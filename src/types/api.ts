/**
 * API response shapes — shared between API routes and client fetch calls.
 * All API routes return one of these shapes.
 */

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Checkout types ─────────────────────────────────────────────────────────────

export interface ValidatedCartItem {
  productId: string;
  productName: string;
  unitPrice: number; // paise
  quantity: number;
  subtotal: number;  // paise
}

export interface CheckoutValidationResult {
  validatedItems: ValidatedCartItem[];
  totalAmount: number; // paise
  theatreId: string;
}

export interface CreateOrderRequest {
  sessionId: string;
  customerName: string;
  mobile: string;
  auditoriumId: string;
  seatNumber: string;
  cartItems: Array<{ productId: string; quantity: number }>;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  razorpayKeyId: string; // public key only
  trackingToken: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  trackingToken: string;
  orderStatus: string;
}

// ─── Cart types (localStorage) ─────────────────────────────────────────────────

export interface LocalCartItem {
  productId: string;
  quantity: number;
}

export interface LocalCart {
  sessionId: string;
  items: LocalCartItem[];
  updatedAt: number; // Unix timestamp ms
}
