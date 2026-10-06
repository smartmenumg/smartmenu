import { Cashfree, CFEnvironment } from "cashfree-pg";

export interface CreateCashfreeOrderParams {
  orderId: string;
  amountInr: number;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  vendorId?: string; // Add this when you're ready for Easy Split!
}

let initialized = false;

function initCashfree() {
  if (initialized) return;

  // @ts-ignore - SDK uses static assignment pattern
  Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
  // @ts-ignore
  Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
  // @ts-ignore
  Cashfree.XEnvironment =
    process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "PRODUCTION"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX;

  initialized = true;
}

export async function createCashfreeOrder(params: CreateCashfreeOrderParams) {
  initCashfree();

  const request = {
    order_amount: params.amountInr,
    order_currency: "INR",
    order_id: params.orderId,
    customer_details: {
      customer_id: `cust_${params.orderId}`,
      customer_phone: params.customerPhone || "9999999999",
      customer_email: params.customerEmail || "customer@example.com",
      customer_name: params.customerName || "Customer",
    },
    order_meta: {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/verify?order_id=${params.orderId}&session_id={payment_session_id}`,
    },
    // If using Easy Split, uncomment and pass vendorId from createOrder call:
    // ...(params.vendorId && {
    //   order_splits: [{ vendor_id: params.vendorId, percentage: 100 }],
    // }),
  };

  try {
    // @ts-ignore - static method on Cashfree class
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    return { data: response.data };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to create Cashfree order.";
    console.error("Cashfree order creation error:", err?.response?.data || err);
    return { error: msg };
  }
}

export async function verifyCashfreePayment(cfOrderId: string): Promise<boolean> {
  initCashfree();
  try {
    // @ts-ignore - static method on Cashfree class
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", cfOrderId);
    const payments: any[] = response?.data ?? [];
    return payments.some((p) => p.payment_status === "SUCCESS");
  } catch (err) {
    console.error("Cashfree payment verification error:", err);
    return false;
  }
}
