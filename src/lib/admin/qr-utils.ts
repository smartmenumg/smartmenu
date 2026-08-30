/**
 * qr-utils.ts — Pure utility functions for QR code signing/verification.
 * NOT a Server Action file — no "use server" directive.
 * Can be imported in both server components and server actions.
 */

import { createHmac } from "crypto";

/**
 * Signs a seat identifier so the URL cannot be tampered with client-side.
 * Uses the service role key as the HMAC secret — only ever available server-side.
 */
export function signSeat(audiId: string, seat: string): string {
  const key = process.env.QR_HMAC_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", key)
    .update(`${audiId}:${seat}`)
    .digest("base64url")
    .slice(0, 12);
}

/**
 * Verifies the HMAC signature on a QR scan.
 * Returns true only if the sig was generated server-side for exactly this audi+seat pair.
 */
export function verifySeatSignature(
  audiId: string,
  seat: string,
  sig: string
): boolean {
  if (!audiId || !seat || !sig) return false;
  return signSeat(audiId, seat) === sig;
}
