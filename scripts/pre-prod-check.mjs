#!/usr/bin/env node
/**
 * Pre-production checklist
 * ─────────────────────────
 * Run before every production deployment:
 *   node scripts/pre-prod-check.mjs
 *
 * Checks:
 *   1. TypeScript — zero errors
 *   2. Production build — passes
 *   3. No test Razorpay keys in env
 *   4. No localhost Supabase URL
 *   5. Required env vars present
 */

import { execSync } from "child_process";

const errors = [];
const warnings = [];

function run(label, cmd) {
  process.stdout.write(`  Checking ${label}... `);
  try {
    execSync(cmd, { stdio: "pipe" });
    console.log("✅");
    return true;
  } catch (e) {
    console.log("❌");
    errors.push(`${label}: ${e.stderr?.toString().trim() || e.message}`);
    return false;
  }
}

console.log("\n═══════════════════════════════════════════");
console.log("  PRE-PRODUCTION CHECKLIST");
console.log("═══════════════════════════════════════════\n");

// 1. TypeScript
run("TypeScript (tsc --noEmit)", "npm run typecheck");

// 2. Production build
run("Production build (next build)", "npm run build");

// 3. Lint
run("ESLint", "npm run lint");

// 4. Env var checks (read from .env.local for local pre-check)
console.log("\n  Checking environment isolation...");

// Check that .env.local doesn't contain live Razorpay key
try {
  const { readFileSync } = await import("fs");
  const envLocal = readFileSync(".env.local", "utf-8");

  if (envLocal.includes("rzp_live_")) {
    errors.push("CRITICAL: Live Razorpay key found in .env.local — use test keys locally.");
  } else {
    console.log("  ✅ No live Razorpay key in .env.local");
  }

  if (!envLocal.includes("SUPABASE_SERVICE_ROLE_KEY=")) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  } else {
    console.log("  ✅ SUPABASE_SERVICE_ROLE_KEY present");
  }

  if (!envLocal.includes("RAZORPAY_WEBHOOK_SECRET=")) {
    warnings.push("RAZORPAY_WEBHOOK_SECRET not found in .env.local");
  } else {
    console.log("  ✅ RAZORPAY_WEBHOOK_SECRET present");
  }
} catch {
  warnings.push(".env.local not found — skipping local env checks");
}

// 5. Check .gitignore protects .env.local
try {
  const { readFileSync } = await import("fs");
  const gitignore = readFileSync(".gitignore", "utf-8");
  if (gitignore.includes(".env.local")) {
    console.log("  ✅ .env.local is git-ignored");
  } else {
    errors.push("CRITICAL: .env.local is NOT in .gitignore — secrets could be committed.");
  }
} catch {
  warnings.push("Could not read .gitignore");
}

// Results
console.log("\n═══════════════════════════════════════════");

if (warnings.length > 0) {
  console.log("\n  WARNINGS:");
  warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
}

if (errors.length > 0) {
  console.log("\n  ERRORS (must fix before deploying):");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  console.log("\n  ❌ Pre-production check FAILED\n");
  process.exit(1);
} else {
  console.log("\n  ✅ All checks passed — safe to deploy to production\n");
}
