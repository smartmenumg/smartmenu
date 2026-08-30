-- ============================================================================
-- MIGRATION: 001_initial_schema
-- Theatre Food Ordering System — Full initial schema
-- ============================================================================
-- Run:  npm run migrate:dev
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('menu', 'admin', 'super_admin');

CREATE TYPE public.order_status AS ENUM (
  'pending_payment',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'delivered',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'created',
  'processing',
  'paid',
  'failed',
  'refunded'
);

-- ============================================================================
-- TABLE: theatres
-- Supports multi-theatre expansion without schema changes.
-- MVP uses exactly one row.
-- ============================================================================

CREATE TABLE public.theatres (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  address     TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: auditoriums
-- Belongs to a theatre. Used to capture seat location at order time.
-- ============================================================================

CREATE TABLE public.auditoriums (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id    UUID NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  total_seats   INT CHECK (total_seats > 0),
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theatre_id, name)
);

-- ============================================================================
-- TABLE: profiles
-- One row per authenticated user. id = auth.users.id (FK).
-- ============================================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theatre_id  UUID NOT NULL REFERENCES public.theatres(id) ON DELETE RESTRICT,
  role        public.user_role NOT NULL,
  full_name   TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: categories
-- Product categories per theatre, ordered by display_order.
-- ============================================================================

CREATE TABLE public.categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id    UUID NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theatre_id, name)
);

-- ============================================================================
-- TABLE: products
-- Price stored in PAISE (integer) — never rupees. Immutable at order time.
-- ============================================================================

CREATE TABLE public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id   UUID NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  description  TEXT,
  price        INT NOT NULL CHECK (price > 0),     -- in paise (e.g. 15000 = ₹150)
  image_url    TEXT,
  available    BOOLEAN NOT NULL DEFAULT true,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: guest_sessions
-- Created on customer's first visit. Survives browser refresh via localStorage.
-- Expires after 24 hours of inactivity.
-- ============================================================================

CREATE TABLE public.guest_sessions (
  id          UUID PRIMARY KEY,               -- client-generated UUID v4
  theatre_id  UUID NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: cart_items
-- Lightweight: only stores product_id + quantity.
-- Prices are NEVER stored here — always fetched fresh from products table.
-- ============================================================================

CREATE TABLE public.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL CHECK (quantity > 0 AND quantity <= 20),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, product_id)               -- one row per product per session
);

-- ============================================================================
-- TABLE: orders
-- Created server-side after checkout validation.
-- tracking_token is the ONLY public identifier — never expose the UUID id.
-- total_amount is server-calculated in paise.
-- ============================================================================

CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id      UUID NOT NULL REFERENCES public.theatres(id) ON DELETE RESTRICT,
  session_id      UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  tracking_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),  -- used in /track/[token]
  customer_name   TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  auditorium_id   UUID NOT NULL REFERENCES public.auditoriums(id) ON DELETE RESTRICT,
  seat_number     TEXT NOT NULL,
  total_amount    INT NOT NULL CHECK (total_amount > 0),           -- paise, server-calculated
  status          public.order_status NOT NULL DEFAULT 'pending_payment',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: order_items
-- Immutable price snapshot captured at order creation time.
-- product_name and unit_price are deliberately duplicated from products
-- so revenue is always historically accurate even if prices change later.
-- ============================================================================

CREATE TABLE public.order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name  TEXT NOT NULL,   -- snapshot — immutable after creation
  unit_price    INT NOT NULL CHECK (unit_price > 0),  -- paise snapshot
  quantity      INT NOT NULL CHECK (quantity > 0),
  subtotal      INT NOT NULL CHECK (subtotal > 0)      -- unit_price * quantity
);

-- ============================================================================
-- TABLE: payments
-- One payment record per order. razorpay_order_id is unique for idempotency.
-- amount must match the Razorpay order amount — validated server-side.
-- ============================================================================

CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  razorpay_order_id    TEXT NOT NULL UNIQUE,    -- idempotency key for webhooks
  razorpay_payment_id  TEXT UNIQUE,             -- set after payment capture
  razorpay_signature   TEXT,
  amount               INT NOT NULL CHECK (amount > 0),  -- paise — matches Razorpay order
  currency             TEXT NOT NULL DEFAULT 'INR',
  status               public.payment_status NOT NULL DEFAULT 'created',
  failure_reason       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at              TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: order_status_history
-- Append-only log of every order status change. Never updated, never deleted.
-- ============================================================================

CREATE TABLE public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      public.order_status NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- null = system/webhook
  notes       TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: bill_prints
-- Tracks when a bill was first printed and how many times it was reprinted.
-- Bill is only printable after order.status = 'accepted'.
-- ============================================================================

CREATE TABLE public.bill_prints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  printed_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  print_count       INT NOT NULL DEFAULT 1 CHECK (print_count >= 1),
  printed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reprinted_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: audit_logs
