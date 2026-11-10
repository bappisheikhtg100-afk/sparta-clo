import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { formatBDT, MEDIA_ASSETS, STORE_INFO } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { SmartImage } from './SmartImage';

import { CustomerReviewsMarquee } from './CustomerReviewsMarquee';

export const AtelierSection: React.FC = () => {
  const { lastOrder, navigate, jumpToCategory } = useStore();

  const houseCodes = [
    {
      num: '01.',
      title: 'Tailored Proportion & Knitwear',
      body: 'From combed cotton quarter-zip cable knits to double-pleated flare trousers, each silhouette balances classical tailoring with effortless everyday movement.',
    },
    {
      num: '02.',
      title: 'Signature Eau de Parfum House',
      body: 'Composed in small batches with high-concentration aromatic oils for enduring projection, offered in 100 ml flacons, 50 ml editions, and 15 ml travel sprays.',
    },
    {
      num: '03.',
      title: 'Cash on Delivery Nationwide',
      body: `Zero online prepayment friction. Settle your order in cash upon doorstep arrival anywhere in Bangladesh (${formatBDT(
        STORE_INFO.insideDhakaFee
      )} Inside Dhaka · ${formatBDT(
        STORE_INFO.outsideDhakaFee
      )} Outside Dhaka · Complimentary over ${formatBDT(
        STORE_INFO.freeShippingThreshold
      )}).`,
    },
  ];

  return (
    <section
      id="atelier"
      className="border-t border-stone-200/90 dark:border-zinc-800/90 bg-[#F3F1EC] dark:bg-[#0D0D10] transition-colors duration-200"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24">
        {/* Customer Reviews Section with Bengali Short Reviews Marquee (Right to Left) */}
        <div className="pb-16 border-b border-stone-300/70 dark:border-zinc-800">
          <CustomerReviewsMarquee />
        </div>

        {/* 3 Architectural House Codes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 pt-16">
          {houseCodes.map((code, idx) => (
            <motion.div
              key={code.num}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: 0.45,
                delay: idx * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="space-y-3"
            >
              <span className="font-display italic text-2xl text-stone-500 dark:text-zinc-400 block">
                {code.num}
              </span>
              <h3 className="text-base font-semibold text-[#111111] dark:text-[#F5F4F0]">
                {code.title}
              </h3>
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                {code.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Recent Order Receipt Shortcut */}
        {lastOrder && (
          <div className="mt-16 pt-8 border-t border-stone-300/70 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Recent Cash on Delivery Order
              </p>
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F4F0] mt-0.5">
                Order <span className="font-mono tabular-nums">{lastOrder.orderId}</span> ·{' '}
                {formatBDT(lastOrder.total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('order-confirmed')}
              className="min-h-[44px] px-5 py-2.5 border border-[#111111] dark:border-[#F5F4F0] text-xs font-medium text-[#111111] dark:text-[#F5F4F0] inline-flex items-center gap-2 self-start sm:self-auto hover:bg-[#111111] hover:text-[#FAF9F6] dark:hover:bg-[#F5F4F0] dark:hover:text-[#08080A] transition-colors cursor-pointer"
            >
              <span>View Order Slip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
