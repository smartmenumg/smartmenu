"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/schemas";
import type { UserRole } from "@/types/database";
import { logAudit } from "@/lib/audit/logger";

// ─── Sign In ─────────────────────────────────────────────────────────────────

export async function signIn(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  // Check profile is active
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, theatre_id")
    .eq("id", data.user.id)
    .single<{ role: UserRole; active: boolean; theatre_id: string }>();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { error: "Your account has been disabled. Contact your administrator." };
  }

  // Redirect based on role
  const roleRedirect: Record<UserRole, string> = {
    menu:        "/dashboard/menu",
    admin:       "/dashboard/admin",
    super_admin: "/dashboard/super-admin",
  };

  revalidatePath("/", "layout");
  redirect(roleRedirect[profile.role]);
}

// ─── Sign Out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

// ─── Get current session user + profile ──────────────────────────────────────

export async function getCurrentProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, full_name, theatre_id")
    .eq("id", user.id)
    .single<{
      role: UserRole;
      active: boolean;
      full_name: string | null;
      theatre_id: string;
    }>();

  if (!profile || !profile.active) return null;

  return { user, profile };
}

// ─── Create user (Super Admin only) ──────────────────────────────────────────

export async function createStaffUser(params: {
  email: string;
  password: string;
  role: "menu" | "admin";
  fullName: string;
  theatreId: string;
  createdBy: string;
}): Promise<{ error?: string; userId?: string }> {
  const adminClient = await createAdminClient();

  // Create auth user
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true, // auto-confirm for staff accounts
  });

  if (createError || !newUser.user) {
    return { error: createError?.message ?? "Failed to create user." };
  }

  // Create profile
  const profilePayload = {
    id: newUser.user.id,
    theatre_id: params.theatreId,
    role: params.role,
    full_name: params.fullName,
    active: true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await adminClient.from("profiles").insert(profilePayload as any);

  if (profileError) {
    // Rollback: delete the auth user
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return { error: "Failed to create user profile." };
  }

  await logAudit({
    userId: params.createdBy,
    action: "account.created",
    entityType: "profiles",
    entityId: newUser.user.id,
    metadata: { email: params.email, role: params.role },
  });

  return { userId: newUser.user.id };
}

// ─── Toggle user active status (Super Admin only) ────────────────────────────

export async function setUserActive(
  targetUserId: string,
  active: boolean,
  performedBy: string
): Promise<{ error?: string }> {
  const adminClient = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("profiles")
    .update({ active })
    .eq("id", targetUserId);

  if (error) return { error: "Failed to update account status." };

  await logAudit({
    userId: performedBy,
    action: active ? "account.enabled" : "account.disabled",
    entityType: "profiles",
    entityId: targetUserId,
    metadata: { active },
  });

  revalidatePath("/dashboard/super-admin");
  return {};
}
