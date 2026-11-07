-- ==============================================================================
-- SPARTA E-COMMERCE PRODUCTION DATABASE SCHEMA & INITIAL SEED
-- Project ID: xqzzeisabqsqblogbvhb
-- Target: Supabase PostgreSQL with Row Level Security (RLS)
-- Execution: Copy & run this entire script in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PRODUCT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PRODUCTS TABLE (Uses TEXT primary key for sparta-001, sparta-002, etc.)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10, 2),
  price_map JSONB,
  edition_note TEXT,
  description TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  hover_image_index INT DEFAULT 1,
  hover_fit TEXT DEFAULT 'cover-top',
  image_fit TEXT DEFAULT 'cover-top',
  canvas_bg TEXT DEFAULT '#F2F1EE',
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '["S", "M", "L", "XL"]'::jsonb,
  stock TEXT NOT NULL DEFAULT 'in-stock',
  stock_count INT NOT NULL DEFAULT 15,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL DEFAULT 'inside-dhaka',
  total_orders INT NOT NULL DEFAULT 1,
  total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE, -- e.g. SPT-284910
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL DEFAULT 'inside-dhaka',
  notes TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  courier_name TEXT DEFAULT 'Pathao Courier',
  consignment_id TEXT,
  courier_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. COURIER INTEGRATIONS & WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS public.courier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE DEFAULT 'pathao',
  client_id TEXT,
  client_secret TEXT,
  username TEXT,
  password TEXT,
  store_id INT DEFAULT 0,
  webhook_secret TEXT,
  is_sandbox BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read published items; Authenticated admin users can insert/update/delete
DROP POLICY IF EXISTS "Public view published products" ON public.products;
CREATE POLICY "Public view published products" ON public.products
  FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated admins manage products" ON public.products;
