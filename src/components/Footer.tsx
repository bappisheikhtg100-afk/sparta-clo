import React from 'react';
import { MEDIA_ASSETS, STORE_INFO } from '../data/storeData';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { theme, jumpToCategory, navigate, toggleTheme } = useStore();

  return (
    <footer className="border-t border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-[#08080A] transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-stone-200 dark:border-zinc-800">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-3 cursor-pointer"
            >
              <img
                src={theme === 'dark' ? MEDIA_ASSETS.logoWhite : MEDIA_ASSETS.logoBlack}
                alt="SPARTA emblem"
                referrerPolicy="no-referrer"
                className="h-10 w-auto object-contain"
              />
              <span className="font-display text-2xl font-semibold tracking-[0.26em] text-[#111111] dark:text-[#F5F4F0]">
                SPARTA
              </span>
            </button>
            <p className="text-sm text-stone-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              Contemporary luxury apparel, tailored trousers, court footwear, and signature fragrances. Cash on Delivery nationwide across Bangladesh.
            </p>
          </div>

          {/* Archive Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-medium text-stone-500 dark:text-zinc-400">
              Archive
            </h3>
            <ul className="space-y-2.5 text-sm text-[#111111] dark:text-zinc-300">
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('Upperwear')}
                  className="hover:opacity-65 transition-opacity cursor-pointer"
                >
                  Upperwear
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('Bottomwear')}
                  className="hover:opacity-65 transition-opacity cursor-pointer"
                >
                  Bottomwear
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('Shoes/Sneakers')}
                  className="hover:opacity-65 transition-opacity cursor-pointer"
                >
                  Shoes &amp; Sneakers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('Perfume')}
                  className="hover:opacity-65 transition-opacity cursor-pointer"
                >
                  Perfume
                </button>
              </li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-medium text-stone-500 dark:text-zinc-400">
              Concierge &amp; Socials
            </h3>
            <div className="space-y-2 text-sm text-stone-600 dark:text-zinc-400">
              <p>
                WhatsApp:{' '}
                <a
                  href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(
                    'Hello SPARTA Support!'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono tabular-nums text-[#111111] dark:text-zinc-200 hover:underline"
                >
                  {STORE_INFO.phone}
                </a>
              </p>
              <p>
                Email:{' '}
                <a
                  href={`mailto:${STORE_INFO.email}`}
                  className="text-[#111111] dark:text-zinc-200 hover:underline"
                >
                  {STORE_INFO.email}
                </a>
              </p>
              <div className="pt-2 flex items-center gap-6 text-sm font-medium text-[#111111] dark:text-zinc-200">
                <a
                  href={STORE_INFO.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] inline-flex items-center hover:opacity-65 transition-opacity"
                >
                  Instagram ↗
                </a>
                <a
                  href={STORE_INFO.socials.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] inline-flex items-center hover:opacity-65 transition-opacity"
                >
                  TikTok ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-zinc-400">
          <p>&copy; 2026 SPARTA. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Cash on Delivery Only</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="underline underline-offset-4 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="underline underline-offset-4 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
            >
              Atelier Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
