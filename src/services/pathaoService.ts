/**
 * Pathao Courier Merchant API Service for SPARTA E-Commerce
 * Based on Official Pathao Merchant API Documentation (Aladdin v1)
 * Features:
 *  - OAuth 2.0 Password Grant & Token Caching
 *  - Full Auto-Address Support (NLP extraction from recipient_address without requiring city/zone dropdowns)
 *  - Store ID auto-discovery and management
 *  - Single & Bulk Order Dispatch
 *  - Consignment Status Tracking (/aladdin/api/v1/orders/{consignment_id}/info)
 *  - Nationwide City, Zone, and Area discovery
 *  - Live shipping fee rate calculation
 */

export interface PathaoCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId?: number;
  webhookSecret?: string;
  isSandbox?: boolean;
}

export interface PathaoTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number;
  city_id: number;
  zone_id: number;
  hub_id?: number;
  is_default_store?: boolean;
  is_default_return_store?: boolean;
}

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

export interface PathaoCreateOrderPayload {
  store_id?: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  delivery_type?: number; // 48 for normal delivery (default), 12 for on-demand
  item_type?: number; // 1 for Document, 2 for Parcel (default 2)
  special_instruction?: string;
  item_quantity?: number;
  item_weight?: number; // in KG between 0.5 and 10 (default 0.5)
  amount_to_collect: number; // COD amount
  item_description?: string;
}

export interface PathaoOrderResult {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee: number;
}

export interface PathaoTrackingInfo {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  order_status_slug: string;
  updated_at: string;
  invoice_id: string | null;
  payment_status?: string;
}

const STORAGE_KEY_CREDS = 'sparta_pathao_credentials_v2';
const STORAGE_KEY_TOKEN = 'sparta_pathao_token_v2';

/**
 * Official Pathao Developer Sandbox credentials
 * Reference: https://courier-api-sandbox.pathao.com / Developer API docs
 */
export const PATHAO_SANDBOX_DEFAULTS: PathaoCredentials = {
  clientId: '7N1aMJQbWm',
  clientSecret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
  username: 'test@pathao.com',
  password: 'lovePathao',
  storeId: 11, // "Demo Store" in Sandbox
  isSandbox: true,
};

export const PATHAO_PRODUCTION_DEFAULTS: PathaoCredentials = {
  clientId: 'M7e549Xd2v',
  clientSecret: 'HkyIjgXODf9GYMK9jiBxUi8mK1fD2auU4iyQns46',
  username: 'bappisheikhtg100@gmail.com',
  password: '%SH$w$$vup6AgH3',
  storeId: 500277, // Best Test Brand (Lalbagh, Dhaka)
  isSandbox: false,
};

export function getStoredPathaoCredentials(): PathaoCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-correct: If user credentials M7e549Xd2v are present with isSandbox=true, switch to false (they are live credentials)
      if (parsed.clientId === 'M7e549Xd2v' && parsed.isSandbox) {
        parsed.isSandbox = false;
        parsed.storeId = parsed.storeId || 500277;
        localStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(parsed));
      }
      return {
        ...PATHAO_PRODUCTION_DEFAULTS,
        ...parsed,
      };
    }
  } catch {
    // fallback
  }

  return {
    ...PATHAO_PRODUCTION_DEFAULTS,
    clientId: (import.meta.env.VITE_PATHAO_CLIENT_ID as string) || PATHAO_PRODUCTION_DEFAULTS.clientId,
    clientSecret: (import.meta.env.VITE_PATHAO_CLIENT_SECRET as string) || PATHAO_PRODUCTION_DEFAULTS.clientSecret,
    username: (import.meta.env.VITE_PATHAO_USERNAME as string) || PATHAO_PRODUCTION_DEFAULTS.username,
    password: (import.meta.env.VITE_PATHAO_PASSWORD as string) || PATHAO_PRODUCTION_DEFAULTS.password,
    storeId: 500277,
    isSandbox: false,
  };
}

export function savePathaoCredentials(creds: PathaoCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

export function getBaseUrl(isSandbox?: boolean): string {
  // When running in development / preview (localhost, port 3000, or cloud run),
  // route through Vite reverse proxy to eliminate browser CORS blocks
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname.includes('run.app') ||
      window.location.port === '3000' ||
      window.location.origin.includes('ais-'))
  ) {
    return isSandbox ? '/pathao-proxy-sandbox' : '/pathao-proxy-live';
  }
  return isSandbox
    ? 'https://courier-api-sandbox.pathao.com'
    : 'https://api-hermes.pathao.com';
}

