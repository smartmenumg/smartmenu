import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise (integer) to INR string: 10050 → "₹100.50" */
export function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** Convert rupees (display) to paise (storage): 100.50 → 10050 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise (storage) to rupees (display): 10050 → 100.50 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Generate a short human-readable order number from a UUID */
export function shortOrderId(uuid: string): string {
  return uuid.replace(/-/g, "").toUpperCase().slice(0, 8);
}

/** Check if a guest cart session has expired (24-hour TTL) */
export const CART_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isCartExpired(updatedAtMs: number): boolean {
  return Date.now() - updatedAtMs > CART_TTL_MS;
}

/** Safe JSON parse — returns null on failure instead of throwing */
export function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
