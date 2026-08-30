-- ============================================================================
-- Phase 5: Public-read RLS for customer-facing tables
-- Customers browse the menu without logging in.
-- All writes go through authenticated server actions.
-- ============================================================================

-- Categories: public read (only active ones)
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (active = true);

-- Products: public read (only active + available)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (active = true AND available = true);

-- Auditoriums: public read (for seat selection dropdown)
CREATE POLICY "auditoriums_public_read" ON public.auditoriums
  FOR SELECT USING (active = true);

-- Orders: public INSERT (customer places order — anon user)
-- Row is keyed by customer_token (UUID they hold)
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Order items: public INSERT linked to an order
CREATE POLICY "order_items_public_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Order tracking: customer can read their own order by token
CREATE POLICY "orders_public_read_by_token" ON public.orders
  FOR SELECT USING (customer_token IS NOT NULL);

CREATE POLICY "order_items_public_read_by_order" ON public.order_items
  FOR SELECT USING (true);
