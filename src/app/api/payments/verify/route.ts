import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCashfreePayment } from "@/lib/payments/cashfree";

export async function verifyAndConfirm(orderId: string) {
  const adminClient = await createAdminClient();

  // 1. Fetch order details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (adminClient as any)
    .from("orders")
    .select("id, tracking_token, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { error: "Order not found.", status: 404 };
  }

  // If already confirmed, just return success (idempotent)
  if (order.status !== "pending_payment") {
    return { success: true, trackingToken: order.tracking_token, alreadyProcessed: true };
  }

  // 2. Verify payment directly with Cashfree using our orderId
  // Cashfree's API accepts the same order_id we passed when creating the order.
  // No need to look up cf_order_id from our DB.
  const isValid = await verifyCashfreePayment(orderId);

  if (!isValid) {
    return {
      error: "Payment has not been completed successfully.",
      trackingToken: order.tracking_token,
      status: 400,
    };
  }

  // 3. Mark payment record as paid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);

  // 4. Mark order as confirmed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", orderId);

  return { success: true, trackingToken: order.tracking_token };
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    }

    const result = await verifyAndConfirm(orderId);
    if (result.error) {
      return NextResponse.json(result, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
