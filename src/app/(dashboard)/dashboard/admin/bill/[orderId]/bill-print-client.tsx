"use client";

import { useEffect } from "react";
import { formatPrice, shortOrderId } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  gst_rate_percent: number;
  gst_amount: number;
  selected_customizations?: { name: string; price: number }[];
}

interface Order {
  id: string;
  customer_name: string;
  mobile: string;
  seat_number: string;
  subtotal_amount: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  auditoriums?: { name: string };
  order_items?: OrderItem[];
  payments?: { status: string; gateway?: string }[];
}

interface Theatre {
  name: string;
  address?: string;
}

export function BillPrintClient({ order, theatre }: { order: Order; theatre: Theatre }) {
  useEffect(() => {
    // Auto-print on load
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const printedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const orderedAt = new Date(order.created_at).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      {/* Screen controls (hidden on print) */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-black border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <span className="text-white/20">|</span>
          <span className="text-sm text-white/40">Bill #{shortOrderId(order.id)}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors"
        >
          🖨️ Print Bill
        </button>
      </div>

      {/* Bill Content */}
      <div className="bill-page">
        {/* Header */}
        <div className="bill-header">
          <h1 className="bill-theatre">{theatre?.name || "CineBites"}</h1>
          {theatre?.address && <p className="bill-address">{theatre.address}</p>}
          <div className="bill-divider" />
        </div>

        {/* Bill title */}
        <div className="bill-title-row">
          <span className="bill-title">TAX INVOICE / KOT</span>
        </div>

        {/* Order meta */}
        <table className="bill-meta-table">
          <tbody>
            <tr>
              <td className="bill-meta-label">Order No.</td>
              <td className="bill-meta-value">#{shortOrderId(order.id)}</td>
            </tr>
            <tr>
              <td className="bill-meta-label">Date</td>
              <td className="bill-meta-value">{orderedAt}</td>
            </tr>
            <tr>
              <td className="bill-meta-label">Customer</td>
              <td className="bill-meta-value">{order.customer_name}</td>
            </tr>
            <tr>
              <td className="bill-meta-label">Mobile</td>
              <td className="bill-meta-value">{order.mobile}</td>
            </tr>
            <tr>
              <td className="bill-meta-label">Screen / Seat</td>
              <td className="bill-meta-value">
                {order.auditoriums?.name} — Seat {order.seat_number}
              </td>
            </tr>
            <tr>
              <td className="bill-meta-label">Payment</td>
              <td className="bill-meta-value capitalize">
                {order.payments?.[0]?.status === "paid" ? "✓ Paid (Cashfree)" : "Pending"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="bill-divider" />

        {/* Items table */}
        <table className="bill-items-table">
          <thead>
            <tr>
              <th className="bill-th bill-th-item">Item</th>
              <th className="bill-th bill-th-qty">Qty</th>
              <th className="bill-th bill-th-rate">Rate</th>
              <th className="bill-th bill-th-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item, idx) => (
              <>
                <tr key={item.id}>
                  <td className="bill-td bill-td-item">{item.product_name}</td>
                  <td className="bill-td bill-td-center">{item.quantity}</td>
                  <td className="bill-td bill-td-center">{formatPrice(item.unit_price)}</td>
                  <td className="bill-td bill-td-right">{formatPrice(item.subtotal)}</td>
                </tr>
                {item.selected_customizations?.map((c, ci) => (
                  <tr key={`${idx}-c${ci}`} className="bill-customization-row">
                    <td className="bill-td-customization" colSpan={2}>+ {c.name}</td>
                    <td className="bill-td bill-td-center">{formatPrice(c.price)}</td>
                    <td className="bill-td bill-td-right">{formatPrice(c.price * item.quantity)}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>

        <div className="bill-divider" />

        {/* Totals */}
        <table className="bill-totals-table">
          <tbody>
            <tr>
              <td className="bill-total-label">Subtotal</td>
              <td className="bill-total-value">{formatPrice(order.subtotal_amount)}</td>
            </tr>
            <tr>
              <td className="bill-total-label">GST / Taxes</td>
              <td className="bill-total-value">{formatPrice(order.gst_amount)}</td>
            </tr>
            <tr className="bill-grand-row">
              <td className="bill-grand-label">TOTAL</td>
              <td className="bill-grand-value">{formatPrice(order.total_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="bill-divider" />

        <p className="bill-footer">Thank you for your order!</p>
        <p className="bill-footer-sub">Printed: {printedAt}</p>
      </div>

      <style>{`
        @media screen {
          body { background: #111; margin: 0; padding: 0; }
          .bill-page {
            background: #fff;
            color: #111;
            max-width: 340px;
            margin: 80px auto 40px;
            padding: 24px;
            border-radius: 12px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
          }
        }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          .bill-page {
            background: #fff;
            color: #000;
            max-width: 80mm;
            margin: 0 auto;
            padding: 4mm;
            font-family: 'Courier New', monospace;
            font-size: 10px;
          }
          @page { size: 80mm auto; margin: 2mm; }
        }

        .bill-header { text-align: center; margin-bottom: 8px; }
        .bill-theatre { font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 0 0 4px; }
        .bill-address { font-size: 10px; color: #555; margin: 0; }
        .bill-divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
        .bill-title-row { text-align: center; margin-bottom: 8px; }
        .bill-title { font-weight: bold; font-size: 11px; letter-spacing: 2px; }

        .bill-meta-table { width: 100%; margin-bottom: 4px; border-collapse: collapse; }
        .bill-meta-label { color: #555; width: 40%; padding: 1px 0; }
        .bill-meta-value { font-weight: 600; padding: 1px 0; }

        .bill-items-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .bill-th { font-weight: bold; border-bottom: 1px solid #ccc; padding: 3px 0; }
        .bill-th-item { text-align: left; width: 50%; }
        .bill-th-qty, .bill-th-rate { text-align: center; width: 15%; }
        .bill-th-amt { text-align: right; width: 20%; }
        .bill-td { padding: 2px 0; }
        .bill-td-item { text-align: left; }
        .bill-td-center { text-align: center; }
        .bill-td-right { text-align: right; }
        .bill-customization-row { color: #777; font-size: 10px; }
        .bill-td-customization { padding-left: 8px; }

        .bill-totals-table { width: 100%; border-collapse: collapse; }
        .bill-total-label { color: #555; padding: 2px 0; }
        .bill-total-value { text-align: right; padding: 2px 0; }
        .bill-grand-row { font-weight: bold; font-size: 14px; border-top: 1px solid #333; }
        .bill-grand-label { padding-top: 4px; }
        .bill-grand-value { text-align: right; padding-top: 4px; }

        .bill-footer { text-align: center; margin-top: 8px; font-weight: bold; }
        .bill-footer-sub { text-align: center; color: #999; font-size: 9px; margin: 2px 0 0; }
      `}</style>
    </>
  );
}
