"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
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

  // Note: auth.users is not queryable via standard API in public schema,
  // but we can fetch profiles. Since the auth email isn't in profiles,
  // we will just return profiles as-is for the MVP (or fetch auth users via Admin API if needed).
  // For simplicity without exposing service_role keys to the client, we just fetch profiles.
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
    action: "account.updated", // or similar if we define role updated
    entityType: "profile",
    entityId: profileId,
    metadata: { role: newRole }
  });

  revalidatePath("/dashboard/super-admin/accounts");
  return {};
}
