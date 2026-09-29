-- ============================================================================
-- MIGRATION: 009_day_end_feature
-- Adds Day End state tracking to theatres table.
-- day_ended_at: IST timestamp when admin clicked "Day End" for this business day.
-- day_ended_by: which admin user triggered the day end.
-- Business day runs from 06:00 IST → next day 05:59 IST (cinema hours).
-- A NULL day_ended_at means the day is currently active (orders allowed).
-- Auto-reset: if day_ended_at < today's 06:00 IST, day is considered active again.
-- ============================================================================

ALTER TABLE public.theatres
  ADD COLUMN IF NOT EXISTS day_ended_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS day_ended_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookup when checking order blocking
CREATE INDEX IF NOT EXISTS idx_theatres_day_ended_at ON public.theatres (day_ended_at)
  WHERE day_ended_at IS NOT NULL;

COMMENT ON COLUMN public.theatres.day_ended_at IS
  'Set by admin when "Day End" is clicked. NULL = day active. Auto-resets at 06:00 IST next day.';
COMMENT ON COLUMN public.theatres.day_ended_by IS
  'Profile user_id of the admin who triggered the day end. Audit purposes.';
