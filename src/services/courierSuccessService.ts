/**
 * Courier Customer Success Rate & Fraud Risk Intelligence Service
 * Combines:
 *  1. Pathao Courier Merchant API (if Pathao credentials are configured)
 *  2. Carrybee Courier Merchant API & Parcel Status (if Carrybee credentials are configured)
 *  3. SPARTA Internal Store Order Delivery/Cancellation History in Supabase
 */

import { supabase } from '../lib/supabase';
import { AdminOrder } from './orderService';
import {
  executePathaoCall,
  getPathaoAccessToken,
  getStoredPathaoCredentials,
  normalizeBangladeshPhone,
} from './pathaoService';
import {
  getStoredCarrybeeCredentials,
  trackCarrybeeOrder,
} from './carrybeeService';

export type CustomerRiskLevel = 'trusted' | 'moderate' | 'high-risk' | 'new';

export interface CourierBreakdownItem {
  provider: 'Pathao Courier' | 'Carrybee Courier' | 'SPARTA Store History';
  available: boolean;
  totalParcels: number;
  delivered: number;
  cancelled: number;
  successRate: number | null;
  note: string;
}

export interface CustomerSuccessReport {
  phone: string;
  totalParcels: number;
  deliveredCount: number;
  cancelledCount: number;
  pendingCount: number;
  successRate: number | null;
  riskLevel: CustomerRiskLevel;
  riskLabel: string;
  configuredCouriers: string[];
  breakdown: CourierBreakdownItem[];
  checkedAt: string;
}

export function isPathaoConfigured(): boolean {
  const c = getStoredPathaoCredentials();
  return Boolean(c.clientId?.trim() && c.clientSecret?.trim() && c.username?.trim() && c.password?.trim());
}

export function isCarrybeeConfigured(): boolean {
  const c = getStoredCarrybeeCredentials();
  return Boolean(c.clientId?.trim() && c.clientSecret?.trim() && c.clientContext?.trim());
}

/**
 * Evaluate customer delivery success rate using whichever courier API(s)
 * are configured + SPARTA store order history.
 */
