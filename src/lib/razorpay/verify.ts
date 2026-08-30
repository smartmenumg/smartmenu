import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Razorpay payment signature.
 *
 * The signature is: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 *
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): boolean {
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(razorpaySignature, "hex");

  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

/**
 * Verify Razorpay webhook signature.
 *
 * The signature is: HMAC-SHA256(raw_body, webhook_secret)
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  razorpaySignature: string,
  webhookSecret: string
): boolean {
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");

  let received: Buffer;
  try {
    received = Buffer.from(razorpaySignature, "hex");
  } catch {
    return false;
  }

  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

/** Razorpay amount is in paise (integer). Validate it matches our server record. */
export function assertAmountMatch(
  serverAmountPaise: number,
  razorpayAmountPaise: number
): void {
  if (serverAmountPaise !== razorpayAmountPaise) {
    throw new Error(
      `Amount mismatch: server=${serverAmountPaise} razorpay=${razorpayAmountPaise}`
    );
  }
}
