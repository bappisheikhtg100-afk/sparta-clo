import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pathao-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { consignment_id, merchant_order_id, order_status, event } = body;

    if (!merchant_order_id && !consignment_id) {
      return new Response(JSON.stringify({ error: 'Missing order identifiers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Pathao courier status to SPARTA order status
    let mappedStatus = 'processing';
    const statusLower = (order_status || event || '').toLowerCase();

    if (statusLower.includes('deliver') || statusLower.includes('successful')) {
      mappedStatus = 'delivered';
    } else if (statusLower.includes('return')) {
      mappedStatus = 'cancelled';
    } else if (statusLower.includes('transit') || statusLower.includes('picked')) {
      mappedStatus = 'shipped';
    }

    // Update order in Supabase
    const { data, error } = await supabaseClient
      .from('orders')
      .update({
        status: mappedStatus,
        courier_status: order_status || event,
        updated_at: new Date().toISOString(),
      })
      .or(`order_number.eq.${merchant_order_id},consignment_id.eq.${consignment_id}`)
      .select('id, order_number, status');

    if (error) {
      console.error('Webhook database update failed:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, updatedOrders: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
