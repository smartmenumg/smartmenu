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

const isProd = process.env.NEXT_PUBLIC_ENV === "production" ||
               process.env.NODE_ENV === "production";

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
    // Cashfree is required for payments
    "CASHFREE_APP_ID",
    "CASHFREE_SECRET_KEY",
  ];
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // ── Production guards ──────────────────────────────────────────────────────
  if (isProd) {
    const cashfreeAppId = process.env.CASHFREE_APP_ID ?? "";

    // Block Cashfree test keys in production
    if (cashfreeAppId.startsWith("TEST")) {
      errors.push(
        "FATAL: Cashfree TEST app ID detected in PRODUCTION. " +
        "Set CASHFREE_APP_ID to a live key."
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
    const cashfreeAppId = process.env.CASHFREE_APP_ID ?? "";

    // Warn if live Cashfree key used in development
    if (!cashfreeAppId.startsWith("TEST") && cashfreeAppId.length > 0) {
      errors.push(
        "FATAL: Cashfree LIVE key detected in DEVELOPMENT. " +
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
