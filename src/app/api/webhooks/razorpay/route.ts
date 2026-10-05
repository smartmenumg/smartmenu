import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Note: Webhook secret must be set in environment variables for validation to work.
    if (secret) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    
    console.log(`[Webhook] Received Razorpay event: ${event}`);

    // Here we just acknowledge the webhook to prevent Razorpay from retrying.
    // Order updates are already handled synchronously via the client verifying the signature.
    // In the future, this can act as a fallback for missed client-side updates.

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
