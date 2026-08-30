import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * ONE-TIME bootstrap endpoint to create the first super_admin account.
 *
 * SECURITY:
 *  - Requires a BOOTSTRAP_SECRET header that matches SUPABASE_SERVICE_ROLE_KEY
 *    (you already know this secret, so it's a sufficient guard for a one-time operation)
 *  - Automatically disabled if any super_admin already exists
 *  - Must be REMOVED or disabled after first use in production
 *
 * Usage (run once):
 *   curl -X POST http://localhost:3000/api/setup/bootstrap \
 *     -H "Content-Type: application/json" \
 *     -H "x-bootstrap-secret: YOUR_SERVICE_ROLE_KEY" \
 *     -d '{"email":"admin@example.com","password":"StrongP@ss1","fullName":"Super Admin"}'
 */

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  fullName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  // Verify bootstrap secret
  const secret = req.headers.get("x-bootstrap-secret");
  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Block if super_admin already exists
  const { count } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("role", "super_admin" as any);

  if (count && count > 0) {
    return Response.json(
      { success: false, error: "Super admin already exists. This endpoint is disabled." },
      { status: 409 }
    );
  }

  // Get the theatre
  const { data: theatre } = await adminClient
    .from("theatres")
    .select("id")
    .limit(1)
    .single<{ id: string }>();

  if (!theatre) {
    return Response.json(
      { success: false, error: "No theatre found. Run the migration first." },
      { status: 400 }
    );
  }

  // Create auth user
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    return Response.json(
      { success: false, error: createError?.message ?? "Failed to create user" },
      { status: 500 }
    );
  }

  // Create super_admin profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: newUser.user.id,
      theatre_id: theatre.id,
      role: "super_admin",
      full_name: parsed.data.fullName,
      active: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return Response.json({ success: false, error: "Failed to create profile" }, { status: 500 });
  }

  return Response.json({
    success: true,
    data: {
      message: "Super admin created. Remove or disable this endpoint now.",
      email: parsed.data.email,
      userId: newUser.user.id,
    },
  });
}
