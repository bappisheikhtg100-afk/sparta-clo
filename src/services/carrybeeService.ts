/**
 * Carrybee Courier Merchant API Service for SPARTA E-Commerce
 * Based on Official Carrybee Developers API v2.0
 * Features:
 *  - Client-ID, Client-Secret, Client-Context Authentication
 *  - Multi-Environment Support (Production & Sandbox)
 *  - Store ID auto-discovery and management
 *  - Single & Bulk Order Dispatch
 *  - Real-time Parcel Tracking (/api/v2/orders/{consignment_id}/details)
 *  - Hybrid Gateway: Local Vite reverse proxy in development + Direct/Supabase Fallback
 */

import { supabase } from '../lib/supabase';
import { normalizeBangladeshPhone } from './pathaoService';

export interface CarrybeeCredentials {
  clientId: string;
  clientSecret: string;
  clientContext: string;
  storeId?: string;
  isSandbox?: boolean;
}

export interface CarrybeeStore {
  id: string;
  name: string;
  contact_person_name?: string;
  contact_person_number?: string;
  address: string;
  city_id?: number;
  zone_id?: number;
  area_id?: number;
  is_active: boolean;
  is_approved?: boolean;
  is_default_pickup_store?: boolean;
}

export interface CarrybeeCreateOrderPayload {
  store_id?: string;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_address: string;
  city_id?: number;
  zone_id?: number;
  area_id?: number;
  delivery_type?: number; // 1 = Normal, 2 = Express
  product_type?: number; // 1 = Parcel, 2 = Book, 3 = Document
  item_type?: number; // alias for product_type
  item_weight?: number; // in grams (default 500)
  item_quantity?: number; // default 1
  collectable_amount?: number; // COD amount
  amount_to_collect?: number; // alias for collectable_amount
  special_instruction?: string;
  product_description?: string;
  item_description?: string; // alias for product_description
}

export interface CarrybeeOrderResult {
  consignment_id: string;
  store_id: string;
  merchant_order_id: string;
  collectable_amount: number;
  cod_fee?: number;
  delivery_fee?: number;
  order_status?: string;
}

export interface CarrybeeTrackingInfo {
  consignment_id: string;
  merchant_order_id: string;
  transfer_status: string;
  order_status?: string;
  hub?: string;
  payment_status?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  collectable_amount?: number;
  delivery_fee?: number;
  updated_at: string;
}

const STORAGE_KEY_CARRYBEE_CREDS = 'sparta_carrybee_credentials_v1';

export const CARRYBEE_PRODUCTION_DEFAULTS: CarrybeeCredentials = {
  clientId: 'ae2fce67-a7b6-4749-82ff-7735c6240276',
  clientSecret: '1164e314-3dc5-461c-8abf-701b7916c360',
  clientContext: 'MJh6nyloHRUQemOjrJSYwEbdaLFTuX',
  isSandbox: false,
};

export const CARRYBEE_SANDBOX_DEFAULTS: CarrybeeCredentials = {
  clientId: '1a89c1a6-fc68-4395-9c09-628e0d3eaafc',
  clientSecret: '1d7152c9-5b2d-4e4e-9c20-652b93333704',
  clientContext: 'DzJwPsx31WaTbS745XZoBjmQLcNqwK',
  isSandbox: true,
};

export function getStoredCarrybeeCredentials(): CarrybeeCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARRYBEE_CREDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...CARRYBEE_PRODUCTION_DEFAULTS,
        ...parsed,
      };
    }
  } catch {
    // fallback
  }

  return { ...CARRYBEE_PRODUCTION_DEFAULTS };
}

export function saveCarrybeeCredentials(creds: CarrybeeCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARRYBEE_CREDS, JSON.stringify(creds));
    // Asynchronously sync to Supabase store_settings so it persists across all admin sessions
    void (async () => {
      try {
        await supabase.from('store_settings').upsert({
          setting_key: 'carrybee_credentials',
          setting_value: creds,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Carrybee Supabase sync notice:', err);
      }
    })();
  } catch {
    // ignore
  }
}

