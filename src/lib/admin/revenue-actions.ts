"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import type { OrderWithDetails } from "@/types/database";

export async function getRevenueMetrics() {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return { error: "Unauthorized" };
  }

  const admin = await createAdminClient();

  // Get start of today (local time approximated)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, error } = await (admin as any)
    .from("orders")
    .select(`
      id,
      total_amount,
      subtotal_amount,
      gst_amount,
      created_at,
      status,
      payments!inner(status)
    `)
    .eq("theatre_id", session.profile.theatre_id)
    .eq("payments.status", "paid")
    .not("status", "eq", "cancelled");

  if (error) {
    console.error("Revenue fetch error:", error);
    return { error: error.message };
  }

  let totalRevenue = 0;
  let totalGst = 0;
  let totalOrders = 0;
  
  let todayRevenue = 0;
  let todayOrders = 0;

  type OrderRow = { total_amount: number; gst_amount: number; created_at: string };
  for (const o of (orders || []) as OrderRow[]) {
    totalRevenue += o.total_amount;
    totalGst += (o.gst_amount || 0); 
    totalOrders++;
    
    const createdAt = new Date(o.created_at);
    if (createdAt >= today) {
      todayRevenue += o.total_amount;
      todayOrders++;
    }
  }

  return {
    metrics: {
      totalRevenue,
      totalGst,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      todayRevenue,
      todayOrders,
    }
  };
}

export async function getRecentPaidOrders() {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return [];
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(`
      *,
      auditoriums ( id, name ),
      order_items ( * ),
      payments!inner ( * )
    `)
    .eq("theatre_id", session.profile.theatre_id)
    .eq("payments.status", "paid")
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("getRecentPaidOrders error:", error);
    return [];
  }

  return (data ?? []) as unknown as OrderWithDetails[];
}
