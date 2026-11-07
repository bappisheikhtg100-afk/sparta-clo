import React, { useMemo } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Truck,
  Printer,
  Plus,
} from 'lucide-react';
import { AdminOrder } from '../services/orderService';
import { Product } from '../types/store';
import { formatBDT } from '../data/storeData';

interface DashboardOverviewProps {
  orders: AdminOrder[];
  products: Product[];
  onSelectOrder: (order: AdminOrder) => void;
  onNavigateTab: (tab: 'orders' | 'products' | 'courier') => void;
  onOpenCreateProduct: () => void;
  onOpenBulkLabels: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  orders,
  products,
  onSelectOrder,
  onNavigateTab,
  onOpenCreateProduct,
  onOpenBulkLabels,
}) => {
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const processingOrders = orders.filter((o) => o.status === 'processing').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + o.total, 0);

    const lowStockProducts = products.filter(
      (p) => p.stock === 'out-of-stock' || (p.stockCount !== undefined && p.stockCount <= 3)
    ).length;

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      lowStockProducts,
    };
  }, [orders, products]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Operations Overview
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Real-time status of orders, inventory stock, and Pathao shipments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenBulkLabels}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print A4 Labels
          </button>
          <button
            type="button"
            onClick={onOpenCreateProduct}
            className="px-3.5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Product
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Gross Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-semibold text-stone-900 dark:text-white">
            {formatBDT(stats.totalRevenue)}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {stats.totalOrders} total transactions
          </div>
        </div>

        {/* Pending Orders */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="p-5 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-semibold text-amber-600 dark:text-amber-400">
            {stats.pendingOrders}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
            Requires Pathao dispatch <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* In Transit / Processing */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="p-5 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">In Fulfillment</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-semibold text-blue-600 dark:text-blue-400">
            {stats.processingOrders}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Packed / with courier
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onNavigateTab('products')}
          className="p-5 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm cursor-pointer hover:border-rose-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-semibold text-rose-600 dark:text-rose-400">
            {stats.lowStockProducts}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Out of stock or &le; 3 units
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-stone-500" />
            <h3 className="text-sm font-medium text-stone-900 dark:text-white">
              Recent Orders
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            View all ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500 dark:text-stone-400">
            No customer orders placed yet. Orders will appear here live when placed from the store.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 text-stone-500 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-sans">
                {recentOrders.map((order) => {
                  const statusColors = {
                    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
                    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
                    delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                    cancelled: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
                  }[order.status];

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-stone-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-900 dark:text-white">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900 dark:text-white">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-400 max-w-[200px] truncate">
                        {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-900 dark:text-white">
                        {formatBDT(order.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${statusColors}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order);
                          }}
                          className="text-xs text-stone-700 dark:text-stone-300 hover:text-black dark:hover:text-white underline cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
