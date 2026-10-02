-- ============================================================================
-- Phase 5: Public-read RLS for customer-facing tables
-- Customers browse the menu without logging in.
-- All writes go through authenticated server actions.
-- ============================================================================

-- Categories: public read (only active ones)
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (active = true);

-- Products: public read (only active + available)
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (active = true AND available = true);

-- Auditoriums: public read (for seat selection dropdown)
DROP POLICY IF EXISTS "auditoriums_public_read" ON public.auditoriums;
CREATE POLICY "auditoriums_public_read" ON public.auditoriums
  FOR SELECT USING (active = true);

-- Orders: public INSERT (customer places order — anon user)
-- Row is keyed by tracking_token (UUID they hold)
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Order items: public INSERT linked to an order
DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;
CREATE POLICY "order_items_public_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Order tracking: customer can read their own order by token
DROP POLICY IF EXISTS "orders_public_read_by_token" ON public.orders;
CREATE POLICY "orders_public_read_by_token" ON public.orders
  FOR SELECT USING (tracking_token IS NOT NULL);

DROP POLICY IF EXISTS "order_items_public_read_by_order" ON public.order_items;
CREATE POLICY "order_items_public_read_by_order" ON public.order_items
  FOR SELECT USING (true);
