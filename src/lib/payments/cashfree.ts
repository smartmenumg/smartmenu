/**
 * Cashfree Payments Helper (Sandbox & Production)
 * API Version: 2023-08-01
 */

const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderAmountRupees: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
  order_amount: number;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED";
  payment_amount: number;
  payment_currency: string;
  payment_method?: Record<string, unknown>;
  payment_time?: string;
  payment_message?: string;
}

export async function createCashfreeOrder(
  params: CreateCashfreeOrderParams
): Promise<{ data?: CashfreeOrderResponse; error?: string }> {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    return { error: "Cashfree API credentials are not configured in environment." };
  }

  try {
    // Cashfree order_id: alphanumeric only, max 45 chars
    const cfOrderId = params.orderId.replace(/-/g, "").slice(0, 45);
    // Cashfree requires 10-digit mobile only (no +91 prefix in sandbox)
    const phone = params.customerPhone.replace(/^\+91/, "").replace(/\D/g, "");

    const payload = {
      order_id: cfOrderId,
      order_amount: params.orderAmountRupees,
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${phone.slice(-6)}_${Date.now()}`,
        customer_name: params.customerName,
        customer_phone: phone,
        customer_email: params.customerEmail || "customer@cinebites.in",
      },
      order_meta: {
        return_url: params.returnUrl,
      },
      order_note: `SmartMenu ${cfOrderId.slice(0, 8)}`,
    };

    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2022-09-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cashfree order creation error:", data);
      return { error: data.message || "Failed to create Cashfree payment order." };
    }

    return {
      data: {
        cf_order_id: data.cf_order_id,
        order_id: cfOrderId, // our sanitised ID — used for payment lookups
        payment_session_id: data.payment_session_id,
        order_status: data.order_status,
        order_amount: data.order_amount,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error contacting Cashfree.";
    console.error("Cashfree API Exception:", err);
    return { error: message };
  }
}

/**
 * Fetch payments for a Cashfree order.
 * @param cfOrderId - the sanitised (no-hyphen) order ID sent to Cashfree
 */
export async function getCashfreeOrderPayments(
  cfOrderId: string
): Promise<{ payments?: CashfreePaymentEntity[]; error?: string }> {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    return { error: "Cashfree API credentials are not configured." };
  }

  // Sanitise just in case caller passes a raw UUID
  const safeId = cfOrderId.replace(/-/g, "").slice(0, 45);

  try {
    const res = await fetch(`${CASHFREE_BASE_URL}/orders/${safeId}/payments`, {
      method: "GET",
      headers: {
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2022-09-01",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cashfree payment fetch error:", data);
      return { error: data.message || "Failed to fetch payment status from Cashfree." };
    }

    return { payments: Array.isArray(data) ? data as CashfreePaymentEntity[] : [data] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error contacting Cashfree.";
    return { error: message };
  }
}
