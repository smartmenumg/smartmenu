"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { signSeat } from "./qr-utils";

export interface SeatRow {
  name: string; // e.g. "A", "V", "GOLD"
  from: number; // start seat number (usually 1)
  to: number;   // end seat number (e.g. 16)
}

export interface SeatLayout {
  rows: SeatRow[];
}

export interface AuditoriumWithLayout {
  id: string;
  name: string;
  display_order: number;
  total_seats: number | null;
  seat_layout: SeatLayout;
}


/**
 * Server action: generate signed QR URLs for all seats in a list.
 * Called from the admin dashboard when generating / printing QR codes.
 */
export async function getSignedQrUrls(
  audiId: string,
  seats: string[],
  baseUrl: string
): Promise<Record<string, string>> {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const seat of seats) {
    const sig = signSeat(audiId, seat);
    result[seat] = `${baseUrl}/order?audi=${audiId}&seat=${encodeURIComponent(seat)}&sig=${sig}`;
  }
  return result;
}

// ─── Auditorium helpers ───────────────────────────────────────────────────────

/** Fetch all auditoriums for this theatre, including their seat layouts. */
export async function getAuditoriumsWithLayout(): Promise<AuditoriumWithLayout[]> {
  const session = await getCurrentProfile();
  if (!session) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (await createAdminClient() as any)
    .from("auditoriums")
    .select("id, name, display_order, total_seats, seat_layout")
    .eq("theatre_id", session.profile.theatre_id)
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getAuditoriumsWithLayout error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((a: any) => ({
    ...a,
    seat_layout: a.seat_layout || { rows: [] },
  })) as AuditoriumWithLayout[];
}

/** Save an updated seat layout for one auditorium. */
export async function saveSeatLayout(
  auditoriumId: string,
  layout: SeatLayout
): Promise<{ error?: string }> {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    return { error: "Unauthorized" };
  }

  // Validate layout
  for (const row of layout.rows) {
    if (!row.name?.trim()) return { error: "Row name cannot be empty." };
    if (row.from < 1) return { error: `Row ${row.name}: start seat must be >= 1.` };
    if (row.to < row.from) return { error: `Row ${row.name}: end seat must be >= start seat.` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (await createAdminClient() as any)
    .from("auditoriums")
    .update({ seat_layout: layout })
    .eq("id", auditoriumId)
    .eq("theatre_id", session.profile.theatre_id);

  if (error) return { error: error.message };

  return {};
}
