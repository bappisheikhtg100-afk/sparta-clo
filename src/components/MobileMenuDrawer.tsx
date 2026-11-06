import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ArrowUpRight, Moon, Sun, ReceiptText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, MEDIA_ASSETS, STORE_INFO } from '../data/storeData';

export const MobileMenuDrawer: React.FC = () => {
  const {
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    jumpToCategory,
    activeCategory,
    theme,
    toggleTheme,
    lastOrder,
    navigate,
  } = useStore();

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 right-0 bottom-0 w-full max-w-[340px] bg-[#FAF9F6] dark:bg-[#0B0B0E] border-l border-stone-200 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto"
            aria-label="Mobile Navigation"
          >
            <div>
              <div className="h-14 px-5 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={theme === 'dark' ? MEDIA_ASSETS.logoWhite : MEDIA_ASSETS.logoBlack}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-auto object-contain"
                  />
                  <span className="font-display text-lg font-semibold tracking-[0.24em] text-[#111111] dark:text-[#F5F4F0]">
                    SPARTA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-stone-500 hover:text-[#111111] dark:hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" strokeWidth={1.6} />
                </button>
              </div>

              <div className="px-6 pt-6 pb-4">
                <p className="text-[11px] font-medium text-stone-500 dark:text-zinc-400 mb-3">
                  Collection Index
                </p>
                <div className="divide-y divide-stone-200/80 dark:divide-zinc-800">
                  {CATEGORIES.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => jumpToCategory(cat)}
                        className="w-full min-h-[54px] flex items-center justify-between text-left group cursor-pointer"
                      >
                        <span
                          className={`font-display text-2xl transition-colors ${
                            isSelected
                              ? 'italic text-[#111111] dark:text-[#F5F4F0]'
                              : 'text-stone-700 dark:text-zinc-300 group-hover:text-[#111111] dark:group-hover:text-white'
                          }`}
                        >
                          {cat === 'All' ? 'All Pieces' : cat}
                        </span>
                        <span className="text-xs text-stone-400">→</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {lastOrder && (
                <div className="px-6 py-3">
                  <button
                    type="button"
                    onClick={() => navigate('order-confirmed')}
                    className="w-full min-h-[48px] px-4 py-3 border border-stone-200 dark:border-zinc-800 bg-[#F2F0EB] dark:bg-[#121216] flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ReceiptText className="w-4 h-4 text-[#111111] dark:text-zinc-200 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111111] dark:text-zinc-100 truncate">
                          Order {lastOrder.orderId}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate">
                          View Cash on Delivery Slip
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-stone-400">→</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-200 dark:border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  Appearance
                </span>
                <div className="inline-flex border border-stone-300 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => toggleTheme('light')}
                    className={`min-h-[36px] px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      theme === 'light'
                        ? 'bg-[#111111] text-[#FAF9F6]'
                        : 'text-stone-600 dark:text-zinc-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTheme('dark')}
                    className={`min-h-[36px] px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      theme === 'dark'
                        ? 'bg-[#F5F4F0] text-[#08080A]'
                        : 'text-stone-600 dark:text-zinc-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Dark
                  </button>
                </div>
              </div>

              <a
                href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(
                  'Hello SPARTA Support!'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] border border-stone-300 dark:border-zinc-800 flex items-center justify-between px-4 text-xs font-medium text-[#111111] dark:text-[#F5F4F0]"
              >
                <span>WhatsApp Concierge · {STORE_INFO.phone}</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
