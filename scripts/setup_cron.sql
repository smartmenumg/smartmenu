-- Run this in the Supabase SQL Editor to automatically reset "Day Ended" status at 6 AM IST every day.
-- This ensures the day starts fresh automatically without manual intervention.

-- 1. Enable pg_cron (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the job
-- 6:00 AM IST is exactly 00:30 AM UTC.
-- Cron expression: 30 0 * * * (At minute 30 past hour 0)
SELECT cron.schedule(
  'reset_day_ended_at_6am_ist',
  '30 0 * * *',
  $$ UPDATE public.theatres SET day_ended_at = NULL WHERE day_ended_at IS NOT NULL; $$
);

-- Note: You can verify the job was created by running:
-- SELECT * FROM cron.job;
