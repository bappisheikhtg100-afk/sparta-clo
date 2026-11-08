import React from 'react';
import { Menu, Moon, ShoppingBag, Sun } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MEDIA_ASSETS } from '../data/storeData';

export const Navbar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    cartCount,
    setIsCartOpen,
    setIsMobileMenuOpen,
    navigate,
    jumpToCategory,
    activeCategory,
    currentRoute,
  } = useStore();

  const handleAtelierScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentRoute !== 'home') {
      navigate('home');
      setTimeout(() => {
        document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: 'Collection', cat: 'All' as const },
    { label: 'Upperwear', cat: 'Upperwear' as const },
    { label: 'Bottomwear', cat: 'Bottomwear' as const },
    { label: 'Fragrance', cat: 'Perfume' as const },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-[#FAF9F6]/90 dark:bg-[#08080A]/90 backdrop-blur-md border-b border-stone-200/90 dark:border-zinc-800/90 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-8">
        {/* Zone 1: Pure Typographic SPARTA Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
          className="inline-flex items-center whitespace-nowrap shrink-0 min-h-[44px] group focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current"
          aria-label="SPARTA Home"
        >
          <img
            src={theme === 'dark' ? MEDIA_ASSETS.logoWhite : MEDIA_ASSETS.logoBlack}
            alt="SPARTA"
            referrerPolicy="no-referrer"
            className="h-4 sm:h-5 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </a>

        {/* Zone 2: Minimalist Single-Line Editorial Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide text-stone-600 dark:text-zinc-400"
        >
          {navItems.map((item) => {
            const isActive = currentRoute === 'home' && activeCategory === item.cat;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => jumpToCategory(item.cat)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-200 cursor-pointer after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-current after:transition-transform after:duration-200 ${
                  isActive
                    ? 'text-[#111111] dark:text-[#F5F4F0] after:scale-x-100'
                    : 'hover:text-[#111111] dark:hover:text-[#F5F4F0] after:scale-x-0 hover:after:scale-x-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <a
            href="#atelier"
            onClick={handleAtelierScroll}
            className="relative py-1 whitespace-nowrap shrink-0 hover:text-[#111111] dark:hover:text-[#F5F4F0] transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-current after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200"
          >
            House
          </a>
        </nav>

        {/* Zone 3: Theme Switch + Bag Action */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => toggleTheme()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-700 dark:text-zinc-300 hover:text-[#111111] dark:hover:text-white transition-colors duration-150 cursor-pointer"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-[18px] h-[18px]" strokeWidth={1.6} />
            ) : (
              <Sun className="w-[18px] h-[18px]" strokeWidth={1.6} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="min-h-[40px] px-4 py-2 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium tracking-wide inline-flex items-center gap-2 whitespace-nowrap shrink-0 hover:opacity-85 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            aria-label={`Open shopping bag with ${cartCount} items`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
            <span>Bag</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">
              ({cartCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-[#111111] dark:text-[#F5F4F0] cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
};
