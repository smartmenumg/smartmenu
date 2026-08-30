import { createAdminClient } from "@/lib/supabase/server";
import { UtensilsCrossed } from "lucide-react";
import { TrackOrderClient } from "./track-order-client";
import Link from "next/link";

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (client as any)
    .from("orders")
    .select(`
      id, tracking_token, customer_name, mobile, seat_number,
      subtotal_amount, gst_amount, total_amount,
      status, created_at,
      auditoriums (name),
      order_items (
        id, product_name, unit_price, quantity, subtotal,
        gst_amount, selected_customizations
      )
    `)
    .eq("tracking_token", token)
    .single();

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-white" style={{ background: "#080808" }}>
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-8 h-8 text-white/20" />
        </div>
        <h1 className="font-display text-xl font-bold text-white mb-2">Order Not Found</h1>
        <p className="text-white/40 text-sm">This tracking link is invalid or expired.</p>
        <Link href="/order" className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold btn-gold inline-block">
          Back to Menu
        </Link>
      </div>
    );
  }

  return <TrackOrderClient initialOrder={order} />;
}
