"use client";

import { useState, useTransition, useCallback } from "react";
import type { OrderHistoryMetrics, DateRangePreset, OrderHistoryFilters } from "@/types/order-history";
import { GATEWAY_FEE_PERCENT } from "@/types/order-history";
import type { OrderWithDetails } from "@/types/database";
import { paiseToRupees } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar, TrendingUp, ShoppingBag, Percent,
  RefreshCw, ChevronDown, IndianRupee, } from "lucide-react";

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today",      label: "Today" },
  { id: "yesterday",  label: "Yesterday" },
  { id: "this_week",  label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "custom",     label: "Custom Range" },
];

function formatPaise(paise: number): string {
  return `₹${paiseToRupees(paise).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface OrderHistoryClientProps {
  initialMetrics: OrderHistoryMetrics;
  initialOrders: OrderWithDetails[];
  initialLabel: string;
  /** Server action passed as prop to avoid client boundary issues */
  fetchOrderHistory: (filters: OrderHistoryFilters) => Promise<{
    metrics?: OrderHistoryMetrics;
    orders?: OrderWithDetails[];
    label?: string;
    error?: string;
  }>;
}

export function OrderHistoryClient({
  initialMetrics,
  initialOrders,
  initialLabel,
  fetchOrderHistory,
}: OrderHistoryClientProps) {
  const [metrics, setMetrics] = useState<OrderHistoryMetrics>(initialMetrics);
  const [orders, setOrders]   = useState<OrderWithDetails[]>(initialOrders);
  const [label, setLabel]     = useState(initialLabel);
  const [preset, setPreset]   = useState<DateRangePreset>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [loading, startTransition]  = useTransition();

  const applyFilter = useCallback((filters: OrderHistoryFilters) => {
    startTransition(async () => {
      const result = await fetchOrderHistory(filters);
      if (result.metrics) setMetrics(result.metrics);
      if (result.orders)  setOrders(result.orders);
      if (result.label)   setLabel(result.label);
      setShowPresets(false);
    });
  }, [fetchOrderHistory]);

  const selectPreset = (p: DateRangePreset) => {
    setPreset(p);
    if (p !== "custom") applyFilter({ preset: p });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Order History</h1>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>

          {/* Date range picker */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              {PRESETS.find(p => p.id === preset)?.label}
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {showPresets && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-64 overflow-hidden transform opacity-100 scale-100">
                <div className="py-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p.id)}
                      className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
                        preset === p.id
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Custom range inputs */}
                <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom Range</p>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    disabled={!startDate || !endDate}
                    onClick={() => {
                      setPreset("custom");
                      applyFilter({ preset: "custom", startDate, endDate });
                    }}
                    className="w-full text-sm bg-blue-600 text-slate-900 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mt-1"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading data...
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShoppingBag className="w-12 h-12 text-blue-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total Orders</p>
              <p className="text-xl font-extrabold text-slate-800 tracking-tight">{metrics.totalOrders.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Avg order: <span className="text-slate-700">{formatPaise(metrics.averageOrderValue)}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gross Revenue</p>
              <p className="text-xl font-extrabold text-slate-800 tracking-tight">{formatPaise(metrics.totalRevenue)}</p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">Including GST</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <Percent className="w-12 h-12 text-orange-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gateway Fee ({GATEWAY_FEE_PERCENT}%)</p>
              <p className="text-xl font-extrabold text-orange-600 tracking-tight">{formatPaise(metrics.gatewayFee)}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Payment processor deduction</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <IndianRupee className="w-12 h-12 text-violet-600" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Net Revenue</p>
              <p className="text-xl font-extrabold text-violet-700 tracking-tight">{formatPaise(metrics.netRevenue)}</p>
              <p className="text-[11px] text-violet-600/80 mt-1 font-medium">Final settlement amount</p>
            </div>
          </div>
        </div>

      {/* ── Period-wise breakdown table ── */}
      {metrics.periodData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Period Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Revenue</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gateway Fee ({GATEWAY_FEE_PERCENT}%)</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.periodData.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{day.date}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{day.orders}</td>
                    <td className="px-5 py-3 text-right text-slate-700 font-medium">{formatPaise(day.revenue)}</td>
                    <td className="px-5 py-3 text-right text-orange-600">−{formatPaise(day.gatewayFee)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-violet-700">{formatPaise(day.netRevenue)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td className="px-5 py-3 text-slate-700">Total</td>
                  <td className="px-5 py-3 text-right text-slate-700">{metrics.totalOrders}</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatPaise(metrics.totalRevenue)}</td>
                  <td className="px-5 py-3 text-right text-orange-700">−{formatPaise(metrics.gatewayFee)}</td>
                  <td className="px-5 py-3 text-right text-violet-800">{formatPaise(metrics.netRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Individual Orders Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Orders ({orders.length})</h2>
          <span className="text-xs text-slate-400">Paid & delivered orders</span>
        </div>
        {orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No orders found for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Seat</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const subtotal = order.subtotal_amount ?? (order.total_amount - (order.gst_amount ?? 0));
                  const fee = Math.round(subtotal * GATEWAY_FEE_PERCENT / 100);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700">{order.customer_name}</div>
                        <div className="text-xs text-slate-400">{order.mobile}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-600">{order.auditoriums?.name}</div>
                        <div className="text-xs text-slate-400">Seat {order.seat_number}</div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-semibold text-slate-800">
                          ₹{paiseToRupees(order.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-400">{order.order_items?.length} items</div>
                      </td>
                      <td className="px-5 py-3 text-right text-orange-500 text-xs">
                        −₹{paiseToRupees(fee).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {format(new Date(order.created_at), "dd MMM, h:mm a")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
