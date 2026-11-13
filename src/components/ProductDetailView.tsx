import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  Ruler,
  X,
  Eye,
} from 'lucide-react';
import { formatBDT, getDisplayPrice, PRODUCTS, STORE_INFO } from '../data/storeData';
import { useStore } from '../context/StoreContext';
import { SmartImage } from './SmartImage';
import { ProductCard } from './ProductCard';
import { getRealisticVisitorCount } from '../services/visitorEngine';

export const ProductDetailView: React.FC = () => {
  const { selectedProduct, addToCart, navigate, products, storeSettings } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState<number>(() =>
    selectedProduct ? getRealisticVisitorCount(selectedProduct.id) : 18
  );

  const sizeSectionRef = useRef<HTMLDivElement | null>(null);

  // Dynamic SEO Metadata & Schema.org Product Structured Data for Google Search Console
  useEffect(() => {
    if (!selectedProduct) return;

    const originalTitle = document.title;
    const defaultDesc =
      "SPARTA (SPARTA CLO) is Bangladesh's premier minimalist luxury clothing brand and fragrance house. Shop heavyweight tees, tailored trousers, knitwear, sneakers, and artisanal perfumes with Cash on Delivery nationwide.";

    // 1. Dynamic Page Title
    document.title = `${selectedProduct.name} — SPARTA | Minimalist Luxury Apparel & Fragrance`;

    // 2. Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const prodDesc = `${selectedProduct.name} by SPARTA Bangladesh. ${selectedProduct.description} Cash on Delivery nationwide.`;
    if (metaDesc) metaDesc.setAttribute('content', prodDesc);

    // 3. OpenGraph Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${selectedProduct.name} — SPARTA`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', prodDesc);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://spartaclo.com/product/${selectedProduct.id}/`);

    // 4. Schema.org Product Structured Data JSON-LD
    const scriptId = 'sparta-product-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const { price } = getDisplayPrice(selectedProduct);
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: selectedProduct.name,
      description: selectedProduct.description,
      image: selectedProduct.images.map((img) =>
        img.startsWith('http') ? img : `https://spartaclo.com${img.startsWith('/') ? img : '/' + img}`
      ),
      brand: {
        '@type': 'Brand',
        name: 'SPARTA',
      },
      offers: {
        '@type': 'Offer',
        price: price,
        priceCurrency: 'BDT',
        availability:
          selectedProduct.stock === 'in-stock'
            ? 'https://schema.org/InStock'
            : selectedProduct.stock === 'coming-soon'
            ? 'https://schema.org/PreOrder'
            : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'SPARTA Atelier',
        },
      },
    };
    script.textContent = JSON.stringify(schemaData);

    return () => {
      document.title = originalTitle;
      if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [selectedProduct]);

  // Organic live visitor counter drift
  useEffect(() => {
    if (!selectedProduct) return;
    const initial = getRealisticVisitorCount(selectedProduct.id);
    setLiveVisitors(initial);

    // Subtle realistic drift every 8 to 15 seconds (+/- 1-2 people)
    const interval = setInterval(() => {
      setLiveVisitors((prev) => {
        const drift = Math.random() > 0.5 ? 1 : -1;
        const baseline = getRealisticVisitorCount(selectedProduct.id);
        const next = prev + drift;
        // Keep within +/- 4 of the diurnal baseline
        if (Math.abs(next - baseline) > 4) {
          return baseline;
        }
        return Math.max(3, next);
      });
    }, 9500);

    return () => clearInterval(interval);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    setActiveImage(0);
    setQuantity(1);
    setValidationMsg(null);
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
      const firstColor = selectedProduct.colors[0];
      setSelectedColor(firstColor.name);
      const targetImg =
        firstColor.imageUrl ||
        (selectedProduct.colorImages && selectedProduct.colorImages[firstColor.name]) ||
        (firstColor.imageIndex !== undefined ? selectedProduct.images[firstColor.imageIndex] : undefined);
      if (targetImg) {
        const foundIdx = selectedProduct.images.indexOf(targetImg);
        if (foundIdx !== -1) setActiveImage(foundIdx);
      }
    } else {
      setSelectedColor(undefined);
    }

    if (selectedProduct.sizes.length === 1) {
      const singleSize = selectedProduct.sizes[0];
      setSelectedSize(singleSize);
    } else {
      setSelectedSize('');
    }
  }, [selectedProduct]);


  if (!selectedProduct) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="font-display text-2xl text-[#111111] dark:text-[#F5F4F0] mb-4">
          No piece selected
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

  const { price: currentPrice, isStartingFrom } = getDisplayPrice(
    selectedProduct,
    selectedSize || undefined
  );
  const isAvailable = selectedProduct.stock === 'in-stock';

  const fitClass =
    selectedProduct.imageFit === 'contain'
      ? 'object-contain p-5 sm:p-8'
      : selectedProduct.imageFit === 'cover-top'
      ? 'object-cover object-top'
      : 'object-cover object-center';

  const handleColorClick = (swatch: { name: string; hex: string; imageIndex?: number; imageUrl?: string }) => {
    setSelectedColor(swatch.name);
    setValidationMsg(null);

    const targetImg =
      swatch.imageUrl ||
      (selectedProduct.colorImages && selectedProduct.colorImages[swatch.name]) ||
      (swatch.imageIndex !== undefined ? selectedProduct.images[swatch.imageIndex] : undefined);

    if (targetImg) {
      const foundIdx = selectedProduct.images.indexOf(targetImg);
      if (foundIdx !== -1) {
        setActiveImage(foundIdx);
      }
    } else if (swatch.imageIndex !== undefined && swatch.imageIndex < selectedProduct.images.length) {
      setActiveImage(swatch.imageIndex);
    }
  };

  const validateSelection = (): boolean => {
    if (!isAvailable) return false;
    if (selectedProduct.colors && selectedProduct.colors.length > 0 && !selectedColor) {
      setValidationMsg('Please choose a colorway first.');
      return false;
    }
    if (!selectedSize) {
      setValidationMsg(
        selectedProduct.category === 'Perfume'
          ? 'Please select a bottle volume first.'
          : 'Please select your size before adding to bag.'
      );
      sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    setValidationMsg(null);
    return true;
  };

  const handleAddToBag = () => {
    if (!validateSelection()) return;
    addToCart(selectedProduct, selectedSize, selectedColor, currentPrice, quantity, true);
  };

  const handleExpressCOD = () => {
    if (!validateSelection()) return;
    addToCart(selectedProduct, selectedSize, selectedColor, currentPrice, quantity, false);
    navigate('checkout');
  };

  const relatedProducts = (products && products.length > 0 ? products : PRODUCTS)
    .filter((p) => p.id !== selectedProduct.id)
    .slice(0, 3);
  const totalImages = selectedProduct.images.length;
  const stepImage = (dir: -1 | 1) => {
    setActiveImage((prev) => (prev + dir + totalImages) % totalImages);
  };

  return (
    <div className="pb-24 md:pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="min-h-[44px] inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collection</span>
        </button>

        {/* Contiguous 12-Column PDP Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* LEFT: Sticky Gallery */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 flex flex-col-reverse sm:flex-row gap-3.5 min-w-0">
            {totalImages > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto no-scrollbar sm:max-h-[650px] py-1 sm:py-0 shrink-0">
                {selectedProduct.images.map((imgSrc, idx) => {
                  const isCurrent = activeImage === idx;
                  return (
                    <button
                      key={imgSrc}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      style={{ backgroundColor: selectedProduct.canvasBg || '#F2F1EE' }}
                      className={`relative w-16 h-22 sm:w-20 sm:h-26 overflow-hidden shrink-0 transition-all cursor-pointer border ${
                        isCurrent
                          ? 'border-[#111111] dark:border-[#F5F4F0] opacity-100'
                          : 'border-stone-200 dark:border-zinc-800 opacity-55 hover:opacity-90'
                      }`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <SmartImage
                        src={imgSrc}
                        alt=""
                        className={`w-full h-full ${
                          selectedProduct.imageFit === 'contain'
                            ? 'object-contain p-1.5'
                            : 'object-cover object-top'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Studio Stage */}
            <div
              style={{ backgroundColor: selectedProduct.canvasBg || '#F2F1EE' }}
              className="relative flex-1 w-full aspect-[3/4] sm:max-h-[660px] overflow-hidden border border-stone-200/80 dark:border-zinc-800"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedProduct.images[activeImage]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <SmartImage
                    src={selectedProduct.images[activeImage]}
                    alt={selectedProduct.name}
                    fallbackLabel={selectedProduct.name}
                    className={`w-full h-full ${fitClass}`}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 bg-black/55 backdrop-blur-md text-[11px] font-mono tabular-nums text-white">
                  {String(activeImage + 1).padStart(2, '0')} /{' '}
                  {String(totalImages).padStart(2, '0')}
                </span>

                <button
                  type="button"
                  onClick={() => setIsZoomOpen(true)}
                  aria-label="Inspect full size image"
                  className="pointer-events-auto min-h-[40px] min-w-[40px] bg-black/55 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {totalImages > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepImage(-1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] bg-black/45 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepImage(1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] bg-black/45 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Contiguous Purchase Salon */}
          <div className="lg:col-span-5 flex flex-col min-w-0 lg:pt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 mb-3">
              <span>{selectedProduct.category}</span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedProduct.stock === 'in-stock'
                  ? selectedProduct.stockCount
                    ? `Available (${selectedProduct.stockCount} in stock)`
                    : 'Available'
                  : selectedProduct.stock === 'out-of-stock'
                  ? 'Sold Out'
                  : 'Upcoming Release'}
              </span>
              {selectedProduct.editionNote && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#111111] dark:text-zinc-200 font-medium">
                    {selectedProduct.editionNote}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-normal text-[#111111] dark:text-[#F5F4F0] leading-[1.06] tracking-tight mb-4">
              {selectedProduct.name}
            </h1>

            <div className="flex items-baseline gap-3 pb-4 border-b border-stone-200 dark:border-zinc-800">
              <span className="font-mono tabular-nums text-xl sm:text-2xl font-medium text-[#111111] dark:text-[#F5F4F0]">
                {isStartingFrom ? 'From ' : ''}
                {formatBDT(currentPrice)}
              </span>
              {selectedProduct.originalPrice && (
                <span className="font-mono tabular-nums text-sm text-stone-400 dark:text-zinc-500 line-through">
                  {formatBDT(selectedProduct.originalPrice)}
                </span>
              )}
            </div>

            {/* Organic Dynamic Visitor Counter Badge */}
            <div className="flex items-center gap-2 py-3 px-3.5 my-3 bg-stone-100/70 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/10 rounded-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Eye className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400" />
              <span className="text-xs text-stone-700 dark:text-stone-300 font-sans">
                <strong className="font-mono font-semibold text-stone-900 dark:text-white tabular-nums">
                  {liveVisitors}
                </strong>{' '}
                people viewing this piece right now
              </span>
            </div>

            <p className="text-sm sm:text-[15px] text-stone-600 dark:text-zinc-400 leading-[1.75] py-4">
              {selectedProduct.description}
            </p>

            {/* Colorway Selector */}
            {selectedProduct.colors && selectedProduct.colors.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-stone-500 dark:text-zinc-400">
                    Colorway
                  </span>
                  <span className="text-xs font-medium text-[#111111] dark:text-[#F5F4F0]">
                    {selectedColor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.colors.map((swatch) => {
                    const isSelected = selectedColor === swatch.name;
                    return (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => handleColorClick(swatch)}
                        className={`min-h-[44px] px-4 py-2 border text-xs font-medium inline-flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#111111] bg-[#111111] text-[#FAF9F6] dark:border-[#F5F4F0] dark:bg-[#F5F4F0] dark:text-[#08080A]'
                            : 'border-stone-300 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 hover:border-[#111111] dark:hover:border-zinc-500'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: swatch.hex }}
                          className="w-3 h-3 rounded-full border border-black/20 dark:border-white/25 shrink-0"
                        />
                        <span>{swatch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size / Volume Selector */}
            <div ref={sizeSectionRef} className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  {selectedProduct.category === 'Perfume' ? 'Volume' : 'Size'}
                </span>

                {selectedProduct.category !== 'Perfume' &&
                  selectedProduct.category !== 'Accessories' && (
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-[#F5F4F0] border-b border-current pb-0.5 cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size Guide</span>
                    </button>
                  )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {selectedProduct.sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  const sizePrice = selectedProduct.priceMap?.[size];
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setValidationMsg(null);
                        if (selectedProduct.sizeImages?.[size]) {
                          const targetUrl = selectedProduct.sizeImages[size];
                          const foundIdx = selectedProduct.images.indexOf(targetUrl);
                          if (foundIdx !== -1) {
                            setActiveImage(foundIdx);
                          }
                        }
                      }}
                      className={`min-h-[48px] px-3 py-2 border text-xs font-medium flex flex-col items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#111111] bg-[#111111] text-[#FAF9F6] dark:border-[#F5F4F0] dark:bg-[#F5F4F0] dark:text-[#08080A]'
                          : 'border-stone-300 dark:border-zinc-800 text-[#111111] dark:text-zinc-200 hover:border-[#111111] dark:hover:border-zinc-500'
                      }`}
                    >
                      <span className="whitespace-nowrap">{size}</span>
                      {sizePrice !== undefined && (
                        <span className="font-mono tabular-nums text-[10px] opacity-75 mt-0.5">
                          {formatBDT(sizePrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {validationMsg && (
                <p role="alert" className="mt-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {validationMsg}
                </p>
              )}
            </div>

            {/* Purchase Actions */}
            {isAvailable ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-stone-300 dark:border-zinc-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="min-h-[50px] min-w-[44px] flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono tabular-nums text-xs font-medium text-[#111111] dark:text-[#F5F4F0]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="min-h-[50px] min-w-[44px] flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToBag}
                    className="flex-1 min-h-[50px] px-6 py-3 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs sm:text-sm font-medium tracking-wide hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Add to Bag
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExpressCOD}
                  className="w-full min-h-[50px] px-6 py-3 border border-[#111111] dark:border-[#F5F4F0] text-xs sm:text-sm font-medium tracking-wide text-[#111111] dark:text-[#F5F4F0] hover:bg-[#111111] hover:text-[#FAF9F6] dark:hover:bg-[#F5F4F0] dark:hover:text-[#08080A] transition-colors cursor-pointer"
                >
                  Order with Cash on Delivery
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="w-full min-h-[50px] px-6 py-3 bg-stone-100 dark:bg-zinc-900 text-stone-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold tracking-wider uppercase cursor-not-allowed border border-stone-300 dark:border-zinc-800 shadow-xs flex items-center justify-center gap-2"
                >
                  {selectedProduct.stock === 'coming-soon' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Coming Soon · Upcoming Atelier Release</span>
                    </>
                  ) : (
                    <span>Archive Piece · Sold Out</span>
                  )}
                </button>
                {selectedProduct.stock === 'coming-soon' && (
                  <p className="text-[11px] text-center text-stone-500 dark:text-zinc-400">
                    This limited edition piece is currently in development at our Dhaka atelier. Expected release date will be announced soon.
                  </p>
                )}
              </div>
            )}

            {/* Delivery & Craftsmanship Specifications */}
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-zinc-800 space-y-2 text-xs text-stone-600 dark:text-zinc-400">
              <p>
                {storeSettings.isFreeDeliveryActive ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Complimentary Cash on Delivery nationwide (All orders)
                  </span>
                ) : (
                  <>
                    Cash on Delivery nationwide · {formatBDT(storeSettings.insideDhakaFee || STORE_INFO.insideDhakaFee)} Inside Dhaka ·{' '}
                    {formatBDT(storeSettings.outsideDhakaFee || STORE_INFO.outsideDhakaFee)} Outside Dhaka
                  </>
                )}
              </p>
              <p>
                Complimentary shipping on orders over{' '}
                <span className="font-mono tabular-nums text-[#111111] dark:text-zinc-200">
                  {formatBDT(storeSettings.freeShippingThreshold || STORE_INFO.freeShippingThreshold)}
                </span>
              </p>
            </div>

            {selectedProduct.details.length > 0 && (
              <div className="mt-7 pt-6 border-t border-stone-200 dark:border-zinc-800">
                <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F4F0] mb-3">
                  Garment &amp; Craftsmanship Notes
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-600 dark:text-zinc-400">
                  {selectedProduct.details.map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="text-stone-400">
                        —
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Curated Recommendations */}
        <div className="mt-24 pt-16 border-t border-stone-200 dark:border-zinc-800">
          <div className="mb-10">
            <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1.5">
              From the Archive
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#111111] dark:text-[#F5F4F0]">
              You May Also <em className="italic font-normal">Consider</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
            {relatedProducts.map((item, idx) => (
              <ProductCard key={item.id} product={item} index={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE STICKY PURCHASE BAR */}
      {isAvailable && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 px-4 bg-[#FAF9F6]/95 dark:bg-[#08080A]/95 backdrop-blur-md border-t border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono tabular-nums text-sm font-medium text-[#111111] dark:text-[#F5F4F0]">
              {formatBDT(currentPrice * quantity)}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate">
              {selectedSize ? `${selectedSize}${selectedColor ? ` · ${selectedColor}` : ''}` : 'Select size'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToBag}
            className="min-h-[42px] px-6 py-2.5 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-xs font-medium whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform"
          >
            {selectedSize ? 'Add to Bag' : 'Select Size'}
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsZoomOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Close zoom preview"
              className="absolute top-5 right-5 min-h-[44px] min-w-[44px] bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedProduct.images[activeImage]}
              alt={selectedProduct.name}
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[88vh] object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size Guide Sheet */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsSizeGuideOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full sm:max-w-lg bg-[#FAF9F6] dark:bg-[#101014] border border-stone-200 dark:border-zinc-800 p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl text-[#111111] dark:text-[#F5F4F0]">
                  Size Reference
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(false)}
                  aria-label="Close size guide"
                  className="min-h-[40px] min-w-[40px] -mr-2 flex items-center justify-center text-stone-500 hover:text-[#111111] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedProduct.category === 'Shoes/Sneakers' ? (
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400">
                      <th className="py-2.5 font-medium">EU Size</th>
                      <th className="py-2.5 font-medium">UK</th>
                      <th className="py-2.5 font-medium">Foot Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-zinc-800 font-mono tabular-nums text-[#111111] dark:text-zinc-200">
                    <tr><td className="py-2.5">40</td><td className="py-2.5">6.5</td><td className="py-2.5">25.0 cm</td></tr>
                    <tr><td className="py-2.5">42</td><td className="py-2.5">8.0</td><td className="py-2.5">26.5 cm</td></tr>
                    <tr><td className="py-2.5">43</td><td className="py-2.5">9.0</td><td className="py-2.5">27.5 cm</td></tr>
                    <tr><td className="py-2.5">44</td><td className="py-2.5">9.5</td><td className="py-2.5">28.0 cm</td></tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400">
                      <th className="py-2.5 font-medium">Size</th>
                      <th className="py-2.5 font-medium">Chest (in)</th>
                      <th className="py-2.5 font-medium">Waist (in)</th>
                      <th className="py-2.5 font-medium">Length (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-zinc-800 font-mono tabular-nums text-[#111111] dark:text-zinc-200">
                    <tr><td className="py-2.5">S</td><td className="py-2.5">38–40</td><td className="py-2.5">29–30</td><td className="py-2.5">26.5</td></tr>
                    <tr><td className="py-2.5">M</td><td className="py-2.5">40–42</td><td className="py-2.5">31–32</td><td className="py-2.5">27.5</td></tr>
                    <tr><td className="py-2.5">L</td><td className="py-2.5">42–44</td><td className="py-2.5">33–34</td><td className="py-2.5">28.5</td></tr>
                    <tr><td className="py-2.5">XL</td><td className="py-2.5">44–46</td><td className="py-2.5">35–36</td><td className="py-2.5">29.5</td></tr>
                  </tbody>
                </table>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
