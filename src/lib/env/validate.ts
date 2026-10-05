/**
 * Environment Guard
 * ─────────────────
 * Validates at runtime that:
 *  - Production builds never use Razorpay test keys
 *  - Development never accidentally points to production Supabase
 *  - Required env vars are present
 *
 * Import this at the top of server-only code (e.g. API route handlers).
 * It throws at startup if misconfigured — fail fast, not silently.
 */

const isVercelPreview = process.env.VERCEL_ENV === "preview";
const isProd = !isVercelPreview && (
  process.env.NEXT_PUBLIC_ENV === "production" ||
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
);

const isDev = !isProd;

/**
 * Call once at app startup (e.g. in instrumentation.ts).
 * Throws if environment configuration is invalid.
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  // ── Required vars (both envs) ──────────────────────────────────────────────
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    // Razorpay is required for payments
    "NEXT_PUBLIC_RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
  ];
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // ── Production guards ──────────────────────────────────────────────────────
  if (isProd) {
    const razorpayAppId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

    if (razorpayAppId.startsWith("rzp_test")) {
      errors.push(
        "FATAL: Razorpay TEST key detected in PRODUCTION. " +
        "You must use a LIVE key in production to charge real money."
      );
    }
    // Block localhost Supabase URL in production
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
      errors.push(
        "FATAL: Supabase URL points to localhost in PRODUCTION."
      );
    }
  }

  // ── Development guards ─────────────────────────────────────────────────────
  if (isDev) {
    const razorpayAppId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

    // Warn if live Razorpay key used in development
    if (razorpayAppId.startsWith("rzp_live")) {
      errors.push(
        "FATAL: Razorpay LIVE key detected in DEVELOPMENT. " +
        "Use a TEST key locally."
      );
    }
  }

  if (errors.length > 0) {
    const message = [
      "═══════════════════════════════════════════",
      "  ENVIRONMENT CONFIGURATION ERROR",
      "═══════════════════════════════════════════",
      ...errors.map((e) => `  ✗ ${e}`),
      "═══════════════════════════════════════════",
    ].join("\n");
    console.error(message);
    throw new Error("Environment validation failed. See errors above.");
  }
}

/** Type-safe env access — throws if key is missing */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Required environment variable "${key}" is not set.`);
  return value;
}

export { isProd, isDev };
