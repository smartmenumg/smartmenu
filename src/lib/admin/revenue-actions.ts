"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getEffectiveTheatreId } from "@/lib/theatre-context";
import { getTodayDayStartUTC } from "@/lib/utils/ist-date";
import type { OrderWithDetails } from "@/types/database";
import type { OrderHistoryFilters, OrderHistoryMetrics } from "@/types/order-history";
import { GATEWAY_FEE_PERCENT } from "@/types/order-history";

async function resolveFilterDates(filters: OrderHistoryFilters): Promise<{
  startUTC: Date;
  endUTC: Date;
  label: string;
}> {
  const IST_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(new Date().getTime() + IST_MS);

  function dayStart(y: number, m: number, d: number): Date {
    return new Date(Date.UTC(y, m, d, 6, 0, 0, 0) - IST_MS);
  }

  const todayStart = getTodayDayStartUTC();
  const now = new Date();

  switch (filters.preset) {
    case "today":
      return { startUTC: todayStart, endUTC: now, label: "Today" };
    case "yesterday": {
      const y = new Date(nowIST);
      y.setUTCDate(y.getUTCDate() - 1);
      return { startUTC: dayStart(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate()), endUTC: todayStart, label: "Yesterday" };
    }
    case "this_week": {
      const w = new Date(nowIST);
      w.setUTCDate(w.getUTCDate() - 6);
      return { startUTC: dayStart(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()), endUTC: now, label: "This Week" };
    }
    case "this_month":
      return { startUTC: dayStart(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1), endUTC: now, label: "This Month" };
    case "custom": {
      if (!filters.startDate || !filters.endDate) return { startUTC: todayStart, endUTC: now, label: "Custom" };
      const [sy, sm, sd] = filters.startDate.split("-").map(Number);
      const [ey, em, ed] = filters.endDate.split("-").map(Number);
      return { startUTC: dayStart(sy, sm - 1, sd), endUTC: dayStart(ey, em - 1, ed + 1), label: `${filters.startDate} to ${filters.endDate}` };
    }
    default:
      return { startUTC: todayStart, endUTC: now, label: "Today" };
  }
}

export async function getOrderHistory(
  filters: OrderHistoryFilters = { preset: "today" }
): Promise<{ metrics?: OrderHistoryMetrics; orders?: OrderWithDetails[]; error?: string; label?: string }> {
  const session = await getCurrentProfile();
  if (!session) return { error: "Unauthorized" };

  const { role, permissions } = session.profile;
  const ok = role === "super_admin" || (role === "admin" && permissions?.includes("revenue"));
  if (!ok) return { error: "Unauthorized" };

  const effectiveTheatreId = await getEffectiveTheatreId();

  const { startUTC, endUTC, label } = await resolveFilterDates(filters);
  const admin = await createAdminClient();

  let query = admin
    .from("orders")
    .select("*, auditoriums(id,name), order_items(*), payments!inner(*)")
    .eq("payments.status", "paid")
    .gte("created_at", startUTC.toISOString())
    .lte("created_at", endUTC.toISOString())
    .order("created_at", { ascending: false });

  // Filter by theatre: null means "All Theatres" (super_admin only)
  if (effectiveTheatreId) {
    query = query.eq("theatre_id", effectiveTheatreId);
  }

  const { data: raw, error } = await query;

  if (error) return { error: error.message };

  const rows = (raw ?? []) as unknown as OrderWithDetails[];
  const IST_MS = 5.5 * 60 * 60 * 1000;
  let totalOrders = 0, totalRevenue = 0, totalGst = 0;
  const dayMap = new Map<string, { orders: number; revenue: number; subtotal: number }>();

  const diffDays = (endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24);
  const groupByMonth = diffDays > 31;

  for (const o of rows) {
    if (o.status !== "cancelled") {
      totalOrders++;
      totalRevenue += o.total_amount;
      totalGst += o.gst_amount ?? 0;
      const ist = new Date(new Date(o.created_at).getTime() + IST_MS);
      
      let key: string;
      if (groupByMonth) {
        key = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
      }
      
      const ex = dayMap.get(key) ?? { orders: 0, revenue: 0, subtotal: 0 };
      dayMap.set(key, { orders: ex.orders + 1, revenue: ex.revenue + o.total_amount, subtotal: ex.subtotal + (o.subtotal_amount ?? 0) });
    }
  }

  const totalSubtotal = totalRevenue - totalGst;
  const gatewayFee = Math.round(totalSubtotal * GATEWAY_FEE_PERCENT / 100);

  const periodData = Array.from(dayMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, d]) => {
      let lbl: string;
      if (groupByMonth) {
        const [y, m] = key.split("-").map(Number);
        lbl = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      } else {
        const [y, m, dy] = key.split("-").map(Number);
        lbl = new Date(Date.UTC(y, m - 1, dy)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
      const fee = Math.round(d.subtotal * GATEWAY_FEE_PERCENT / 100);
      return { date: lbl, orders: d.orders, revenue: d.revenue, gatewayFee: fee, netRevenue: d.revenue - fee };
    });

  return {
    metrics: { totalOrders, totalRevenue, totalGst, netRevenue: totalRevenue - gatewayFee, gatewayFee, gatewayFeePercent: GATEWAY_FEE_PERCENT, averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0, periodData },
    orders: rows,
    label,
  };
}