-- ============================================================================
-- MIGRATION: Combos, Discounts, and Customizations
-- ============================================================================

-- 1. Modify `products` table for discounts and combo flags
ALTER TABLE public.products
ADD COLUMN original_price INT,                          -- original price in paise (null if no discount)
ADD COLUMN is_combo BOOLEAN NOT NULL DEFAULT false,     -- identifies if this is a combo product
ADD COLUMN has_customizations BOOLEAN NOT NULL DEFAULT false; -- toggle for add-ons

-- Enforce that original_price (if provided) is greater than the selling price
ALTER TABLE public.products
ADD CONSTRAINT check_original_price_greater CHECK (
  original_price IS NULL OR original_price > price
);

-- ============================================================================
-- 2. TABLE: combo_items
-- Defines the items that make up a combo product.
-- ============================================================================
CREATE TABLE public.combo_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity         INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (combo_product_id, item_product_id)
);

-- Enable RLS and grant Admin full access (customer doesn't need to read this explicitly, it's server-managed mostly)
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on combo_items" ON public.combo_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Allow public read access to combo_items so the frontend can display what's in a combo
CREATE POLICY "Public read on combo_items" ON public.combo_items
  FOR SELECT USING (true);


-- ============================================================================
-- 3. TABLE: product_customizations
-- Defines the manual add-ons (like "Extra Cheese") for a product.
-- ============================================================================
CREATE TABLE public.product_customizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  price_adjustment INT NOT NULL DEFAULT 0, -- additional cost in paise (can be 0 or positive)
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and grant Admin full access
ALTER TABLE public.product_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on product_customizations" ON public.product_customizations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Allow public read access to active customizations
CREATE POLICY "Public read on product_customizations" ON public.product_customizations
  FOR SELECT USING (active = true);


-- ============================================================================
-- 4. Modify `order_items` to store selected customizations
-- ============================================================================
ALTER TABLE public.order_items
ADD COLUMN selected_customizations JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Stores array of { "id": "uuid", "name": "Extra Cheese", "price": 2000 }
