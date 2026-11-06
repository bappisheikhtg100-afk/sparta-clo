import React, { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { BANGLADESH_DIVISIONS, formatBDT, STORE_INFO } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { DeliveryZone, ShippingDetails } from '../types/store';
import { SmartImage } from './SmartImage';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    navigate,
    placeCODOrder,
  } = useStore();

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

  const isFreeShipping = cartSubtotal >= STORE_INFO.freeShippingThreshold;
  const baseDeliveryFee =
    form.deliveryZone === 'inside-dhaka'
      ? STORE_INFO.insideDhakaFee
      : STORE_INFO.outsideDhakaFee;
  const deliveryFee = isFreeShipping ? 0 : baseDeliveryFee;
  const totalPayable = cartSubtotal + deliveryFee;

  const handleDivisionChange = (division: string) => {
    const autoZone: DeliveryZone =
      division === 'Dhaka' ? 'inside-dhaka' : 'outside-dhaka';
    setForm((prev) => ({
      ...prev,
      division,
      deliveryZone: autoZone,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 11-digit Bangladesh mobile number.');
      return;
    }
    if (
      !form.fullName.trim() ||
      !form.division ||
      !form.district.trim() ||
      !form.thana.trim() ||
      !form.address.trim()
    ) {
      setFormError('Please complete all required delivery address fields.');
      return;
    }
    setFormError(null);
    placeCODOrder({
      ...form,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      district: form.district.trim(),
      thana: form.thana.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    });
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
                  Full Name *
                </label>
                <input
                  id="cod-name"
                  required
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="cod-phone"
                  className="block text-xs text-stone-500 dark:text-zinc-400"
                >
                  Mobile Number *
                </label>
                <input
                  id="cod-phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  {isFreeShipping ? 'Complimentary' : formatBDT(STORE_INFO.insideDhakaFee)}
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
                  {isFreeShipping ? 'Complimentary' : formatBDT(STORE_INFO.outsideDhakaFee)}
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
            className="w-full min-h-[54px] px-8 py-4 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs sm:text-sm font-medium tracking-wide hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
          >
            Place Cash on Delivery Order · {formatBDT(totalPayable)}
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

          <div className="mt-6 pt-5 border-t border-stone-200 dark:border-zinc-800 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(cartSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-stone-600 dark:text-zinc-400">
              <span>
                Delivery ({form.deliveryZone === 'inside-dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
              </span>
              <span className="font-mono tabular-nums">
                {deliveryFee === 0 ? 'Complimentary' : formatBDT(deliveryFee)}
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
