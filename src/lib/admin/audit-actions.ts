"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import type { AuditLog } from "@/types/database";

export interface AuditLogWithUser extends AuditLog {
  profiles: { full_name: string | null } | null;
}

export async function getAuditLogs(): Promise<AuditLogWithUser[]> {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return [];
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  // Fetch logs
  const { data: logs, error: logsError } = await adminAny
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (logsError) {
    console.error("getAuditLogs error:", logsError);
    return [];
  }

  if (!logs || logs.length === 0) return [];

  // Fetch unique profiles for these logs
  const userIds = [...new Set((logs as AuditLog[]).map(l => l.user_id).filter(Boolean))] as string[];
  
  let profilesMap: Record<string, { full_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await adminAny
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
      
    if (profiles) {
      profilesMap = (profiles as { id: string; full_name: string | null }[]).reduce((acc, p) => {
        acc[p.id] = { full_name: p.full_name };
        return acc;
      }, {} as Record<string, { full_name: string | null }>);
    }
  }

  // Map them together
  const enhancedLogs = (logs as AuditLog[]).map(log => ({
    ...log,
    profiles: log.user_id ? profilesMap[log.user_id] || null : null
  }));

  return enhancedLogs as unknown as AuditLogWithUser[];
}