CREATE POLICY "Authenticated admins manage products" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product Categories: Public read active; Authenticated admins manage
DROP POLICY IF EXISTS "Public view active categories" ON public.product_categories;
CREATE POLICY "Public view active categories" ON public.product_categories
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated admins manage categories" ON public.product_categories;
CREATE POLICY "Authenticated admins manage categories" ON public.product_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders: Public can insert checkout orders; Authenticated admins can view & update orders
DROP POLICY IF EXISTS "Public checkout order insert" ON public.orders;
CREATE POLICY "Public checkout order insert" ON public.orders
  FOR INSERT WITH CHECK (total > 0 AND customer_name IS NOT NULL AND customer_phone IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admins manage orders" ON public.orders;
CREATE POLICY "Authenticated admins manage orders" ON public.orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Order Items: Public insert; Authenticated admins manage
DROP POLICY IF EXISTS "Public insert order items" ON public.order_items;
CREATE POLICY "Public insert order items" ON public.order_items
  FOR INSERT WITH CHECK (quantity > 0);

DROP POLICY IF EXISTS "Authenticated admins manage order items" ON public.order_items;
CREATE POLICY "Authenticated admins manage order items" ON public.order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers: Public insert/upsert on checkout; Authenticated admins full read/update
DROP POLICY IF EXISTS "Public insert customer info" ON public.customers;
CREATE POLICY "Public insert customer info" ON public.customers
  FOR INSERT WITH CHECK (phone IS NOT NULL AND full_name IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated admins manage customers" ON public.customers;
CREATE POLICY "Authenticated admins manage customers" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Courier Integrations: Authenticated admins only (Strict Security)
DROP POLICY IF EXISTS "Authenticated admins manage courier settings" ON public.courier_integrations;
CREATE POLICY "Authenticated admins manage courier settings" ON public.courier_integrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store Settings: Public read; Authenticated admins manage
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated admins manage settings" ON public.store_settings;
CREATE POLICY "Authenticated admins manage settings" ON public.store_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. INITIAL SEED DATA
-- Insert Product Categories
INSERT INTO public.product_categories (slug, name, sort_order)
VALUES
  ('upperwear', 'Upperwear', 1),
  ('bottomwear', 'Bottomwear', 2),
  ('shoes-sneakers', 'Shoes/Sneakers', 3),
  ('accessories', 'Accessories', 4),
  ('perfume', 'Perfume', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert Store Rules & Rates
INSERT INTO public.store_settings (setting_key, setting_value)
VALUES
  ('delivery_rates', '{"inside_dhaka": 70, "outside_dhaka": 120, "free_shipping_threshold": 5000}'::jsonb),
  ('store_profile', '{"name": "SPARTA", "phone": "+880 1610-046310", "whatsapp": "8801610046310", "email": "sparta.bd.com@gmail.com"}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value, updated_at = now();

-- Insert Courier Configuration Defaults
INSERT INTO public.courier_integrations (provider, client_id, is_sandbox)
VALUES ('pathao', '', false)
ON CONFLICT (provider) DO NOTHING;

-- Seed All Core 11 SPARTA Products
INSERT INTO public.products (
  id, slug, name, category, price, original_price, price_map, edition_note,
  description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published, sort_order
)
VALUES
(
  'sparta-001',
  'spartan-cable-knit',
  'Spartan Cable Knit',
  'Upperwear',
  1049,
  1279,
  NULL,
  '18% Off · New Arrival',
  'Crafted from high-gauge combed yarn with defined vertical cable twist and reinforced rib collar, cuffs, and hem. Structured silhouette with luxury drape.',
  '["High-gauge combed cotton-acrylic blend", "Deep architectural vertical cable knit", "Reinforced double-knit cuffs and waist hem", "Designed for transitional seasons"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/spartan-black.png", "https://spartacl0.netlify.app/assets/products/spartan-white.png", "https://spartacl0.netlify.app/assets/products/spartan-red.png", "https://spartacl0.netlify.app/assets/products/spartan-navy.png", "https://spartacl0.netlify.app/assets/products/spartan-5.png", "https://spartacl0.netlify.app/assets/products/spartan-6.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#F5F4F0',
  '[{"name": "Washed Obsidian", "hex": "#1A1A1A", "imageIndex": 0}, {"name": "Natural Chalk", "hex": "#EAE6DF", "imageIndex": 1}, {"name": "Crimson Sparta", "hex": "#8A1C24", "imageIndex": 2}, {"name": "Midnight Navy", "hex": "#1B2433", "imageIndex": 3}]'::jsonb,
  '["S", "M", "L", "XL"]'::jsonb,
  'in-stock',
  25,
  true,
  1
),
(
  'sparta-002',
  'tailored-flare-trousers',
  'Tailored Flare Trousers',
  'Bottomwear',
  1249,
  1499,
  NULL,
  '17% Off · Signature Cut',
  'Mid-rise tailored trousers with sharp front creases and subtle architectural flare from calf to hem. Clean drape with structured movement.',
  '["Premium polyester-viscose suiting twill", "Pressed central front and back creases", "Concealed hook-and-bar front tab closure", "Split side hems for intentional shoe stacking"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/flare-black.png", "https://spartacl0.netlify.app/assets/products/flare-offwhite.png", "https://spartacl0.netlify.app/assets/products/flare-gray.png", "https://spartacl0.netlify.app/assets/products/flare-white.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#F3F2EE',
  '[{"name": "Pitch Black", "hex": "#111111", "imageIndex": 0}, {"name": "Raw Off-White", "hex": "#E8E4DA", "imageIndex": 1}, {"name": "Concrete Slate", "hex": "#7A7B7E", "imageIndex": 2}, {"name": "Optic White", "hex": "#F8F8F8", "imageIndex": 3}]'::jsonb,
  '["28", "30", "32", "34", "36"]'::jsonb,
  'in-stock',
  20,
  true,
  2
),
(
  'sparta-003',
  'court-saf1-sneaker',
  'Court SAF1 Sneaker',
  'Shoes/Sneakers',
  1649,
  1899,
  NULL,
  'Best Seller · Limited Restock',
  'Retro court low-top sneaker featuring segmented micro-textured toe, layered heel tab, and vulcanized natural rubber sole with SPARTA tread.',
  '["Supple matte leather and premium suede overlays", "Vulcanized natural rubber cupsole with tread grip", "Reinforced eyelet stay and padded tongue", "Perforated vamp for airflow"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/saf1-white.png", "https://spartacl0.netlify.app/assets/products/saf1-2.png", "https://spartacl0.netlify.app/assets/products/saf1-3.png", "https://spartacl0.netlify.app/assets/products/saf1-4.png"]'::jsonb,
  1,
  'contain',
  'contain',
  '#EDEDEA',
  '[{"name": "Monochrome White", "hex": "#F5F5F5", "imageIndex": 0}, {"name": "Tonal Cream", "hex": "#E5DEC9", "imageIndex": 1}]'::jsonb,
  '["40", "41", "42", "43", "44"]'::jsonb,
  'in-stock',
  18,
  true,
  3
),
(
  'sparta-004',
  'heavyweight-atelier-cap',
  'Heavyweight Atelier Cap',
  'Accessories',
  499,
  649,
  NULL,
  'Essential Accessory',
  'Six-panel unstructured cap constructed from 14 oz brushed cotton twill. Features low-profile embroidery and antique matte metal slide buckle.',
  '["14 oz brushed heavyweight cotton twill", "Curved architectural visor with tonal stitching", "Self-fabric strap with antique metal slider", "One size fits all with adjustable slider"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/cap-black.png", "https://spartacl0.netlify.app/assets/products/cap-2.png", "https://spartacl0.netlify.app/assets/products/cap-3.png", "https://spartacl0.netlify.app/assets/products/cap-4.png"]'::jsonb,
  1,
  'contain',
  'contain',
  '#F0EFEA',
  '[{"name": "Onyx Black", "hex": "#111111", "imageIndex": 0}, {"name": "Sand Dune", "hex": "#CBB89D", "imageIndex": 1}]'::jsonb,
  '["Free Size"]'::jsonb,
  'in-stock',
  40,
  true,
  4
),
(
  'sparta-005',
  'oxford-knit-polo',
  'Oxford Knit Polo',
  'Upperwear',
  899,
  1099,
  NULL,
  '18% Off · Classic Fit',
  'Fine-gauge knit polo featuring ribbed collar and placket with tonal horn-effect buttons. Crafted from lightweight combed cotton.',
  '["100% fine combed cotton knit", "Ribbed spread collar with 3-button placket", "Natural horn-effect buttons with SPARTA etching", "Straight hem with side vents for ease of wear"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/polo-black.png", "https://spartacl0.netlify.app/assets/products/polo-white.png", "https://spartacl0.netlify.app/assets/products/polo-navy.png", "https://spartacl0.netlify.app/assets/products/polo-brown.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#F5F4F0',
  '[{"name": "Classic Black", "hex": "#111111", "imageIndex": 0}, {"name": "Crisp White", "hex": "#FFFFFF", "imageIndex": 1}, {"name": "Deep Navy", "hex": "#1E2A38", "imageIndex": 2}, {"name": "Espresso Brown", "hex": "#4A3525", "imageIndex": 3}]'::jsonb,
  '["S", "M", "L", "XL"]'::jsonb,
  'in-stock',
  30,
  true,
  5
),
(
  'sparta-006',
  'military-utility-cargo-shorts',
  'Military Utility Cargo Shorts',
  'Bottomwear',
  849,
  999,
  NULL,
  'Utility Archive',
  'Heavyweight cotton canvas shorts featuring gusseted bellows cargo pockets and an elasticized waistband with internal drawstring.',
  '["100% heavy cotton canvas (320 GSM)", "Deep bellows cargo pockets with hidden snaps", "Elasticized waistband with tonal round drawstring", "Mid-thigh relaxed silhouette"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/army-1.png", "https://spartacl0.netlify.app/assets/products/army-2.png", "https://spartacl0.netlify.app/assets/products/army-3.png", "https://spartacl0.netlify.app/assets/products/army-4.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#EFEFEA',
  '[{"name": "Military Green", "hex": "#4B5320", "imageIndex": 0}, {"name": "Black Ops", "hex": "#1C1C1C", "imageIndex": 1}]'::jsonb,
  '["M", "L", "XL"]'::jsonb,
  'in-stock',
  25,
  true,
  6
),
(
  'sparta-007',
  'relaxed-bermuda-shorts',
  'Relaxed Bermuda Shorts',
  'Bottomwear',
  749,
  899,
  NULL,
  'Summer Essential',
  'Minimalist Bermuda shorts crafted from soft French terry with slant pockets and an unstructured raw hem aesthetic.',
  '["100% loopback cotton French terry", "Slant front hand pockets and single back welt pocket", "Drawcord elastic waist with nickel eyelets", "Knee-length relaxed drape"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/shorts-black.png", "https://spartacl0.netlify.app/assets/products/shorts-offwhite.png", "https://spartacl0.netlify.app/assets/products/shorts-3.png", "https://spartacl0.netlify.app/assets/products/shorts-4.png", "https://spartacl0.netlify.app/assets/products/shorts-5.png", "https://spartacl0.netlify.app/assets/products/shorts-6.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#F4F3EE',
  '[{"name": "Jet Black", "hex": "#111111", "imageIndex": 0}, {"name": "Oatmeal Melange", "hex": "#E3DCCF", "imageIndex": 1}]'::jsonb,
  '["M", "L", "XL"]'::jsonb,
  'in-stock',
  35,
  true,
  7
),
(
  'sparta-008',
  'classic-oxford-button-down',
  'Classic Oxford Button-Down',
  'Upperwear',
  1149,
  1349,
  NULL,
  'Wardrobe Pillar',
  'Tailored long-sleeve shirt crafted from 100% combed cotton basketweave Oxford cloth with button-down collar and curved hem.',
  '["100% long-staple combed cotton Oxford cloth", "Classic button-down collar with natural roll", "Chest spade pocket and box pleat with locker loop", "Chalk buttons with cross-stitch reinforcement"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/oxford-white.png", "https://spartacl0.netlify.app/assets/products/oxford-black.png"]'::jsonb,
  1,
  'cover-top',
  'cover-top',
  '#F5F4F0',
  '[{"name": "Pure White", "hex": "#FFFFFF", "imageIndex": 0}, {"name": "Washed Black", "hex": "#222222", "imageIndex": 1}]'::jsonb,
  '["M", "L", "XL", "XXL"]'::jsonb,
  'in-stock',
  20,
  true,
  8
),
(
  'sparta-009',
  'vampire-blood-extrait-de-parfum',
  'Vampire Blood Extrait De Parfum',
  'Perfume',
  299,
  NULL,
  '{"15 ml": 299, "50 ml": 799, "100 ml": 1199}'::jsonb,
  'Extrait Concentration (32% Oil)',
  'A magnetic nocturnal blend of dark Bulgarian red rose, smoked black cherry, Indonesian patchouli, and raw amber resin.',
  '["Concentration: Extrait de Parfum (32% premium fragrance oil)", "Top: Wild Black Cherry, Saffron, Bitter Almond", "Heart: Bulgarian Red Rose, Damask Rose, Plum Liqueur", "Base: Indonesian Patchouli, Vanilla Bourbon, Amber Resin", "Longevity: 12-16 hours on skin with architectural sillage"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/perfume-vampire-1.png", "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=1000"]'::jsonb,
  1,
  'contain',
  'contain',
  '#151114',
  NULL,
  '["15 ml", "50 ml", "100 ml"]'::jsonb,
  'in-stock',
  50,
  true,
  9
),
(
  'sparta-010',
  'spartan-man-eau-de-parfum',
  'Spartan Man Eau De Parfum',
  'Perfume',
  299,
  NULL,
  '{"15 ml": 299, "50 ml": 799, "100 ml": 1199}'::jsonb,
  'High-Concentration Signature',
  'Crisp Calabrian bergamot and pink pepper opening over dry Virginian cedarwood, smoky vetiver, and clean modern ambroxan.',
  '["Concentration: Eau de Parfum (24% oil concentration)", "Top: Calabrian Bergamot, Pink Peppercorn, Crisp Apple", "Heart: Virginian Cedar, Clary Sage, Lavender", "Base: Haitian Vetiver, Ambroxan, White Leather", "Longevity: 8-12 hours with radiant masculine projection"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/perfume-man-1.png", "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=1000"]'::jsonb,
  1,
  'contain',
  'contain',
  '#121518',
  NULL,
  '["15 ml", "50 ml", "100 ml"]'::jsonb,
  'in-stock',
  50,
  true,
  10
),
(
  'sparta-011',
  'sparta-femme-eau-de-parfum',
  'Sparta Femme Eau De Parfum',
  'Perfume',
  299,
  NULL,
  '{"15 ml": 299, "50 ml": 799, "100 ml": 1199}'::jsonb,
  'Sophisticated Floral Woody',
  'Velvety white jasmine and Turkish peony warmed by toasted tonka bean, Madagascar vanilla, and creamy white sandalwood.',
  '["Concentration: Eau de Parfum (24% oil concentration)", "Top: Sparkling Pear, Italian Mandarin, Dewy Freesia", "Heart: White Sambac Jasmine, Turkish Peony, Iris", "Base: Toasted Tonka Bean, Madagascar Vanilla, Sandalwood", "Longevity: 8-10 hours with soft, lingering warmth"]'::jsonb,
  '["https://spartacl0.netlify.app/assets/products/perfume-female-1.png", "https://spartacl0.netlify.app/assets/products/perfume-female-2.png"]'::jsonb,
  1,
  'contain',
  'contain',
  '#161316',
  NULL,
  '["15 ml", "50 ml", "100 ml"]'::jsonb,
  'in-stock',
  45,
  true,
  11
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  price_map = EXCLUDED.price_map,
  edition_note = EXCLUDED.edition_note,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  images = EXCLUDED.images,
  sizes = EXCLUDED.sizes,
  colors = EXCLUDED.colors,
  stock = EXCLUDED.stock,
  stock_count = EXCLUDED.stock_count,
  is_published = EXCLUDED.is_published,
  updated_at = now();