export async function syncCarrybeeCredentialsFromSupabase(): Promise<CarrybeeCredentials> {
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'carrybee_credentials')
      .maybeSingle();

    if (data?.setting_value && data.setting_value.clientId) {
      const parsed = data.setting_value as CarrybeeCredentials;
      localStorage.setItem(STORAGE_KEY_CARRYBEE_CREDS, JSON.stringify(parsed));
      return parsed;
    }
  } catch (err) {
    console.warn('Could not sync Carrybee credentials from Supabase:', err);
  }
  return getStoredCarrybeeCredentials();
}

/**
 * Universal Carrybee API executor with Vite dev proxy and direct/fallback handling
 */
export async function executeCarrybeeCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: any;
    creds?: CarrybeeCredentials;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const creds = options.creds || getStoredCarrybeeCredentials();

  if (!creds.clientId || !creds.clientSecret || !creds.clientContext) {
    throw new Error('Carrybee API credentials are not configured. Please check Settings & Integrations.');
  }

  const isDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname.includes('run.app') ||
      window.location.port === '3000' ||
      window.location.origin.includes('ais-'));

  const authHeaders: Record<string, string> = {
    'Client-ID': creds.clientId.trim(),
    'Client-Secret': creds.clientSecret.trim(),
    'Client-Context': creds.clientContext.trim(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // 1. In dev environment: use local proxy to avoid CORS
  if (isDev) {
    const proxyBase = creds.isSandbox ? '/carrybee-proxy-sandbox' : '/carrybee-proxy-live';
    const res = await fetch(`${proxyBase}${endpoint}`, {
      method,
      headers: authHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const resJson = await res.json().catch(async () => {
      const txt = await res.text();
      return { error: true, message: txt };
    });

    if (!res.ok || resJson.error) {
      const msg = resJson.message || `Carrybee API error (${res.status})`;
      throw new Error(msg);
    }

    return resJson as T;
  }

  // 2. Production: direct fetch with CORS handling
  const directBase = creds.isSandbox ? 'https://sandbox.carrybee.com' : 'https://developers.carrybee.com';
  try {
    const res = await fetch(`${directBase}${endpoint}`, {
      method,
      headers: authHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const resJson = await res.json().catch(async () => {
      const txt = await res.text();
      return { error: true, message: txt };
    });

    if (!res.ok || resJson.error) {
      const msg = resJson.message || `Carrybee error (${res.status})`;
      throw new Error(msg);
    }

    return resJson as T;
  } catch (err: any) {
    throw new Error(err?.message || 'Carrybee gateway connection failed');
  }
}

/**
 * Fetch registered pickup stores for authenticated merchant
 */
export async function fetchCarrybeeStores(customCreds?: CarrybeeCredentials): Promise<CarrybeeStore[]> {
  const creds = customCreds || getStoredCarrybeeCredentials();
  const res = await executeCarrybeeCall<any>('/api/v2/stores', {
    method: 'GET',
    creds,
  });

  const storesList = res?.data?.stores || res?.stores || [];
  return Array.isArray(storesList) ? storesList : [];
}

/**
 * Dynamically resolves a valid store ID for Carrybee merchant
 */
export async function resolveCarrybeeStoreId(
  creds: CarrybeeCredentials,
  requestedStoreId?: string
): Promise<string> {
  if (requestedStoreId && requestedStoreId.trim()) {
    return requestedStoreId.trim();
  }

  if (creds.storeId && creds.storeId.trim()) {
    return creds.storeId.trim();
  }

  try {
    const stores = await fetchCarrybeeStores(creds);
    if (stores && stores.length > 0) {
      const active = stores.find((s) => s.is_active) || stores[0];
      const validId = String(active.id);
      creds.storeId = validId;
      saveCarrybeeCredentials(creds);
      return validId;
    }
  } catch (err) {
    console.warn('Could not auto-fetch Carrybee stores:', err);
  }

  return '1';
}

/**
 * Dispatch an order parcel to Carrybee Courier
 * Endpoint: POST /api/v2/orders
 */
export async function createCarrybeeOrder(
  payload: CarrybeeCreateOrderPayload,
  customCreds?: CarrybeeCredentials
): Promise<CarrybeeOrderResult> {
  const creds = customCreds || getStoredCarrybeeCredentials();
  const storeId = await resolveCarrybeeStoreId(creds, payload.store_id);

  // Address length: 10 to 200 chars
  let address = (payload.recipient_address || '').trim();
  if (address.length < 10) address = `${address}, Bangladesh`;
  if (address.length > 200) address = address.substring(0, 200);

  // Name length: 2 to 99 chars
  let name = (payload.recipient_name || 'Customer').trim();
  if (name.length < 2) name = `${name} Client`;
  if (name.length > 99) name = name.substring(0, 99);

  const phone = normalizeBangladeshPhone(payload.recipient_phone);

  const body: Record<string, any> = {
    store_id: storeId,
    merchant_order_id: payload.merchant_order_id,
    delivery_type: payload.delivery_type || 1, // 1=Normal, 2=Express
    product_type: payload.product_type || payload.item_type || 1, // 1=Parcel
    recipient_phone: phone,
    recipient_name: name,
    recipient_address: address,
    item_weight: Math.max(100, Math.min(25000, Number(payload.item_weight) || 500)), // grams!
    item_quantity: Math.max(1, payload.item_quantity || 1),
    collectable_amount: Math.round(Number(payload.collectable_amount ?? payload.amount_to_collect) || 0),
    product_description: payload.product_description || payload.item_description || 'SPARTA Luxury Apparel Piece',
    special_instruction: payload.special_instruction || 'Please call before delivery. Fragile luxury item.',
  };

  if (payload.recipient_secondary_phone) {
    body.recipient_secondary_phone = normalizeBangladeshPhone(payload.recipient_secondary_phone);
  }
  if (payload.city_id) body.city_id = payload.city_id;
  if (payload.zone_id) body.zone_id = payload.zone_id;
  if (payload.area_id) body.area_id = payload.area_id;

  const res = await executeCarrybeeCall<any>('/api/v2/orders', {
    method: 'POST',
    creds,
    body,
  });

  const orderData = res?.data?.order || res?.data || {};

  if (!orderData?.consignment_id) {
    throw new Error(res?.message || 'Carrybee rejected shipment order creation.');
  }

  const cod = Number(orderData.collectable_amount) || Number(payload.collectable_amount ?? payload.amount_to_collect) || 0;

  return {
    consignment_id: orderData.consignment_id,
    store_id: orderData.store_id || storeId,
    merchant_order_id: payload.merchant_order_id,
    collectable_amount: cod,
    cod_fee: Number(orderData.cod_fee) || 15,
    delivery_fee: Number(orderData.delivery_fee) || 0,
    order_status: 'Created / Processing',
  };
}

/**
 * Track an order consignment with Carrybee
 * Endpoint: GET /api/v2/orders/{consignment_id}/details
 */
export async function trackCarrybeeOrder(
  consignmentId: string,
  customCreds?: CarrybeeCredentials
): Promise<CarrybeeTrackingInfo> {
  const creds = customCreds || getStoredCarrybeeCredentials();

  const res = await executeCarrybeeCall<any>(`/api/v2/orders/${encodeURIComponent(consignmentId)}/details`, {
    method: 'GET',
    creds,
  });

  const data = res?.data || {};

  return {
    consignment_id: data.consignment_id || consignmentId,
    merchant_order_id: data.merchant_order_id || '',
    transfer_status: data.transfer_status || data.order_status || 'In Transit',
    order_status: data.order_status || data.transfer_status || 'In Transit',
    hub: data.hub_name || data.hub || 'Central Sorting Hub',
    payment_status: data.payment_status || 'Unpaid',
    recipient_name: data.recipient_name || '',
    recipient_phone: data.recipient_phone || '',
    recipient_address: data.recipient_address || '',
    collectable_amount: Number(data.collectable_amount) || 0,
    delivery_fee: Number(data.delivery_fee) || 0,
    updated_at: data.updated_at || new Date().toISOString(),
  };
}
