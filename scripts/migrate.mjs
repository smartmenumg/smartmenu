#!/usr/bin/env node
/**
 * Migration workflow helper
 * ─────────────────────────
 * Usage:
 *   node scripts/migrate.mjs dev    → applies pending migrations to DEV project
 *   node scripts/migrate.mjs prod   → applies pending migrations to PROD project
 *
 * Requires:
 *   SUPABASE_PROJECT_ID in .env.local (dev)
 *   SUPABASE_PROJECT_ID_PROD in Vercel env (prod — set manually, never in git)
 *
 * Workflow:
 *   1. Write migration SQL in supabase/migrations/
 *   2. Run: node scripts/migrate.mjs dev
 *   3. Test locally
 *   4. Commit migration file to git
 *   5. Run: node scripts/migrate.mjs prod (on CI/CD or manually)
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const target = process.argv[2];
if (!target || !["dev", "prod"].includes(target)) {
  console.error("Usage: node scripts/migrate.mjs [dev|prod]");
  process.exit(1);
}

// Load env
let projectId;
if (target === "dev") {
  // Read from .env.local
  try {
    const envLocal = readFileSync(resolve(root, ".env.local"), "utf-8");
    const match = envLocal.match(/^SUPABASE_PROJECT_ID=(.+)$/m);
    projectId = match?.[1]?.trim();
  } catch {
    console.error("Cannot read .env.local — is it created?");
    process.exit(1);
  }
} else {
  // Production — must be set in shell env (Vercel CI or manually)
  projectId = process.env.SUPABASE_PROJECT_ID_PROD;
}

if (!projectId) {
  console.error(`SUPABASE_PROJECT_ID${target === "prod" ? "_PROD" : ""} is not set.`);
  process.exit(1);
}

if (target === "prod") {
  console.log("\n⚠️  You are about to apply migrations to PRODUCTION.");
  console.log(`   Project: ${projectId}`);
  console.log("   Press Ctrl+C within 5 seconds to abort...\n");
  await new Promise((r) => setTimeout(r, 5000));
}

console.log(`\n→ Linking to ${target.toUpperCase()} project: ${projectId}`);
execSync(`npx supabase link --project-ref ${projectId}`, {
  cwd: root,
  stdio: "inherit",
});

console.log(`\n→ Pushing migrations to ${target.toUpperCase()}...`);
execSync("npx supabase db push", { cwd: root, stdio: "inherit" });

console.log(`\n✅ Migrations applied to ${target.toUpperCase()} successfully.`);
