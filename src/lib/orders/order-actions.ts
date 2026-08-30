"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import type { OrderStatus, OrderWithDetails } from "@/types/database";

/** Fetch all orders for the current admin's theatre */
export async function getAdminOrders(): Promise<OrderWithDetails[]> {
  const session = await getCurrentProfile();
  if (!session) return [];

  const admin = await createAdminClient();

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
    .order("created_at", { ascending: false })
    .limit(100);

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

  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("theatre_id", session.profile.theatre_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return {};
}

/** Cancel an order */
export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  return updateOrderStatus(orderId, "cancelled");
}
