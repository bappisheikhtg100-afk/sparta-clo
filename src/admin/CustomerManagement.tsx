import React, { useState, useMemo } from 'react';
import { Search, User, Phone, MapPin, ShoppingBag, Globe, Building2 } from 'lucide-react';
import { AdminOrder } from '../services/orderService';
import { formatBDT } from '../data/storeData';

interface CustomerManagementProps {
  orders: AdminOrder[];
}

export type BDKDivision =
  | 'Dhaka'
  | 'Chattogram'
  | 'Sylhet'
  | 'Rajshahi'
  | 'Khulna'
  | 'Barishal'
  | 'Rangpur'
  | 'Mymensingh'
  | 'Other';

interface CustomerSummary {
  phone: string;
  name: string;
  address: string;
  zone: string;
  division: BDKDivision;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

/**
 * Intelligent Bangladesh division resolver from raw address text and delivery zone
 */
function resolveDivision(address: string, zone?: string): BDKDivision {
  const text = (address || '').toLowerCase();

  // Chattogram division
  if (
    /chattogram|chittagong|cox'?s\s*bazar|cumilla|comilla|feni|brahmanbaria|chandpur|noakhali|lakshmipur|khagrachhari|rangamati|bandarban/.test(text)
  ) {
    return 'Chattogram';
  }

  // Sylhet division
  if (/sylhet|moulvibazar|moulovibazar|habiganj|sunamganj|sreemangal|beanibazar/.test(text)) {
    return 'Sylhet';
  }

  // Rajshahi division
  if (/rajshahi|bogra|bogura|pabna|sirajganj|naogaon|natore|joypurhat|chapai|nawabganj/.test(text)) {
    return 'Rajshahi';
  }

  // Khulna division
  if (/khulna|jessore|jashore|kushtia|satkhira|bagerhat|chuadanga|jhenaidah|magura|meherpur/.test(text)) {
    return 'Khulna';
  }

  // Barishal division
  if (/barishal|barisal|bhola|patuakhali|pirojpur|barguna|jhalokathi|kuakata/.test(text)) {
    return 'Barishal';
  }

  // Rangpur division
  if (/rangpur|dinajpur|gaibandha|kurigram|lalmonirhat|nilphamari|panchagarh|thakurgaon|saidpur/.test(text)) {
    return 'Rangpur';
  }

  // Mymensingh division
  if (/mymensingh|jamalpur|netrokona|sherpur/.test(text)) {
    return 'Mymensingh';
  }

  // Dhaka division (default if inside dhaka or matches dhaka districts)
  if (
    zone === 'inside-dhaka' ||
    /dhaka|gazipur|narayanganj|tangail|narsingdi|faridpur|manikganj|munshiganj|rajbari|gopalganj|madaripur|shariatpur|kishoreganj|savar|uttara|gulshan|banani|dhanmondi|mirpur|motijheel|keraniganj/.test(text)
  ) {
    return 'Dhaka';
  }

  return 'Other';
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ orders }) => {
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');

  const customers: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((o) => {
      const phone = o.customerPhone.trim();
      const existing = map.get(phone);
      const div = resolveDivision(o.shippingAddress, o.deliveryZone);

      if (!existing) {
        map.set(phone, {
          phone,
          name: o.customerName,
          address: o.shippingAddress,
          zone: o.deliveryZone,
          division: div,
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
          existing.division = div;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const divisionsList: { id: string; label: string }[] = [
    { id: 'all', label: 'All Divisions' },
    { id: 'Dhaka', label: 'Dhaka' },
    { id: 'Chattogram', label: 'Chattogram' },
    { id: 'Sylhet', label: 'Sylhet' },
    { id: 'Rajshahi', label: 'Rajshahi' },
    { id: 'Khulna', label: 'Khulna' },
    { id: 'Barishal', label: 'Barishal' },
    { id: 'Rangpur', label: 'Rangpur' },
    { id: 'Mymensingh', label: 'Mymensingh' },
    { id: 'Other', label: 'Other / Pending' },
  ];

  const filtered = customers.filter((c) => {
    const matchesDivision =
      selectedDivision === 'all' || c.division === selectedDivision;
    const term = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.address.toLowerCase().includes(term) ||
      c.division.toLowerCase().includes(term);

    return matchesDivision && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Client Directory
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Registered customer database categorized division-wise with lifetime purchase history.
          </p>
        </div>
      </div>

      {/* Division Tabs & Search */}
      <div className="space-y-3">
        {/* Division Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {divisionsList.map((d) => {
            const count =
              d.id === 'all'
                ? customers.length
                : customers.filter((c) => c.division === d.id).length;

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDivision(d.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedDivision === d.id
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 border border-stone-200 dark:border-white/10'
                }`}
              >
                <span>{d.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedDivision === d.id
                      ? 'bg-stone-700 text-stone-100 dark:bg-stone-200 dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-white/10 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, address, or division..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-sm outline-none focus:border-stone-400"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 text-stone-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4 text-right">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No customers found for the selected division or search query.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const divisionColors: Record<BDKDivision, string> = {
                    Dhaka: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                    Chattogram: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
                    Sylhet: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
                    Rajshahi: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                    Khulna: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
                    Barishal: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
                    Rangpur: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
                    Mymensingh: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
                    Other: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
                  };

                  return (
                    <tr key={client.phone} className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-medium text-stone-900 dark:text-white">
                        {client.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                        {client.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            divisionColors[client.division] || divisionColors.Other
                          }`}
                        >
                          <Building2 className="w-2.5 h-2.5" />
                          {client.division}
                        </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
