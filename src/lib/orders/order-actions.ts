"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import type { OrderStatus, OrderWithDetails } from "@/types/database";
import { getTodayDayStartUTC } from "@/lib/utils/ist-date";

/**
 * Fetch today's orders for the current admin's theatre.
 * "Today" = from 06:00 IST today until now (cinema business day boundary).
 */
export async function getAdminOrders(): Promise<OrderWithDetails[]> {
  const session = await getCurrentProfile();
  if (!session) return [];

  const admin = await createAdminClient();

  // Business day starts at 06:00 IST — filter to today's orders only
  const dayStartUTC = getTodayDayStartUTC();

  const { data, error } = await admin
    .from("orders")
    .select(`
      *,
      auditoriums ( id, name ),
      order_items ( * ),
      payments ( * )
    `)
    .eq("theatre_id", session.profile.theatre_id)
    .not("status", "in", "(pending_payment,cancelled)")
    .gte("created_at", dayStartUTC.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getAdminOrders error:", error);
    return [];
  }

  return (data ?? []) as unknown as OrderWithDetails[];
}

/** Update order status */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ error?: string }> {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    return { error: "Unauthorized" };
  }

  // Guard: only allow transitions to accepted or delivered from the admin UI
  const allowedStatuses: OrderStatus[] = ["accepted", "delivered", "cancelled"];
  if (!allowedStatuses.includes(newStatus)) {
    return { error: "Invalid status transition" };
  }

  const admin = await createAdminClient();

  // The database trigger enforces strict linear status transitions (accepted -> preparing -> ready -> delivered).
  // Since the UI now skips directly from accepted to delivered, we need to walk the order through the intermediate states.
  if (newStatus === "delivered") {
    // 1. Fetch current status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (admin as any).from("orders").select("status").eq("id", orderId).single();
    const currentStatus = order?.status;

    const sequence = [];
    if (currentStatus === "accepted") sequence.push("preparing", "ready", "delivered");
    else if (currentStatus === "preparing") sequence.push("ready", "delivered");
    else if (currentStatus === "ready") sequence.push("delivered");
    else sequence.push("delivered"); // fallback

    for (const s of sequence) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from("orders")
        .update({ status: s, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("theatre_id", session.profile.theatre_id);
      
      if (error) {
        console.error(`Supabase update error (status ${s}):`, error);
        return { error: error.message };
      }
    }
  } else {
    // Standard direct update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("theatre_id", session.profile.theatre_id);

    if (error) {
      console.error("Supabase update error:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard/admin");
  return {};
}

/** Cancel an order */
export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  return updateOrderStatus(orderId, "cancelled");
}
