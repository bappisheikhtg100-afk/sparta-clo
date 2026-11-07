import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload, isSandbox } = await req.json();

    const baseUrl = isSandbox
      ? 'https://courier-api-sandbox.pathao.com'
      : 'https://api-hermes.pathao.com';

    const clientId = Deno.env.get('PATHAO_CLIENT_ID') || payload?.clientId;
    const clientSecret = Deno.env.get('PATHAO_CLIENT_SECRET') || payload?.clientSecret;
    const username = Deno.env.get('PATHAO_USERNAME') || payload?.username;
    const password = Deno.env.get('PATHAO_PASSWORD') || payload?.password;

    if (action === 'issue-token') {
      const response = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
          grant_type: 'password',
        }),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create-order') {
      const authHeader = req.headers.get('Authorization');
      const response = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: {
          Authorization: authHeader || `Bearer ${payload.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload.order),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
