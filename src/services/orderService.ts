/**
 * Order Service for SPARTA E-Commerce
 * Manages customer order placement, database records, order items,
 * status transitions, and Pathao consignment references.
 */

import { supabase } from '../lib/supabase';
import { CartItem, OrderReceipt, ShippingDetails } from '../types/store';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  deliveryZone: 'inside-dhaka' | 'outside-dhaka';
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  courierName?: string;
  consignmentId?: string;
  courierStatus?: string;
  internalNotes?: string;
  items: CartItem[];
}

const LOCAL_ORDERS_KEY = 'sparta_admin_orders_v3';

function getStoredOrders(): AdminOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveStoredOrders(orders: AdminOrder[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // ignore
  }
}

/**
 * Record a new customer order into Supabase
 */
export async function createOrderRecord(
  receipt: OrderReceipt,
  shipping: ShippingDetails
): Promise<string> {
  const fullAddress = `${shipping.address}, ${shipping.thana}, ${shipping.district}, ${shipping.division}`;

  const adminOrder: AdminOrder = {
    id: receipt.orderId,
    orderNumber: receipt.orderId,
    createdAt: receipt.createdAt,
    customerName: shipping.fullName,
    customerPhone: shipping.phone,
    shippingAddress: fullAddress,
    deliveryZone: shipping.deliveryZone,
    subtotal: receipt.subtotal,
    deliveryFee: receipt.deliveryFee,
    total: receipt.total,
    status: 'pending',
    paymentStatus: 'pending',
    courierName: 'Pathao Courier',
    internalNotes: shipping.notes || undefined,
    items: receipt.items,
  };

  // 1. Save in local cache first
  const existing = getStoredOrders();
  saveStoredOrders([adminOrder, ...existing.filter((o) => o.orderNumber !== receipt.orderId)]);

  // Notify active windows/tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sparta_orders_updated'));
  }

  // 2. Persist to Supabase Database
  try {
    // Attempt 1: Atomic RPC function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_public_checkout_order', {
      p_order_number: receipt.orderId,
      p_customer_name: shipping.fullName,
      p_customer_phone: shipping.phone,
      p_shipping_address: fullAddress,
      p_delivery_zone: shipping.deliveryZone,
      p_subtotal: receipt.subtotal,
      p_delivery_fee: receipt.deliveryFee,
      p_total: receipt.total,
      p_notes: shipping.notes || null,
      p_items: receipt.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        size: it.size,
        color: it.color || null,
        price: it.price,
        quantity: it.quantity,
      })),
    });

    if (rpcErr || (rpcData && !rpcData.success)) {
      // Attempt 2: Direct Table Insert
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: receipt.orderId,
          customer_name: shipping.fullName,
          customer_phone: shipping.phone,
          shipping_address: fullAddress,
          delivery_zone: shipping.deliveryZone,
          subtotal: receipt.subtotal,
          delivery_fee: receipt.deliveryFee,
          total: receipt.total,
          payment_method: 'Cash on Delivery',
          status: 'pending',
          notes: shipping.notes || null,
        })
        .select('id')
        .single();

      if (!orderErr && orderData?.id) {
        const itemsToInsert = receipt.items.map((item) => ({
          order_id: orderData.id,
          product_id: item.productId,
          product_name: item.name,
          size: item.size,
          color: item.color || null,
          unit_price: item.price,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
        }));

        await supabase.from('order_items').insert(itemsToInsert);

        await supabase.from('customers').upsert({
          phone: shipping.phone,
          full_name: shipping.fullName,
          address: fullAddress,
          delivery_zone: shipping.deliveryZone,
        });
      } else if (orderErr) {
        console.error('Failed to insert order into Supabase:', orderErr);
      }
    }
  } catch (err) {
    console.error('Supabase order creation exception:', err);
  }

  return receipt.orderId;
}

/**
 * Fetch all orders for the Admin Dashboard
 */
export async function fetchAllOrders(): Promise<AdminOrder[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mapped: AdminOrder[] = data.map((row: any) => ({
        id: row.id,
        orderNumber: row.order_number || row.id,
        createdAt: row.created_at,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        shippingAddress: row.shipping_address,
        deliveryZone: row.delivery_zone || 'inside-dhaka',
        subtotal: Number(row.subtotal) || 0,
        deliveryFee: Number(row.delivery_fee) || 0,
        total: Number(row.total) || 0,
        status: row.status || 'pending',
        paymentStatus: row.payment_status || 'pending',
        courierName: row.courier_name || 'Pathao Courier',
        consignmentId: row.consignment_id || undefined,
        courierStatus: row.courier_status || undefined,
        internalNotes: row.internal_notes || row.notes || undefined,
        items: (row.order_items || []).map((it: any) => ({
          cartId: it.id,
          productId: it.product_id,
          name: it.product_name,
          category: 'Upperwear',
          image: '',
          size: it.size,
          color: it.color || undefined,
          price: Number(it.unit_price) || 0,
          quantity: it.quantity || 1,
        })),
      }));

      // Merge local cache if any local orders were created in this browser
      const stored = getStoredOrders();
      const dbIds = new Set(mapped.map((m) => m.orderNumber));
      const unsynced = stored.filter((s) => !dbIds.has(s.orderNumber));
      const combined = [...unsynced, ...mapped];
      saveStoredOrders(combined);
      return combined;
    }
  } catch {
    // fallback to stored orders
  }

  return getStoredOrders();
}

/**
 * Update order status or tracking details
 */
export async function updateOrderStatus(
  orderId: string,
  updates: Partial<AdminOrder>
): Promise<void> {
  // Update local cache
  const orders = getStoredOrders();
  const updated = orders.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, ...updates } : o));
  saveStoredOrders(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sparta_orders_updated'));
  }

  // Update Supabase
  try {
    const dbPayload: any = {};
    if (updates.status) dbPayload.status = updates.status;
    if (updates.paymentStatus) dbPayload.payment_status = updates.paymentStatus;
    if (updates.consignmentId) dbPayload.consignment_id = updates.consignmentId;
    if (updates.courierStatus) dbPayload.courier_status = updates.courierStatus;
    if (updates.courierName) dbPayload.courier_name = updates.courierName;
    if (updates.internalNotes) dbPayload.internal_notes = updates.internalNotes;
    dbPayload.updated_at = new Date().toISOString();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);

    if (isUuid) {
      await supabase.from('orders').update(dbPayload).eq('id', orderId);
    } else {
      await supabase.from('orders').update(dbPayload).eq('order_number', orderId);
    }
  } catch (err) {
    console.warn('Could not update order in Supabase:', err);
  }
}
