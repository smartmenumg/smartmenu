/**
 * Cashfree Payment Gateway - Direct REST API integration
 * Using fetch instead of the cashfree-pg SDK to avoid Next.js bundling issues.
 */

const CASHFREE_BASE_URL =
  process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const API_VERSION = "2023-08-01";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": process.env.CASHFREE_APP_ID!,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
  };
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  amountInr: number;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  vendorId?: string; // For Easy Split when ready
}

export async function createCashfreeOrder(params: CreateCashfreeOrderParams) {
  const body: Record<string, unknown> = {
    order_id: params.orderId,
    order_amount: params.amountInr,
    order_currency: "INR",
    customer_details: {
      customer_id: `cust_${params.orderId}`,
      customer_phone: params.customerPhone || "9999999999",
      customer_email: params.customerEmail || "customer@example.com",
      customer_name: params.customerName || "Customer",
    },
    order_meta: {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/verify?order_id=${params.orderId}&session_id={payment_session_id}`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com"}/api/webhooks/cashfree`,
    },
    // Easy Split - uncomment when vendorId is ready:
    // ...(params.vendorId && {
    //   order_splits: [{ vendor_id: params.vendorId, percentage: 100 }],
    // }),
  };

  try {
    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cashfree order creation failed:", data);
      return { error: data?.message || "Failed to create Cashfree order." };
    }

    return { data };
  } catch (err: any) {
    console.error("Cashfree order creation error:", err);
    return { error: err?.message || "Failed to create Cashfree order." };
  }
}

export async function verifyCashfreePayment(cfOrderId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${CASHFREE_BASE_URL}/orders/${cfOrderId}/payments`,
      { headers: getHeaders() }
    );

    if (!res.ok) return false;

    const payments: any[] = await res.json();
    return Array.isArray(payments) && payments.some((p) => p.payment_status === "SUCCESS");
  } catch (err) {
    console.error("Cashfree payment verification error:", err);
    return false;
  }
}
