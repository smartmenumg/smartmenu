import { Cashfree } from "cashfree-pg";

export interface CreateCashfreeOrderParams {
  orderId: string;
  amountInr: number;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  vendorId?: string; // Add this when you're ready for Easy Split!
}

export function initCashfree() {
  // @ts-ignore
  Cashfree.XClientId = process.env.CASHFREE_APP_ID || "";
  // @ts-ignore
  Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "";
  // @ts-ignore
  Cashfree.XEnvironment = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "PRODUCTION" 
    ? Cashfree.Environment.PRODUCTION 
    : Cashfree.Environment.SANDBOX;
}

export async function createCashfreeOrder(params: CreateCashfreeOrderParams) {
  initCashfree();

  try {
    const request: any = {
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
      }
    };

    // If using Easy Split, you would add vendor_splits here:
    // if (params.vendorId) {
    //   request.order_splits = [
    //     { vendor_id: params.vendorId, percentage: 100 }
    //   ];
    // }

    // @ts-ignore
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    return { data: response.data };
  } catch (err: any) {
    console.error("Cashfree order creation error:", err.response?.data || err);
    return { error: err.response?.data?.message || err.message || "Failed to create Cashfree order." };
  }
}

export async function verifyCashfreePayment(orderId: string) {
  initCashfree();
  try {
    // @ts-ignore
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    // Filter for successful payments
    const successfulPayment = response.data.filter((p: any) => p.payment_status === "SUCCESS");
    if (successfulPayment.length > 0) {
      return true;
    }
    return false;
  } catch (err) {
    console.error("Cashfree payment verification error:", err);
    return false;
  }
}
