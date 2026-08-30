"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import type { OrderWithDetails, OrderStatus } from "@/types/database";
import { updateOrderStatus, getAdminOrders, cancelOrder } from "@/lib/orders/order-actions";
import { formatPrice } from "@/lib/utils";
import {
  ClipboardList, Clock, ChefHat, CheckCircle2, Truck,
  RefreshCw, Smartphone, MapPin, Receipt,
  ChevronDown, ChevronUp, Printer, Wifi, WifiOff,
} from "lucide-react";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending_payment: { label: "Pending Payment", color: "text-yellow-400",  bg: "bg-yellow-500/8",  border: "border-yellow-500/20",  dot: "bg-yellow-400" },
  confirmed:       { label: "Confirmed",        color: "text-blue-400",    bg: "bg-blue-500/8",    border: "border-blue-500/20",    dot: "bg-blue-400" },
  accepted:        { label: "Accepted",          color: "text-indigo-400",  bg: "bg-indigo-500/8",  border: "border-indigo-500/20",  dot: "bg-indigo-400" },
  preparing:       { label: "Preparing",         color: "text-orange-400",  bg: "bg-orange-500/8",  border: "border-orange-500/20",  dot: "bg-orange-400" },
  ready:           { label: "Ready",             color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  delivered:       { label: "Delivered",         color: "text-slate-400",   bg: "bg-slate-500/8",   border: "border-slate-500/20",   dot: "bg-slate-400" },
  cancelled:       { label: "Cancelled",         color: "text-red-400",     bg: "bg-red-500/8",     border: "border-red-500/20",     dot: "bg-red-400" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: React.ReactNode; style: string }>> = {
  confirmed: { status: "accepted",  label: "Accept Order",  icon: <ClipboardList className="w-3.5 h-3.5" />, style: "bg-blue-500 hover:bg-blue-400 text-white" },
  accepted:  { status: "preparing", label: "Start Prep",    icon: <ChefHat className="w-3.5 h-3.5" />,       style: "bg-orange-500 hover:bg-orange-400 text-white" },
  preparing: { status: "ready",     label: "Mark Ready",    icon: <CheckCircle2 className="w-3.5 h-3.5" />,  style: "bg-emerald-500 hover:bg-emerald-400 text-white" },
  ready:     { status: "delivered", label: "Delivered",     icon: <Truck className="w-3.5 h-3.5" />,         style: "bg-slate-600 hover:bg-slate-500 text-white" },
};

const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "accepted", "preparing", "ready"];
const DONE_STATUSES: OrderStatus[]   = ["delivered", "cancelled"];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function OrderCard({
  order,
  onStatusUpdate,
}: {
  order: OrderWithDetails;
  onStatusUpdate: (id: string, status: OrderStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, startTransition] = useTransition();
  const cfg = STATUS_CONFIG[order.status];
  const next = NEXT_STATUS[order.status];
  const shortId = order.id.slice(0, 8).toUpperCase();

  const handleNext = () => {
    if (!next) return;
    startTransition(() => { onStatusUpdate(order.id, next.status); });
  };

  const handleCancel = () => {
    if (!confirm(`Cancel order #${shortId}? This cannot be undone.`)) return;
    startTransition(async () => {
      const { error } = await cancelOrder(order.id);
      if (!error) onStatusUpdate(order.id, "cancelled");
    });
  };

  return (
    <div className={`rounded-2xl border ${cfg.border} overflow-hidden transition-all duration-300`} style={{ background: "#0f0f0f" }}>
      {/* Status bar */}
      <div className={`h-1 w-full ${cfg.dot}`} style={{ opacity: 0.7 }} />

      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-mono text-[11px] text-white/30 tracking-wider">#{shortId}</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
              {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/25">
              <Clock className="w-3 h-3" />{timeAgo(order.created_at)}
            </span>
          </div>
          <p className="font-display font-semibold text-white text-base leading-none">{order.customer_name}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-white/40">
              <MapPin className="w-3 h-3" />
              {order.auditoriums?.name ?? "—"} · Seat <strong className="text-amber-400">{order.seat_number}</strong>
            </span>
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Smartphone className="w-3 h-3" />{order.mobile}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="font-display font-bold text-amber-400 text-xl leading-none">{formatPrice(order.total_amount)}</p>
          <p className="text-[10px] text-white/30 mt-1">{order.order_items?.length ?? 0} items</p>
        </div>
      </div>

      {/* Items toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span>{expanded ? "Hide items" : `View ${order.order_items?.length ?? 0} items`}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-white/60">
                {item.product_name}
                <span className="text-white/30 ml-1">× {item.quantity}</span>
                {Array.isArray(item.selected_customizations) && item.selected_customizations.length > 0 && (
                  <span className="block text-[10px] text-amber-400/60 mt-0.5">
                    + {item.selected_customizations.map((c: { name: string }) => c.name).join(", ")}
                  </span>
                )}
              </span>
              <span className="text-white/40 font-medium">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="pt-2 flex justify-between text-xs text-white/30" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span>GST</span><span>{formatPrice(order.gst_amount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-sm text-amber-400">
            <span>Total</span><span>{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      )}

      {(next || !["delivered","cancelled"].includes(order.status)) && (
        <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Print bill link */}
          <a
            href={`/dashboard/admin/bill/${order.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-amber-400 hover:bg-amber-500/10 border border-white/[0.06] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </a>

          <div className="flex items-center gap-2">
            {/* Cancel */}
            {!["delivered","cancelled"].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            {next && (
              <button
                onClick={handleNext}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${next.style}`}
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : next.icon}
                {next.label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useOrderSound() {
  const audioRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current = ctx;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } catch {
      // browser may block AudioContext before user interaction
    }
  }, []);

  return playChime;
}

interface AdminOrdersClientProps {
  initialOrders: OrderWithDetails[];
  theatreId: string;
}

export function AdminOrdersClient({ initialOrders, theatreId }: AdminOrdersClientProps) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
  const [refreshing, startRefresh] = useTransition();
  const [activeTab, setActiveTab] = useState<"active" | "done">("active");
  const [connected, setConnected] = useState(false);
  const playChime = useOrderSound();

  const handleNewOrder = useCallback((order: OrderWithDetails) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
    playChime();
    setActiveTab("active");
  }, [playChime]);

  const handleRealtimeUpdate = useCallback((orderId: string, newStatus: OrderStatus, updatedAt: string) => {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: newStatus, updated_at: updatedAt } : o)
    );
  }, []);

  useRealtimeOrders({
    theatreId,
    onNewOrder: handleNewOrder,
    onStatusUpdate: handleRealtimeUpdate,
    pollFn: getAdminOrders,
    onPollResult: (fresh) => setOrders(fresh),
    pollIntervalMs: 12000,
  });

  // Detect realtime connectivity
  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const fresh = await getAdminOrders();
      setOrders(fresh);
    });
  }, []);

  const handleStatusUpdate = useCallback(async (id: string, status: OrderStatus) => {
    const { error } = await updateOrderStatus(id, status);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o));
    }
  }, []);

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const done   = orders.filter((o) => DONE_STATUSES.includes(o.status));
  const shown  = activeTab === "active" ? active : done;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            Live Orders
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {connected
              ? <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-xs text-emerald-400/70">Real-time active</span></>
              : <><WifiOff className="w-3 h-3 text-white/30" /><span className="text-xs text-white/30">Connecting…</span></>
            }
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-all btn-ghost disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {(["confirmed", "accepted", "preparing", "ready"] as OrderStatus[]).map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={`rounded-xl border ${cfg.border} ${cfg.bg} px-3 py-3 text-center`}>
              <p className={`text-xl font-display font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[9px] text-white/30 mt-0.5 tracking-wide uppercase">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        {(["active", "done"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab === "active" ? `Active (${active.length})` : `Done (${done.length})`}
          </button>
        ))}
      </div>

      {/* Orders */}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-2xl gap-3" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <ClipboardList className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">
            {activeTab === "active" ? "No active orders — realtime will alert you" : "No completed orders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
