"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import type { OrderWithDetails, OrderStatus } from "@/types/database";
import { updateOrderStatus, getAdminOrders, cancelOrder } from "@/lib/orders/order-actions";
import { getOrdersInRange } from "@/lib/orders/history-actions";
import { triggerDayEnd, cancelDayEnd } from "@/lib/admin/day-end-actions";
import { formatPrice } from "@/lib/utils";
import {
  ClipboardList, Clock, CheckCircle2,
  RefreshCw, Smartphone, MapPin, ChevronDown, ChevronUp, Printer, Wifi, WifiOff,
  Moon, Sun, AlertTriangle, Volume2, LogOut, Download, Calendar, History,
} from "lucide-react";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import type { UserRole } from "@/types/database";
import { signOut } from "@/lib/auth/actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending_payment: { label: "Pending Payment", color: "text-yellow-600",  bg: "bg-yellow-50",  border: "border-yellow-200",  dot: "bg-yellow-400" },
  confirmed:       { label: "New Order",        color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500"   },
  accepted:        { label: "Accepted",          color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500" },
  preparing:       { label: "Preparing",         color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-400" },
  ready:           { label: "Ready",             color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-500" },
  delivered:       { label: "Delivered",         color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-400"  },
  cancelled:       { label: "Cancelled",         color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-400"    },
};

// 2-step admin flow only: confirmed -> accepted -> delivered
const NEXT_STATUS: Partial<Record<string, { status: OrderStatus; label: string; style: string }>> = {
  confirmed: { status: "accepted",  label: "Accept",        style: "bg-blue-600 hover:bg-blue-700 text-white" },
  accepted:  { status: "delivered", label: "Mark Delivered", style: "bg-green-600 hover:bg-green-700 text-white" },
};

const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "accepted", "preparing", "ready"];
const DONE_STATUSES:   OrderStatus[] = ["delivered", "cancelled"];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTodayIST(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// ── KOT Print helper ──────────────────────────────────────────────────────────
function printKOT(order: OrderWithDetails) {
  const kotWindow = window.open("", "_blank", "width=400,height=600");
  if (!kotWindow) {
    alert("Pop-up blocked. Please allow pop-ups to print KOT.");
    return;
  }

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const shortId = order.id.slice(0, 8).toUpperCase();

  const items = (order.order_items ?? [])
    .map((item) => {
      const customizations = Array.isArray(item.selected_customizations) && item.selected_customizations.length > 0
        ? `<div style="font-size:11px;color:#555;margin-left:12px;">&rarr; ${item.selected_customizations.map((c: { name: string }) => c.name).join(", ")}</div>`
        : "";
      return `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc;">
          <div>
            <strong>${item.quantity}x ${item.product_name}</strong>
            ${customizations}
          </div>
        </div>`;
    })
    .join("");

  kotWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>KOT #${shortId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 13px; padding: 12px; max-width: 300px; }
    .center { text-align: center; }
    .divider { border-top: 2px dashed #000; margin: 8px 0; }
    .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .value { font-size: 14px; font-weight: bold; }
    h1 { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
    h2 { font-size: 13px; font-weight: 700; }
    @media print {
      body { margin: 0; padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="center">
    <h1>KOT</h1>
    <div class="label">Kitchen Order Ticket</div>
  </div>
  <div class="divider"></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
    <div><span class="label">Order ID</span><br/><span class="value">#${shortId}</span></div>
    <div style="text-align:right;"><span class="label">Time</span><br/><span style="font-size:11px;">${now}</span></div>
  </div>
  <div class="divider"></div>
  <div style="margin-bottom:4px;"><span class="label">Customer</span><br/><span class="value">${order.customer_name}</span></div>
  <div style="margin-bottom:4px;"><span class="label">Location</span><br/><span class="value">${order.auditoriums?.name ?? "-"} | Seat ${order.seat_number}</span></div>
  <div style="margin-bottom:4px;"><span class="label">Mobile</span><br/><span>${order.mobile}</span></div>
  <div class="divider"></div>
  <h2 style="margin-bottom:6px;">ITEMS</h2>
  ${items}
  <div class="divider"></div>
  <div style="text-align:right;font-size:15px;font-weight:900;">Total: ${formatPrice(order.total_amount)}</div>
  <div class="divider"></div>
  <div class="center label" style="margin-top:8px;">Accepted at: ${now}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
  kotWindow.document.close();
}

// ── Compact Order Card ────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatusUpdate,
  showTheatreTag,
}: {
  order: OrderWithDetails;
  onStatusUpdate: (id: string, status: OrderStatus) => Promise<void>;
  showTheatreTag?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, startTransition] = useTransition();
  const cfg  = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.confirmed;
  const next = NEXT_STATUS[order.status];
  const shortId = order.id.slice(0, 8).toUpperCase();

  const handleNext = () => {
    if (!next) return;
    const willPrintKOT = next.status === "accepted";
    startTransition(async () => {
      await onStatusUpdate(order.id, next.status);
      // Auto-print KOT when accepting an order
      if (willPrintKOT) {
        printKOT(order);
      }
    });
  };

  const handleCancel = () => {
    if (!confirm(`Cancel order #${shortId}?`)) return;
    startTransition(async () => {
      const { error } = await cancelOrder(order.id);
      if (!error) onStatusUpdate(order.id, "cancelled");
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Row 1: ID / status / time */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-slate-800">#{shortId}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${cfg.bg} ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${order.status === "confirmed" ? "animate-pulse" : ""}`} />
              {cfg.label}
            </span>
            {showTheatreTag && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                {showTheatreTag}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <Clock className="w-3 h-3" />
            {timeAgo(order.created_at)}
          </span>
        </div>

        {/* Row 2: Name + amount */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-base text-slate-900 leading-tight truncate">{order.customer_name}</p>
            <div className="flex flex-col mt-1 gap-1">
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                {order.auditoriums?.name} <span className="text-slate-300">|</span> Seat <strong className="text-slate-700">{order.seat_number}</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Smartphone className="w-3 h-3 flex-shrink-0" />
                {order.mobile}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 bg-slate-50 px-3 py-2 rounded-xl">
            <p className="font-extrabold text-base text-slate-900">{formatPrice(order.total_amount)}</p>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">{order.order_items?.length ?? 0} items</p>
          </div>
        </div>
      </div>

      {/* Items expander */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100/50"
      >
        <span>{expanded ? "Hide details" : "View order details"}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-5 py-3 space-y-2 bg-slate-50/50 border-t border-slate-100/50">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span className="text-slate-700 font-medium">
                {item.quantity}x {item.product_name}
                {Array.isArray(item.selected_customizations) && item.selected_customizations.length > 0 && (
                  <span className="block text-[10px] text-slate-500 font-normal mt-0.5 ml-4 border-l-2 border-slate-200 pl-2">
                    {item.selected_customizations.map((c: { name: string }) => c.name).join(", ")}
                  </span>
                )}
              </span>
              <span className="text-slate-600 font-semibold">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 flex justify-between text-[11px] text-slate-400 border-t border-slate-200/50 border-dashed">
            <span>GST</span><span>{formatPrice(order.gst_amount)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-800 pt-1">
            <span>Total Amount</span><span>{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 border-t border-slate-100/50 bg-white">
        <a
          href={`/dashboard/admin/bill/${order.id}`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Bill
        </a>
        <div className="flex items-center gap-2">
          {!["delivered","cancelled"].includes(order.status) && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {next && (
            <button
              onClick={handleNext}
              disabled={loading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm ${next.style}`}
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {next.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function useOrderSound() {
  const audioRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current = ctx;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } catch { /* blocked before user interaction */ }
  }, []);
}

// ── Order History / Report Tab ────────────────────────────────────────────────
type ReportRange = "today" | "week" | "month" | "custom";

function getISTDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

function getTodayIST() { return getISTDateString(new Date()); }
function getDateDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getISTDateString(d);
}
function getMonthStartIST() {
  const d = new Date();
  d.setDate(1);
  return getISTDateString(d);
}

function OrderHistoryTab({ theatreId }: { theatreId: string }) {
  const [range, setRange] = useState<ReportRange>("today");
  const [customFrom, setCustomFrom] = useState(getTodayIST());
  const [customTo, setCustomTo]     = useState(getTodayIST());
  const [historyOrders, setHistoryOrders] = useState<OrderWithDetails[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const isAllView = theatreId === "all";

  function getDateRange(): { from: string; to: string } {
    const today = getTodayIST();
    if (range === "today")  return { from: today, to: today };
    if (range === "week")   return { from: getDateDaysAgo(6), to: today };
    if (range === "month")  return { from: getMonthStartIST(), to: today };
    return { from: customFrom, to: customTo };
  }

  const fetchReport = () => {
    const { from, to } = getDateRange();
    startLoad(async () => {
      const orders = await getOrdersInRange(from, to);
      setHistoryOrders(orders);
    });
  };

  const downloadExcel = async () => {
    if (!historyOrders || historyOrders.length === 0) return;
    setDownloadLoading(true);
    try {
      const XLSX = await import("xlsx");
      const { from, to } = getDateRange();

      const totalRevenue = historyOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0);
      const delivered = historyOrders.filter(o => o.status === "delivered").length;
      const cancelled = historyOrders.filter(o => o.status === "cancelled").length;

      const summaryData = [
        ["Report Period", `${from} to ${to}`],
        ["Generated At", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
        [],
        ["Metric", "Value"],
        ["Total Orders", historyOrders.length],
        ["Delivered", delivered],
        ["Cancelled", cancelled],
        ["Total Revenue (Rs.)", (totalRevenue / 100).toFixed(2)],
        ["Avg Order Value (Rs.)", historyOrders.length > 0 ? ((totalRevenue / 100) / historyOrders.length).toFixed(2) : "0.00"],
      ];

      const orderRows = historyOrders.map(o => ({
        "Order ID":     o.id.slice(0, 8).toUpperCase(),
        "Date":         new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
        "Time":         new Date(o.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
        "Customer":     o.customer_name,
        "Mobile":       o.mobile,
        "Auditorium":   o.auditoriums?.name ?? "",
        "Seat":         o.seat_number,
        "Items":        o.order_items?.length ?? 0,
        "GST (Rs.)":    ((o.gst_amount ?? 0) / 100).toFixed(2),
        "Total (Rs.)":  (o.total_amount / 100).toFixed(2),
        "Status":       o.status,
      }));

      const itemRows: Record<string, string | number>[] = [];
      historyOrders.forEach(o => {
        (o.order_items ?? []).forEach(item => {
          itemRows.push({
            "Order ID":           o.id.slice(0, 8).toUpperCase(),
            "Date":               new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
            "Customer":           o.customer_name,
            "Product":            item.product_name,
            "Qty":                item.quantity,
            "Unit Price (Rs.)":   ((item.unit_price ?? 0) / 100).toFixed(2),
            "Subtotal (Rs.)":     (item.subtotal / 100).toFixed(2),
            "Customizations":     Array.isArray(item.selected_customizations)
              ? item.selected_customizations.map((c: { name: string }) => c.name).join(", ")
              : "",
          });
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), "Order Items");

      XLSX.writeFile(wb, `SmartMenu_Report_${from}_to_${to}.xlsx`);
    } catch (e) {
      console.error("Excel export error:", e);
      alert("Failed to generate report. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const { from, to } = getDateRange();
  const totalRevenue = (historyOrders ?? []).filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0);
  const deliveredCount = (historyOrders ?? []).filter(o => o.status === "delivered").length;
  const cancelledCount = (historyOrders ?? []).filter(o => o.status === "cancelled").length;

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h2 className="font-bold text-slate-800 text-base">Order History Report</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "custom"] as ReportRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                range === r
                  ? "bg-slate-800 text-white border-slate-800"
                  : "text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {r === "today" ? "Today" : r === "week" ? "Last 7 Days" : r === "month" ? "This Month" : "Custom Range"}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Generate Report
          </button>
          {historyOrders && historyOrders.length > 0 && (
            <button
              onClick={downloadExcel}
              disabled={downloadLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all"
            >
              {downloadLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Excel
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {historyOrders !== null && (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Orders", value: historyOrders.length, color: "text-slate-800" },
              { label: "Delivered", value: deliveredCount, color: "text-emerald-600" },
              { label: "Cancelled", value: cancelledCount, color: "text-red-500" },
              { label: "Revenue", value: formatPrice(totalRevenue), color: "text-blue-600" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 text-center">
            Showing data from <strong className="text-slate-600">{from}</strong> to <strong className="text-slate-600">{to}</strong>
            {isAllView ? " (All theatres)" : ""}
          </div>

          {historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl">
              <History className="w-10 h-10 text-slate-300" />
              <p className="text-slate-400 text-sm font-medium">No orders found for this period.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-sm">{historyOrders.length} orders</h3>
                <span className="text-xs text-slate-400">Most recent first</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Order ID","Date","Customer","Location","Items","Total","Status"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyOrders.map(o => {
                      const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.confirmed;
                      return (
                        <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">#{o.id.slice(0,8).toUpperCase()}</td>
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day:"2-digit", month:"short" })}
                            {" "}
                            <span className="text-slate-400">{new Date(o.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour:"2-digit", minute:"2-digit" })}</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{o.customer_name}</td>
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{o.auditoriums?.name} / {o.seat_number}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{o.order_items?.length ?? 0}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{formatPrice(o.total_amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AdminOrdersClientProps {
  initialOrders: OrderWithDetails[];
  theatreId: string;
  theatreName: string;
  isDayEnded: boolean;
  profile: { role: UserRole; full_name: string | null };
  userInitial: string;
  allTheatres?: { id: string; name: string }[];
}

export function AdminOrdersClient({
  initialOrders,
  theatreId,
  theatreName,
  isDayEnded: initialDayEnded,
  userInitial,
  allTheatres,
}: AdminOrdersClientProps) {
  const isAllView = theatreId === "all";
  const theatreMap = new Map((allTheatres ?? []).map(t => [t.id, t.name]));
  const [orders, setOrders]             = useState<OrderWithDetails[]>(initialOrders);
  const [refreshing, startRefresh]      = useTransition();
  const [activeTab, setActiveTab]       = useState<"active" | "done" | "history">("active");
  const [connected, setConnected]       = useState(false);
  const [isDayEnded, setIsDayEnded]     = useState(initialDayEnded);
  const [dayEndLoading, startDayEnd]    = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);
  const playChime = useOrderSound();

  useEffect(() => {
    setOrders(initialOrders);
    setIsDayEnded(initialDayEnded);
  }, [initialOrders, initialDayEnded]);

  const handleNewOrder = useCallback((order: OrderWithDetails) => {
    setOrders(prev => prev.some(o => o.id === order.id) ? prev : [order, ...prev]);
    playChime();
    setActiveTab("active");
  }, [playChime]);

  const handleRealtimeUpdate = useCallback((orderId: string, newStatus: OrderStatus, updatedAt: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: updatedAt } : o));
  }, []);

  const STATUS_RANK: Record<string, number> = {
    confirmed: 1, accepted: 2, preparing: 3, ready: 4, delivered: 5, cancelled: 6, pending_payment: 0,
  };
  const mergePollOrders = useCallback((fresh: OrderWithDetails[]) => {
    setOrders(prev => {
      const prevMap = new Map(prev.map(o => [o.id, o]));
      const merged = fresh.map(o => {
        const existing = prevMap.get(o.id);
        if (existing && (STATUS_RANK[existing.status] ?? 0) > (STATUS_RANK[o.status] ?? 0)) {
          return { ...o, status: existing.status };
        }
        return o;
      });
      const freshIds = new Set(fresh.map(o => o.id));
      const local = prev.filter(o => !freshIds.has(o.id));
      return [...merged, ...local];
    });
  }, []);

  useRealtimeOrders({ theatreId: isAllView ? "" : theatreId, onNewOrder: handleNewOrder, onStatusUpdate: handleRealtimeUpdate, pollFn: getAdminOrders, onPollResult: mergePollOrders, pollIntervalMs: 8000 });

  const filteredOrders = isAllView
    ? orders
    : orders.filter(o => o.theatre_id === theatreId);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const refresh = useCallback(() => {
    startRefresh(async () => { const f = await getAdminOrders(); setOrders(f); });
  }, []);

  const handleStatusUpdate = useCallback(async (id: string, status: OrderStatus) => {
    const { error } = await updateOrderStatus(id, status);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o));
    } else {
      console.error("Status update error:", error);
      alert(`Failed to update order status: ${error}`);
    }
  }, []);

  const handleDayEnd = () => {
    if (!confirm(isDayEnded
      ? "Start accepting orders again?"
      : "End the business day? Customers cannot order until 6:00 AM tomorrow."
    )) return;
    startDayEnd(async () => {
      const { error } = isDayEnded ? await cancelDayEnd() : await triggerDayEnd();
      if (!error) setIsDayEnded(!isDayEnded);
    });
  };

  const active = filteredOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const done   = filteredOrders.filter(o => DONE_STATUSES.includes(o.status));
  const shown  = activeTab === "active" ? active : done;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <p className="text-sm font-medium text-slate-600">{theatreName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            {connected
              ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-[11px] text-green-600">Live</span></>
              : <><WifiOff className="w-3 h-3 text-slate-400" /><span className="text-[11px] text-slate-400">Connecting</span></>
            }
          </div>

          <button
            onClick={handleDayEnd}
            disabled={dayEndLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50 ${
              isDayEnded
                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                : "bg-red-50 text-red-600 border-red-300 hover:bg-red-100"
            }`}
          >
            {isDayEnded ? <><Sun className="w-3 h-3" /> Start Day</> : <><Moon className="w-3 h-3" /> Day End</>}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {userInitial}
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden transform opacity-100 scale-100 origin-top-right">
                  <div className="px-3 py-2 border-b border-slate-100 flex flex-col">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Account</span>
                  </div>

                  <button
                    onClick={() => { playChime(); setShowDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                  >
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    Test Sound
                  </button>
                  
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      Logout
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {isDayEnded && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">Day ended — new orders blocked until <strong>6:00 AM</strong> tomorrow.</p>
        </div>
      )}

      {/* Page Content */}
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header: Title & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Orders</h1>
            <p className="text-sm text-slate-500 mt-1">{formatTodayIST()}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex gap-1 p-1 rounded-full bg-slate-200/50">
              {(["active", "done", "history"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  {tab === "history" && <History className="w-3.5 h-3.5" />}
                  {tab === "active" ? "Pending" : tab === "done" ? "Completed" : "History"}
                </button>
              ))}
            </div>

            {activeTab !== "history" && (
              <button
                onClick={refresh}
                disabled={refreshing}
                className="p-2.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all disabled:opacity-50"
                aria-label="Refresh orders"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "history" ? (
          <OrderHistoryTab theatreId={theatreId} />
        ) : (
          shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">
                {activeTab === "active"
                  ? isDayEnded ? "Day ended — no more orders today." : "No pending orders right now."
                  : "No completed orders yet today."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {shown.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  showTheatreTag={isAllView ? (theatreMap.get(order.theatre_id) ?? order.theatre_id) : undefined}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
