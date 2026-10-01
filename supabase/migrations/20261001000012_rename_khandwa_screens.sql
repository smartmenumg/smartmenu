-- Rename Khandwa screens to remove 'Platinum', 'Gold', 'Silver'
UPDATE public.auditoriums 
SET name = 'Screen 1' 
WHERE name = 'Screen 1 — Platinum' AND theatre_id = 'b0000000-0000-0000-0000-000000000002';

UPDATE public.auditoriums 
SET name = 'Screen 2' 
WHERE name = 'Screen 2 — Gold' AND theatre_id = 'b0000000-0000-0000-0000-000000000002';

UPDATE public.auditoriums 
SET name = 'Screen 3' 
WHERE name = 'Screen 3 — Silver' AND theatre_id = 'b0000000-0000-0000-0000-000000000002';
