import React, { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, Tag, X, Loader2 } from 'lucide-react';
import { BANGLADESH_DIVISIONS, formatBDT, STORE_INFO } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { DeliveryZone, ShippingDetails } from '../types/store';
import { normalizeBangladeshPhone } from '../services/pathaoService';
import { SmartImage } from './SmartImage';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    discountAmount,
    spendSaveAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    storeSettings,
    updateCartQuantity,
    removeFromCart,
    navigate,
    placeCODOrder,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState<ShippingDetails>({
    fullName: '',
    phone: '',
    division: 'Dhaka',
    district: '',
    thana: '',
    address: '',
    notes: '',
    deliveryZone: 'inside-dhaka',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-28 text-center">
        <h1 className="font-display text-3xl text-[#111111] dark:text-[#F5F4F0] mb-3">
          Your bag is empty
        </h1>
        <p className="text-sm text-stone-500 dark:text-zinc-400 mb-8">
          Select pieces from the archive before proceeding to Cash on Delivery checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="min-h-[48px] px-8 py-3 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium tracking-wide cursor-pointer"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  const isFreeShipping =
    storeSettings.isFreeDeliveryActive ||
    cartSubtotal >= (storeSettings.freeShippingThreshold || STORE_INFO.freeShippingThreshold);

  const baseDeliveryFee =
    form.deliveryZone === 'inside-dhaka'
      ? (storeSettings.insideDhakaFee || STORE_INFO.insideDhakaFee)
      : (storeSettings.outsideDhakaFee || STORE_INFO.outsideDhakaFee);

  const deliveryFee = isFreeShipping ? 0 : baseDeliveryFee;
  const totalDiscount = discountAmount + spendSaveAmount;
  const totalPayable = Math.max(0, cartSubtotal - totalDiscount + deliveryFee);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput.trim());
    setCouponFeedback(res);
    if (res.success) {
      setCouponInput('');
    }
  };

  const handleDivisionChange = (division: string) => {
    const autoZone: DeliveryZone =
      division === 'Dhaka' ? 'inside-dhaka' : 'outside-dhaka';
    setForm((prev) => ({
      ...prev,
      division,
      deliveryZone: autoZone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = form.fullName.trim();
    if (/\d/.test(cleanName)) {
      setFormError('Full Name cannot contain numbers (0–9). Please enter letters only.');
      return;
    }
    if (cleanName.length < 3 || !/[a-zA-Z\u0980-\u09FF]{2,}/.test(cleanName)) {
      setFormError('Please enter a valid full name (at least 3 characters).');
      return;
    }

    const normalizedPhone = normalizeBangladeshPhone(form.phone);
    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
      setFormError('Mobile number must be exactly 11 digits starting with 01 (e.g. 017XXXXXXXX).');
      return;
    }
    if (/^01(\d)\1{8}$/.test(normalizedPhone) || normalizedPhone === '01234567890') {
      setFormError('Please provide a real, active Bangladesh mobile number.');
      return;
    }

    if (
      !form.division ||
      form.district.trim().length < 2 ||
      form.thana.trim().length < 2 ||
      form.address.trim().length < 6
    ) {
      setFormError('Please complete your full delivery address (District, Thana, House/Road).');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await placeCODOrder({
        ...form,
        fullName: cleanName,
        phone: normalizedPhone,
        district: form.district.trim(),
        thana: form.thana.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
    } catch (err: any) {
      setFormError(err?.message || 'Unable to place order right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClasses =
    'w-full min-h-[48px] px-0 py-3 bg-transparent border-b border-stone-300 dark:border-zinc-800 text-sm text-[#111111] dark:text-[#F5F4F0] placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#111111] dark:focus:border-[#F5F4F0] transition-colors';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-16">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="min-h-[44px] inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0] transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Continue Shopping</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* LEFT: Minimalist Underline Shipping & Strictly COD Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-10">
          <div>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1.5">
              Doorstep Settlement · Bangladesh
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-normal text-[#111111] dark:text-[#F5F4F0] tracking-tight">
              Cash on Delivery <em className="italic font-normal">Checkout</em>
            </h1>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="cod-name"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Full Name * (Letters only)
                </label>
                <input
                  id="cod-name"
                  required
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[0-9]/g, '');
                    setForm({ ...form, fullName: sanitized });
                  }}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="cod-phone"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Mobile Number * (11 digits, starts with 01)
                </label>
                <input
                  id="cod-phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => {
                    const cleanDigits = e.target.value.replace(/[^0-9+]/g, '');
                    setForm({ ...form, phone: cleanDigits });
                  }}
                  className={`${fieldClasses} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="cod-division"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Division *
                </label>
                <select
                  id="cod-division"
                  required
                  value={form.division}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className={`${fieldClasses} [&>option]:bg-white [&>option]:text-stone-900 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100`}
                >
                  {BANGLADESH_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cod-district"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  District *
                </label>
                <input
                  id="cod-district"
                  required
                  type="text"
                  placeholder="e.g. Dhaka, Sylhet, Chattogram"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className={fieldClasses}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="cod-thana"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Thana / Upazila *
                </label>
                <input
                  id="cod-thana"
                  required
                  type="text"
                  placeholder="e.g. Gulshan, Dhanmondi, Uttara"
                  value={form.thana}
                  onChange={(e) => setForm({ ...form, thana: e.target.value })}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="cod-address"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Full Street Address *
                </label>
                <input
                  id="cod-address"
                  required
                  type="text"
                  placeholder="House, Road, Block / Sector"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={fieldClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cod-notes"
                className="block text-xs text-stone-500 dark:text-zinc-400"
              >
                Courier Note (Optional)
              </label>
              <input
                id="cod-notes"
                type="text"
                placeholder="Landmark or preferred delivery hour"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={fieldClasses}
              />
            </div>
          </div>

          {/* Delivery Zone */}
          <div>
            <span className="block text-xs text-stone-500 dark:text-zinc-400 mb-3">
              Delivery Area
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryZone: 'inside-dhaka' })}
                className={`min-h-[58px] p-4 border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  form.deliveryZone === 'inside-dhaka'
                    ? 'border-[#111111] dark:border-[#F5F4F0] bg-[#F2F0EB] dark:bg-[#121216]'
                    : 'border-stone-300 dark:border-zinc-800 hover:border-stone-500'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                    Inside Dhaka
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    1–2 business days
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                  {isFreeShipping ? 'Complimentary' : formatBDT(storeSettings.insideDhakaFee || STORE_INFO.insideDhakaFee)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryZone: 'outside-dhaka' })}
                className={`min-h-[58px] p-4 border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  form.deliveryZone === 'outside-dhaka'
                    ? 'border-[#111111] dark:border-[#F5F4F0] bg-[#F2F0EB] dark:bg-[#121216]'
                    : 'border-stone-300 dark:border-zinc-800 hover:border-stone-500'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                    Outside Dhaka
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    2–4 business days
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                  {isFreeShipping ? 'Complimentary' : formatBDT(storeSettings.outsideDhakaFee || STORE_INFO.outsideDhakaFee)}
                </span>
              </button>
            </div>
          </div>

          {/* Strictly Cash on Delivery Notice */}
          <div>
            <span className="block text-xs text-stone-500 dark:text-zinc-400 mb-3">
              Payment Method
            </span>
            <div className="p-5 border border-[#111111] dark:border-[#F5F4F0] bg-[#F2F0EB]/70 dark:bg-[#121216]">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F4F0]">
                  Cash on Delivery (COD)
                </h2>
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  Selected
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                SPARTA operates exclusively via Cash on Delivery. Settle{' '}
                <strong className="font-mono tabular-nums text-[#111111] dark:text-[#F5F4F0]">
                  {formatBDT(totalPayable)}
                </strong>{' '}
                in cash directly with our courier partner upon receiving your parcel.
              </p>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[54px] px-8 py-4 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs sm:text-sm font-medium tracking-wide hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying &amp; Placing Order...</span>
              </>
            ) : (
              <span>Place Cash on Delivery Order · {formatBDT(totalPayable)}</span>
            )}
          </button>
        </form>

        {/* RIGHT: Sticky Order Summary */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 border border-stone-200 dark:border-zinc-800 bg-[#F3F1EC] dark:bg-[#0E0E12] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-normal text-[#111111] dark:text-[#F5F4F0] pb-4 mb-5 border-b border-stone-200 dark:border-zinc-800">
            Order Summary
          </h2>

          <div className="divide-y divide-stone-200 dark:divide-zinc-800 max-h-[380px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.cartId} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                <div className="w-16 h-20 bg-[#F2F1EE] border border-stone-200 dark:border-zinc-800 shrink-0 overflow-hidden">
                  <SmartImage
                    src={item.image}
                    alt={item.name}
                    fallbackLabel={item.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-[#111111] dark:text-[#F5F4F0] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                    {item.size}
                    {item.color ? ` · ${item.color}` : ''}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.cartId, -1)}
                      className="w-6 h-6 border border-stone-300 dark:border-zinc-700 flex items-center justify-center text-stone-600 dark:text-zinc-300 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono tabular-nums text-xs text-[#111111] dark:text-[#F5F4F0]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.cartId, 1)}
                      className="w-6 h-6 border border-stone-300 dark:border-zinc-700 flex items-center justify-center text-stone-600 dark:text-zinc-300 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartId)}
                      className="ml-1 text-stone-400 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <span className="font-mono tabular-nums text-sm font-medium text-[#111111] dark:text-[#F5F4F0] shrink-0">
                  {formatBDT(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon / Voucher Input Box */}
          <div className="mt-6 pt-5 border-t border-stone-200 dark:border-zinc-800">
            <span className="block text-xs uppercase tracking-wider text-stone-500 dark:text-zinc-400 font-medium mb-2.5">
              Promo Voucher / Coupon
            </span>

            {appliedCoupon ? (
              <div className="p-3 bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
                  <div>
                    <span className="font-mono text-xs font-semibold text-stone-900 dark:text-white">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      {appliedCoupon.description || 'Active discount applied'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="p-1 text-stone-400 hover:text-rose-500 cursor-pointer transition-colors"
                  title="Remove coupon"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code (e.g. SPARTA10)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-stone-300 dark:border-zinc-700 text-xs text-stone-900 dark:text-white uppercase font-mono tracking-wider outline-none focus:border-stone-800 dark:focus:border-white"
                />
                <button
                  type="submit"
                  disabled={!couponInput.trim()}
                  className="px-4 py-2 bg-stone-900 hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium uppercase tracking-wider disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </form>
            )}

            {couponFeedback && (
              <p
                className={`mt-2 text-[11px] ${
                  couponFeedback.success
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {couponFeedback.message}
              </p>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-stone-200 dark:border-zinc-800 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(cartSubtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Promo Coupon ({appliedCoupon?.code})
                </span>
                <span className="font-mono tabular-nums font-medium">
                  - {formatBDT(discountAmount)}
                </span>
              </div>
            )}

            {spendSaveAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Spend &amp; Save Campaign</span>
                <span className="font-mono tabular-nums font-medium">
                  - {formatBDT(spendSaveAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400">
              <span>
                Delivery ({form.deliveryZone === 'inside-dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
              </span>
              <span className="font-mono tabular-nums">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Complimentary</span>
                ) : (
                  formatBDT(deliveryFee)
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400">
              <span>Payment</span>
              <span>Cash on Delivery</span>
            </div>

            <div className="pt-4 mt-3 border-t border-stone-300 dark:border-zinc-800 flex items-baseline justify-between">
              <span className="text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                Total Payable
              </span>
              <span className="font-mono tabular-nums text-xl font-semibold text-[#111111] dark:text-[#F5F4F0]">
                {formatBDT(totalPayable)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
