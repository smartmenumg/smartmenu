-- ============================================================================
-- MIGRATION: Day-Wise Pricing & Cashfree Payment Support
-- ============================================================================

-- 1. Add `has_day_pricing` toggle flag to `products`
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_day_pricing BOOLEAN NOT NULL DEFAULT false;

-- 2. CREATE TABLE: product_day_pricing
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
CREATE TABLE IF NOT EXISTS public.product_day_pricing (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  day_of_week      INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  price            INT NOT NULL CHECK (price >= 0),            -- price in paise
  original_price   INT,                                       -- strikethrough price in paise
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, day_of_week),
  CONSTRAINT check_day_original_price CHECK (original_price IS NULL OR original_price > price)
);

-- Enable RLS on product_day_pricing
ALTER TABLE public.product_day_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on product_day_pricing" ON public.product_day_pricing
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Public read on product_day_pricing" ON public.product_day_pricing
  FOR SELECT USING (is_active = true);

-- 3. Modify `payments` table to support Cashfree Gateway alongside Razorpay
ALTER TABLE public.payments
ALTER COLUMN razorpay_order_id DROP NOT NULL;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'cashfree',
ADD COLUMN IF NOT EXISTS cf_order_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cf_payment_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS payment_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS raw_response JSONB;
