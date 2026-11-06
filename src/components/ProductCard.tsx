import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types/store';
import { formatBDT, getDisplayPrice } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
  index: number;
}

function getFitClass(fit?: 'cover-top' | 'cover-center' | 'contain'): string {
  if (fit === 'contain') return 'object-contain p-4 sm:p-6';
  if (fit === 'cover-top') return 'object-cover object-top';
  return 'object-cover object-center';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const { navigate, addToCart } = useStore();
  const [selectedSwatchIdx, setSelectedSwatchIdx] = useState<number | null>(null);
  const [selectedColorName, setSelectedColorName] = useState<string | undefined>(
    product.colors?.[0]?.name
  );

  const { price, isStartingFrom } = getDisplayPrice(product);

  const primaryIndex = selectedSwatchIdx ?? 0;

  // Determine secondary hover image so EVERY product reveals a distinct second angle/look on hover
  let secondaryIndex: number | null = null;
  if (product.images.length > 1) {
    const preferredHover = product.hoverImageIndex ?? 1;
    if (preferredHover !== primaryIndex && preferredHover < product.images.length) {
      secondaryIndex = preferredHover;
    } else {
      secondaryIndex = primaryIndex === 0 ? 1 : 0;
    }
  }

  const primaryFit = getFitClass(product.imageFit);
  const secondaryFit = getFitClass(
    secondaryIndex === product.hoverImageIndex
      ? product.hoverFit ?? product.imageFit
      : product.imageFit
  );

  const getStatusLabel = () => {
    if (product.stock === 'out-of-stock') return 'Sold Out';
    if (product.stock === 'coming-soon') return 'Coming Soon';
    if (product.editionNote) return product.editionNote;
    return 'Available';
  };

  const handleQuickAdd = (e: React.MouseEvent, size: string) => {
    e.stopPropagation();
    const sizePrice = product.priceMap?.[size] ?? product.price ?? price;
    addToCart(product, size, selectedColorName, sizePrice, 1, true);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.24),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col min-w-0"
    >
      {/* Sharp Architectural Gallery Frame with Instant Dual-Image Hover Swap */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate('product', product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('product', product);
          }
        }}
        style={{ backgroundColor: product.canvasBg || '#F2F1EE' }}
        className="group/media relative w-full aspect-[3/4] overflow-hidden cursor-pointer border border-stone-200/60 dark:border-zinc-800/80 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current"
      >
        {/* Primary Studio Image */}
        <SmartImage
          src={product.images[primaryIndex]}
          alt={product.name}
          fallbackLabel={product.name}
          loading="lazy"
          className={`absolute inset-0 w-full h-full ${primaryFit} transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            secondaryIndex !== null
              ? 'opacity-100 scale-100 group-hover/media:opacity-0 group-hover/media:scale-[1.03]'
              : 'opacity-100 scale-100 group-hover/media:scale-[1.03]'
          } ${product.stock !== 'in-stock' ? 'opacity-85' : ''}`}
        />

        {/* Secondary Editorial Hover Image */}
        {secondaryIndex !== null && (
          <SmartImage
            src={product.images[secondaryIndex]}
            alt={`${product.name} alternate view`}
            fallbackLabel={product.name}
            loading="lazy"
            className={`absolute inset-0 w-full h-full ${secondaryFit} opacity-0 scale-100 group-hover/media:opacity-100 group-hover/media:scale-[1.04] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`}
          />
        )}

        {/* Desktop Slide-Up Quick-Add Size Bar for In-Stock Pieces */}
        {product.stock === 'in-stock' ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="hidden lg:flex flex-col gap-1.5 absolute inset-x-0 bottom-0 p-3 bg-[#FAF9F6]/95 dark:bg-[#0C0C0E]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-zinc-800 translate-y-full opacity-0 group-hover/media:translate-y-0 group-hover/media:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            <span className="text-[10px] font-medium text-stone-500 dark:text-zinc-400 tracking-wide">
              Quick Add
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={(e) => handleQuickAdd(e, size)}
                  className="min-h-[32px] px-2.5 py-1 text-[11px] font-medium border border-stone-300 dark:border-zinc-700 text-[#111111] dark:text-[#F5F4F0] hover:bg-[#111111] hover:text-[#FAF9F6] hover:border-[#111111] dark:hover:bg-[#F5F4F0] dark:hover:text-[#08080A] dark:hover:border-[#F5F4F0] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex absolute inset-x-0 bottom-0 px-3.5 py-2.5 bg-[#FAF9F6]/92 dark:bg-[#0C0C0E]/92 backdrop-blur-md border-t border-stone-200/80 dark:border-zinc-800 items-center justify-between translate-y-full opacity-0 group-hover/media:translate-y-0 group-hover/media:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
            <span className="text-[11px] font-medium text-stone-600 dark:text-zinc-300">
              {product.stock === 'out-of-stock' ? 'Archive · Sold Out' : 'Preview Upcoming Release'}
            </span>
            <span className="text-[11px] text-[#111111] dark:text-[#F5F4F0]">→</span>
          </div>
        )}
      </div>

      {/* Editorial Unboxed Product Details */}
      <div className="pt-3.5 flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-500 dark:text-zinc-400 truncate">
          <span>{product.category}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              product.stock === 'in-stock' && product.editionNote
                ? 'text-[#111111] dark:text-zinc-200 font-medium'
                : ''
            }
          >
            {getStatusLabel()}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('product', product)}
            className="text-left text-sm sm:text-[15px] font-medium text-[#111111] dark:text-[#F5F4F0] truncate hover:opacity-70 transition-opacity cursor-pointer"
          >
            {product.name}
          </button>

          {/* Interactive Color Swatches */}
          {product.colors && product.colors.length > 1 && (
            <div
              className="flex items-center gap-1.5 pt-1 shrink-0"
              aria-label="Colorways"
            >
              {product.colors.map((swatch) => {
                const isSelected = selectedSwatchIdx === swatch.imageIndex;
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (swatch.imageIndex !== undefined) {
                        if (selectedSwatchIdx === swatch.imageIndex) {
                          setSelectedSwatchIdx(null);
                          setSelectedColorName(product.colors?.[0]?.name);
                        } else {
                          setSelectedSwatchIdx(swatch.imageIndex);
                          setSelectedColorName(swatch.name);
                        }
                      }
                    }}
                    title={swatch.name}
                    aria-label={`Preview ${swatch.name}`}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                      isSelected
                        ? 'ring-1 ring-offset-1 ring-[#111111] dark:ring-[#F5F4F0] dark:ring-offset-[#08080A]'
                        : 'hover:scale-110'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: swatch.hex }}
                      className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums text-xs sm:text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
            {isStartingFrom ? 'From ' : ''}
            {formatBDT(price)}
          </span>
          {product.originalPrice && (
            <span className="font-mono tabular-nums text-[11px] text-stone-400 dark:text-zinc-500 line-through">
              {formatBDT(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
};
