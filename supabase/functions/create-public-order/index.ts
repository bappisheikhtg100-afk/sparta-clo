import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { shipping, items, subtotal, deliveryFee, total, orderNumber } = await req.json();

    if (!shipping?.fullName || !shipping?.phone || !shipping?.address || !items?.length) {
      return new Response(JSON.stringify({ error: 'Missing required order fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullAddress = `${shipping.address}, ${shipping.thana}, ${shipping.district}, ${shipping.division}`;

    // 1. Insert order
    const { data: orderData, error: orderErr } = await supabaseClient
      .from('orders')
      .insert({
        order_number: orderNumber || `SPT-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_name: shipping.fullName,
        customer_phone: shipping.phone,
        shipping_address: fullAddress,
        delivery_zone: shipping.deliveryZone || 'inside-dhaka',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: 'Cash on Delivery',
        status: 'pending',
        notes: shipping.notes || null,
      })
      .select('id, order_number')
      .single();

    if (orderErr) throw orderErr;

    // 2. Insert items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.name,
      size: item.size,
      color: item.color || null,
      unit_price: item.price,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsErr } = await supabaseClient.from('order_items').insert(orderItems);
    if (itemsErr) throw itemsErr;

    // 3. Upsert customer
    await supabaseClient.from('customers').upsert({
      phone: shipping.phone,
      full_name: shipping.fullName,
      address: fullAddress,
      delivery_zone: shipping.deliveryZone || 'inside-dhaka',
    });

    return new Response(
      JSON.stringify({ success: true, orderId: orderData.order_number, id: orderData.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