export async function checkCustomerCourierSuccessRate(
  rawPhone: string,
  knownOrders: AdminOrder[] = []
): Promise<CustomerSuccessReport> {
  const phone = normalizeBangladeshPhone(rawPhone);
  const configuredCouriers: string[] = [];
  const breakdown: CourierBreakdownItem[] = [];

  if (isCarrybeeConfigured()) configuredCouriers.push('Carrybee');
  if (isPathaoConfigured()) configuredCouriers.push('Pathao');

  // 1. Query internal Supabase orders + knownOrders for exact phone history
  let matchingOrders: AdminOrder[] = knownOrders.filter(
    (o) => normalizeBangladeshPhone(o.customerPhone) === phone
  );

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, courier_name, consignment_id, courier_status, customer_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && Array.isArray(data)) {
      const dbMatched = data.filter(
        (r: any) => normalizeBangladeshPhone(r.customer_phone || '') === phone
      );
      if (dbMatched.length > matchingOrders.length) {
        matchingOrders = dbMatched.map((r: any) => ({
          id: r.id,
          orderNumber: r.order_number,
          createdAt: r.created_at,
          customerName: '',
          customerPhone: r.customer_phone,
          shippingAddress: '',
          deliveryZone: 'inside-dhaka',
          subtotal: 0,
          deliveryFee: 0,
          total: 0,
          status: r.status,
          paymentStatus: 'pending',
          courierName: r.courier_name,
          consignmentId: r.consignment_id,
          courierStatus: r.courier_status,
          items: [],
        }));
      }
    }
  } catch {
    // fallback to knownOrders
  }

  let internalDelivered = 0;
  let internalCancelled = 0;
  let internalPending = 0;

  for (const ord of matchingOrders) {
    const st = (ord.status || '').toLowerCase();
    const cs = (ord.courierStatus || '').toLowerCase();
    if (st === 'delivered' || cs.includes('deliver')) {
      internalDelivered += 1;
    } else if (st === 'cancelled' || cs.includes('return') || cs.includes('cancel')) {
      internalCancelled += 1;
    } else {
      internalPending += 1;
    }
  }

  const internalResolved = internalDelivered + internalCancelled;
  const internalRate =
    internalResolved > 0 ? Math.round((internalDelivered / internalResolved) * 100) : null;

  breakdown.push({
    provider: 'SPARTA Store History',
    available: true,
    totalParcels: matchingOrders.length,
    delivered: internalDelivered,
    cancelled: internalCancelled,
    successRate: internalRate,
    note:
      matchingOrders.length === 0
        ? 'No previous orders on SPARTA'
        : `${matchingOrders.length} total (${internalDelivered} delivered, ${internalCancelled} cancelled, ${internalPending} active)`,
  });

  let apiDelivered = 0;
  let apiCancelled = 0;
  let apiTotal = 0;

  // 2. Pathao Courier Customer Success Lookup (when Pathao keys are configured)
  if (isPathaoConfigured()) {
    try {
      const creds = getStoredPathaoCredentials();
      const token = await getPathaoAccessToken(creds);
      const res = await executePathaoCall<any>('/aladdin/api/v1/user/success', {
        method: 'POST',
        creds,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: { phone },
      });

      const payload = res?.data || res || {};
      const totalDel = Number(
        payload.total_delivery ?? payload.total ?? payload.total_parcel ?? 0
      );
      const successDel = Number(
        payload.successful_delivery ?? payload.success ?? payload.delivered ?? 0
      );
      const cancelDel = Math.max(
        0,
        Number(payload.cancelled_delivery ?? payload.cancelled ?? totalDel - successDel)
      );

      if (totalDel > 0 || payload.customer_rating || payload.success_rate !== undefined) {
        const rate =
          payload.success_rate !== undefined
            ? Math.round(Number(payload.success_rate))
            : totalDel > 0
            ? Math.round((successDel / totalDel) * 100)
            : null;
        apiTotal += totalDel;
        apiDelivered += successDel;
        apiCancelled += cancelDel;
        breakdown.push({
          provider: 'Pathao Courier',
          available: true,
          totalParcels: totalDel,
          delivered: successDel,
          cancelled: cancelDel,
          successRate: rate,
          note:
            totalDel > 0
              ? `Pathao Network: ${successDel}/${totalDel} delivered`
              : `Pathao API connected`,
        });
      } else {
        breakdown.push({
          provider: 'Pathao Courier',
          available: true,
          totalParcels: 0,
          delivered: 0,
          cancelled: 0,
          successRate: null,
          note: 'Pathao connected · No prior network history returned',
        });
      }
    } catch (err: any) {
      breakdown.push({
        provider: 'Pathao Courier',
        available: false,
        totalParcels: 0,
        delivered: 0,
        cancelled: 0,
        successRate: null,
        note: err?.message ? `Pathao check unavailable (${err.message.slice(0, 60)})` : 'Pathao check unavailable',
      });
    }
  }

  // 3. Carrybee Courier Live Parcel Verification (when Carrybee keys are configured)
  if (isCarrybeeConfigured()) {
    const cbOrders = matchingOrders.filter(
      (o) =>
        o.consignmentId &&
        (o.courierName?.toLowerCase().includes('carrybee') ||
          o.consignmentId.startsWith('CB') ||
          o.consignmentId.startsWith('FX'))
    );

    let cbDelivered = 0;
    let cbCancelled = 0;

    if (cbOrders.length > 0) {
      for (const ord of cbOrders.slice(0, 5)) {
        try {
          const track = await trackCarrybeeOrder(ord.consignmentId!);
          const st = (track.order_status || track.transfer_status || '').toLowerCase();
          if (st.includes('deliver')) cbDelivered += 1;
          else if (st.includes('cancel') || st.includes('return')) cbCancelled += 1;
        } catch {
          if (ord.status === 'delivered') cbDelivered += 1;
          else if (ord.status === 'cancelled') cbCancelled += 1;
        }
      }
    }

    const cbResolved = cbDelivered + cbCancelled;
    breakdown.push({
      provider: 'Carrybee Courier',
      available: true,
      totalParcels: cbOrders.length,
      delivered: cbDelivered,
      cancelled: cbCancelled,
      successRate: cbResolved > 0 ? Math.round((cbDelivered / cbResolved) * 100) : null,
      note:
        cbOrders.length > 0
          ? `Carrybee API Verified: ${cbDelivered}/${cbOrders.length} delivered`
          : 'Carrybee API Active · Ready to track future consignments',
    });
  }

  // Combine overall stats (avoid double-counting when Pathao API returned network totals)
  const combinedTotal = apiTotal > 0 ? apiTotal + internalPending : matchingOrders.length;
  const combinedDelivered = apiTotal > 0 ? Math.max(apiDelivered, internalDelivered) : internalDelivered;
  const combinedCancelled = apiTotal > 0 ? Math.max(apiCancelled, internalCancelled) : internalCancelled;
  const resolved = combinedDelivered + combinedCancelled;

  const successRate = resolved > 0 ? Math.round((combinedDelivered / resolved) * 100) : null;

  let riskLevel: CustomerRiskLevel = 'new';
  let riskLabel = 'New Customer (No Completed History)';

  if (successRate !== null) {
    if (successRate >= 85) {
      riskLevel = 'trusted';
      riskLabel = `Trusted Customer (${successRate}% Success)`;
    } else if (successRate >= 60) {
      riskLevel = 'moderate';
      riskLabel = `Moderate Risk (${successRate}% Success)`;
    } else {
      riskLevel = 'high-risk';
      riskLabel = `High Cancellation Risk (${successRate}% Success)`;
    }
  } else if (matchingOrders.length > 1) {
    riskLevel = 'moderate';
    riskLabel = `${matchingOrders.length} Unresolved Orders`;
  }

  return {
    phone,
    totalParcels: combinedTotal,
    deliveredCount: combinedDelivered,
    cancelledCount: combinedCancelled,
    pendingCount: internalPending,
    successRate,
    riskLevel,
    riskLabel,
    configuredCouriers,
    breakdown,
    checkedAt: new Date().toISOString(),
  };
}
