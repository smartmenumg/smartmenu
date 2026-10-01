-- ============================================================================
-- MIGRATION: 011_multi_theatre_mahavir_group
-- Renames existing theatre to Satna Cinema.
-- Adds Khandwa Cinema as the second Mahavir Group property.
-- Both theatres have independent auditoriums, categories, and products.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PART 1: Rename existing theatre → Satna Cinema
-- ────────────────────────────────────────────────────────────────────────────

UPDATE public.theatres
SET
  name    = 'Satna Cinema',
  slug    = 'satna',
  address = 'Near Clock Tower, Civil Lines, Satna, Madhya Pradesh 485001',
  settings = '{"currency": "INR", "timezone": "Asia/Kolkata", "gst_number": "", "city": "Satna"}',
  updated_at = now()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- ────────────────────────────────────────────────────────────────────────────
-- PART 2: Create Khandwa Cinema
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.theatres (id, name, slug, address, settings, active)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Khandwa Cinema',
  'khandwa',
  'Indore Road, Khandwa, Madhya Pradesh 450001',
  '{"currency": "INR", "timezone": "Asia/Kolkata", "gst_number": "", "city": "Khandwa"}',
  true
) ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- PART 3: Update Satna auditoriums (rename for clarity)
-- ────────────────────────────────────────────────────────────────────────────

-- Rename existing Satna auditoriums to professional names
UPDATE public.auditoriums
SET name = 'Screen 1 — Platinum' WHERE theatre_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Audi 1';

UPDATE public.auditoriums
SET name = 'Screen 2 — Gold' WHERE theatre_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Audi 2';

UPDATE public.auditoriums
SET name = 'Screen 3 — Silver' WHERE theatre_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Audi 3';

UPDATE public.auditoriums
SET name = 'Gold Class Lounge' WHERE theatre_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Gold Class';

-- ────────────────────────────────────────────────────────────────────────────
-- PART 4: Khandwa Cinema — Auditoriums
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.auditoriums (theatre_id, name, total_seats, display_order, active)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Screen 1 — Platinum', 180, 1, true),
  ('b0000000-0000-0000-0000-000000000002', 'Screen 2 — Gold',     220, 2, true),
  ('b0000000-0000-0000-0000-000000000002', 'Screen 3 — Silver',   120, 3, true)
