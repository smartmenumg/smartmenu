-- ============================================================================
-- MIGRATION: 005_seat_layout
-- Adds an editable JSON seat layout configuration to auditoriums.
-- seat_layout stores an array of row definitions:
--   { "rows": [{ "name": "V", "from": 1, "to": 16 }, ...] }
-- ============================================================================

ALTER TABLE public.auditoriums
  ADD COLUMN IF NOT EXISTS seat_layout JSONB NOT NULL DEFAULT '{"rows":[]}';
