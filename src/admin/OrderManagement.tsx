import React, { useState } from 'react';
import {
  Search,
  Filter,
  Truck,
  Printer,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Send,
  Loader2,
} from 'lucide-react';
import { AdminOrder, updateOrderStatus } from '../services/orderService';
import {
  createPathaoOrder,
  getStoredPathaoCredentials,
  trackPathaoOrder,
  PathaoTrackingInfo,
} from '../services/pathaoService';
import {
  createCarrybeeOrder,
  trackCarrybeeOrder,
  CarrybeeTrackingInfo,
  getStoredCarrybeeCredentials,
} from '../services/carrybeeService';
import { generateA4ShippingLabelsPDF, mapOrderToLabelData } from '../services/labelGenerator';
import { formatBDT } from '../data/storeData';

interface OrderManagementProps {
  orders: AdminOrder[];
  onRefresh: () => void;
  selectedOrder: AdminOrder | null;
  onSelectOrder: (order: AdminOrder | null) => void;
  onOpenBulkLabels: (selectedOrders: AdminOrder[]) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  onRefresh,
  selectedOrder,
  onSelectOrder,
  onOpenBulkLabels,
}) => {
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCarrybeeDispatching, setIsCarrybeeDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Status & Courier filtering
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = activeStatus === 'all' || o.status === activeStatus;
    
    // Courier filter
    let matchesCourier = true;
    const isCb = (o.courierName && o.courierName.toLowerCase().includes('carrybee')) ||
                 (o.consignmentId && (o.consignmentId.startsWith('CB') || o.consignmentId.startsWith('FX')));
    const isPt = (o.courierName && o.courierName.toLowerCase().includes('pathao')) ||
                 (o.consignmentId && !isCb);

    if (courierFilter === 'pathao') {
      matchesCourier = !!o.consignmentId && Boolean(isPt);
    } else if (courierFilter === 'carrybee') {
      matchesCourier = !!o.consignmentId && Boolean(isCb);
    } else if (courierFilter === 'unassigned') {
      matchesCourier = !o.consignmentId;
    }

    const term = search.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(term) ||
      o.customerName.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      (o.consignmentId && o.consignmentId.toLowerCase().includes(term));

    return matchesStatus && matchesCourier && matchesSearch;
  });

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: AdminOrder['status']) => {
    await updateOrderStatus(orderId, { status: newStatus });
    onRefresh();
    if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
      onSelectOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const handlePrintSingleLabel = (order: AdminOrder, forcedCourier?: string) => {
    const courier = forcedCourier || order.courierName || 'Pathao Courier';
    const mockReceipt: any = {
      orderId: order.orderNumber,
      createdAt: order.createdAt,
      courierName: courier,
      customer: {
        fullName: order.customerName,
        phone: order.customerPhone,
        address: order.shippingAddress,
        division: '',
        district: '',
        thana: '',
        deliveryZone: order.deliveryZone,
        notes: order.internalNotes || '',
      },
      items: order.items,
      total: order.total,
    };
    const labelData = mapOrderToLabelData(mockReceipt, order.consignmentId, courier);
    const pdf = generateA4ShippingLabelsPDF([labelData]);
    const courierTag = courier.toLowerCase().includes('carrybee') ? 'CARRYBEE' : 'PATHAO';
    pdf.save(`SPARTA-${courierTag}-${order.orderNumber}.pdf`);
  };

  const [isTracking, setIsTracking] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<PathaoTrackingInfo | null>(null);
  const [carrybeeTrackingInfo, setCarrybeeTrackingInfo] = useState<CarrybeeTrackingInfo | null>(null);

  // Pathao Dispatch
  const handleDispatchToPathao = async (order: AdminOrder) => {
    setIsDispatching(true);
    setDispatchError(null);
    setDispatchSuccess(null);

    try {
      const creds = getStoredPathaoCredentials();
      const result = await createPathaoOrder({
        store_id: creds.storeId,
        merchant_order_id: order.orderNumber,
        recipient_name: order.customerName,
        recipient_phone: order.customerPhone,
        recipient_address: order.shippingAddress,
        delivery_type: 48,
        item_type: 2, // parcel
        item_quantity: Math.max(1, order.items.reduce((acc, it) => acc + it.quantity, 0)),
        item_weight: 0.5,
        amount_to_collect: order.total,
        item_description: order.items.map((it) => it.name).join(', ') || 'SPARTA Garments',
      });

      await updateOrderStatus(order.id, {
        status: 'processing',
        consignmentId: result.consignment_id,
        courierName: 'Pathao Courier',
        courierStatus: result.order_status,
      });

      setDispatchSuccess(
        `Dispatched to Pathao Courier! Consignment ID: ${result.consignment_id} (Fee: ৳${result.delivery_fee})`
      );
      onRefresh();
      if (selectedOrder) {
        onSelectOrder({
          ...selectedOrder,
          status: 'processing',
          consignmentId: result.consignment_id,
          courierName: 'Pathao Courier',
          courierStatus: result.order_status,
        });
      }
    } catch (err: any) {
      setDispatchError(err?.message || 'Failed to dispatch to Pathao');
    } finally {
      setIsDispatching(false);
    }
  };

  // Carrybee Dispatch
  const handleDispatchToCarrybee = async (order: AdminOrder) => {
    setIsCarrybeeDispatching(true);
    setDispatchError(null);
    setDispatchSuccess(null);

    try {
      const creds = getStoredCarrybeeCredentials();
      const result = await createCarrybeeOrder({
        store_id: creds.storeId || '33023',
        merchant_order_id: order.orderNumber,
        recipient_name: order.customerName,
        recipient_phone: order.customerPhone,
        recipient_address: order.shippingAddress,
        delivery_type: 1, // normal
        product_type: 1, // 1=Parcel (as per Carrybee API documentation)
        item_quantity: Math.max(1, order.items.reduce((acc, it) => acc + it.quantity, 0)),
        item_weight: 500, // grams
        amount_to_collect: order.total,
        product_description: order.items.map((it) => it.name).join(', ') || 'SPARTA Luxury Apparel',
        special_instruction: order.internalNotes || 'Fragile luxury apparel - Handle with care',
      });

      await updateOrderStatus(order.id, {
        status: 'processing',
        consignmentId: result.consignment_id,
        courierName: 'Carrybee Courier',
        courierStatus: result.order_status,
      });

      setDispatchSuccess(
        `Dispatched to Carrybee Courier! Consignment ID: ${result.consignment_id} (Fee: ৳${result.delivery_fee})`
      );
      onRefresh();
      if (selectedOrder) {
        onSelectOrder({
          ...selectedOrder,
          status: 'processing',
          consignmentId: result.consignment_id,
          courierName: 'Carrybee Courier',
          courierStatus: result.order_status,
        });
      }
    } catch (err: any) {
      setDispatchError(err?.message || 'Failed to dispatch to Carrybee Courier');
    } finally {
      setIsCarrybeeDispatching(false);
    }
  };

  const handleTrackPathao = async (consignmentId: string) => {
    setIsTracking(true);
    try {
      const track = await trackPathaoOrder(consignmentId);
      setTrackingInfo(track);

      if (
        track.order_status_slug === 'delivered' ||
        track.order_status?.toLowerCase() === 'delivered'
      ) {
        if (selectedOrder) {
          await updateOrderStatus(selectedOrder.id, {
            status: 'delivered',
            courierStatus: 'Delivered',
            paymentStatus: 'paid',
          });
          onRefresh();
          onSelectOrder({
            ...selectedOrder,
            status: 'delivered',
            courierStatus: 'Delivered',
            paymentStatus: 'paid',
          });
        }
      }
    } catch (err: any) {
      alert(`Pathao tracking query failed: ${err.message}`);
    } finally {
      setIsTracking(false);
    }
  };

  const handleTrackCarrybee = async (consignmentId: string) => {
    setIsTracking(true);
    try {
      const track = await trackCarrybeeOrder(consignmentId);
      setCarrybeeTrackingInfo(track);

      if (track.order_status?.toLowerCase().includes('deliver')) {
        if (selectedOrder) {
          await updateOrderStatus(selectedOrder.id, {
            status: 'delivered',
            courierStatus: 'Delivered',
            paymentStatus: 'paid',
          });
          onRefresh();
          onSelectOrder({
            ...selectedOrder,
            status: 'delivered',
            courierStatus: 'Delivered',
            paymentStatus: 'paid',
          });
        }
      }
    } catch (err: any) {
      alert(`Carrybee tracking query failed: ${err.message}`);
    } finally {
      setIsTracking(false);
    }
  };

  // Dispatched orders (orders with consignmentId or in processing/shipped status)
  const dispatchedOrders = orders.filter(
    (o) => !!o.consignmentId || o.status === 'processing' || o.status === 'shipped'
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Orders &amp; Dispatch
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage COD shipments, track Pathao consignments, and export shipping labels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Option to Print All Dispatched Orders simultaneously */}
          <button
            type="button"
            onClick={() => {
              if (dispatchedOrders.length === 0) {
                alert('No dispatched orders found yet. Dispatch orders to Pathao Courier first.');
                return;
              }
              onOpenBulkLabels(dispatchedOrders);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Bulk print labels for all orders dispatched to Pathao"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print All Dispatched Labels ({dispatchedOrders.length})</span>
          </button>

          {/* Option to Print Selected Orders */}
          {selectedOrderIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const picked = orders.filter((o) => selectedOrderIds.includes(o.id));
                onOpenBulkLabels(picked);
              }}
              className="px-3.5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Selected Labels ({selectedOrderIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            { id: 'pending', label: 'Pending', count: orders.filter((o) => o.status === 'pending').length },
            { id: 'processing', label: 'Processing', count: orders.filter((o) => o.status === 'processing').length },
            { id: 'shipped', label: 'Shipped', count: orders.filter((o) => o.status === 'shipped').length },
            { id: 'delivered', label: 'Delivered', count: orders.filter((o) => o.status === 'delivered').length },
            { id: 'cancelled', label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeStatus === tab.id
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-black'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Courier & Search Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-stone-100 dark:bg-white/5 p-0.5 rounded text-xs">
            <span className="text-[10px] text-stone-400 font-mono px-2 uppercase">Courier:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'pathao', label: 'Pathao' },
              { id: 'carrybee', label: 'Carrybee' },
              { id: 'unassigned', label: 'Unassigned' },
            ].map((cf) => (
              <button
                key={cf.id}
                type="button"
                onClick={() => setCourierFilter(cf.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  courierFilter === cf.id
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, customer, phone, AWB..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded outline-none focus:border-stone-400"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 text-stone-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all orders"
                    className="rounded border-stone-300 dark:border-white/20"
                  />
                </th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Shipping Destination</th>
                <th className="py-3 px-4">COD Total</th>
                <th className="py-3 px-4">Courier &amp; Consignment ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No orders match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isCarrybee =
                    (order.courierName && order.courierName.toLowerCase().includes('carrybee')) ||
                    (order.consignmentId && (order.consignmentId.startsWith('CB') || order.consignmentId.startsWith('FX')));
                  const isPathao =
                    (order.courierName && order.courierName.toLowerCase().includes('pathao')) ||
                    (order.consignmentId && !isCarrybee);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`hover:bg-stone-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors ${
                        isSelected ? 'bg-stone-50/80 dark:bg-white/[0.04]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          aria-label={`Select order ${order.orderNumber}`}
                          className="rounded border-stone-300 dark:border-white/20"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-900 dark:text-white">
                        {order.orderNumber}
                        <div className="text-[10px] text-stone-400 font-sans">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900 dark:text-white">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300 max-w-[220px] truncate">
                        {order.shippingAddress}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-stone-900 dark:text-white">
                        {formatBDT(order.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        {order.consignmentId ? (
                          isCarrybee ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded text-[11px] font-mono text-amber-800 dark:text-amber-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span className="font-semibold">Carrybee:</span> {order.consignmentId}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded text-[11px] font-mono text-blue-700 dark:text-blue-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span className="font-semibold">Pathao:</span> {order.consignmentId}
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-stone-400">Not Dispatched</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${
                            order.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : order.status === 'processing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : order.status === 'shipped'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintSingleLabel(order)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                            title={`Print ${order.courierName || 'Shipping'} Label`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Dual Courier Dispatch Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#141419] border border-stone-200 dark:border-white/10 rounded-sm shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-display font-medium text-stone-900 dark:text-white">
                    Order Details: {selectedOrder.orderNumber}
                  </h3>
                  {selectedOrder.courierName && (
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-semibold ${
                      selectedOrder.courierName.toLowerCase().includes('carrybee')
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}>
                      {selectedOrder.courierName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectOrder(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {dispatchSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {dispatchSuccess}
                </div>
              )}

              {dispatchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {dispatchError}
                </div>
              )}

              {/* Status Update Bar */}
              <div className="p-4 bg-stone-50 dark:bg-white/[0.02] border border-stone-200 dark:border-white/10 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="block text-[11px] font-medium uppercase text-stone-500">
                    Order Status
                  </span>
                  <div className="text-sm font-semibold text-stone-900 dark:text-white capitalize">
                    {selectedOrder.status}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as any)}
                    aria-label="Update order status"
                    className="px-3 py-1.5 bg-white dark:bg-black border border-stone-300 dark:border-white/20 text-stone-900 dark:text-white text-xs rounded outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePrintSingleLabel(selectedOrder, 'Carrybee Courier')}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Print Carrybee Courier Amber Shipping Sticker"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Carrybee Sticker
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintSingleLabel(selectedOrder, 'Pathao Courier')}
                      className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-medium rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Print Pathao Courier Crimson Shipping Sticker"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Pathao Sticker
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer & Delivery Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-stone-200 dark:border-white/10 rounded">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-2">
                    Customer Information
                  </h4>
                  <div className="space-y-1 text-stone-700 dark:text-stone-300">
                    <div className="font-semibold text-stone-900 dark:text-white text-sm">
                      {selectedOrder.customerName}
                    </div>
                    <div className="font-mono">{selectedOrder.customerPhone}</div>
                  </div>
                </div>

                <div className="p-4 border border-stone-200 dark:border-white/10 rounded">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-2">
                    Delivery Destination
                  </h4>
                  <div className="space-y-1 text-stone-700 dark:text-stone-300">
                    <p>{selectedOrder.shippingAddress}</p>
                    <div className="text-[11px] text-stone-400 uppercase">
                      Zone: {selectedOrder.deliveryZone === 'inside-dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-stone-200 dark:border-white/10 rounded overflow-hidden">
                <div className="px-4 py-2 bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 font-medium text-stone-500 uppercase text-[11px]">
                  Order Items
                </div>
                <div className="divide-y divide-stone-100 dark:divide-white/5 p-4 space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                      <div>
                        <div className="font-medium text-stone-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </div>
                        <div className="text-stone-500 text-[11px]">
                          Size: {item.size} {item.color ? `· Color: ${item.color}` : ''}
                        </div>
                      </div>
                      <div className="font-mono font-medium text-stone-900 dark:text-white">
                        {formatBDT(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-stone-200 dark:border-white/10 flex justify-between items-center font-mono font-semibold text-sm text-stone-900 dark:text-white">
                    <span>COD Payable on Delivery:</span>
                    <span>{formatBDT(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* DUAL COURIER DISPATCH CONTROL CENTER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-stone-500" />
                    Automated Courier Dispatch Center
                  </h4>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Select Courier &amp; Push to Partner Portal
                  </span>
                </div>

                {/* Option A: Carrybee Courier */}
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/70 dark:border-amber-800/40 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="font-semibold text-amber-950 dark:text-amber-200 text-xs">
                        Carrybee Courier Integration
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded font-mono">
                        v2.0 REST API
                      </span>
                    </div>
                    {selectedOrder.consignmentId && selectedOrder.courierName?.toLowerCase().includes('carrybee') && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 font-mono text-[11px] rounded font-semibold border border-amber-300">
                        Carrybee AWB: {selectedOrder.consignmentId}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    Transfers parcel weight, COD total ({formatBDT(selectedOrder.total)}), and recipient address directly to Carrybee Courier.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDispatchToCarrybee(selectedOrder)}
                      disabled={isCarrybeeDispatching || isDispatching}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isCarrybeeDispatching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {selectedOrder.consignmentId && selectedOrder.courierName?.toLowerCase().includes('carrybee')
                        ? 'Re-dispatch / Update Carrybee'
                        : 'Dispatch via Carrybee Courier'}
                    </button>

                    {selectedOrder.consignmentId && selectedOrder.courierName?.toLowerCase().includes('carrybee') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTrackCarrybee(selectedOrder.consignmentId!)}
                          disabled={isTracking}
                          className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer border border-stone-200 dark:border-white/10"
                        >
                          {isTracking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Truck className="w-3.5 h-3.5" />
                          )}
                          Track Carrybee Live
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintSingleLabel(selectedOrder, 'Carrybee Courier')}
                          className="px-3.5 py-2 bg-amber-900 hover:bg-black text-white font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                          title="Print Carrybee Courier signature shipping sticker"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Carrybee Sticker
                        </button>
                      </>
                    )}
                  </div>

                  {carrybeeTrackingInfo && (
                    <div className="p-3 bg-white dark:bg-black/40 border border-amber-200 dark:border-amber-800/50 rounded text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-stone-500">Carrybee Status:</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400 uppercase">
                          {carrybeeTrackingInfo.order_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-stone-400">
                        <span>Hub: {carrybeeTrackingInfo.hub || 'Central Sorting'}</span>
                        <span>Fee: ৳{carrybeeTrackingInfo.delivery_fee}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option B: Pathao Courier */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="font-semibold text-blue-950 dark:text-blue-200 text-xs">
                        Pathao Courier Integration
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-200/60 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 rounded font-mono">
                        Hermes Aladdin API
                      </span>
                    </div>
                    {selectedOrder.consignmentId && !selectedOrder.courierName?.toLowerCase().includes('carrybee') && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-[11px] rounded font-semibold border border-blue-300">
                        Pathao Consignment: {selectedOrder.consignmentId}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    Transfers order details directly to Pathao Courier system with automated COD parcel creation and merchant reference.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDispatchToPathao(selectedOrder)}
                      disabled={isDispatching || isCarrybeeDispatching}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isDispatching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {selectedOrder.consignmentId && !selectedOrder.courierName?.toLowerCase().includes('carrybee')
                        ? 'Re-dispatch / Update Pathao'
                        : 'Dispatch via Pathao Courier'}
                    </button>

                    {selectedOrder.consignmentId && !selectedOrder.courierName?.toLowerCase().includes('carrybee') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTrackPathao(selectedOrder.consignmentId!)}
                          disabled={isTracking}
                          className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer border border-stone-200 dark:border-white/10"
                        >
                          {isTracking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Truck className="w-3.5 h-3.5" />
                          )}
                          Track Pathao Live
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintSingleLabel(selectedOrder, 'Pathao Courier')}
                          className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-stone-200 font-medium text-xs rounded inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                          title="Print Pathao Courier Shipping Sticker for this order"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Pathao Sticker
                        </button>
                      </>
                    )}
                  </div>

                  {trackingInfo && (
                    <div className="p-3 bg-white dark:bg-black/30 border border-blue-200 dark:border-blue-900/60 rounded text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-stone-500">Live Status:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">
                          {trackingInfo.order_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-stone-400">
                        <span>Updated At:</span>
                        <span>{new Date(trackingInfo.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
