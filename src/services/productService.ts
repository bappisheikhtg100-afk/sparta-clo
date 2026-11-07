/**
 * Product Service for SPARTA E-Commerce
 * Synchronizes with Supabase database with seamless offline/fallback support
 */

import { supabase } from '../lib/supabase';
import { Product, Category, StockStatus } from '../types/store';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/storeData';

const LOCAL_PRODUCTS_KEY = 'sparta_local_products_v2';

function mapDbRowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price ? Number(row.price) : undefined,
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    priceMap: row.price_map || undefined,
    editionNote: row.edition_note || undefined,
    description: row.description || '',
    details: Array.isArray(row.details) ? row.details : [],
    images: Array.isArray(row.images) ? row.images : [],
    hoverImageIndex: row.hover_image_index ?? undefined,
    hoverFit: row.hover_fit ?? undefined,
    colors: row.colors || undefined,
    category: row.category as Exclude<Category, 'All'>,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    stock: (row.stock as StockStatus) || (row.stock_status as StockStatus) || 'in-stock',
    stockCount: row.stock_count ?? undefined,
    imageFit: row.image_fit ?? undefined,
    canvasBg: row.canvas_bg ?? undefined,
  };
}

function mapProductToDbRow(product: Product, isPublished = true) {
  return {
    id: product.id,
    name: product.name,
    slug: product.id.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: product.category,
    price: product.price ?? null,
    original_price: product.originalPrice ?? null,
    price_map: product.priceMap ?? null,
    edition_note: product.editionNote ?? null,
    description: product.description || '',
    details: product.details || [],
    images: product.images || [],
    hover_image_index: product.hoverImageIndex ?? 1,
    hover_fit: product.hoverFit ?? 'cover-top',
    colors: product.colors ?? null,
    sizes: product.sizes || [],
    stock: product.stock || 'in-stock',
    stock_count: product.stockCount ?? 15,
    image_fit: product.imageFit ?? 'cover-top',
    canvas_bg: product.canvasBg ?? '#F2F1EE',
    is_published: isPublished,
  };
}

export function getLocalStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRODUCTS;
}

export function saveLocalStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
}

/**
 * Fetch all published products for customer storefront
 */
export async function fetchPublishedProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      const live = data.map(mapDbRowToProduct);
      saveLocalStoredProducts(live);
      return live;
    }
  } catch {
    // fallback gracefully
  }

  return getLocalStoredProducts();
}

/**
 * Fetch all products for admin dashboard (including unpublished)
 */
export async function fetchAdminProducts(): Promise<(Product & { is_published: boolean })[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        ...mapDbRowToProduct(row),
        is_published: row.is_published ?? true,
      }));
    }
  } catch {
    // fallback
  }

  return getLocalStoredProducts().map((p) => ({ ...p, is_published: true }));
}

/**
 * Save or update a product in database and local cache
 */
export async function upsertProduct(product: Product, isPublished = true): Promise<void> {
  const row = mapProductToDbRow(product, isPublished);

  // 1. Immediately update local store cache for instant UI feedback
  const current = getLocalStoredProducts();
  const existingIdx = current.findIndex((p) => p.id === product.id);
  let updated: Product[];
  if (existingIdx > -1) {
    updated = [...current];
    updated[existingIdx] = product;
  } else {
    updated = [product, ...current];
  }
  saveLocalStoredProducts(updated);

  // 2. Persist to Supabase products table
  try {
    const { error } = await supabase.from('products').upsert(row);
    if (error) {
      console.warn('Supabase product upsert response:', error.message);
    }
  } catch (err) {
    console.warn('Supabase product upsert exception:', err);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const current = getLocalStoredProducts();
  saveLocalStoredProducts(current.filter((p) => p.id !== productId));

  try {
    await supabase.from('products').delete().eq('id', productId);
  } catch {
    // ignore
  }
}

/**
 * Toggle publish status
 */
export async function toggleProductPublish(productId: string, isPublished: boolean): Promise<void> {
  try {
    await supabase.from('products').update({ is_published: isPublished }).eq('id', productId);
  } catch {
    // ignore
  }
}
