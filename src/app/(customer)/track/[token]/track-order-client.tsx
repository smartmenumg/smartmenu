"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeOrder } from "@/hooks/use-realtime-orders";
import { formatPrice, shortOrderId } from "@/lib/utils";
import {
  CheckCircle2, Clock, ChefHat, Truck, XCircle,
  MapPin, UtensilsCrossed, ArrowLeft, Package,
} from "lucide-react";
import type { OrderStatus } from "@/types/database";
import Link from "next/link";

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  gst_amount: number;
  selected_customizations?: { name: string; price: number }[];
}

interface TrackingOrder {
  id: string;
  tracking_token: string;
  customer_name: string;
  mobile: string;
  seat_number: string;
  subtotal_amount: number;
  gst_amount: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  auditoriums?: { name: string };
  order_items?: OrderItem[];
}

const STATUS_STEPS: { key: OrderStatus; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { key: "confirmed",  label: "Order Confirmed",       sublabel: "Payment received",           icon: <CheckCircle2 className="w-5 h-5" /> },
  { key: "accepted",   label: "Order Accepted",         sublabel: "Staff is preparing your ticket", icon: <Package className="w-5 h-5" /> },
  { key: "preparing",  label: "Being Prepared",         sublabel: "Kitchen is on it!",          icon: <ChefHat className="w-5 h-5" /> },
  { key: "ready",      label: "Ready for Delivery",     sublabel: "Out for delivery to your seat", icon: <Truck className="w-5 h-5" /> },
  { key: "delivered",  label: "Delivered!",             sublabel: "Enjoy your meal 🎬",         icon: <CheckCircle2 className="w-5 h-5" /> },
];

const STATUS_ORDER: OrderStatus[] = ["confirmed", "accepted", "preparing", "ready", "delivered"];

function getStepState(stepKey: OrderStatus, currentStatus: OrderStatus): "done" | "active" | "upcoming" {
  if (currentStatus === "cancelled") return "upcoming";
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "upcoming";
}

export function TrackOrderClient({ initialOrder }: { initialOrder: TrackingOrder }) {
  const [status, setStatus] = useState<OrderStatus>(initialOrder.status);
  const [justUpdated, setJustUpdated] = useState(false);

  const handleStatusChange = useCallback((newStatus: OrderStatus) => {
    setStatus((prev) => {
      if (newStatus !== prev) {
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 3000);
        return newStatus;
      }
      return prev;
    });
  }, []);

  // Realtime (fast path)
  useRealtimeOrder(initialOrder.id, handleStatusChange);

  // Polling fallback via our API — every 6s, no RLS issues
  useEffect(() => {
    const token = initialOrder.tracking_token;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/status?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) handleStatusChange(data.status as OrderStatus);
        }
      } catch { /* ignore */ }
    };

    // Poll immediately, then every 6s
    poll();
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [initialOrder.tracking_token, handleStatusChange]);

  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";

  return (
    <div className="min-h-screen text-white" style={{ background: "#080808" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{ background: "rgba(8,8,8,0.93)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/order"
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <UtensilsCrossed className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-display font-semibold text-sm text-white">Track Order</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {justUpdated && (
              <span className="text-[10px] text-emerald-400 animate-fade-in font-medium">Updated!</span>
            )}
            <span className="font-mono text-[10px] text-white/25">#{shortOrderId(initialOrder.id)}</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">

        {/* Status Hero */}
        {isCancelled ? (
          <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-red-400">Order Cancelled</h1>
              <p className="text-sm text-white/40 mt-1">Your order was cancelled. Please contact staff for assistance.</p>
            </div>
          </div>
        ) : isDelivered ? (
          <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto animate-gold-pulse">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-emerald-400">Delivered!</h1>
              <p className="text-sm text-white/40 mt-1">Enjoy your meal! 🎬</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center space-y-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400/70 font-medium tracking-wider uppercase">Live Tracking</span>
            </div>
            <h1 className="font-display font-bold text-xl text-white">
              {STATUS_STEPS.find(s => s.key === status)?.label ?? "Processing…"}
            </h1>
            <p className="text-sm text-white/40">
              {STATUS_STEPS.find(s => s.key === status)?.sublabel}
            </p>
          </div>
        )}

        {/* Progress Timeline */}
        {!isCancelled && (
          <div className="rounded-2xl p-5 space-y-0" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/25 mb-4">Order Progress</p>
            {STATUS_STEPS.map((step, idx) => {
              const state = getStepState(step.key, status);
              const isLast = idx === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      state === "done"    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                      : state === "active" ? "bg-amber-500/20 border border-amber-500/50 text-amber-400 animate-gold-pulse"
                      : "bg-white/[0.04] border border-white/[0.08] text-white/20"
                    }`}>
                      {state === "done" ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[24px] rounded-full transition-all duration-500 ${
                        state === "done" ? "bg-emerald-500/30" : "bg-white/[0.06]"
                      }`} />
                    )}
                  </div>

                  {/* Text */}
                  <div className="pb-5 flex-1 min-w-0">
                    <p className={`font-semibold text-sm leading-tight ${
                      state === "done" ? "text-emerald-400"
                      : state === "active" ? "text-white"
                      : "text-white/25"
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      state === "active" ? "text-white/50" : "text-white/20"
                    }`}>
                      {step.sublabel}
                    </p>
                  </div>

                  {state === "active" && (
                    <div className="flex items-start pt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400/60 animate-spin" style={{ animationDuration: "3s" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Delivery info */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-white/30">Delivering to</p>
            <p className="font-semibold text-white">{initialOrder.customer_name}</p>
            <p className="text-sm text-amber-400 font-medium">
              {initialOrder.auditoriums?.name} · Seat {initialOrder.seat_number}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/25">Items Ordered</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {initialOrder.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <span className="text-white/70">{item.product_name}</span>
                  <span className="text-white/30 ml-2">× {item.quantity}</span>
                  {item.selected_customizations?.map((c, i) => (
                    <p key={i} className="text-[11px] text-amber-400/60 mt-0.5">+ {c.name}</p>
                  ))}
                </div>
                <span className="text-white/40">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex justify-between text-xs text-white/30">
              <span>Subtotal</span>
              <span>{formatPrice(initialOrder.subtotal_amount)}</span>
            </div>
            {initialOrder.gst_amount > 0 && (
              <div className="flex justify-between text-xs text-white/30">
                <span>GST & Taxes</span>
                <span>{formatPrice(initialOrder.gst_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-bold text-base pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-white">Total Paid</span>
              <span className="text-amber-400">{formatPrice(initialOrder.total_amount)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/20">
          Ordered at {new Date(initialOrder.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
