import Razorpay from "razorpay";
import crypto from "crypto";

export interface CreateRazorpayOrderParams {
  orderId: string;
  amountPaise: number;
}

export async function createRazorpayOrder(params: CreateRazorpayOrderParams) {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return { error: "Razorpay API credentials are not configured in environment." };
  }

  const instance = new Razorpay({
    key_id,
    key_secret,
  });

  const options = {
    amount: params.amountPaise,
    currency: "INR",
    receipt: params.orderId.substring(0, 40),
  };

  try {
    const order = await instance.orders.create(options);
    return { data: order };
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return { error: err.error?.description || err.message || "Failed to create Razorpay order." };
  }
}

export function verifyRazorpaySignature(
  order_id: string,
  payment_id: string,
  signature: string
): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return false;

  const body = order_id + "|" + payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
}
