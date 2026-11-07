import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { CATEGORIES, getDisplayPrice, PRODUCTS } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';

type SortOption = 'featured' | 'price-asc' | 'price-desc';

export const CollectionSection: React.FC = () => {
  const { activeCategory, setActiveCategory, products } = useStore();
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = products && products.length > 0 ? products : PRODUCTS;

    if (activeCategory === 'All' && !searchQuery.trim()) {
      list = list.filter((p) => p.featuredOnHome !== false);
    } else if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory);
    }

    if (inStockOnly) {
      list = list.filter((p) => p.stock === 'in-stock');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      list = [...list].sort(
        (a, b) => getDisplayPrice(a).price - getDisplayPrice(b).price
      );
    } else if (sortBy === 'price-desc') {
      list = [...list].sort(
        (a, b) => getDisplayPrice(b).price - getDisplayPrice(a).price
      );
    }

    return list;
  }, [activeCategory, inStockOnly, searchQuery, sortBy]);

  return (
    <section
      id="collection"
      className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mb-2">
            Seasonal Wardrobe &amp; Olfactory Archive
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-normal text-[#111111] dark:text-[#F5F4F0] leading-[1.06] tracking-tight">
            {activeCategory === 'All' ? (
              <>
                Curated <em className="italic font-normal">Collection</em>
              </>
            ) : (
              activeCategory
            )}
          </h2>
        </div>

        <span className="font-mono tabular-nums text-xs text-stone-500 dark:text-zinc-400">
          {String(filteredProducts.length).padStart(2, '0')}{' '}
          {filteredProducts.length === 1 ? 'Piece' : 'Pieces'}
        </span>
      </div>

      {/* Hairline Architectural Filter & Utility Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-stone-200 dark:border-zinc-800 mb-10 sm:mb-14">
        {/* Category Hairline Tabs */}
        <div
          role="tablist"
          aria-label="Product categories"
          className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`relative min-h-[44px] pb-3.5 pt-1 text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#111111] dark:text-[#F5F4F0]'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0]'
                }`}
              >
                <span>{cat === 'All' ? 'All Pieces' : cat}</span>
                {isActive && (
                  <motion.span
                    layoutId="activeCategoryLine"
                    transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                    className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-[#111111] dark:bg-[#F5F4F0]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Minimalist Search, Ready-to-Ship & Sort Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 pb-3">
          {/* Expandable Underline Search */}
          <div className="flex items-center">
            {isSearchExpanded || searchQuery ? (
              <div className="relative flex items-center border-b border-[#111111] dark:border-[#F5F4F0]">
                <Search className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400 mr-2 shrink-0" />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setIsSearchExpanded(false);
                  }}
                  placeholder="Search archive..."
                  aria-label="Search archive"
                  className="w-36 sm:w-44 py-1 bg-transparent text-xs text-[#111111] dark:text-[#F5F4F0] placeholder:text-stone-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchExpanded(false);
                  }}
                  aria-label="Clear search"
                  className="p-1 text-stone-400 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            )}
          </div>

          <span aria-hidden="true" className="text-stone-300 dark:text-zinc-700 hidden sm:inline">
            ·
          </span>

          <button
            type="button"
            onClick={() => setInStockOnly((v) => !v)}
            className={`min-h-[36px] text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              inStockOnly
                ? 'text-[#111111] dark:text-[#F5F4F0] underline underline-offset-4'
                : 'text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0]'
            }`}
          >
            {inStockOnly ? 'In Stock Only ✓' : 'In Stock Only'}
          </button>

          <span aria-hidden="true" className="text-stone-300 dark:text-zinc-700 hidden sm:inline">
            ·
          </span>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="min-h-[36px] bg-transparent text-xs font-medium text-stone-700 dark:text-zinc-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-stone-900 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100"
          >
            <option value="featured">Sort: Curated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Product Gallery Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-24 text-center border border-stone-200 dark:border-zinc-800">
          <p className="font-display text-2xl text-[#111111] dark:text-[#F5F4F0] mb-2">
            No pieces match your current selection
          </p>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-7">
            Clear active filters to view the full SPARTA archive.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('All');
              setInStockOnly(false);
              setSearchQuery('');
            }}
            className="min-h-[44px] px-6 py-2.5 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium tracking-wide cursor-pointer"
          >
            Reset Archive View
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3.5 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:gap-x-8 lg:gap-y-16">
          {filteredProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      )}
    </section>
  );
};
