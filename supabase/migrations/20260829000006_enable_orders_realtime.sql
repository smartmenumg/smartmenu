-- Phase 9: Enable Supabase Realtime on orders table
-- This allows the admin dashboard and customer tracking page
-- to receive live updates without polling

-- Allow UPDATE events to broadcast full row data (needed for filters)
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add orders to the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