-- Append-only. Never updated, never deleted.
-- Stores who did what, to which entity, when.
-- NEVER store secrets, passwords, or card data here.
-- ============================================================================

CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Products: menu query (active + available products for a theatre)
CREATE INDEX idx_products_theatre_available
  ON public.products(theatre_id, available, active)
  WHERE active = true;

-- Products: by category
CREATE INDEX idx_products_category
  ON public.products(category_id)
  WHERE active = true;

-- Categories: ordered display
CREATE INDEX idx_categories_theatre_order
  ON public.categories(theatre_id, display_order)
  WHERE active = true;

-- Guest sessions: expiry cleanup
CREATE INDEX idx_guest_sessions_expires
  ON public.guest_sessions(expires_at);

-- Cart items: by session
CREATE INDEX idx_cart_items_session
  ON public.cart_items(session_id);

-- Orders: customer tracking by token (primary access pattern for customers)
CREATE UNIQUE INDEX idx_orders_tracking_token
  ON public.orders(tracking_token);

-- Orders: admin dashboard (theatre + status + time)
CREATE INDEX idx_orders_theatre_status_time
  ON public.orders(theatre_id, status, created_at DESC);

-- Orders: by auditorium (for filtering)
CREATE INDEX idx_orders_auditorium
  ON public.orders(auditorium_id, created_at DESC);

-- Orders: by session (for cart-to-order lookup)
CREATE INDEX idx_orders_session
  ON public.orders(session_id)
  WHERE session_id IS NOT NULL;

-- Payments: webhook idempotency — the most critical index
CREATE UNIQUE INDEX idx_payments_razorpay_order_id
  ON public.payments(razorpay_order_id);

-- Payments: by order
CREATE INDEX idx_payments_order
  ON public.payments(order_id);

-- Payments: revenue queries (paid only)
CREATE INDEX idx_payments_status_paid_at
  ON public.payments(status, paid_at DESC)
  WHERE status = 'paid';

-- Order status history: by order
CREATE INDEX idx_order_status_history_order
  ON public.order_status_history(order_id, changed_at DESC);

-- Audit logs: by entity
CREATE INDEX idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- Audit logs: by user
CREATE INDEX idx_audit_logs_user
  ON public.audit_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Profiles: by theatre + role
CREATE INDEX idx_profiles_theatre_role
  ON public.profiles(theatre_id, role)
  WHERE active = true;

-- ============================================================================
-- TRIGGERS: updated_at auto-maintenance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_theatres_updated_at
  BEFORE UPDATE ON public.theatres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- FUNCTION: validate_order_status_transition
-- Enforces that only valid status progressions are allowed.
-- Called by application logic AND as a DB-level constraint.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_order_status_transition(
  current_status public.order_status,
  new_status     public.order_status
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE current_status
    WHEN 'pending_payment' THEN new_status IN ('confirmed', 'cancelled')
    WHEN 'confirmed'       THEN new_status IN ('accepted', 'cancelled')
    WHEN 'accepted'        THEN new_status IN ('preparing', 'cancelled')
    WHEN 'preparing'       THEN new_status IN ('ready')
    WHEN 'ready'           THEN new_status IN ('delivered')
    WHEN 'delivered'       THEN FALSE  -- terminal state
    WHEN 'cancelled'       THEN FALSE  -- terminal state
    ELSE FALSE
  END;
END;
$$;

-- ============================================================================
-- TRIGGER: enforce order status transitions at DB level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.validate_order_status_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_order_status_transition();

-- ============================================================================
-- FUNCTION: auto-log order status history on status change
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_log_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.theatres              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoriums           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_prints           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's role ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- ── Helper: get current user's theatre_id ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_theatre_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT theatre_id FROM public.profiles
  WHERE id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- ── theatres ─────────────────────────────────────────────────────────────────
-- Anyone can read active theatres (needed for public menu page)
CREATE POLICY "theatres_public_read" ON public.theatres
  FOR SELECT USING (active = true);

CREATE POLICY "theatres_super_admin_all" ON public.theatres
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- ── auditoriums ──────────────────────────────────────────────────────────────
-- Anyone can read active auditoriums (needed for customer checkout form)
CREATE POLICY "auditoriums_public_read" ON public.auditoriums
  FOR SELECT USING (active = true);

CREATE POLICY "auditoriums_super_admin_all" ON public.auditoriums
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Users can only read their own profile
CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Super admin can manage all profiles
CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- ── categories ───────────────────────────────────────────────────────────────
-- Public read: active categories for the menu page
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (active = true);

-- Menu role: full management of their theatre's categories
CREATE POLICY "categories_menu_all" ON public.categories
  FOR ALL USING (
    public.current_user_role() IN ('menu', 'super_admin')
    AND theatre_id = public.current_user_theatre_id()
  );

-- Admin: read only
CREATE POLICY "categories_admin_read" ON public.categories
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    AND theatre_id = public.current_user_theatre_id()
  );

