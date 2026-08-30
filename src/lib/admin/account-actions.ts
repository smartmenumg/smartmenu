"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { createStaffUser } from "@/lib/auth/actions";
import { createUserSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit/logger";
import type { UserRole } from "@/types/database";

export interface ProfileWithEmail {
  id: string;
  role: UserRole;
  full_name: string | null;
  active: boolean;
  created_at: string;
  email?: string; 
}

export async function getProfiles(): Promise<ProfileWithEmail[]> {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return [];
  }

  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("theatre_id", session.profile.theatre_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProfiles error:", error);
    return [];
  }

  return (data || []) as ProfileWithEmail[];
}

export async function toggleProfileActive(profileId: string, currentStatus: boolean) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return { error: "Unauthorized" };
  }

  // Prevent self-deactivation
  if (profileId === session.user.id) {
    return { error: "You cannot deactivate your own account" };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("profiles")
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .eq("theatre_id", session.profile.theatre_id);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    userId: session.user.id,
    action: currentStatus ? "account.disabled" : "account.enabled",
    entityType: "profile",
    entityId: profileId,
  });

  revalidatePath("/dashboard/super-admin/accounts");
  return {};
}

export async function updateProfileRole(profileId: string, newRole: UserRole) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return { error: "Unauthorized" };
  }

  if (newRole === "super_admin") {
    return { error: "Super admin role cannot be assigned via the dashboard." };
  }

  // Prevent self-demotion
  if (profileId === session.user.id && newRole !== "super_admin") {
    return { error: "You cannot demote your own super admin role" };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .eq("theatre_id", session.profile.theatre_id);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    userId: session.user.id,
    action: "account.updated",
    entityType: "profile",
    entityId: profileId,
    metadata: { role: newRole }
  });

  revalidatePath("/dashboard/super-admin/accounts");
  return {};
}

/**
 * Server action: create a new staff account for this theatre.
 * Super admin only. Wraps createStaffUser + validates + revalidates UI.
 */
export async function createStaffAccount(params: {
  email: string;
  password: string;
  role: "menu" | "admin";
  full_name: string;
}): Promise<{ error?: string }> {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return { error: "Unauthorized" };
  }

  // Validate input
  const parsed = createUserSchema.safeParse({
    email: params.email,
    password: params.password,
    role: params.role,
    full_name: params.full_name,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await createStaffUser({
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    theatreId: session.profile.theatre_id,
    createdBy: session.user.id,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/super-admin/accounts");
  return {};
}
