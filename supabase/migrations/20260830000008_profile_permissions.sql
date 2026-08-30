-- Add permissions array to profiles table for granular access control
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{"live_orders","menu","qr_codes"}';
