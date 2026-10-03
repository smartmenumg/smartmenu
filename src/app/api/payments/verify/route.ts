import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";

async function verifyAndConfirm(
  orderId: string,
  razorpayPaymentId?: string,
  razorpayOrderId?: string,
  razorpaySignature?: string
) {
  const adminClient = await createAdminClient();

  // 1. Fetch order details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (adminClient as any)
    .from("orders")
    .select("id, tracking_token, status, total_amount")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { error: "Order not found.", status: 404 };
  }

  // If already confirmed
  if (order.status !== "pending_payment") {
    return { success: true, trackingToken: order.tracking_token, alreadyProcessed: true };
  }

  // 2. Verify Razorpay Signature if provided
  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return { error: "Missing Razorpay verification parameters.", status: 400 };
  }

  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValid) {
    return {
      error: "Invalid payment signature.",
      trackingToken: order.tracking_token,
      status: 400,
    };
  }

  // 3. Mark payment as paid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("payments")
    .update({
      gateway_payment_id: razorpayPaymentId,
      status: "paid",
      paid_at: new Date().toISOString(),
      raw_response: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
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
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    }

    const result = await verifyAndConfirm(orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature);
    if (result.error) {
      return NextResponse.json(result, { status: result.status || 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// NOTE: GET handler removed — Razorpay uses client-side modal, not server-side redirects.
// All payment verification goes through the POST handler above.
