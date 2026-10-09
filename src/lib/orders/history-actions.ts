"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getEffectiveTheatreId } from "@/lib/theatre-context";
import type { OrderWithDetails } from "@/types/database";

/**
 * Fetch orders within a given date range for the report / history tab.
 * Both from and to are ISO strings (date only, e.g. "2024-01-01").
 */
export async function getOrdersInRange(
  from: string,
  to: string
): Promise<OrderWithDetails[]> {
  const session = await getCurrentProfile();
  if (!session) return [];

  const admin = await createAdminClient();
  const effectiveTheatreId = await getEffectiveTheatreId();

  // Convert date strings to UTC ISO timestamps (use full day range)
  const fromDate = new Date(`${from}T00:00:00+05:30`).toISOString();
  const toDate   = new Date(`${to}T23:59:59+05:30`).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("orders")
    .select(`
      *,
      auditoriums ( id, name ),
      order_items ( * ),
      payments ( * )
    `)
    .neq("status", "pending_payment")
    .gte("created_at", fromDate)
    .lte("created_at", toDate)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (effectiveTheatreId !== null) {
    query = query.eq("theatre_id", effectiveTheatreId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getOrdersInRange error:", error);
    return [];
  }

  return (data ?? []) as unknown as OrderWithDetails[];
}
