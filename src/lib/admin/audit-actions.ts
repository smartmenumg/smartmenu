"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getEffectiveTheatreId } from "@/lib/theatre-context";
import type { AuditLog } from "@/types/database";

export interface AuditLogWithUser extends AuditLog {
  profiles: { full_name: string | null; theatre_id?: string } | null;
}

export async function getAuditLogs(): Promise<AuditLogWithUser[]> {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "super_admin") {
    return [];
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const effectiveTheatreId = await getEffectiveTheatreId();

  // Fetch logs (system-wide)
  const logsQuery = adminAny
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    console.error("getAuditLogs error:", logsError);
    return [];
  }

  if (!logs || logs.length === 0) return [];

  // Fetch unique profiles for these logs
  const userIds = [...new Set((logs as AuditLog[]).map(l => l.user_id).filter(Boolean))] as string[];
  
  let profilesMap: Record<string, { full_name: string | null; theatre_id?: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await adminAny
      .from("profiles")
      .select("id, full_name, theatre_id")
      .in("id", userIds);
      
    if (profiles) {
      profilesMap = (profiles as { id: string; full_name: string | null; theatre_id: string }[]).reduce((acc, p) => {
        acc[p.id] = { full_name: p.full_name, theatre_id: p.theatre_id };
        return acc;
      }, {} as Record<string, { full_name: string | null; theatre_id: string }>);
    }
  }

  let enhancedLogs = (logs as AuditLog[]).map(log => ({
    ...log,
    profiles: log.user_id ? profilesMap[log.user_id] || null : null
  }));

  if (effectiveTheatreId) {
    enhancedLogs = enhancedLogs.filter(log => {
      // Filter by the user's theatre if available. 
      // This is a best-effort filter since audit_logs doesn't store theatre_id directly.
      const userTheatreId = log.user_id ? profilesMap[log.user_id]?.theatre_id : null;
      return userTheatreId === effectiveTheatreId;
    });
  }

  return enhancedLogs as unknown as AuditLogWithUser[];
}
