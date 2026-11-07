-- SPARTA E-COMMERCE DATABASE MIGRATION
-- Project: xqzzeisabqsqblogbvhb
-- Designed for: PostgreSQL / Supabase with Row Level Security (RLS)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE courier_status AS ENUM (
    'not_submitted',
    'pending_pickup',
    'in_transit',
    'delivered',
    'failed_delivery',
    'returned'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. ADMIN PROFILES
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'SPARTA Admin',
  role user_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- Cached slug/name for fast queries (Upperwear, Bottomwear, etc.)
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10, 2),
  price_map JSONB, -- For volume-based pricing, e.g. {"15 ml": 299, "50 ml": 799, "100 ml": 1199}
  edition_note TEXT,
  description TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  hover_image_index INT DEFAULT 1,
  hover_fit TEXT DEFAULT 'cover-center',
  image_fit TEXT DEFAULT 'cover-center',
  canvas_bg TEXT DEFAULT '#F2F1EE',
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '["Free Size"]'::jsonb,
  stock TEXT NOT NULL DEFAULT 'in-stock', -- 'in-stock', 'out-of-stock', 'coming-soon'
  stock_count INT NOT NULL DEFAULT 50,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  delivery_division TEXT,
  delivery_district TEXT,
  delivery_thana TEXT,
  delivery_address TEXT,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE, -- e.g. SPT-284910
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_division TEXT NOT NULL,
  delivery_district TEXT NOT NULL,
  delivery_thana TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL DEFAULT 'inside-dhaka', -- 'inside-dhaka' | 'outside-dhaka'
  delivery_notes TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  
  -- Courier tracking details
  courier_status courier_status NOT NULL DEFAULT 'not_submitted',
  pathao_consignment_id TEXT,
  pathao_merchant_order_id TEXT,
  pathao_tracking_url TEXT,
  pathao_store_id INT,
  pathao_delivery_fee NUMERIC(10, 2),
  pathao_response JSONB,
  courier_submitted_at TIMESTAMPTZ,
  
  -- Internal audit
  internal_notes TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ORDER ITEMS (historical preservation, completely isolated from product changes)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  product_image TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. STORE SETTINGS (Key-Value configuration for brand, shipping fees, courier)
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. COURIER INTEGRATIONS & SECRETS (Strictly Admin/Server-Side Accessible)
CREATE TABLE IF NOT EXISTS public.courier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE, -- 'pathao'
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox', -- 'sandbox' | 'production'
  client_id TEXT,
  encrypted_client_secret TEXT,
  username TEXT,
  encrypted_password TEXT,
  selected_store_id INT,
  selected_store_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ACTIVITY LOGS (Security audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- 'create_product', 'update_order_status', 'pathao_parcel_created', etc.
  entity_type TEXT NOT NULL, -- 'product', 'order', 'courier', 'settings'
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. INDEXES FOR HIGH-THROUGHPUT RETRIEVAL & SORTING
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 13. AUTO-UPDATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 14. HELPER: IS CURRENT USER AN ADMIN?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ADMIN PROFILES: Admins can read their own or all admin profiles
CREATE POLICY "Admins can view admin profiles"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Super admins can manage admin profiles"
  ON public.admin_profiles FOR ALL
  USING (public.is_admin());

-- PRODUCT CATEGORIES: Public can view active categories, admins can manage
CREATE POLICY "Public read active categories"
  ON public.product_categories FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage categories"
  ON public.product_categories FOR ALL
  USING (public.is_admin());

-- PRODUCTS: Public can view published products, admins have full control
CREATE POLICY "Public read published products"
  ON public.products FOR SELECT
  USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- CUSTOMERS: Strictly Admin-Only
CREATE POLICY "Admins access customers"
  ON public.customers FOR ALL
  USING (public.is_admin());

-- ORDERS: Admins can manage all orders; public CANNOT select all orders
CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- Allow anonymous customer order insertion strictly with safe default status 'pending'
CREATE POLICY "Public insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND total_amount > 0
    AND customer_name IS NOT NULL
    AND customer_phone IS NOT NULL
  );

