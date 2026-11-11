/**
 * Store Settings & Coupons Service for SPARTA E-Commerce
 * Synchronizes announcement banners, social links, coupons, and delivery rules
 * with Supabase database and local storage.
 */

import { supabase } from '../lib/supabase';
import { Coupon, StoreSettings } from '../types/store';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  announcementText:
    'EID ARCHIVE 2026 IS LIVE · CASH ON DELIVERY NATIONWIDE · COMPLIMENTARY SHIPPING OVER ৳5,000 · ARCHITECTURAL LUXURY',
  isAnnouncementActive: true,
  facebookUrl: 'https://facebook.com/sparta.clo',
  instagramUrl: 'https://www.instagram.com/sparta.clo?exln=MXRubjI4aWprcDNmdA%3D%3D&utm_source=qr',
  tiktokUrl: 'https://www.tiktok.com/@sparta_clo?_r=1&_t=ZS-9AdPkzDk69F',
  whatsappNumber: '8801610046310',
  isFreeDeliveryActive: false,
  insideDhakaFee: 70,
  outsideDhakaFee: 120,
  freeShippingThreshold: 5000,
  spendSaveThreshold: 3000,
  spendSaveDiscount: 200,
  metaPixelId: '',
  isMetaPixelActive: false,
  googleAnalyticsId: '',
  isGoogleAnalyticsActive: false,
  customHeadScripts: '',
};

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'c-sparta10',
    code: 'SPARTA10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 1500,
    isActive: true,
    description: '10% off on orders above ৳1,500',
  },
  {
    id: 'c-eid2026',
    code: 'EID2026',
    discountType: 'fixed',
    discountValue: 250,
    minOrderAmount: 2500,
    isActive: true,
    description: '৳250 flat off on orders above ৳2,500',
  },
];

const SETTINGS_STORAGE_KEY = 'sparta_store_settings_v3';
const COUPONS_STORAGE_KEY = 'sparta_store_coupons_v3';

export function getLocalStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_STORE_SETTINGS;
}

export function saveLocalStoreSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getLocalCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_COUPONS;
}

export function saveLocalCoupons(coupons: Coupon[]): void {
  try {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
  } catch {
    // ignore
  }
}

/**
 * Fetch store settings from Supabase or local cache
 */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('setting_key', 'store_configuration')
      .maybeSingle();

    if (!error && data?.setting_value) {
      const merged = { ...DEFAULT_STORE_SETTINGS, ...data.setting_value };
      saveLocalStoreSettings(merged);
      return merged;
    }
  } catch {
    // ignore
  }
  return getLocalStoreSettings();
}

/**
 * Persist store settings to Supabase and local cache
 */
export async function updateStoreSettings(settings: StoreSettings): Promise<void> {
  saveLocalStoreSettings(settings);

  try {
    await supabase.from('store_settings').upsert({
      setting_key: 'store_configuration',
      setting_value: settings,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync settings to Supabase:', err);
  }
}

/**
 * Fetch all coupons from Supabase or local cache
 */
export async function fetchCoupons(): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('setting_key', 'active_coupons')
      .maybeSingle();

    if (!error && Array.isArray(data?.setting_value)) {
      saveLocalCoupons(data.setting_value);
      return data.setting_value;
    }
  } catch {
    // ignore
  }
  return getLocalCoupons();
}

/**
 * Persist coupons list to Supabase and local cache
 */
export async function updateCoupons(coupons: Coupon[]): Promise<void> {
  saveLocalCoupons(coupons);

  try {
    await supabase.from('store_settings').upsert({
      setting_key: 'active_coupons',
      setting_value: coupons,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync coupons to Supabase:', err);
  }
}
