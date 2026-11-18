-- ==============================================================================
-- SPARTA E-COMMERCE: TELEGRAM ORDER NOTIFICATION IDEMPOTENCY MIGRATION
-- ==============================================================================
-- Adds atomic claim & notification timestamp columns to public.orders so
-- duplicate Telegram notifications can never be sent on retries or race conditions.
-- ==============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS telegram_notification_claimed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_telegram_pending
  ON public.orders(id)
  WHERE telegram_notified_at IS NULL;
