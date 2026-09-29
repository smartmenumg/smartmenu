/**
 * Shared types for the Order History feature.
 * Kept in a separate file so they can be imported by both
 * server actions ("use server") and client components ("use client").
 */

export type DateRangePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

export interface OrderHistoryFilters {
  preset: DateRangePreset;
  startDate?: string; // ISO date string, for custom range (YYYY-MM-DD)
  endDate?: string;   // ISO date string, for custom range (YYYY-MM-DD)
}

export interface PeriodWiseEntry {
  date: string;          // "29 Sep 2026"
  orders: number;
  revenue: number;       // paise
  gatewayFee: number;    // paise
  netRevenue: number;    // paise
}

export interface OrderHistoryMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalGst: number;
  netRevenue: number;
  gatewayFee: number;
  gatewayFeePercent: number;
  averageOrderValue: number;
  periodData: PeriodWiseEntry[];
}

/** Gateway fee %. Change ONLY this to update rates app-wide. */
export const GATEWAY_FEE_PERCENT = 2.0;