/**
 * Clean Bangladesh phone numbers to strict 11-digit format (01XXXXXXXXX)
 */
export function normalizeBangladeshPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Issue or retrieve cached access token from Pathao OAuth2
 */
export async function getPathaoAccessToken(
  customCreds?: PathaoCredentials,
  forceRefresh = false
): Promise<string> {
  const creds = customCreds || getStoredPathaoCredentials();
  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error('Pathao credentials are not fully configured. Please check Admin Settings.');
  }

  const cacheKey = `${STORAGE_KEY_TOKEN}_${creds.isSandbox ? 'sandbox' : 'prod'}_${creds.clientId}`;

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expires_at > Date.now() + 60000 && parsed.token) {
          return parsed.token;
        }
      }
    } catch {
      // ignore
    }
  }

  const baseUrl = getBaseUrl(creds.isSandbox);
  const response = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: creds.clientId.trim(),
      client_secret: creds.clientSecret.trim(),
      username: creds.username.trim(),
      password: creds.password.trim(),
      grant_type: 'password',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to issue Pathao access token (${response.status}): ${err}`);
  }

  const data: PathaoTokenResponse = await response.json();
  const token = data.access_token;
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ token, expires_at: expiresAt }));
  } catch {
    // ignore
  }

  return token;
}

/**
 * Fetch list of registered stores for merchant
 */
export async function fetchPathaoStores(customCreds?: PathaoCredentials): Promise<PathaoStore[]> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/stores`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Pathao stores (${response.status})`);
  }

  const json = await response.json();
  const list = json?.data?.data || json?.data || [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch available delivery cities in Bangladesh (/aladdin/api/v1/city-list)
 */
export async function fetchPathaoCities(customCreds?: PathaoCredentials): Promise<PathaoCity[]> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/city-list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cities (${response.status})`);
  }

  const json = await response.json();
  const list = json?.data?.data || json?.data || [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch zones for a given city (/aladdin/api/v1/cities/{city_id}/zone-list)
 */
export async function fetchPathaoZones(cityId: number, customCreds?: PathaoCredentials): Promise<PathaoZone[]> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zones for city ${cityId}`);
  }

  const json = await response.json();
  const list = json?.data?.data || json?.data || [];
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch areas for a given zone (/aladdin/api/v1/zones/{zone_id}/area-list)
 */
export async function fetchPathaoAreas(zoneId: number, customCreds?: PathaoCredentials): Promise<PathaoArea[]> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch areas for zone ${zoneId}`);
  }

  const json = await response.json();
  const list = json?.data?.data || json?.data || [];
  return Array.isArray(list) ? list : [];
}

/**
 * Calculate expected shipping fee from Pathao Price Plan
 */
export async function calculatePathaoPrice(params: {
  storeId: number;
  recipientCityId?: number;
  recipientZoneId?: number;
  itemWeightKg?: number;
}): Promise<number> {
  const creds = getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/merchant/price-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      store_id: params.storeId,
      item_type: 2, // Parcel
      delivery_type: 48, // Standard delivery
      item_weight: params.itemWeightKg || 0.5,
      recipient_city: params.recipientCityId || 1,
      recipient_zone: params.recipientZoneId || 1,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not calculate shipping rate');
  }

  const json = await response.json();
  return json?.data?.final_price || json?.data?.price || 0;
}

/**
 * Build compliant order body honoring Pathao Auto-Address Feature
 * (If recipient_city or zone are not provided, omit them so Pathao NLP extracts address)
 */
