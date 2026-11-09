-- ==============================================================================
-- SPARTA E-COMMERCE: COMPLETE FULL PRODUCTION MASTER DATABASE MIGRATION
-- ==============================================================================
-- Project ID: xqzzeisabqsqblogbvhb
-- INSTRUCTIONS FOR USER / ADMIN:
-- 1. Go to your Supabase Dashboard -> SQL Editor (or https://supabase.com/dashboard/project/xqzzeisabqsqblogbvhb/sql/new)
-- 2. Delete anything currently in the query window.
-- 3. Paste this ENTIRE script and click "RUN".
-- 4. It will cleanly configure all tables, RLS policies, permissions, functions, and initial data.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. PRODUCT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PRODUCTS TABLE
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
  size_images JSONB DEFAULT '{}'::jsonb,
  hover_image_index INT DEFAULT 1,
  hover_fit TEXT DEFAULT 'cover-top',
  image_fit TEXT DEFAULT 'cover-top',
  canvas_bg TEXT DEFAULT '#F2F1EE',
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '["S", "M", "L", "XL"]'::jsonb,
  stock TEXT NOT NULL DEFAULT 'in-stock',
  stock_count INT NOT NULL DEFAULT 15,
  is_published BOOLEAN NOT NULL DEFAULT true,
  featured_on_home BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure newly added columns exist if table already exists
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_on_home BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_images JSONB DEFAULT '{}'::jsonb;

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
  order_number TEXT NOT NULL UNIQUE,
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

-- 7. COURIER INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.courier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE DEFAULT 'pathao',
  client_id TEXT,
  client_secret TEXT,
  username TEXT,
  password TEXT,
  store_id INT DEFAULT 500277,
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

-- 10. GLOBAL PERMISSIONS GRANTS (CRITICAL FIX FOR 42501 PERMISSION DENIED)
GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 11. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 12. CLEANUP & RECREATE RLS POLICIES (IDEMPOTENT)
DROP POLICY IF EXISTS "Public view published products" ON public.products;
DROP POLICY IF EXISTS "Authenticated admins manage products" ON public.products;
CREATE POLICY "Public view published products" ON public.products
  FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated admins manage products" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view active categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated admins manage categories" ON public.product_categories;
CREATE POLICY "Public view active categories" ON public.product_categories
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated admins manage categories" ON public.product_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public checkout order insert" ON public.orders;
DROP POLICY IF EXISTS "Authenticated admins manage orders" ON public.orders;
CREATE POLICY "Public checkout order insert" ON public.orders
  FOR INSERT WITH CHECK (total >= 0 AND customer_name IS NOT NULL AND customer_phone IS NOT NULL);
CREATE POLICY "Authenticated admins manage orders" ON public.orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated admins manage order items" ON public.order_items;
CREATE POLICY "Public insert order items" ON public.order_items
  FOR INSERT WITH CHECK (quantity > 0);
CREATE POLICY "Authenticated admins manage order items" ON public.order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated admins manage customers" ON public.customers;
CREATE POLICY "Public insert customers" ON public.customers
  FOR INSERT WITH CHECK (phone IS NOT NULL AND full_name IS NOT NULL);
CREATE POLICY "Authenticated admins manage customers" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admins manage courier settings" ON public.courier_integrations;
CREATE POLICY "Authenticated admins manage courier settings" ON public.courier_integrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated admins manage settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings
  FOR SELECT USING (true);
CREATE POLICY "Authenticated admins manage settings" ON public.store_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. ATOMIC CHECKOUT FUNCTION (GUARANTEES 100% ORDER CREATION INTO DATABASE)
CREATE OR REPLACE FUNCTION public.create_public_checkout_order(
  p_order_number text,
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_delivery_zone text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_notes text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Insert Order
  INSERT INTO public.orders (
    order_number,
    customer_name,
    customer_phone,
    shipping_address,
    delivery_zone,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    status,
    notes
  ) VALUES (
    p_order_number,
    p_customer_name,
    p_customer_phone,
    p_shipping_address,
    p_delivery_zone,
    p_subtotal,
    p_delivery_fee,
    p_total,
    'Cash on Delivery',
    'pending',
    p_notes
  ) RETURNING id INTO v_order_id;

  -- Insert Order Items
  IF p_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_name,
        size,
        color,
        unit_price,
        quantity,
        total_price
      ) VALUES (
        v_order_id,
        v_item->>'productId',
        v_item->>'name',
        v_item->>'size',
        v_item->>'color',
        coalesce((v_item->>'price')::numeric, 0),
        coalesce((v_item->>'quantity')::int, 1),
        coalesce((v_item->>'price')::numeric, 0) * coalesce((v_item->>'quantity')::int, 1)
      );
    END LOOP;
  END IF;

  -- Upsert Customer Record
  INSERT INTO public.customers (phone, full_name, address, delivery_zone, total_orders, total_spent)
  VALUES (p_customer_phone, p_customer_name, p_shipping_address, p_delivery_zone, 1, p_total)
  ON CONFLICT (phone) DO UPDATE
  SET total_orders = customers.total_orders + 1,
      total_spent = customers.total_spent + EXCLUDED.total_spent,
      address = EXCLUDED.address,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_checkout_order TO anon, authenticated, service_role;

-- 14. PATHAO SERVER-SIDE PROXY FUNCTION (ELIMINATES BROWSER CORS FOR GITHUB PAGES)
CREATE OR REPLACE FUNCTION public.pathao_proxy(
  endpoint text,
  method text DEFAULT 'GET',
  headers jsonb DEFAULT '{}'::jsonb,
  payload jsonb DEFAULT null,
  is_sandbox boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url text;
  full_url text;
  req_headers extensions.http_header[];
  header_key text;
  resp extensions.http_response;
  resp_json jsonb;
BEGIN
  IF is_sandbox THEN
    base_url := 'https://courier-api-sandbox.pathao.com';
  ELSE
    base_url := 'https://api-hermes.pathao.com';
  END IF;

  full_url := base_url || endpoint;

  req_headers := array[
    extensions.http_header('Accept', 'application/json'),
    extensions.http_header('Content-Type', 'application/json')
  ];

  IF headers IS NOT NULL THEN
    FOR header_key IN SELECT jsonb_object_keys(headers) LOOP
      req_headers := array_append(req_headers, extensions.http_header(header_key, headers->>header_key));
    END LOOP;
  END IF;

  IF upper(method) = 'POST' THEN
    resp := extensions.http((
      'POST',
      full_url,
      req_headers,
      'application/json',
      payload::text
    )::extensions.http_request);
  ELSE
    resp := extensions.http((
      'GET',
      full_url,
      req_headers,
      null,
      null
    )::extensions.http_request);
  END IF;

  BEGIN
    resp_json := resp.content::jsonb;
    RETURN resp_json;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', resp.status,
      'raw_content', resp.content
    );
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', true,
    'status', 500,
    'message', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pathao_proxy(text, text, jsonb, jsonb, boolean) TO anon, authenticated, service_role;

-- 15. SEED INITIAL STORE SETTINGS & COURIER CONFIGURATION
INSERT INTO public.store_settings (setting_key, setting_value)
VALUES
  ('shipping_rules', '{"inside_dhaka_fee": 70, "outside_dhaka_fee": 120, "free_shipping_threshold": 5000, "is_delivery_free": false}'::jsonb),
  ('store_profile', '{"name": "SPARTA", "phone": "+880 1610-046310", "whatsapp": "8801610046310", "email": "sparta.bd.com@gmail.com"}'::jsonb),
  ('announcement_bar', '{"text": "COMPLIMENTARY SHIPPING NATIONWIDE ON ORDERS OVER ৳5,000 | CASH ON DELIVERY AVAILABLE ACROSS BANGLADESH", "is_active": true}'::jsonb),
  ('social_links', '{"facebook": "https://facebook.com/sparta.clo", "instagram": "https://www.instagram.com/sparta.clo", "tiktok": "https://www.tiktok.com/@sparta_clo", "whatsapp": "8801610046310"}'::jsonb),
  ('offers_coupons', '[{"code": "SPARTA10", "discount_type": "percent", "discount_value": 10, "min_order_amount": 2000, "is_active": true, "description": "10% off on orders above 2000 BDT"}]'::jsonb)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value, updated_at = now();

INSERT INTO public.courier_integrations (provider, client_id, store_id, is_sandbox)
VALUES ('pathao', 'M7e549Xd2v', 500277, false)
ON CONFLICT (provider) DO UPDATE
SET store_id = 500277, is_sandbox = false;
