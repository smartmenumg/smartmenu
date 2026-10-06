import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCashfreePayment } from "@/lib/payments/cashfree";

async function verifyAndConfirm(orderId: string) {
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

  // If already confirmed
  if (order.status !== "pending_payment") {
    return { success: true, trackingToken: order.tracking_token, alreadyProcessed: true };
  }

  // 2. Fetch from payments table to get gateway_order_id
  const { data: payment } = await (adminClient as any)
    .from("payments")
    .select("gateway_order_id")
    .eq("order_id", orderId)
    .single();

  if (!payment || !payment.gateway_order_id) {
     return { error: "Payment record not found.", status: 404 };
  }

  // 3. Verify Cashfree Payment via API
  const isValid = await verifyCashfreePayment(payment.gateway_order_id);

  if (!isValid) {
    return {
      error: "Payment has not been completed successfully.",
      trackingToken: order.tracking_token,
      status: 400,
    };
  }

  // 3. Mark payment as paid
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
    .update({
      status: "confirmed",
    })
    .eq("id", orderId);

  return { success: true, trackingToken: order.tracking_token };
}

// Handler for Client-side verification POST call
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
