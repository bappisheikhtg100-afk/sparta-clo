import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Check, Heart, Plus, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HeroStage3D, SpartaCrestIcon } from './HeroStage3D';
import { CoverflowSection, MarqueeHighlights } from './CoverflowSection';
import { LookbookModal3D } from './LookbookModal3D';
import { RAIL_PIECES, TRENDING_CATEGORIES, DemoLookPiece } from './demoData';

const RAIL_CONFIRM_MS = 1600;

interface Tilt3DFrameProps {
  children: React.ReactNode;
  className?: string;
}

const Tilt3DFrame: React.FC<Tilt3DFrameProps> = ({ children, className = '' }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el || e.pointerType === 'touch') return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14;
    const rotX = (0.5 - py) * 14;
    el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
      2
    )}deg) scale3d(1.025, 1.025, 1.025)`;

    if (glareRef.current) {
      glareRef.current.style.opacity = '1';
      glareRef.current.style.background = `radial-gradient(circle at ${px * 100}% ${
        py * 100
      }%, rgba(255,255,255,0.28), transparent 62%)`;
    }
  };

  const handleLeave = () => {
    const el = frameRef.current;
    if (el) {
      el.style.transform =
        'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  return (
    <div
      ref={frameRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
      />
    </div>
  );
};

export const DemoPage: React.FC = () => {
  const {
    products,
    cartCount,
    setIsCartOpen,
    addToCart,
    navigate,
    jumpToCategory,
    storeSettings,
  } = useStore();

  const railRef = useRef<HTMLUListElement | null>(null);
  const categoriesRef = useRef<HTMLElement | null>(null);
  const confirmTimerRef = useRef<number>(0);

  const [favourites, setFavourites] = useState<Set<number>>(() => new Set([1, 3]));
  const [selectedColors, setSelectedColors] = useState<Record<number, number>>({});
  const [addedId, setAddedId] = useState<number | null>(null);
  const [addedLabel, setAddedLabel] = useState('');
  const [railBounds, setRailBounds] = useState({ start: true, end: false });
  const [catInView, setCatInView] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [inspected3D, setInspected3D] = useState<DemoLookPiece | null>(null);

  const resolveStoreProduct = useCallback(
    (piece: DemoLookPiece) => {
      return products.find((p) => p.id === piece.productId);
    },
    [products]
  );

  const handleAddPiece = useCallback(
    (piece: DemoLookPiece, colorIndex = 0) => {
      const colorOpt = piece.colors[colorIndex] ?? piece.colors[0];
      const liveProd = resolveStoreProduct(piece);
      const label = `${piece.name} · ${colorOpt.name}`;

      if (liveProd) {
        const validSize =
          liveProd.sizes.find((s) => !(liveProd.outOfStockSizes || []).includes(s)) ||
          liveProd.sizes[0] ||
          piece.defaultSize;
        const unitPrice = liveProd.priceMap?.[validSize] ?? liveProd.price ?? piece.price;
        addToCart(liveProd, validSize, colorOpt.name, unitPrice, 1, false);
      } else {
        addToCart(
          {
            id: piece.productId,
            name: piece.name,
            price: piece.price,
            description: piece.fabric,
            details: [piece.fabric, piece.fit],
            images: [piece.packshot || piece.image],
            category: piece.storeCategory,
            sizes: [piece.defaultSize],
            stock: 'in-stock',
          },
          piece.defaultSize,
          colorOpt.name,
          piece.price,
          1,
          false
        );
      }

      setAddedId(piece.id);
      setAddedLabel(label);
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = window.setTimeout(() => setAddedId(null), RAIL_CONFIRM_MS);
    },
    [addToCart, resolveStoreProduct]
  );

  const handleOpenProductPage = useCallback(
    (piece: DemoLookPiece) => {
      const liveProd = resolveStoreProduct(piece);
      if (liveProd) {
        navigate('product', liveProd);
      } else {
        navigate('home');
      }
    },
    [navigate, resolveStoreProduct]
  );

  const toggleFav = useCallback((id: number) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const scrollRailBy = (dir: -1 | 1) => {
    const rail = railRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !first) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: 'smooth' });
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const syncBounds = () => {
      setRailBounds({
        start: rail.scrollLeft < 4,
        end: rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4,
      });
    };
    syncBounds();
    rail.addEventListener('scroll', syncBounds, { passive: true });
    window.addEventListener('resize', syncBounds);
    return () => {
      rail.removeEventListener('scroll', syncBounds);
      window.removeEventListener('resize', syncBounds);
      window.clearTimeout(confirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = categoriesRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCatInView(true);
      },
      { threshold: 0.04 }
    );
    io.observe(el);
    const fallback = window.setTimeout(() => setCatInView(true), 1400);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return RAIL_PIECES;
    return RAIL_PIECES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.fabric.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const savedPieces = useMemo(
    () => RAIL_PIECES.filter((item) => favourites.has(item.id)),
    [favourites]
  );

  const currentYear = new Date().getFullYear();

  return (
    <div className="sparta-demo min-h-screen w-full overflow-x-clip bg-[#f7f7f5] text-[#0b0b0b]">
      {/* 1. Sticky 3D WebGL Liquid Paint-Wash & Floating Runway */}
      <HeroStage3D
        cartCount={cartCount}
        favouritesCount={favourites.size}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenFavourites={() => setSavedDrawerOpen(true)}
        onOpenBag={() => setIsCartOpen(true)}
        onBackToStore={() => navigate('home')}
        onInspectLook={(piece) => setInspected3D(piece)}
      />

      {/* 2. Interactive 3D Coverflow Showcase */}
      <CoverflowSection
        onAddToBag={(piece) => handleAddPiece(piece, selectedColors[piece.id] ?? 0)}
        onInspect3D={(piece) => setInspected3D(piece)}
      />

      {/* 3. Counter-Scrolling Interactive Curved TextPath Marquee */}
      <MarqueeHighlights />

      {/* 4. Fresh On The Rail — Interactive 3D Perspective Tilt Cards */}
      <section className="bg-white py-16 text-[#0b0b0b] sm:py-24" aria-labelledby="demo-rail-title">
        <header className="mb-8 flex items-end justify-between gap-6 px-5 sm:mb-10 sm:px-8">
          <div className="flex flex-col gap-3">
            <span className="font-ui-demo flex items-center gap-2 text-[11px] tracking-[0.32em] text-black/55 uppercase">
              <SpartaCrestIcon className="h-3 w-3" /> New in
            </span>
            <h2
              id="demo-rail-title"
              className="font-display-demo text-[2rem] leading-none tracking-[0.02em] uppercase sm:text-[2.8rem]"
            >
              Fresh on the rail
            </h2>
          </div>

          <div className="hidden gap-4 sm:flex">
            {([-1, 1] as const).map((dir) => {
              const disabled = dir < 0 ? railBounds.start : railBounds.end;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => scrollRailBy(dir)}
                  disabled={disabled}
                  aria-label={dir < 0 ? 'Scroll back' : 'Scroll forward'}
                  className="grid h-9 w-[3.2rem] cursor-pointer place-items-center rounded-full border border-black/80 text-black transition-colors hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-25"
                >
                  <svg viewBox="0 0 32 12" className="h-3 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
                    {dir < 0 ? (
                      <path d="M31 6H1m5-5L1 6l5 5" />
                    ) : (
                      <path d="M1 6h30m-5-5 5 5-5 5" />
                    )}
                  </svg>
                </button>
              );
            })}
          </div>
        </header>

        <ul
          ref={railRef}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-4 sm:scroll-px-8 sm:gap-6 sm:px-8"
        >
          {RAIL_PIECES.map((item) => {
            const isFav = favourites.has(item.id);
            const isAdded = addedId === item.id;
            const cIdx = selectedColors[item.id] ?? 0;
            const activeColor = item.colors[cIdx] ?? item.colors[0];
            const displayImage = activeColor?.image || item.image;
            const displayLabel = `${item.name} · ${activeColor.name}`;

            return (
              <li
                key={item.id}
                className="group w-[clamp(240px,27vw,400px)] shrink-0 snap-start"
              >
                <Tilt3DFrame className="aspect-[3/4] overflow-hidden rounded-xl bg-[#f2f1ee] shadow-sm transition-shadow duration-500 group-hover:shadow-xl">
                  <button
                    type="button"
                    onClick={() => setInspected3D(item)}
                    className="block h-full w-full cursor-pointer text-left"
                    aria-label={`Inspect ${displayLabel} in 3D`}
                  >
                    <img
                      src={displayImage}
                      alt={displayLabel}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover object-top transition-[scale] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-[1.04]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspected3D(item)}
                    className="font-ui-demo absolute bottom-3 left-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-[10px] tracking-[0.18em] text-white uppercase opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100"
                  >
                    <Box className="h-3 w-3" /> 3D View
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFav(item.id)}
                    aria-pressed={isFav}
                    aria-label={
                      isFav ? `Remove ${displayLabel} from favourites` : `Add ${displayLabel} to favourites`
                    }
                    className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/85 backdrop-blur transition-transform hover:scale-105 active:scale-95"
                  >
                    <Heart
                      className={`h-[17px] w-[17px] transition-colors ${
                        isFav ? 'fill-black stroke-black' : 'stroke-black'
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                </Tilt3DFrame>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] italic sm:text-[14px]">{displayLabel}</p>
                    <p className="mt-0.5 text-[13px] font-bold italic sm:text-[14px]">
                      ৳{item.price.toLocaleString('en-IN')}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={`${item.name} colorway`}
                      className="mt-2.5 flex gap-2"
                    >
                      {item.colors.map((swatch, idx) => {
                        const selected = idx === cIdx;
                        return (
                          <button
                            key={swatch.name}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={swatch.name}
                            title={swatch.name}
                            onClick={() =>
                              setSelectedColors((prev) => ({ ...prev, [item.id]: idx }))
                            }
                            className={`grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-full border transition-colors ${
                              selected
                                ? 'border-black'
                                : 'border-transparent hover:border-black/30'
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/15"
                              style={{ background: swatch.hex }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddPiece(item, cIdx)}
                    aria-label={`Add ${displayLabel} to bag`}
                    className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors ${
                      isAdded
                        ? 'border-black bg-black text-white'
                        : 'border-black/80 text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    {isAdded ? (
                      <Check className="h-4 w-4" strokeWidth={1.6} />
                    ) : (
                      <Plus className="h-4 w-4" strokeWidth={1.6} />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-end px-5 sm:px-8">
          <button
            type="button"
            onClick={() => jumpToCategory('All')}
            className="font-ui-demo cursor-pointer rounded-full bg-black px-6 py-3 text-[14px] font-light text-white transition-transform hover:-translate-y-0.5"
          >
            Shop all archive
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {addedId ? `${addedLabel} added to bag` : ''}
        </p>
      </section>

      {/* 5. Trending Categories — 3D Depth Portrait Portals */}
      <section
        ref={categoriesRef}
        data-inview={catInView ? '1' : '0'}
        className="bg-[#f7f7f5] py-16 text-[#0b0b0b] sm:py-24"
        aria-labelledby="demo-categories-title"
      >
        <header className="cf-reveal mb-8 flex flex-col gap-3 px-5 sm:mb-10 sm:px-8">
          <span className="font-ui-demo flex items-center gap-2 text-[11px] tracking-[0.32em] text-black/55 uppercase">
            <SpartaCrestIcon className="h-3 w-3" /> Shop by category
          </span>
          <h2
            id="demo-categories-title"
            className="font-display-demo text-[2rem] leading-none tracking-[0.02em] uppercase sm:text-[2.8rem]"
          >
            Trending categories
          </h2>
        </header>

        <ul className="grid grid-cols-2 gap-3 px-5 sm:gap-4 sm:px-8 lg:grid-cols-4">
          {TRENDING_CATEGORIES.map((tile, idx) => (
            <li
              key={tile.id}
              className="cat-tile cf-reveal"
              style={{ transitionDelay: `${0.08 + idx * 0.06}s` }}
            >
              <Tilt3DFrame className="aspect-[3/4] overflow-hidden rounded-xl bg-[#e8e6e1] shadow-md">
                <button
                  type="button"
                  onClick={() => jumpToCategory(tile.storeCategory)}
                  className="group relative block h-full w-full cursor-pointer text-left"
                >
                  <img
                    src={tile.image}
                    alt={tile.alt}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover transition-[scale] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-[1.06]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black from-5% via-black/60 via-40% to-transparent"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-3 pb-5 text-white sm:pb-7"
                    style={{ transform: 'translateZ(26px)' }}
                  >
                    <span className="font-display-demo text-[1.15rem] leading-none tracking-[0.12em] uppercase sm:text-[1.6rem]">
                      {tile.name}
                    </span>
                    <span className="cat-cta font-ui-demo text-[10px] tracking-[0.28em] text-white/80 uppercase sm:text-[11px]">
                      Shop now
                    </span>
                  </div>
                </button>
              </Tilt3DFrame>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Dark Split Editorial Footer */}
      <footer className="bg-[#0b0b0b] px-5 pt-14 pb-8 text-white sm:px-8 sm:pt-20 sm:pb-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-0">
          <div className="flex flex-col gap-6 lg:border-r lg:border-white/15 lg:pr-12">
            <a
              href="#demo"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5"
            >
              <SpartaCrestIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              <span className="font-logo text-[1.9rem] leading-none tracking-[-0.02em] sm:text-[2.3rem]">
                SPARTA
              </span>
            </a>

            <p className="font-ui-demo max-w-[36ch] text-[14px] leading-relaxed font-light text-white/65">
              <span className="font-normal text-white">SPARTA</span> crafts minimalist menswear
              and signature fragrances in Bangladesh — architectural knitwear, double-pleat
              tailoring, and court footwear built to last.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="font-ui-demo cursor-pointer rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black transition-transform hover:-translate-y-0.5"
              >
                Visit Official Store
              </button>
              <a
                href={`https://wa.me/${storeSettings.whatsappNumber || '8801610046310'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-ui-demo rounded-full border border-white/25 px-5 py-2.5 text-[13px] font-light text-white transition-colors hover:border-white"
              >
                WhatsApp Concierge
              </a>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:pl-12"
          >
            <div>
              <h3 className="font-display-demo mb-5 text-[1.05rem] tracking-[0.08em] uppercase sm:mb-6 sm:text-[1.15rem]">
                Collection
              </h3>
              <ul className="flex flex-col gap-3.5">
                {(['Upperwear', 'Bottomwear', 'Shoes/Sneakers', 'Perfume', 'Accessories'] as const).map(
                  (cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => jumpToCategory(cat)}
                        className="font-ui-demo cursor-pointer text-[14px] font-light text-white/65 transition-colors hover:text-white sm:text-[15px]"
                      >
                        {cat}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-display-demo mb-5 text-[1.05rem] tracking-[0.08em] uppercase sm:mb-6 sm:text-[1.15rem]">
                House
              </h3>
              <ul className="flex flex-col gap-3.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('home')}
                    className="font-ui-demo cursor-pointer text-[14px] font-light text-white/65 transition-colors hover:text-white sm:text-[15px]"
                  >
                    Official Storefront
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="font-ui-demo cursor-pointer text-[14px] font-light text-white/65 transition-colors hover:text-white sm:text-[15px]"
                  >
                    Search Archive
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="font-ui-demo cursor-pointer text-[14px] font-light text-white/65 transition-colors hover:text-white sm:text-[15px]"
                  >
                    Shopping Bag ({cartCount})
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-display-demo mb-5 text-[1.05rem] tracking-[0.08em] uppercase sm:mb-6 sm:text-[1.15rem]">
                Delivery
              </h3>
              <ul className="flex flex-col gap-3.5 text-[14px] font-light text-white/65 sm:text-[15px]">
                <li>Cash on Delivery Nationwide</li>
                <li>Inside Dhaka: ৳{storeSettings.insideDhakaFee ?? 70}</li>
                <li>Outside Dhaka: ৳{storeSettings.outsideDhakaFee ?? 120}</li>
                <li>Dhaka, Bangladesh</li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/15 pt-6 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-ui-demo text-[13px] font-light text-white/55">
            © {currentYear} SPARTA Atelier. All rights reserved.
          </p>
          <span className="font-ui-demo text-[12px] tracking-[0.18em] text-white/45 uppercase">
            Cash on Delivery · Nationwide Bangladesh
          </span>
        </div>
      </footer>

      {/* 3D Interactive Monolith Product Inspector */}
      <LookbookModal3D
        piece={inspected3D}
        onClose={() => setInspected3D(null)}
        onAddToBag={handleAddPiece}
        onOpenProductPage={handleOpenProductPage}
      />

      {/* Search Overlay Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-16 backdrop-blur-md"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#f7f7f5] p-6 text-[#0b0b0b] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-black/15 pb-3">
              <Search className="h-5 w-5 text-black/55" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knitwear, trousers, oxford shirts, perfume..."
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-black/40"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setInspected3D(item);
                  }}
                  className="flex cursor-pointer items-center gap-3.5 rounded-xl bg-white p-2.5 text-left transition hover:ring-1 hover:ring-black/25"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-12 shrink-0 rounded-lg object-cover object-top"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{item.name}</p>
                    <p className="text-[12px] text-black/55">{item.category}</p>
                    <p className="mt-0.5 text-[13px] font-bold">
                      ৳{item.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-black/50">
                  No archive pieces matched &ldquo;{searchQuery}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved / Favourites Modal Drawer */}
      {savedDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
          onClick={() => setSavedDrawerOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-[#f7f7f5] p-6 text-[#0b0b0b] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/15 pb-4">
              <div>
                <span className="text-[10px] tracking-[0.26em] text-black/50 uppercase">
                  Curated Selection
                </span>
                <h3 className="font-display-demo text-xl uppercase">
                  Saved Pieces ({savedPieces.length})
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close saved pieces"
                onClick={() => setSavedDrawerOpen(false)}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-black/20 hover:bg-black hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
              {savedPieces.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-12 shrink-0 rounded-lg object-cover object-top"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{item.name}</p>
                      <p className="text-[12px] text-black/55">
                        ৳{item.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddPiece(item, selectedColors[item.id] ?? 0)}
                      className="cursor-pointer rounded-full bg-black px-3.5 py-1.5 text-[12px] text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFav(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-black/15 hover:border-black"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {savedPieces.length === 0 && (
                <p className="py-12 text-center text-sm text-black/50">
                  Tap the heart icon on any piece to save it to your edit.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
