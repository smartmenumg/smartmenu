import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

let done = false;

/**
 * One-time bootstrapper: enables Supabase Realtime on the orders table.
 * Called from the admin dashboard on first load.
 */
export async function POST() {
  if (done) return NextResponse.json({ ok: true, cached: true });

  try {
    const admin = await createAdminClient();

    // Use raw SQL via RPC or Postgres function — supabase-js doesn't expose DDL directly
    // We'll call the pg_catalog to check if already set, then set REPLICA IDENTITY FULL
    await admin.rpc("enable_orders_realtime" as never);
    done = true;
    return NextResponse.json({ ok: true });
  } catch {
    // Silently fail — the polling fallback handles it
    return NextResponse.json({ ok: false });
  }
}