-- ORDER ITEMS: Public can insert their order items alongside the order, admins can manage
CREATE POLICY "Admins manage order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (quantity > 0 AND unit_price >= 0);

-- STORE SETTINGS: Public can read non-secret settings (shipping fees, brand info), admins manage all
CREATE POLICY "Public read public settings"
  ON public.store_settings FOR SELECT
  USING (is_secret = false OR public.is_admin());

CREATE POLICY "Admins manage settings"
  ON public.store_settings FOR ALL
  USING (public.is_admin());

-- COURIER INTEGRATIONS: STRICTLY SERVER-SIDE & ADMIN ONLY (Never exposed to public)
CREATE POLICY "Admins access courier integrations"
  ON public.courier_integrations FOR ALL
  USING (public.is_admin());

-- ACTIVITY LOGS: Strictly Admins
CREATE POLICY "Admins view activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- 16. SEED ESSENTIAL STORE SETTINGS
INSERT INTO public.store_settings (key, value, description, is_secret)
VALUES
  ('brand_info', '{"name":"SPARTA","phone":"+880 1610-046310","whatsapp":"8801610046310","email":"sparta.bd.com@gmail.com","currency":"৳"}'::jsonb, 'General store contact and brand details', false),
  ('shipping_settings', '{"inside_dhaka_fee":70,"outside_dhaka_fee":120,"free_shipping_threshold":5000}'::jsonb, 'Standard delivery fee configuration for Bangladesh', false),
  ('cloudinary_config', '{"cloud_name":"zgk3djqr","api_key":"583185876679327"}'::jsonb, 'Client Cloudinary identifiers', false)
ON CONFLICT (key) DO NOTHING;

-- 17. SEED INITIAL CATEGORIES
INSERT INTO public.product_categories (slug, name, sort_order)
VALUES
  ('Upperwear', 'Upperwear', 1),
  ('Bottomwear', 'Bottomwear', 2),
  ('Shoes/Sneakers', 'Shoes / Sneakers', 3),
  ('Accessories', 'Accessories', 4),
  ('Perfume', 'Perfume', 5)
ON CONFLICT (slug) DO NOTHING;


