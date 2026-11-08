-- ==============================================================================
-- SPARTA E-COMMERCE: PATHAO COURIER BACKEND PROXY & SUPABASE PERMISSIONS FIX
-- ==============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor (Click "New query" -> Paste -> "Run")
-- This does 2 essential things:
--  1. Fixes "permission denied for table products / store_settings" (42501)
--  2. Creates a secure Server-Side HTTP Proxy for Pathao Courier API so GitHub Pages
--     never gets blocked by browser CORS ("Failed to fetch").
-- ==============================================================================

-- 1. ENABLE HTTP EXTENSION
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. GRANT PERMISSIONS ON ALL PUBLIC TABLES & SCHEMAS
GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. CREATE SECURE PATHAO PROXY FUNCTION
-- This allows your website on GitHub Pages to safely talk to Pathao API via Supabase
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

  -- Default headers
  req_headers := array[
    extensions.http_header('Accept', 'application/json'),
    extensions.http_header('Content-Type', 'application/json')
  ];

  -- Append custom headers (e.g. Authorization)
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