ON CONFLICT (theatre_id, name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- PART 5: Khandwa Cinema — Categories (their own unique menu structure)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.categories (theatre_id, name, display_order, active)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Starters & Snacks',   1, true),
  ('b0000000-0000-0000-0000-000000000002', 'Main Course',         2, true),
  ('b0000000-0000-0000-0000-000000000002', 'Beverages',           3, true),
  ('b0000000-0000-0000-0000-000000000002', 'Combos & Meals',      4, true),
  ('b0000000-0000-0000-0000-000000000002', 'Desserts & Ice Cream',5, true)
ON CONFLICT (theatre_id, name) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- PART 6: Khandwa Cinema — Products
-- Prices in PAISE (e.g. 15000 = ₹150)
-- ────────────────────────────────────────────────────────────────────────────

-- We need category IDs, so use a DO block with variables
DO $$
DECLARE
  khandwa_id    UUID := 'b0000000-0000-0000-0000-000000000002';
  cat_starters  UUID;
  cat_main      UUID;
  cat_beverages UUID;
  cat_combos    UUID;
  cat_desserts  UUID;
BEGIN
  SELECT id INTO cat_starters  FROM public.categories WHERE theatre_id = khandwa_id AND name = 'Starters & Snacks';
  SELECT id INTO cat_main      FROM public.categories WHERE theatre_id = khandwa_id AND name = 'Main Course';
  SELECT id INTO cat_beverages FROM public.categories WHERE theatre_id = khandwa_id AND name = 'Beverages';
  SELECT id INTO cat_combos    FROM public.categories WHERE theatre_id = khandwa_id AND name = 'Combos & Meals';
  SELECT id INTO cat_desserts  FROM public.categories WHERE theatre_id = khandwa_id AND name = 'Desserts & Ice Cream';

  -- Starters & Snacks
  INSERT INTO public.products (theatre_id, category_id, name, description, price, available, active)
  VALUES
    (khandwa_id, cat_starters, 'Butter Popcorn (Large)',    'Freshly popped corn tossed in rich butter — cinema''s finest.',                 18000, true, true),
    (khandwa_id, cat_starters, 'Butter Popcorn (Regular)', 'Classic butter popcorn in a handy regular size.',                               12000, true, true),
    (khandwa_id, cat_starters, 'Caramel Popcorn',          'Sweet and crunchy caramel glazed popcorn.',                                     16000, true, true),
    (khandwa_id, cat_starters, 'Cheese Nachos',            'Crispy tortilla chips loaded with spicy jalapeño cheese dip.',                  19000, true, true),
    (khandwa_id, cat_starters, 'Veg Spring Rolls (6 pcs)', 'Crispy golden rolls stuffed with spiced vegetables. Served with sweet chilli.', 17000, true, true),
    (khandwa_id, cat_starters, 'Masala Peanuts',           'Roasted peanuts tossed in chaat masala and lemon. A light & addictive snack.',   8000, true, true),
    (khandwa_id, cat_starters, 'French Fries',             'Golden crispy fries with a sprinkle of tangy seasoning.',                       15000, true, true)
  ;

  -- Main Course
  INSERT INTO public.products (theatre_id, category_id, name, description, price, available, active)
  VALUES
    (khandwa_id, cat_main, 'Veg Burger',               'Crispy aloo tikki patty with fresh lettuce, tomato & chipotle mayo in a toasted bun.', 18000, true, true),
    (khandwa_id, cat_main, 'Paneer Tikka Sub (6 inch)', 'Marinated paneer tikka in a toasted sub with green chutney and veggies.',              22000, true, true),
    (khandwa_id, cat_main, 'Cheese Pizza Slice',        'Loaded with mozzarella and tangy marinara on a thin crust.',                          20000, true, true),
    (khandwa_id, cat_main, 'Veg Hot Dog',               'Spiced soya sausage in a soft bun with mustard and ketchup.',                         15000, true, true),
    (khandwa_id, cat_main, 'Paneer Wrap',               'Soft wheat wrap stuffed with grilled paneer, onions & pepper.',                       19000, true, true)
  ;

  -- Beverages
  INSERT INTO public.products (theatre_id, category_id, name, description, price, available, active)
  VALUES
    (khandwa_id, cat_beverages, 'Pepsi (Large)',           'Chilled Pepsi to keep you refreshed through the show.',              7000, true, true),
    (khandwa_id, cat_beverages, 'Pepsi (Regular)',         'Regular chilled Pepsi.',                                             5000, true, true),
    (khandwa_id, cat_beverages, '7UP (Large)',             'Crisp lemon-lime flavour, chilled to perfection.',                   7000, true, true),
    (khandwa_id, cat_beverages, 'Mango Frooti (330ml)',    'India''s favourite mango drink.',                                    4000, true, true),
    (khandwa_id, cat_beverages, 'Mineral Water (500ml)',   'Chilled packaged drinking water.',                                   2500, true, true),
    (khandwa_id, cat_beverages, 'Hot Masala Chai',         'Freshly brewed spiced tea. Perfect for the evening show.',           6000, true, true),
    (khandwa_id, cat_beverages, 'Cold Coffee (Blended)',   'Creamy blended cold coffee with a hint of chocolate.',              12000, true, true),
    (khandwa_id, cat_beverages, 'Fresh Lime Soda',         'Freshly squeezed lime, soda & salt. Sweet or salted.',               8000, true, true)
  ;

  -- Combos & Meals
  INSERT INTO public.products (theatre_id, category_id, name, description, price, available, active)
  VALUES
    (khandwa_id, cat_combos, 'Movie Night Combo (Veg)',     'Large Butter Popcorn + Pepsi Large. The perfect pair.',               23000, true, true),
    (khandwa_id, cat_combos, 'Family Combo (4 pax)',        '2x Large Popcorn + 4x Pepsi Regular. Perfect for the full family.',  55000, true, true),
    (khandwa_id, cat_combos, 'Snack & Sip Combo',          'Veg Burger + Pepsi Large. A filling combo.',                          23000, true, true),
    (khandwa_id, cat_combos, 'Cheese Lover''s Combo',      'Cheese Nachos + Cold Coffee. Rich and satisfying.',                   29000, true, true),
    (khandwa_id, cat_combos, 'Gold Class Premiere Platter','Paneer Tikka Sub + Caramel Popcorn + 2x Pepsi. Premium experience.', 52000, true, true)
  ;

  -- Desserts & Ice Cream
  INSERT INTO public.products (theatre_id, category_id, name, description, price, available, active)
  VALUES
    (khandwa_id, cat_desserts, 'Vanilla Soft Serve',    'Creamy classic vanilla soft serve in a cone.',                            8000, true, true),
    (khandwa_id, cat_desserts, 'Choco Fudge Sundae',    'Vanilla ice cream topped with hot fudge sauce and crushed wafers.',      13000, true, true),
    (khandwa_id, cat_desserts, 'Mango Kulfi',           'Traditional Indian kulfi with rich mango flavour. Served on a stick.',   10000, true, true),
    (khandwa_id, cat_desserts, 'Brownie with Ice Cream','Warm chocolate brownie served with a scoop of vanilla ice cream.',       18000, true, true),
    (khandwa_id, cat_desserts, 'Gulab Jamun (2 pcs)',   'Soft golden milk-solid dumplings soaked in rose-flavoured sugar syrup.',  9000, true, true)
  ;
END $$;
