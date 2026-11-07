import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  Percent,
  Truck,
  TrendingDown,
  Sparkles,
  Save,
  Check,
  X,
} from 'lucide-react';
import { Coupon, StoreSettings } from '../types/store';
import { formatBDT } from '../data/storeData';
import { useStore } from '../context/StoreContext';

interface OffersManagementProps {
  onRefresh?: () => void;
}

export const OffersManagement: React.FC<OffersManagementProps> = () => {
  const { storeSettings, updateSettings, coupons, saveCoupons, pushToast } = useStore();

  // Local settings copy for form
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);
  const [isSaved, setIsSaved] = useState(false);

  // Coupon modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('1500');
  const [couponDesc, setCouponDesc] = useState('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(settingsForm);
    setIsSaved(true);
    pushToast('Offers & Delivery Updated', 'Changes applied across storefront & checkout');
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const newCoupon: Coupon = {
      id: `c-${Date.now()}`,
      code: couponCode.trim().toUpperCase(),
      discountType: couponType,
      discountValue: Number(couponValue) || 10,
      minOrderAmount: Number(couponMinOrder) || 0,
      isActive: true,
      description: couponDesc.trim() || undefined,
    };

    const updated = [newCoupon, ...coupons.filter((c) => c.code !== newCoupon.code)];
    await saveCoupons(updated);
    setIsCouponModalOpen(false);
    setCouponCode('');
    setCouponDesc('');
    pushToast('Coupon Created', `${newCoupon.code} is now active`);
  };

  const handleToggleCouponActive = async (id: string, current: boolean) => {
    const updated = coupons.map((c) => (c.id === id ? { ...c, isActive: !current } : c));
    await saveCoupons(updated);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm('Delete this coupon code?')) {
      const updated = coupons.filter((c) => c.id !== id);
      await saveCoupons(updated);
      pushToast('Coupon Deleted');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl text-xs">
      <div className="pb-2 border-b border-stone-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Offers, Coupons &amp; Delivery Rules
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mt-0.5">
            Configure customer promo codes, tier-based spend discounts, and global delivery fee toggles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCouponModalOpen(true)}
          className="px-3.5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black font-medium text-xs rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Promo Code
        </button>
      </div>

      {/* Section 1: Active Coupons List */}
      <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-stone-900 dark:text-white">
              Active Promo Coupons ({coupons.length})
            </h3>
          </div>
          <span className="text-[11px] text-stone-400">
            Customers apply these during checkout
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="p-6 text-center text-stone-400 border border-dashed border-stone-200 dark:border-white/10 rounded">
            No active coupons found. Click "Create Promo Code" to add a new discount.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-white/5">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 bg-stone-100 dark:bg-white/10 rounded font-mono font-bold text-stone-900 dark:text-white tracking-widest text-xs">
                    {coupon.code}
                  </div>
                  <div>
                    <div className="font-medium text-stone-900 dark:text-white">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% Off Entire Cart`
                        : `${formatBDT(coupon.discountValue)} Flat Discount`}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Min order: {formatBDT(coupon.minOrderAmount)}{' '}
                      {coupon.description ? `· ${coupon.description}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleCouponActive(coupon.id, coupon.isActive)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                      coupon.isActive
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Delete coupon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Spend & Save Tier & Delivery Switch Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Spend & Save Tier Discount Card */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-white/5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Tier-Based Spend &amp; Save Discount (Automatic)
              </h3>
              <p className="text-[11px] text-stone-500">
                Automatically cuts price at checkout when the customer's cart subtotal exceeds the threshold
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Cart Minimum Threshold (BDT)
              </label>
              <input
                type="number"
                value={settingsForm.spendSaveThreshold}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, spendSaveThreshold: Number(e.target.value) || 0 })
                }
                placeholder="e.g. 3000"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Set to 0 to disable automatic tier discounts.
              </span>
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Discount Given (BDT)
              </label>
              <input
                type="number"
                value={settingsForm.spendSaveDiscount}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, spendSaveDiscount: Number(e.target.value) || 0 })
                }
                placeholder="e.g. 300"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Amount subtracted automatically when cart exceeds threshold.
              </span>
            </div>
          </div>
        </div>

        {/* Global Delivery Fee Controls Card */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                  Nationwide Delivery Charge Controls
                </h3>
                <p className="text-[11px] text-stone-500">
                  Manage shipping rates or turn on free delivery campaigns across Bangladesh
                </p>
              </div>
            </div>

            {/* Master Free Delivery Switch */}
            <label className="flex items-center gap-2.5 px-3 py-1.5 bg-stone-100 dark:bg-white/5 rounded-sm cursor-pointer border border-stone-200 dark:border-white/10">
              <input
                type="checkbox"
                checked={settingsForm.isFreeDeliveryActive}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, isFreeDeliveryActive: e.target.checked })
                }
                className="rounded border-stone-300 w-4 h-4 text-black focus:ring-0"
              />
              <span className="font-medium text-stone-900 dark:text-white text-[11px]">
                {settingsForm.isFreeDeliveryActive ? 'Free Delivery Active (৳0 Everywhere)' : 'Turn OFF Delivery Fees'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Inside Dhaka Rate (BDT)
              </label>
              <input
                type="number"
                disabled={settingsForm.isFreeDeliveryActive}
                value={settingsForm.insideDhakaFee}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, insideDhakaFee: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Outside Dhaka Rate (BDT)
              </label>
              <input
                type="number"
                disabled={settingsForm.isFreeDeliveryActive}
                value={settingsForm.outsideDhakaFee}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, outsideDhakaFee: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Free Shipping Threshold (BDT)
              </label>
              <input
                type="number"
                disabled={settingsForm.isFreeDeliveryActive}
                value={settingsForm.freeShippingThreshold}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    freeShippingThreshold: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isSaved && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Settings Updated Live
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Offer &amp; Delivery Rules
          </button>
        </div>
      </form>

      {/* Modal: Create Promo Code */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#141419] border border-stone-200 dark:border-white/10 rounded-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-white/10">
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Create New Promo Code
              </h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SPARTA20"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    placeholder={couponType === 'percentage' ? '15' : '300'}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Minimum Order Amount (BDT)
                </label>
                <input
                  type="number"
                  value={couponMinOrder}
                  onChange={(e) => setCouponMinOrder(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={couponDesc}
                  onChange={(e) => setCouponDesc(e.target.value)}
                  placeholder="e.g. 15% off on New Eid Drop"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 dark:border-white/15 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
