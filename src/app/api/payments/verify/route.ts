import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCashfreeOrderPayments } from "@/lib/payments/cashfree";

async function verifyAndConfirm(orderId: string) {
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

  // 2. Derive the sanitised Cashfree order ID from our internal UUID
  // (we send UUID-without-hyphens to Cashfree as their order_id)
  const cfOrderId = orderId.replace(/-/g, "").slice(0, 45);

  // 3. Fetch payments for this order from Cashfree
  const cfRes = await getCashfreeOrderPayments(cfOrderId);
  if (cfRes.error || !cfRes.payments) {
    return { error: cfRes.error || "Failed to verify payments from Cashfree.", status: 400 };
  }

  const successPayment = cfRes.payments.find((p) => p.payment_status === "SUCCESS");

  if (!successPayment) {
    return {
      error: "Payment not completed or failed.",
      payments: cfRes.payments,
      trackingToken: order.tracking_token,
      status: 400,
    };
  }

  // 3. Mark payment as paid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("payments")
    .update({
      cf_payment_id: successPayment.cf_payment_id,
      status: "paid",
      paid_at: successPayment.payment_time || new Date().toISOString(),
      raw_response: successPayment,
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

// Handler for Cashfree Return URL browser redirect (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.redirect(new URL("/order?error=missing_order_id", req.url));
  }

  const result = await verifyAndConfirm(orderId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (result.trackingToken) {
    return NextResponse.redirect(
      new URL(`/track/${result.trackingToken}?payment=${result.success ? "success" : "failed"}`, appUrl)
    );
  }

  return NextResponse.redirect(new URL("/order?error=payment_failed", appUrl));
}
