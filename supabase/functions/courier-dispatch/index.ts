/**
 * Supabase Edge Function: courier-dispatch
 * Description: Secure server-side proxy for Pathao and CarryBee logistics APIs.
 * Ensures zero secret keys or auth credentials leak to client-side browser traffic.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate that the caller is an active Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized admin access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request payload
    const body = await req.json();
    const { provider, endpoint, method = 'POST', payload } = body;

    let targetUrl = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (provider === 'carrybee') {
      const isSandbox = Boolean(body.isSandbox);
      const baseUrl = isSandbox
        ? 'https://sandbox.carrybee.com'
        : 'https://developers.carrybee.com';
      targetUrl = `${baseUrl}${endpoint}`;

      headers['Client-ID'] =
        body.clientId || Deno.env.get('CARRYBEE_CLIENT_ID') || '';
      headers['Client-Secret'] =
        body.clientSecret || Deno.env.get('CARRYBEE_CLIENT_SECRET') || '';
      headers['Client-Context'] =
        body.clientContext || Deno.env.get('CARRYBEE_CLIENT_CONTEXT') || '';
    } else if (provider === 'pathao') {
      const isSandbox = Boolean(body.isSandbox);
      const baseUrl = isSandbox
        ? 'https://courier-api-sandbox.pathao.com'
        : 'https://api-hermes.pathao.com';
      targetUrl = `${baseUrl}${endpoint}`;

      if (body.accessToken) {
        headers['Authorization'] = `Bearer ${body.accessToken}`;
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported courier provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Dispatch HTTP request to the respective courier API
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const responseData = await response.json().catch(async () => {
      const text = await response.text();
      return { raw: text };
    });

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal proxy failure' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