async function buildCompliantOrderBody(
  payload: PathaoCreateOrderPayload,
  creds: PathaoCredentials,
  token: string,
  baseUrl: string
): Promise<Record<string, any>> {
  // Resolve store ID
  let storeId = payload.store_id || creds.storeId;
  if (!storeId || storeId === 0) {
    try {
      const storesRes = await fetch(`${baseUrl}/aladdin/api/v1/stores`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (storesRes.ok) {
        const storesJson = await storesRes.json();
        const storeList = storesJson?.data?.data || storesJson?.data || [];
        if (storeList.length > 0) {
          storeId = storeList[0].store_id;
        }
      }
    } catch {
      // ignore
    }
  }

  // Ensure recipient phone is normalized 11-digit
  const phone = normalizeBangladeshPhone(payload.recipient_phone);

  // Address validation (10 to 220 chars)
  let address = payload.recipient_address.trim();
  if (address.length < 10) {
    address = `${address}, Bangladesh`;
  }
  if (address.length > 220) {
    address = address.substring(0, 220);
  }

  // Name validation (3 to 100 chars)
  let name = payload.recipient_name.trim();
  if (name.length < 3) {
    name = `${name} Client`;
  }
  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  const body: Record<string, any> = {
    store_id: storeId || 1,
    merchant_order_id: payload.merchant_order_id,
    recipient_name: name,
    recipient_phone: phone,
    recipient_address: address,
    delivery_type: payload.delivery_type || 48,
    item_type: payload.item_type || 2,
    item_quantity: Math.max(1, payload.item_quantity || 1),
    item_weight: Math.max(0.5, Math.min(10, Number(payload.item_weight) || 0.5)),
    amount_to_collect: Math.round(Number(payload.amount_to_collect) || 0),
    item_description: payload.item_description || 'SPARTA Atelier Collection Pieces',
  };

  if (payload.recipient_secondary_phone) {
    body.recipient_secondary_phone = normalizeBangladeshPhone(payload.recipient_secondary_phone);
  }
  if (payload.special_instruction) {
    body.special_instruction = payload.special_instruction;
  }

  // Auto-address feature: Only include city/zone/area if explicitly valid integers > 0
  // Pathao explicitly warns: "do not send a null value. If not included in the request payload,
  // then our system will populate it automatically based on the recipient_address you will be provided."
  if (payload.recipient_city && payload.recipient_city > 0) {
    body.recipient_city = payload.recipient_city;
  }
  if (payload.recipient_zone && payload.recipient_zone > 0) {
    body.recipient_zone = payload.recipient_zone;
  }
  if (payload.recipient_area && payload.recipient_area > 0) {
    body.recipient_area = payload.recipient_area;
  }

  return body;
}

/**
 * Dispatch a single order parcel to Pathao Courier
 * Endpoint: POST /aladdin/api/v1/orders
 */
export async function createPathaoOrder(
  payload: PathaoCreateOrderPayload,
  customCreds?: PathaoCredentials
): Promise<PathaoOrderResult> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const body = await buildCompliantOrderBody(payload, creds, token, baseUrl);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMessage =
        errJson.message ||
        (errJson.errors ? Object.values(errJson.errors).flat().join(', ') : errorText);
    } catch {
      // raw text
    }
    throw new Error(`Pathao dispatch failed (${response.status}): ${parsedMessage}`);
  }

  const json = await response.json();
  const data = json?.data || {};

  return {
    consignment_id: data.consignment_id || `PTH-${Date.now()}`,
    merchant_order_id: payload.merchant_order_id,
    order_status: data.order_status || 'Pending',
    delivery_fee: Number(data.delivery_fee) || 0,
  };
}

/**
 * Dispatch multiple orders in bulk to Pathao Courier
 * Endpoint: POST /aladdin/api/v1/orders/bulk
 */
export async function createPathaoBulkOrders(
  payloads: PathaoCreateOrderPayload[],
  customCreds?: PathaoCredentials
): Promise<{ success: boolean; message: string }> {
  if (payloads.length === 0) return { success: true, message: 'No orders to dispatch.' };

  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const orderObjects = await Promise.all(
    payloads.map((p) => buildCompliantOrderBody(p, creds, token, baseUrl))
  );

  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json',
    },
    body: JSON.stringify({ orders: orderObjects }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pathao bulk dispatch failed (${response.status}): ${errText}`);
  }

  const json = await response.json();
  return {
    success: true,
    message: json?.message || 'Bulk orders submitted successfully to Pathao.',
  };
}

/**
 * Track an order consignment status (/aladdin/api/v1/orders/{consignment_id}/info)
 */
export async function trackPathaoOrder(
  consignmentId: string,
  customCreds?: PathaoCredentials
): Promise<PathaoTrackingInfo> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders/${consignmentId}/info`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to track consignment ${consignmentId} (${response.status}): ${err}`);
  }

  const json = await response.json();
  const data = json?.data || {};

  return {
    consignment_id: data.consignment_id || consignmentId,
    merchant_order_id: data.merchant_order_id || '',
    order_status: data.order_status || 'Pending',
    order_status_slug: data.order_status_slug || 'pending',
    updated_at: data.updated_at || new Date().toISOString(),
    invoice_id: data.invoice_id || null,
    payment_status: data.payment_status,
  };
}
