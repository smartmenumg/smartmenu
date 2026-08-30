"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Package, UtensilsCrossed } from "lucide-react";



export default function MyOrdersPage() {
  const [tokens, setTokens] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("order_history") ?? "[]") as string[];
      // eslint-disable-next-line
      setTokens(stored);
    } catch {
      // eslint-disable-next-line
      setTokens([]);
    }
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: "#080808" }}>
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{ background: "rgba(8,8,8,0.93)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/order" className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <Package className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-display font-semibold text-sm text-white">My Orders</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-white/15" />
            </div>
            <p className="text-white/30 text-sm text-center">
              No past orders found on this device.<br />Orders placed from this browser will appear here.
            </p>
            <Link href="/order" className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold">
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/25 tracking-widest uppercase font-semibold mb-4">
              {tokens.length} order{tokens.length !== 1 ? "s" : ""} on this device
            </p>
            {tokens.map((token, idx) => (
              <Link
                key={token}
                href={`/track/${token}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all"
                style={{ background: "#0f0f0f" }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">Order #{idx + 1}</p>
                  <p className="text-xs text-white/30 font-mono mt-0.5">{token.slice(0, 16)}…</p>
                </div>
                <span className="text-xs text-amber-400 font-semibold">Track →</span>
              </Link>
            ))}
            <button
              onClick={() => {
                localStorage.removeItem("order_history");
                setTokens([]);
              }}
              className="w-full py-2.5 text-xs text-white/25 hover:text-red-400 transition-colors mt-2"
            >
              Clear order history
            </button>
          </>
        )}
      </div>
    </div>
  );
}
