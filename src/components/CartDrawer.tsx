import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatBDT, STORE_INFO } from '../data/storeData';
import { SmartImage } from './SmartImage';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    cartCount,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    navigate,
  } = useStore();

  const remainingForFreeShipping = Math.max(
    0,
    STORE_INFO.freeShippingThreshold - cartSubtotal
  );
  const progressPct = Math.min(
    100,
    Math.round((cartSubtotal / STORE_INFO.freeShippingThreshold) * 100)
  );

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setIsCartOpen(false)}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 right-0 bottom-0 w-full sm:max-w-[420px] bg-[#FAF9F6] dark:bg-[#0B0B0E] border-l border-stone-200 dark:border-zinc-800 flex flex-col"
            aria-label="Shopping Bag"
          >
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-2xl font-normal text-[#111111] dark:text-[#F5F4F0]">
                  Shopping Bag
                </h2>
                <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                  ({cartCount})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-stone-500 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close shopping bag"
              >
                <X className="w-5 h-5" strokeWidth={1.6} />
              </button>
            </div>

            {/* Complimentary Delivery Progress */}
            {cart.length > 0 && (
              <div className="px-6 py-3.5 bg-[#F2F0EB] dark:bg-[#121216] border-b border-stone-200 dark:border-zinc-800 shrink-0">
                <p className="text-xs text-stone-600 dark:text-zinc-300 mb-2">
                  {remainingForFreeShipping === 0 ? (
                    <span>Complimentary nationwide delivery unlocked</span>
                  ) : (
                    <span>
                      Add{' '}
                      <strong className="font-mono tabular-nums font-medium text-[#111111] dark:text-white">
                        {formatBDT(remainingForFreeShipping)}
                      </strong>{' '}
                      for complimentary delivery
                    </span>
                  )}
                </p>
                <div className="h-[2px] w-full bg-stone-300 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#111111] dark:bg-[#F5F4F0] transition-transform duration-300 origin-left"
                    style={{ transform: `scaleX(${progressPct / 100})` }}
                  />
                </div>
              </div>
            )}

            {/* Bag Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <ShoppingBag
                    className="w-7 h-7 text-stone-400 dark:text-zinc-600 mb-4"
                    strokeWidth={1.3}
                  />
                  <p className="font-display text-2xl text-[#111111] dark:text-[#F5F4F0] mb-1.5">
                    Your bag is empty
                  </p>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 max-w-[230px] mb-7">
                    Discover tailored knitwear, formal trousers, and signature fragrances.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('home');
                    }}
                    className="min-h-[44px] px-7 py-2.5 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium tracking-wide hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    Explore Collection
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-zinc-800">
                  {cart.map((item) => (
                    <div key={item.cartId} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                      <div className="w-20 h-26 bg-[#F2F1EE] shrink-0 border border-stone-200/80 dark:border-zinc-800 overflow-hidden">
                        <SmartImage
                          src={item.image}
                          alt={item.name}
                          fallbackLabel={item.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F4F0] truncate">
                              {item.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.cartId)}
                              className="min-h-[36px] min-w-[36px] -mt-1.5 -mr-2 flex items-center justify-center text-stone-400 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                            {item.size}
                            {item.color ? ` · ${item.color}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-stone-300 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.cartId, -1)}
                              className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-mono tabular-nums font-medium text-[#111111] dark:text-[#F5F4F0]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.cartId, 1)}
                              className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-mono tabular-nums text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
                            {formatBDT(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Checkout CTA */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-stone-200 dark:border-zinc-800 bg-[#F3F1EC] dark:bg-[#101014] shrink-0 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600 dark:text-zinc-400">Subtotal</span>
                    <span className="font-mono tabular-nums font-semibold text-base text-[#111111] dark:text-[#F5F4F0]">
                      {formatBDT(cartSubtotal)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    Cash on Delivery only · Settled upon arrival
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('checkout');
                  }}
                  className="w-full min-h-[50px] px-6 py-3 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-2.5 hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Proceed to COD Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
