import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { formatBDT } from '../data/storeData';
import { useStore } from '../context/StoreContext';

export const OrderConfirmedView: React.FC = () => {
  const { lastOrder, navigate } = useStore();
  const [copied, setCopied] = useState(false);

  if (!lastOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="font-display text-2xl text-[#111111] dark:text-[#F5F4F0] mb-4">
          No recent order found
        </p>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="min-h-[44px] px-7 py-2.5 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium cursor-pointer"
        >
          Return to Collection
        </button>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastOrder.summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="border border-stone-200 dark:border-zinc-800 bg-white dark:bg-[#0E0E12] p-6 sm:p-12"
      >
        <p className="font-mono tabular-nums text-xs text-stone-500 dark:text-zinc-400 mb-2">
          Order #{lastOrder.orderId} Confirmed · Preparing Dispatch
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-normal text-[#111111] dark:text-[#F5F4F0] leading-[1.06] mb-4">
          Thank you, <em className="italic font-normal">{lastOrder.customer.fullName}.</em>
        </h1>
        <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed mb-8">
          Your Cash on Delivery order has been recorded. Send your order slip to our Dhaka concierge on WhatsApp below for immediate dispatch verification.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <a
            href={lastOrder.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[50px] px-6 py-3 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs sm:text-sm font-medium tracking-wide inline-flex items-center justify-center gap-2 hover:opacity-85 transition-opacity"
          >
            <span>Send Order Slip on WhatsApp</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[50px] px-5 py-3 border border-stone-300 dark:border-zinc-700 text-xs sm:text-sm font-medium text-[#111111] dark:text-[#F5F4F0] inline-flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Slip'}</span>
          </button>
        </div>

        <div className="pt-6 border-t border-stone-200 dark:border-zinc-800 space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1">
                Shipping Destination
              </p>
              <p className="font-medium text-[#111111] dark:text-zinc-100">
                {lastOrder.customer.address}
              </p>
              <p className="text-stone-600 dark:text-zinc-400">
                {lastOrder.customer.thana}, {lastOrder.customer.district},{' '}
                {lastOrder.customer.division}
              </p>
              <p className="font-mono tabular-nums text-stone-600 dark:text-zinc-400 mt-0.5">
                {lastOrder.customer.phone}
              </p>
            </div>

            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1">
                Payment Terms
              </p>
              <p className="font-medium text-[#111111] dark:text-zinc-100">
                Cash on Delivery (COD)
              </p>
              <p className="text-stone-600 dark:text-zinc-400">
                Payable in cash upon arrival
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800 space-y-2.5">
            {lastOrder.items.map((item) => (
              <div
                key={item.cartId}
                className="flex items-center justify-between gap-4 text-xs sm:text-sm"
              >
                <span className="text-stone-700 dark:text-zinc-300">
                  <span className="font-mono tabular-nums">{item.quantity}x</span>{' '}
                  {item.name} ({item.size}
                  {item.color ? ` · ${item.color}` : ''})
                </span>
                <span className="font-mono tabular-nums font-medium text-[#111111] dark:text-zinc-100 shrink-0">
                  {formatBDT(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-stone-500 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(lastOrder.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-stone-500 dark:text-zinc-400">
              <span>Delivery</span>
              <span className="font-mono tabular-nums">
                {lastOrder.deliveryFee === 0
                  ? 'Complimentary'
                  : formatBDT(lastOrder.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-stone-200 dark:border-zinc-800 font-medium text-base text-[#111111] dark:text-[#F5F4F0]">
              <span>Total COD Payable</span>
              <span className="font-mono tabular-nums font-semibold">
                {formatBDT(lastOrder.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-stone-200 dark:border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="min-h-[44px] text-xs sm:text-sm font-medium text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0] border-b border-current pb-0.5 transition-colors cursor-pointer"
          >
            Return to Collection
          </button>
        </div>
      </motion.div>
    </div>
  );
};
