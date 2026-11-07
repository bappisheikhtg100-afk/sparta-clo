import React, { useState, useMemo } from 'react';
import { Search, User, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { AdminOrder } from '../services/orderService';
import { formatBDT } from '../data/storeData';

interface CustomerManagementProps {
  orders: AdminOrder[];
}

interface CustomerSummary {
  phone: string;
  name: string;
  address: string;
  zone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ orders }) => {
  const [search, setSearch] = useState('');

  const customers: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((o) => {
      const phone = o.customerPhone.trim();
      const existing = map.get(phone);

      if (!existing) {
        map.set(phone, {
          phone,
          name: o.customerName,
          address: o.shippingAddress,
          zone: o.deliveryZone,
          orderCount: 1,
          totalSpent: o.status !== 'cancelled' ? o.total : 0,
          lastOrderDate: o.createdAt,
        });
      } else {
        existing.orderCount += 1;
        if (o.status !== 'cancelled') {
          existing.totalSpent += o.total;
        }
        if (new Date(o.createdAt) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.createdAt;
          existing.address = o.shippingAddress;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Client Directory
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Registered customer database with lifetime purchase history and delivery destinations.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, or address..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-sm outline-none focus:border-stone-400"
        />
        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
      </div>

      <div className="bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 text-stone-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4 text-right">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.phone} className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium text-stone-900 dark:text-white">
                      {client.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                      {client.phone}
                    </td>
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-400 max-w-[280px] truncate">
                      {client.address}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {client.orderCount}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-stone-900 dark:text-white">
                      {formatBDT(client.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-500 font-mono">
                      {new Date(client.lastOrderDate).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
