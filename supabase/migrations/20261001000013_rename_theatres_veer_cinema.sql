-- ============================================================================
-- MIGRATION: 013_rename_theatres_veer_cinema
-- Renames both theatres from the Mahavir Group branding
-- to their official operating name: Veer Cinema
-- ============================================================================

UPDATE public.theatres
SET name = 'Veer Cinema, Satna', updated_at = now()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

UPDATE public.theatres
SET name = 'Veer Cinema, Khandwa', updated_at = now()
WHERE id = 'b0000000-0000-0000-0000-000000000002';