-- 18. INITIAL PRODUCTS SEEDING (SPARTA 11 CORE PRODUCTS)
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-001', 'Spartan Cable Knit', 'Upperwear', 1049, 1279, null, '18% Off · New Arrival', 'New Arrival: The signature Spartan Cable Knit. Crafted for comfort, confidence, and quiet distinction with a structured quarter-zip collar and embroidered chest crest.', '["Mid-weight breathable combed cotton cable-knit weave","Quarter-zip mock collar with brushed metal puller","Tonal embroidered Spartan crest at left chest","Ribbed cuffs and structured waistband hem"]'::jsonb, '["/assets/products/spartan-white.png","/assets/products/spartan-black.png","/assets/products/spartan-navy.png","/assets/products/spartan-red.png","/assets/products/spartan-5.png","/assets/products/spartan-6.png"]'::jsonb, 4, 'cover-top', 'cover-top', '#F3F3F5', '[{"name":"White","hex":"#F4F3EF","imageIndex":0},{"name":"Black","hex":"#141416","imageIndex":1},{"name":"Navy Blue","hex":"#1B2436","imageIndex":2},{"name":"Red Wine","hex":"#5E1924","imageIndex":3}]'::jsonb, '["S","M","L","XL"]'::jsonb, 'in-stock', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-002', 'Spartan Flare Formal', 'Bottomwear', 1200, 1558, null, '23% Off', 'Classic formal flare trousers tailored for an elongated architectural line. Double front pleats deliver fluid movement from waist to hem.', '["Double front pleats with crisp pressed centre crease","Subtle flare leg opening engineered to drape cleanly over footwear","Concealed hook-and-bar tailored waistband closure","Wrinkle-resistant structured suiting cloth"]'::jsonb, '["/assets/products/flare-black.png","/assets/products/flare-gray.png","/assets/products/flare-white.png","/assets/products/flare-offwhite.png"]'::jsonb, 1, 'cover-center', 'cover-center', '#EFEFF0', '[{"name":"Black","hex":"#151517","imageIndex":0},{"name":"Gray","hex":"#6E7075","imageIndex":1},{"name":"White","hex":"#FAFAFA","imageIndex":2},{"name":"Off White","hex":"#EAE6DF","imageIndex":3}]'::jsonb, '["S","M","L","XL"]'::jsonb, 'in-stock', 150, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-008', 'Heritage Cable Polo', 'Upperwear', 699, null, null, 'Resort Knit', 'Old-money open-collar cable knit polo finished with contrast ivory tipping along the collar and cuffs.', '["Open-placket Johnny collar with contrast tipping","Vertical fine-gauge cable texture throughout","Soft breathable combed cotton yarn","Clean straight hem suited for tailored trousers or shorts"]'::jsonb, '["/assets/products/polo-navy.png","/assets/products/polo-white.png","/assets/products/polo-black.png","/assets/products/polo-brown.png"]'::jsonb, 1, 'contain', 'contain', '#F7F7F5', '[{"name":"Navy Blue","hex":"#161D2B","imageIndex":0},{"name":"White","hex":"#F6F5F0","imageIndex":1},{"name":"Black","hex":"#141416","imageIndex":2},{"name":"Brown","hex":"#4B3628","imageIndex":3}]'::jsonb, '["M","L","XL"]'::jsonb, 'in-stock', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-007', 'Spartan Female', 'Perfume', 0, null, '{"100 ml":1599,"50 ml":899,"15 ml":399}'::jsonb, 'Eau de Parfum', 'Elegant and captivating Eau de Parfum presented in faceted rose glass. Luminous Damask rose and white peony settle into warm cashmere wood.', '["Eau de Parfum concentration with 8–10 hour longevity","Notes of Damask rose, white peony, pink pepper, and ambergris","Offered in 100 ml flacon, 50 ml edition, and 15 ml travel spray","Embossed rose-toned presentation box"]'::jsonb, '["/assets/products/perfume-female-1.png","/assets/products/perfume-female-2.png"]'::jsonb, 1, 'cover-center', 'cover-center', '#D8B8B4', '[]'::jsonb, '["100 ml","50 ml","15 ml"]'::jsonb, 'in-stock', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-003', 'SAF1', 'Shoes/Sneakers', 5999, null, null, null, 'Minimalist low-top court sneaker crafted in smooth chalk leather with tonal suede toe-cap and heel overlays.', '["Full-grain chalk leather and soft tonal suede panelling","Perforated breathable vamp with SPARTA tongue stamp","High-density stitched rubber cupsole","Cushioned leather-lined collar"]'::jsonb, '["/assets/products/saf1-white.png","/assets/products/saf1-2.png","/assets/products/saf1-3.png","/assets/products/saf1-4.png"]'::jsonb, 2, 'cover-center', 'cover-center', '#CFCAC2', '[{"name":"White","hex":"#EAE8E3","imageIndex":0}]'::jsonb, '["40","42","43","44"]'::jsonb, 'out-of-stock', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-004', 'Spartan Head Cap', 'Accessories', 1499, 1763, null, '15% Off', 'Structured six-panel cap in heavyweight brushed cotton twill featuring raised silver Spartan helmet embroidery.', '["Structured six-panel crown with curved visor","Heavyweight washed black cotton twill","Polished metal buckle back strap","Embroidered tonal eyelets"]'::jsonb, '["/assets/products/cap-black.png","/assets/products/cap-2.png","/assets/products/cap-3.png","/assets/products/cap-4.png"]'::jsonb, 2, 'cover-center', 'cover-center', '#E6E5E2', '[{"name":"Black","hex":"#161618","imageIndex":0}]'::jsonb, '["Free Size"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-005', 'SPARTAN MAN', 'Perfume', 0, null, '{"100 ml":1199,"50 ml":799,"15 ml":299}'::jsonb, 'Eau de Parfum', 'Signature masculine Eau de Parfum by SPARTA. Crisp Calabrian bergamot and black pepper layered over dry cedarwood, vetiver, and warm amber.', '["High-oil Eau de Parfum concentration","Notes of bergamot, black pepper, dry cedarwood, and ambroxan","Available in 100 ml, 50 ml, and 15 ml formats","Architectural heavy glass flacon with knurled matte cap"]'::jsonb, '["/assets/products/perfume-man-1.png","/src/assets/images/spartan_man_editorial_1793639288096.jpg"]'::jsonb, 1, 'cover-center', 'cover-center', '#CEC7BC', '[]'::jsonb, '["100 ml","50 ml","15 ml"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-006', 'Spartan Vampired Blood', 'Perfume', 0, null, '{"100 ml":899,"50 ml":599}'::jsonb, 'Noir Edition', 'Bold nocturnal fragrance composed for evening wear. Deep blood orange, dark cherry, saffron, and smoky resinous oud.', '["Intense nocturnal Eau de Parfum sillage","Notes of blood orange, black cherry, saffron, and dark oud","Available in 100 ml and 50 ml flacons"]'::jsonb, '["/assets/products/perfume-vampire-1.png","/src/assets/images/vampire_blood_editorial_1793639289573.jpg"]'::jsonb, 1, 'cover-center', 'cover-center', '#191113', '[]'::jsonb, '["100 ml","50 ml"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-009', 'Signature Oxford Shirt', 'Upperwear', 899, null, null, null, 'Crisp tailored button-down Oxford shirt woven from breathable combed cotton for effortless year-round structure.', '["100% combed cotton basketweave Oxford cloth","Softly rolled button-down collar","Tailored torso taper with back box pleat"]'::jsonb, '["/assets/products/oxford-white.png","/assets/products/oxford-black.png"]'::jsonb, 1, 'contain', 'contain', '#F7F7F5', '[{"name":"White","hex":"#F7F7F7","imageIndex":0},{"name":"Black","hex":"#161618","imageIndex":1}]'::jsonb, '["M","L","XL","XXL"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-010', 'Denim Shorts', 'Bottomwear', 899, null, null, null, 'Heavyweight washed cotton denim shorts cut cleanly above the knee with classic five-pocket hardware.', '["13 oz structured cotton denim","Relaxed straight leg silhouette","Classic five-pocket construction with tonal stitching"]'::jsonb, '["/assets/products/shorts-offwhite.png","/assets/products/shorts-black.png","/assets/products/shorts-3.png","/assets/products/shorts-4.png","/assets/products/shorts-5.png","/assets/products/shorts-6.png"]'::jsonb, 1, 'contain', 'contain', '#F6F6F4', '[{"name":"Off White","hex":"#EAE7E0","imageIndex":0},{"name":"Black","hex":"#18181B","imageIndex":1}]'::jsonb, '["M","L","XL"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('sparta-011', 'Sparta Army 2025', 'Shoes/Sneakers', 3999, null, null, '2025 Archive', 'German-trainer inspired low-profile sneaker pairing supple chalk calfskin with Dove-grey suede overlays.', '["Supple chalk leather upper with grey suede overlays","Minimalist SPARTA side-panel foil stamp","Low-profile rubber court sole"]'::jsonb, '["/assets/products/army-1.png","/assets/products/army-2.png","/assets/products/army-3.png","/assets/products/army-4.png"]'::jsonb, 3, 'cover-center', 'contain', '#C7C7C9', '[]'::jsonb, '["40","42","43","44"]'::jsonb, 'coming-soon', 50, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;