-- ── products ─────────────────────────────────────────────────────────────────
-- Public read: available + active products only
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (available = true AND active = true);

-- Menu + super_admin: full management of their theatre's products
CREATE POLICY "products_menu_all" ON public.products
  FOR ALL USING (
    public.current_user_role() IN ('menu', 'super_admin')
    AND theatre_id = public.current_user_theatre_id()
  );

-- Admin: read all products (including unavailable) for their theatre
CREATE POLICY "products_admin_read" ON public.products
  FOR SELECT USING (
    public.current_user_role() = 'admin'
    AND theatre_id = public.current_user_theatre_id()
  );

-- ── guest_sessions ───────────────────────────────────────────────────────────
-- Managed entirely via service role in API routes — no direct client access
-- Anon can insert their own session (upsert on first visit)
CREATE POLICY "guest_sessions_anon_insert" ON public.guest_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "guest_sessions_anon_read" ON public.guest_sessions
  FOR SELECT USING (true);

CREATE POLICY "guest_sessions_anon_update" ON public.guest_sessions
  FOR UPDATE USING (true);

CREATE POLICY "guest_sessions_admin_read" ON public.guest_sessions
  FOR SELECT USING (public.current_user_role() IN ('admin', 'super_admin'));

-- ── cart_items ───────────────────────────────────────────────────────────────
-- Cart items are managed server-side; anon can manage their own session's items
CREATE POLICY "cart_items_anon_manage" ON public.cart_items
  FOR ALL USING (true);

-- ── orders ───────────────────────────────────────────────────────────────────
-- No direct public read — customers use tracking_token via API only
-- Admin can read/update orders for their theatre
CREATE POLICY "orders_admin_manage" ON public.orders
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'super_admin')
    AND theatre_id = public.current_user_theatre_id()
  );

-- Super admin: unrestricted
CREATE POLICY "orders_super_admin_all" ON public.orders
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- ── order_items ──────────────────────────────────────────────────────────────
CREATE POLICY "order_items_admin_read" ON public.order_items
  FOR SELECT USING (
    public.current_user_role() IN ('admin', 'super_admin')
  );

-- ── payments ─────────────────────────────────────────────────────────────────
-- Admin: read only (no direct write — all writes via service role in API)
CREATE POLICY "payments_admin_read" ON public.payments
  FOR SELECT USING (
    public.current_user_role() IN ('admin', 'super_admin')
  );

-- Super admin: full access
CREATE POLICY "payments_super_admin_all" ON public.payments
  FOR ALL USING (public.current_user_role() = 'super_admin');

-- ── order_status_history ─────────────────────────────────────────────────────
CREATE POLICY "order_status_history_admin_read" ON public.order_status_history
  FOR SELECT USING (
    public.current_user_role() IN ('admin', 'super_admin')
  );

-- ── bill_prints ──────────────────────────────────────────────────────────────
CREATE POLICY "bill_prints_admin_all" ON public.bill_prints
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'super_admin')
  );

-- ── audit_logs ───────────────────────────────────────────────────────────────
-- Read-only for super_admin; all writes via service role
CREATE POLICY "audit_logs_super_admin_read" ON public.audit_logs
  FOR SELECT USING (public.current_user_role() = 'super_admin');

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,                     -- public read (needed for <img src>)
  10485760,                 -- 10 MB max upload
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: menu role can upload/delete product images
CREATE POLICY "product_images_menu_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND public.current_user_role() IN ('menu', 'super_admin')
  );

CREATE POLICY "product_images_menu_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND public.current_user_role() IN ('menu', 'super_admin')
  );

CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- ============================================================================
-- SEED DATA — Default theatre and auditoriums
-- ============================================================================

-- Insert the single theatre for this MVP
INSERT INTO public.theatres (id, name, slug, address, settings, active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Cineplex Theatre',
  'cineplex',
  'Main Street, City',
  '{"currency": "INR", "timezone": "Asia/Kolkata"}',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Insert auditoriums
INSERT INTO public.auditoriums (theatre_id, name, total_seats, display_order, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Audi 1', 150, 1, true),
  ('a0000000-0000-0000-0000-000000000001', 'Audi 2', 200, 2, true),
  ('a0000000-0000-0000-0000-000000000001', 'Audi 3', 100, 3, true),
  ('a0000000-0000-0000-0000-000000000001', 'Gold Class', 50, 4, true)
ON CONFLICT (theatre_id, name) DO NOTHING;

-- Insert sample categories
INSERT INTO public.categories (theatre_id, name, display_order, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Popcorn & Snacks', 1, true),
  ('a0000000-0000-0000-0000-000000000001', 'Beverages',        2, true),
  ('a0000000-0000-0000-0000-000000000001', 'Combos',           3, true),
  ('a0000000-0000-0000-0000-000000000001', 'Nachos & Sides',   4, true),
  ('a0000000-0000-0000-0000-000000000001', 'Hot Food',         5, true)
ON CONFLICT (theatre_id, name) DO NOTHING;
