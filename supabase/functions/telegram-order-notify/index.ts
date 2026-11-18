/**
 * Supabase Edge Function: telegram-order-notify
 * Triggered securely via Supabase Database Webhook (INSERT on public.orders).
 * Reads order & order_items directly from PostgreSQL using SERVICE_ROLE_KEY,
 * prevents duplicate notifications with an atomic DB claim lock, and posts
 * formatted order alerts to Telegram using Supabase Edge Function Secrets.
 *
 * Required Secrets (set in Supabase Dashboard / CLI):
 *   - TELEGRAM_BOT_TOKEN
 *   - TELEGRAM_CHAT_ID (single ID or comma-separated IDs)
 * Optional Secret:
 *   - TELEGRAM_WEBHOOK_SECRET (recommended header verification: x-webhook-secret)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatBDT(amount: unknown): string {
  const num = Number(amount) || 0;
  return `৳${num.toLocaleString('en-IN')}`;
}

function formatDhakaTime(isoDate?: string): string {
  try {
    const dt = isoDate ? new Date(isoDate) : new Date();
    return dt.toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date().toISOString();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const botToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '').trim();
    const rawChatIds = (Deno.env.get('TELEGRAM_CHAT_ID') ?? '').trim();
    const webhookSecret = (Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '').trim();

    // 1. Optional shared webhook secret verification (if configured in Secrets)
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret')?.trim() ?? '';
      const authHeader = req.headers.get('authorization')?.trim() ?? '';
      const isAuthorized =
        providedSecret === webhookSecret ||
        (serviceRoleKey !== '' && authHeader === `Bearer ${serviceRoleKey}`);

      if (!isAuthorized) {
        return jsonResponse({ error: 'Unauthorized webhook request' }, 401);
      }
    }

    // 2. Ensure Telegram Secrets are configured BEFORE claiming DB row
    if (!botToken || !rawChatIds) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Supabase Secrets');
      return jsonResponse(
        { error: 'Telegram secrets (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) are not configured.' },
        500
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase server credentials' }, 500);
    }

    const chatIds = rawChatIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (chatIds.length === 0) {
      return jsonResponse({ error: 'No valid chat IDs in TELEGRAM_CHAT_ID secret' }, 500);
    }

    // 3. Parse Database Webhook payload
    const payload = await req.json();

    if (payload?.type && payload.type !== 'INSERT') {
      return jsonResponse({ skipped: true, reason: `Ignored event type: ${payload.type}` }, 200);
    }

    if (payload?.table && payload.table !== 'orders') {
      return jsonResponse({ skipped: true, reason: `Ignored table: ${payload.table}` }, 200);
    }

    const record = payload?.record ?? payload;
    const orderId: string | undefined = record?.id || payload?.order_id;

    if (!orderId || typeof orderId !== 'string') {
      return jsonResponse({ error: 'Missing order record ID in webhook payload' }, 400);
    }

    // Fast duplicate check from webhook record snapshot
    if (record?.telegram_notified_at || record?.telegram_notification_claimed === true) {
      return jsonResponse({ skipped: true, reason: 'Order already notified' }, 200);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4. Atomic claim lock in PostgreSQL to guarantee ZERO duplicate notifications
    const { data: claimedOrder, error: claimErr } = await supabaseAdmin
      .from('orders')
      .update({ telegram_notification_claimed: true })
      .eq('id', orderId)
      .eq('telegram_notification_claimed', false)
      .is('telegram_notified_at', null)
      .select('*')
      .maybeSingle();

    if (claimErr) {
      console.error('Failed to claim order for Telegram notification:', claimErr.message);
      return jsonResponse({ error: claimErr.message }, 500);
    }

    if (!claimedOrder) {
      return jsonResponse(
        { skipped: true, reason: 'Order already claimed/notified or does not exist' },
        200
      );
    }

    // 5. Fetch authoritative order_items directly from DB (1 short retry covers non-RPC fallback inserts)
    let { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_name, size, color, unit_price, quantity, total_price')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!items || items.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const retryRes = await supabaseAdmin
        .from('order_items')
        .select('product_name, size, color, unit_price, quantity, total_price')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      items = retryRes.data ?? [];
    }

    const totalQty = (items ?? []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 1),
      0
    );

    const itemLines =
      items && items.length > 0
        ? items
            .map((it) => {
              const variantParts = [it.size, it.color].filter(Boolean).map(escapeHtml);
              const variantText = variantParts.length > 0 ? ` (${variantParts.join(' · ')})` : '';
              const qty = Number(it.quantity) || 1;
              const lineTotal =
                Number(it.total_price) || (Number(it.unit_price) || 0) * qty;
              return `• <b>${qty}×</b> ${escapeHtml(it.product_name)}${variantText} — ${formatBDT(
                lineTotal
              )}`;
            })
            .join('\n')
        : '• <i>Item details pending</i>';

    const deliveryZoneLabel =
      claimedOrder.delivery_zone === 'outside-dhaka' ? 'Outside Dhaka' : 'Inside Dhaka';

    const deliveryFeeText =
      Number(claimedOrder.delivery_fee) > 0
        ? formatBDT(claimedOrder.delivery_fee)
        : 'Complimentary (Free)';

    const messageParts = [
      `🛍 <b>NEW COD ORDER — SPARTA</b>`,
      ``,
      `🆔 <b>Order ID:</b> <code>${escapeHtml(claimedOrder.order_number)}</code>`,
      `🕒 <b>Time:</b> ${escapeHtml(formatDhakaTime(claimedOrder.created_at))}`,
      ``,
      `👤 <b>Customer:</b> ${escapeHtml(claimedOrder.customer_name)}`,
      `📞 <b>Phone:</b> <code>${escapeHtml(claimedOrder.customer_phone)}</code>`,
      `📍 <b>Zone:</b> ${escapeHtml(deliveryZoneLabel)}`,
      `🏠 <b>Address:</b> ${escapeHtml(claimedOrder.shipping_address)}`,
      ``,
      `📦 <b>Product Details (Total Qty: ${totalQty}):</b>`,
      itemLines,
      ``,
      `💵 <b>Subtotal:</b> ${formatBDT(claimedOrder.subtotal)}`,
      `🚚 <b>Delivery Fee:</b> ${deliveryFeeText}`,
      `💰 <b>Total Amount:</b> <b>${formatBDT(claimedOrder.total)}</b>`,
      `💳 <b>Payment:</b> ${escapeHtml(claimedOrder.payment_method || 'Cash on Delivery')}`,
    ];

    if (claimedOrder.notes && String(claimedOrder.notes).trim()) {
      messageParts.push(`📝 <b>Note:</b> ${escapeHtml(claimedOrder.notes)}`);
    }

    const messageText = messageParts.join('\n');

    // 6. Dispatch notification to Telegram Bot API
    const sendResults = await Promise.all(
      chatIds.map(async (chatId) => {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });

        const tgData = await tgRes.json().catch(() => ({}));
        return {
          chatId,
          ok: tgRes.ok && tgData?.ok === true,
          error: tgData?.description || (!tgRes.ok ? `HTTP ${tgRes.status}` : undefined),
        };
      })
    );

    const anySucceeded = sendResults.some((r) => r.ok);

    if (!anySucceeded) {
      // Release lock so Supabase webhook retry can re-attempt delivery
      await supabaseAdmin
        .from('orders')
        .update({ telegram_notification_claimed: false })
        .eq('id', orderId);

      console.error('Telegram API delivery failed for all chat IDs:', sendResults);
      return jsonResponse(
        { error: 'Telegram API delivery failed', details: sendResults },
        502
      );
    }

    // 7. Mark notification timestamp permanently
    await supabaseAdmin
      .from('orders')
      .update({ telegram_notified_at: new Date().toISOString() })
      .eq('id', orderId);

    return jsonResponse({
      success: true,
      orderNumber: claimedOrder.order_number,
      deliveredTo: sendResults.filter((r) => r.ok).map((r) => r.chatId).length,
    });
  } catch (err: any) {
    console.error('telegram-order-notify exception:', err);
    return jsonResponse({ error: err?.message || 'Internal error' }, 500);
  }
});
