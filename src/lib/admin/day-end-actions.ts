"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import { getTodayDayStartUTC } from "@/lib/utils/ist-date";

/**
 * Checks if the current business day has been ended.
 * Returns true only if day_ended_at is set AND it falls within the current
 * 6am-to-6am business day window (not from a previous day).
 */
export async function getDayEndState(theatreId: string): Promise<{
  isDayEnded: boolean;
  dayEndedAt: string | null;
  dayEndedBy: string | null;
}> {
  const client = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from("theatres")
    .select("day_ended_at, day_ended_by")
    .eq("id", theatreId)
    .single();

  if (!data || !data.day_ended_at) {
    return { isDayEnded: false, dayEndedAt: null, dayEndedBy: null };
  }

  const dayEndedAt = new Date(data.day_ended_at);
  const todayStart = getTodayDayStartUTC();

  // If day_ended_at is before today's 6am IST boundary, it is from a previous
  // business day - the new day has auto-reset.
  if (dayEndedAt < todayStart) {
    return { isDayEnded: false, dayEndedAt: null, dayEndedBy: null };
  }

  return {
    isDayEnded: true,
    dayEndedAt: data.day_ended_at,
    dayEndedBy: data.day_ended_by,
  };
}

/** Admin triggers "Day End" - blocks new orders until next 6am IST */
export async function triggerDayEnd(): Promise<{ error?: string }> {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    return { error: "Unauthorized" };
  }

  const client = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("theatres")
    .update({
      day_ended_at: new Date().toISOString(),
      day_ended_by: session.user.id,
    })
    .eq("id", session.profile.theatre_id);

  if (error) return { error: error.message };

  await logAudit({
    userId: session.user.id,
    action: "day.ended",
    entityType: "theatres",
    entityId: session.profile.theatre_id,
    metadata: { ended_at: new Date().toISOString() },
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/order");
  return {};
}

/** Admin cancels "Day End" early - start day before auto-reset at 6am */
export async function cancelDayEnd(): Promise<{ error?: string }> {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    return { error: "Unauthorized" };
  }

  const client = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from("theatres")
    .update({
      day_ended_at: null,
      day_ended_by: null,
    })
    .eq("id", session.profile.theatre_id);

  if (error) return { error: error.message };

  await logAudit({
    userId: session.user.id,
    action: "day.started",
    entityType: "theatres",
    entityId: session.profile.theatre_id,
    metadata: { started_at: new Date().toISOString() },
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/order");
  return {};
}
