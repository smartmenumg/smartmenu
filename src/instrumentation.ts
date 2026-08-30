/**
 * Next.js Instrumentation — runs once on server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Used to:
 *  1. Validate environment configuration (fail fast)
 *  2. Initialize Sentry (when configured)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("@/lib/env/validate");
    validateEnvironment();
  }
}
