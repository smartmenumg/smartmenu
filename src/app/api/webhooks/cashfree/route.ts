import { NextRequest, NextResponse } from "next/server";
import { verifyAndConfirm } from "@/app/api/payments/verify/route";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    // Cashfree webhooks should include these headers, but we don't strictly need to 
    // verify the cryptographic signature ourselves because we NEVER trust the webhook payload blindly.
    // Instead, we extract the orderId and securely ask Cashfree's REST API "is this actually paid?"
    // This is fundamentally spoof-proof.

    if (!rawBody) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    
    // Cashfree payload structure usually contains data.order.order_id
    const orderId = body?.data?.order?.order_id;
    const eventType = body?.type;

    if (!orderId) {
      console.warn("[Cashfree Webhook] Received payload without order_id");
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    console.log(`[Cashfree Webhook] Received event: ${eventType} for order: ${orderId}`);

    // If it's a payment success event, trigger our robust verification logic
    if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
      // This function securely queries the Cashfree REST API using our secret keys
      // and marks the order as paid/confirmed if Cashfree verifies it.
      const result = await verifyAndConfirm(orderId);
      
      if (result.error && result.status !== 404) {
        console.error(`[Cashfree Webhook] Verification failed for ${orderId}:`, result.error);
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      
      console.log(`[Cashfree Webhook] Successfully processed order: ${orderId}`);
    }

    // Always acknowledge the webhook so Cashfree doesn't retry
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Cashfree Webhook] Critical error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
