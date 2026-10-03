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
      cf_payment_id: razorpayPaymentId, // Storing razorpay payment ID here
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

// Handler for Cashfree Return URL browser redirect (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.redirect(new URL("/order?error=missing_order_id", req.url));
  }

  // For GET (webhook/redirect), we don't have signature in url params, so it might fail if we rely on it.
  // Razorpay usually uses frontend checkout, so GET redirect might not be used the same way as Cashfree.
  // If it is hit, it will fail signature check unless provided in search params.
  const razorpayPaymentId = searchParams.get("razorpay_payment_id") || undefined;
  const razorpayOrderId = searchParams.get("razorpay_order_id") || undefined;
  const razorpaySignature = searchParams.get("razorpay_signature") || undefined;

  const result = await verifyAndConfirm(orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (result.trackingToken) {
    return NextResponse.redirect(
      new URL(`/track/${result.trackingToken}?payment=${result.success ? "success" : "failed"}`, appUrl)
    );
  }

  return NextResponse.redirect(new URL("/order?error=payment_failed", appUrl));
}
