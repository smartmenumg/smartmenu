#!/usr/bin/env node
/**
 * apply-migration.mjs
 * ───────────────────
 * Applies a SQL migration file directly to the Supabase database
 * via the Management API, without requiring `supabase login`.
 *
 * Usage:
 *   node scripts/apply-migration.mjs <path-to-sql-file>
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * How it works:
 *   Reads the SQL file and executes it using the Supabase rpc endpoint
 *   with the service role key (bypasses RLS, full DB access).
 *
 * NOTE: For production, use the Supabase CLI with a PAT token or
 *       the Supabase dashboard SQL editor.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env.local manually
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(root, ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.error("Cannot read .env.local");
    process.exit(1);
  }
}

loadEnvLocal();

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sql = readFileSync(resolve(root, sqlFile), "utf-8");
const projectId = supabaseUrl.replace("https://", "").split(".")[0];

console.log(`\n→ Applying migration to project: ${projectId}`);
console.log(`  File: ${sqlFile}`);

// Split on statement boundaries for better error reporting
// Using the Supabase SQL execution endpoint
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  // Fallback: try the pg endpoint directly
  const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!pgResponse.ok) {
    const errText = await pgResponse.text();
    console.error("\n❌ Migration failed:", errText);
    console.error("\n💡 Run the SQL manually in the Supabase SQL Editor:");
    console.error(`   https://supabase.com/dashboard/project/${projectId}/sql/new`);
    process.exit(1);
  }
}

console.log("\n✅ Migration applied successfully.");
console.log("   Verify in Supabase dashboard → Table Editor");
