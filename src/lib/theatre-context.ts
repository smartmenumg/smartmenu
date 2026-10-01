/**
 * Theatre Context — Cookie-based theatre switching for super_admin.
 *
 * Super admins can switch between theatres using a dropdown in the sidebar.
 * The selected theatre_id is stored in a cookie: `active_theatre_id`.
 *
 * Normal admins always use their own profile.theatre_id — no cookie involved.
 *
 * Usage in server actions:
 *   const theatreId = await getEffectiveTheatreId();
 */

import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/actions";
import { createAdminClient } from "@/lib/supabase/server";

export const THEATRE_COOKIE = "active_theatre_id";

export interface TheatreOption {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

/**
 * Returns the theatre_id that should be used for all data queries.
 *
 * - For regular admins/menu users: always their own profile.theatre_id
 * - For super_admin: reads the `active_theatre_id` cookie.
 *   If the cookie is missing or invalid, falls back to their own profile.theatre_id.
 *
 * Returns null ONLY for super_admin when the cookie is explicitly set to "all"
 * (meaning they want cross-theatre data).
 */
export async function getEffectiveTheatreId(): Promise<string | null> {
  const session = await getCurrentProfile();
  if (!session) return null;

  const { role, theatre_id } = session.profile;

  // Non-super_admin: always their own theatre, no exceptions
  if (role !== "super_admin") return theatre_id;

  // Super admin: check cookie
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(THEATRE_COOKIE)?.value;

  if (!cookieVal || cookieVal === "all") return null; // null = all theatres
  return cookieVal; // specific theatre UUID
}

/**
 * Same as getEffectiveTheatreId, but for non-super_admin scenarios
 * where null is not a valid option. Falls back to profile theatre.
 */
export async function getEffectiveTheatreIdStrict(): Promise<string> {
  const session = await getCurrentProfile();
  if (!session) throw new Error("Unauthenticated");

  const { role, theatre_id } = session.profile;
  if (role !== "super_admin") return theatre_id;

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(THEATRE_COOKIE)?.value;

  if (!cookieVal || cookieVal === "all") return theatre_id; // fallback to own profile
  return cookieVal;
}

/**
 * Fetches all theatres from the database.
 * Used to populate the theatre switcher dropdown.
 * Only callable by super_admin.
 */
export async function getAllTheatres(): Promise<TheatreOption[]> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("theatres")
    .select("id, name, slug, active")
    .order("name", { ascending: true });

  return (data ?? []) as TheatreOption[];
}

/**
 * Gets the currently active theatre name for display in the sidebar header.
 */
export async function getActiveTheatreName(): Promise<string> {
  const session = await getCurrentProfile();
  if (!session) return "—";

  if (session.profile.role !== "super_admin") {
    // For non-super_admin, fetch their theatre name
    const admin = await createAdminClient();
    const { data } = await admin
      .from("theatres")
      .select("name")
      .eq("id", session.profile.theatre_id)
      .single<{ name: string }>();
    return data?.name ?? "—";
  }

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(THEATRE_COOKIE)?.value;

  if (!cookieVal || cookieVal === "all") return "All Theatres";

  const admin = await createAdminClient();
  const { data } = await admin
    .from("theatres")
    .select("name")
    .eq("id", cookieVal)
    .single<{ name: string }>();

  return data?.name ?? "All Theatres";
}
