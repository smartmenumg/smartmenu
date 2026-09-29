/**
 * IST date boundary utilities.
 * This file has NO "use server" directive — it's a pure utility
 * that can be imported by any module (server actions, client utils, etc.)
 */

/**
 * Returns today's 6:00 AM IST boundary as a UTC Date.
 * Cinema/theatre business day = 06:00 IST today → 05:59 IST next day.
 * IST = UTC+5:30, so 06:00 IST = 00:30 UTC.
 */
export function getTodayDayStartUTC(): Date {
  const now = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);

  // Build 06:00 IST of today (as a UTC timestamp)
  const sixAmIST = Date.UTC(
    nowIST.getUTCFullYear(),
    nowIST.getUTCMonth(),
    nowIST.getUTCDate(),
    6, 0, 0, 0   // 06:00 in IST hour position
  );
  // Convert from IST frame back to true UTC
  return new Date(sixAmIST - IST_OFFSET_MS);
}

/**
 * Checks whether a given timestamp falls within the current business day
 * (i.e., after today's 06:00 IST boundary).
 */
export function isCurrentBusinessDay(isoTimestamp: string): boolean {
  const ts = new Date(isoTimestamp);
  return ts >= getTodayDayStartUTC();
}
