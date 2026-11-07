/**
 * Pathao Courier Service for SPARTA E-Commerce
 * Implements token issuance, store listing, city/zone/area hierarchy,
 * price plan calculation, order parcel dispatch, and consignment tracking.
 * Reference: https://github.com/enuenan/pathao-courier
 */

export interface PathaoCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId?: number;
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
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number; // 48 for normal delivery, 12 for on-demand
  item_type: number; // 1 for Document, 2 for Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // in KG (e.g. 0.5)
  amount_to_collect: number;
  item_description: string;
}

export interface PathaoOrderResult {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee: number;
}

const STORAGE_KEY_CREDS = 'sparta_pathao_credentials_v1';
const STORAGE_KEY_TOKEN = 'sparta_pathao_token_v1';

export function getStoredPathaoCredentials(): PathaoCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    clientId: (import.meta.env.VITE_PATHAO_CLIENT_ID as string) || '',
    clientSecret: (import.meta.env.VITE_PATHAO_CLIENT_SECRET as string) || '',
    username: (import.meta.env.VITE_PATHAO_USERNAME as string) || '',
    password: (import.meta.env.VITE_PATHAO_PASSWORD as string) || '',
    storeId: 0,
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

function getBaseUrl(isSandbox?: boolean): string {
  return isSandbox
    ? 'https://courier-api-sandbox.pathao.com'
    : 'https://api-hermes.pathao.com';
}

/**
 * Issue or retrieve cached access token from Pathao
 */
export async function getPathaoAccessToken(
  customCreds?: PathaoCredentials,
  forceRefresh = false
): Promise<string> {
  const creds = customCreds || getStoredPathaoCredentials();
  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error('Pathao credentials are not fully configured. Please configure them in Admin Settings.');
  }

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_TOKEN);
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
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      username: creds.username,
      password: creds.password,
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
    localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify({ token, expires_at: expiresAt }));
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
    throw new Error(`Failed to fetch stores (${response.status})`);
  }

  const json = await response.json();
  return json?.data?.data || json?.data || [];
}

/**
 * Fetch available delivery cities in Bangladesh
 */
export async function fetchPathaoCities(customCreds?: PathaoCredentials): Promise<PathaoCity[]> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/countries/1/city-list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cities (${response.status})`);
  }

  const json = await response.json();
  return json?.data?.data || json?.data || [];
}

/**
 * Fetch zones for a given city
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
  return json?.data?.data || json?.data || [];
}

/**
 * Fetch areas for a given zone
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
  return json?.data?.data || json?.data || [];
}

/**
 * Calculate expected shipping fee from Pathao
 */
export async function calculatePathaoPrice(params: {
  storeId: number;
  recipientCityId: number;
  recipientZoneId: number;
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
      recipient_city: params.recipientCityId,
      recipient_zone: params.recipientZoneId,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not calculate shipping rate');
  }

  const json = await response.json();
  return json?.data?.price || 0;
}

/**
 * Dispatch an order to Pathao Courier
 */
export async function createPathaoOrder(
  payload: PathaoCreateOrderPayload,
  customCreds?: PathaoCredentials
): Promise<PathaoOrderResult> {
  const creds = customCreds || getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pathao dispatch failed (${response.status}): ${errorText}`);
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
 * Track an order consignment status
 */
export async function trackPathaoOrder(consignmentId: string): Promise<any> {
  const creds = getStoredPathaoCredentials();
  const token = await getPathaoAccessToken(creds);
  const baseUrl = getBaseUrl(creds.isSandbox);

  const response = await fetch(`${baseUrl}/aladdin/api/v1/orders/${consignmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to track consignment ${consignmentId}`);
  }

  const json = await response.json();
  return json?.data;
}
