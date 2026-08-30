-- ============================================================================
-- MIGRATION: Item-wise Flexible GST System (0%, 5%, 12%, 18%, etc.)
-- ============================================================================

-- 1. Add GST rate column to `products` table (default 5%)
ALTER TABLE public.products
ADD COLUMN gst_rate_percent INT NOT NULL DEFAULT 5 CHECK (gst_rate_percent >= 0 AND gst_rate_percent <= 28);

-- 2. Add subtotal and GST breakdowns to `orders` table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal_amount INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount INT NOT NULL DEFAULT 0;

-- 3. Add GST snapshot columns to `order_items` table for audit & tax invoice compliance
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS gst_rate_percent INT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS gst_amount INT NOT NULL DEFAULT 0;
