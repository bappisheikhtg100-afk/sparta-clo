import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COVERFLOW_EXTRAS, HERO_LOOKS, RAIL_PIECES, DemoLookPiece } from './demoData';
import { SpartaCrestIcon } from './HeroStage3D';

interface CoverflowSectionProps {
  onAddToBag: (piece: DemoLookPiece) => void;
  onInspect3D: (piece: DemoLookPiece) => void;
}

const EDIT_SLIDES = [...HERO_LOOKS.slice(0, 3), ...COVERFLOW_EXTRAS, HERO_LOOKS[3], HERO_LOOKS[4]];

export const CoverflowSection: React.FC<CoverflowSectionProps> = ({
  onAddToBag,
  onInspect3D,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const cardWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: number; x: number; pos: number; v: number; t: number } | null>(null);

  const [inView, setInView] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const count = EDIT_SLIDES.length;
  const wrapIndex = useCallback((idx: number) => ((Math.round(idx) % count) + count) % count, [count]);

  const applyTransforms = useCallback(() => {
    const w = cardWidthRef.current;
    if (!w) return;
    const spacing = w * 1.05;
    const pos = posRef.current;

    slideRefs.current.forEach((el, idx) => {
      if (!el) return;
      let diff = ((idx - pos) % count + count) % count;
      if (diff > count / 2) diff -= count;
      const absD = Math.abs(diff);
      const falloff = Math.pow(absD, 0.56);
      const angle = Math.min(44 * falloff, 82) * Math.sign(diff);

      el.style.transform = `translateX(calc(-50% + ${diff * spacing}px)) translateZ(${
        -0.6 * w * falloff
      }px) rotateY(${-angle}deg)`;
      const loopFade = Math.min(1, Math.max(0, count / 2 - absD));
      el.style.opacity = String(Math.max(0, 1 - 0.1 * absD) * loopFade);
      el.style.zIndex = String(100 - Math.round(absD));
    });
  }, [count]);

  const animateTo = useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setActiveIndex(wrapIndex(target));

      const tick = () => {
        const delta = target - posRef.current;
        if (Math.abs(delta) < 0.0004) {
          posRef.current = target;
          applyTransforms();
          rafRef.current = null;
          return;
        }
        posRef.current += delta * 0.16;
        applyTransforms();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [applyTransforms, wrapIndex]
  );

  const goToIndex = useCallback(
    (idx: number) => {
      const snapped = idx + Math.round((targetRef.current - idx) / count) * count;
      animateTo(snapped);
    },
    [animateTo, count]
  );

  const stepBy = useCallback(
    (delta: number) => {
      animateTo(Math.round(targetRef.current) + delta);
    },
    [animateTo]
  );

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const first = slideRefs.current[0];
      if (first) {
        cardWidthRef.current = first.offsetWidth;
        applyTransforms();
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyTransforms]);

  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.04 }
    );
    io.observe(sec);
    const fallback = window.setTimeout(() => setInView(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeSlide = EDIT_SLIDES[activeIndex];

  return (
    <section
      ref={sectionRef}
      data-inview={inView ? '1' : '0'}
      className="relative overflow-hidden bg-[#f7f7f5] py-16 text-[#0b0b0b] sm:py-24"
      aria-label="The SPARTA Edit"
    >
      <header className="cf-reveal mb-4 flex flex-col items-center gap-3 px-5 text-center">
        <span className="font-ui-demo flex items-center gap-2 text-[11px] tracking-[0.32em] text-black/55 uppercase">
          <SpartaCrestIcon className="h-3 w-3" /> The 3D Edit
        </span>
        <h2 className="font-display-demo text-[2rem] leading-none tracking-[0.02em] uppercase sm:text-[2.8rem]">
          Pieces worth keeping
        </h2>
      </header>

      <div
        className="cf-reveal relative w-full"
        style={{ '--cf-card': 'clamp(210px, 25vw, 355px)' } as React.CSSProperties}
        role="region"
        aria-roledescription="carousel"
        aria-label="SPARTA Coverflow Archive"
      >
        <div className="relative">
          <div
            ref={trackRef}
            tabIndex={0}
            onPointerDown={(e) => {
              if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              targetRef.current = posRef.current;
              dragRef.current = {
                id: e.pointerId,
                x: e.clientX,
                pos: posRef.current,
                v: 0,
                t: performance.now(),
              };
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current;
              if (!drag || drag.id !== e.pointerId) return;
              const unit = cardWidthRef.current * 1.05;
              if (!unit) return;
              const now = performance.now();
              const prev = posRef.current;
              posRef.current = drag.pos - (e.clientX - drag.x) / unit;
              drag.v = ((posRef.current - prev) / Math.max(now - drag.t, 1)) * 1000;
              drag.t = now;
              const nextActive = wrapIndex(posRef.current);
              if (nextActive !== activeIndex) setActiveIndex(nextActive);
              applyTransforms();
            }}
            onPointerUp={(e) => {
              const drag = dragRef.current;
              if (!drag || drag.id !== e.pointerId) return;
              dragRef.current = null;
              const momentum = Math.max(-2, Math.min(2, drag.v * 0.18));
              animateTo(Math.round(posRef.current + momentum));
            }}
            onPointerCancel={(e) => {
              const drag = dragRef.current;
              if (!drag || drag.id !== e.pointerId) return;
              dragRef.current = null;
              animateTo(Math.round(posRef.current));
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepBy(-1);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepBy(1);
              }
            }}
            className="cursor-grab overflow-hidden py-10 outline-none active:cursor-grabbing"
            style={{ perspective: 'calc(var(--cf-card) * 3)', touchAction: 'pan-y' }}
          >
            <div
              className="relative select-none"
              style={{ height: 'var(--cf-card)', transformStyle: 'preserve-3d' }}
            >
              {EDIT_SLIDES.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  ref={(el) => {
                    slideRefs.current[idx] = el;
                  }}
                  onClick={() => {
                    if (idx === activeIndex) onInspect3D(item);
                    else goToIndex(idx);
                  }}
                  className="absolute left-1/2 top-0 aspect-square cursor-pointer overflow-hidden rounded-2xl bg-[#e8e6e1] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.4)] will-change-transform"
                  style={{ width: 'var(--cf-card)' }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    draggable={false}
                    className="h-full w-full select-none object-cover object-top"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Left/Right 3D Stage Controls */}
          <button
            type="button"
            aria-label="Previous 3D look"
            onClick={() => stepBy(-1)}
            className="absolute left-3 top-1/2 z-[120] grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-black/25 bg-white/80 text-black backdrop-blur transition hover:bg-black hover:text-white sm:left-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next 3D look"
            onClick={() => stepBy(1)}
            className="absolute right-3 top-1/2 z-[120] grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-black/25 bg-white/80 text-black backdrop-blur transition hover:bg-black hover:text-white sm:right-8"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Active Slide Specification Readout */}
        {activeSlide && (
          <div className="mx-auto mt-2 flex w-[min(360px,86vw)] flex-col items-center">
            <h3 className="font-display-demo text-center text-[1.6rem] leading-tight tracking-[0.02em] uppercase sm:text-[1.9rem]">
              {activeSlide.name}
            </h3>
            <p className="mt-1.5 text-[13px] text-black/55 italic">{activeSlide.category}</p>
            <dl className="mt-6 w-full space-y-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="font-ui-demo font-light text-black/55">Fabric / Notes</dt>
                <dd className="font-medium italic text-black">{activeSlide.fabric}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="font-ui-demo font-light text-black/55">Silhouette</dt>
                <dd className="font-medium italic text-black">{activeSlide.fit}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="font-ui-demo font-light text-black/55">Rating</dt>
                <dd className="font-medium italic text-black">★ {activeSlide.rating.toFixed(1)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="font-ui-demo font-light text-black/55">Price</dt>
                <dd className="font-bold italic text-black">
                  ৳{activeSlide.price.toLocaleString('en-IN')}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onAddToBag(activeSlide)}
                className="font-ui-demo cursor-pointer rounded-full bg-[#0b0b0b] px-5 py-2.5 text-[13px] font-light text-white transition-transform hover:-translate-y-0.5"
              >
                Add to bag
              </button>
              <button
                type="button"
                onClick={() => onInspect3D(activeSlide)}
                className="font-ui-demo cursor-pointer rounded-full border border-black/25 px-5 py-2.5 text-[13px] font-light text-black transition-colors hover:border-black"
              >
                Inspect in 3D
              </button>
            </div>
          </div>
        )}

        {/* Pagination dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {EDIT_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === activeIndex}
              onClick={() => goToIndex(idx)}
              className={`h-2 w-2 cursor-pointer rounded-full bg-[#0b0b0b] transition-opacity ${
                idx === activeIndex ? 'opacity-100' : 'opacity-25 hover:opacity-50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface CurvedMarqueeProps {
  text: string;
  speed: number;
  curveAmount: number;
  direction: 'left' | 'right';
  className?: string;
}

const CurvedLoop: React.FC<CurvedMarqueeProps> = ({
  text,
  speed,
  curveAmount,
  direction,
  className,
}) => {
  const pathId = useMemo(
    () => `sparta-curve-${Math.random().toString(36).slice(2, 9)}`,
    []
  );
  const cleanText = useMemo(() => (text.endsWith(' ') ? text : `${text}\u00A0`), [text]);
  const measureRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const [unitWidth, setUnitWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const velRef = useRef(0);
  const dirRef = useRef(direction);

  const repeatedText = useMemo(() => {
    if (!unitWidth) return cleanText;
    const repeats = Math.ceil(1900 / unitWidth) + 2;
    return Array.from({ length: repeats }, () => cleanText).join('');
  }, [cleanText, unitWidth]);

  useEffect(() => {
    const updateWidth = () => {
      if (measureRef.current) {
        setUnitWidth(measureRef.current.getComputedTextLength());
      }
    };
    updateWidth();
    let mounted = true;
    document.fonts?.ready.then(() => {
      if (mounted) updateWidth();
    });
    return () => {
      mounted = false;
    };
  }, [cleanText, className]);

  useEffect(() => {
    if (unitWidth && textPathRef.current) {
      textPathRef.current.setAttribute('startOffset', `${-unitWidth}px`);
      setOffset(-unitWidth);
    }
  }, [unitWidth]);

  useEffect(() => {
    if (!unitWidth) return;
    let raf = 0;
    const step = () => {
      if (!draggingRef.current && textPathRef.current) {
        const stepPx = dirRef.current === 'right' ? speed : -speed;
        let next = parseFloat(textPathRef.current.getAttribute('startOffset') || '0') + stepPx;
        if (next <= -unitWidth) next += unitWidth;
        if (next > 0) next -= unitWidth;
        textPathRef.current.setAttribute('startOffset', `${next}px`);
        setOffset(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [unitWidth, speed]);

  const pathD = `M-100,40 Q720,${40 + curveAmount} 1540,40`;

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden"
      style={{
        visibility: unitWidth ? 'visible' : 'hidden',
        cursor: draggingRef.current ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => {
        draggingRef.current = true;
        lastXRef.current = e.clientX;
        velRef.current = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current || !textPathRef.current || !unitWidth) return;
        const dx = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        velRef.current = dx;
        let next = parseFloat(textPathRef.current.getAttribute('startOffset') || '0') + dx;
        if (next <= -unitWidth) next += unitWidth;
        if (next > 0) next -= unitWidth;
        textPathRef.current.setAttribute('startOffset', `${next}px`);
        setOffset(next);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
        dirRef.current = velRef.current >= 0 ? 'right' : 'left';
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <svg
        className="block aspect-[100/18] w-full select-none overflow-visible font-normal uppercase"
        viewBox="0 0 1440 160"
      >
        <text
          ref={measureRef}
          xmlSpace="preserve"
          className={className}
          style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        >
          {cleanText}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {unitWidth > 0 && (
          <text xmlSpace="preserve" className={`fill-white ${className ?? ''}`}>
            <textPath
              ref={textPathRef}
              href={`#${pathId}`}
              startOffset={`${offset}px`}
              xmlSpace="preserve"
            >
              {repeatedText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

const HIGHLIGHTS_LINES = [
  'Architectural menswear crafted in Bangladesh',
  'Combed cotton cable knits & double-pleat suiting',
  'Artisanal Eau de Parfum extractions',
  'Cash on Delivery nationwide',
  'Complimentary delivery over ৳5,000',
  'Designed to outlast seasons',
];

export const MarqueeHighlights: React.FC = () => {
  const piecesText = useMemo(() => RAIL_PIECES.map((p) => `${p.name} ✦ `).join(''), []);
  const highlightsText = useMemo(() => HIGHLIGHTS_LINES.map((t) => `${t} ✦ `).join(''), []);

  return (
    <section
      className="relative overflow-hidden bg-[#0b0b0b] py-10 text-white sm:py-14"
      aria-label="Highlights"
    >
      <header className="mb-3 flex flex-col items-center gap-3 px-5 text-center">
        <span className="font-ui-demo flex items-center gap-2 text-[11px] tracking-[0.32em] text-white/50 uppercase">
          <SpartaCrestIcon className="h-3 w-3" /> Highlights
        </span>
      </header>

      <div aria-hidden="true">
        <div className="mb-[-3.4vw] sm:mb-[-5.2vw]">
          <CurvedLoop
            text={highlightsText}
            speed={0.9}
            curveAmount={70}
            direction="left"
            className="font-display-demo text-[4rem] font-normal tracking-[0.04em] sm:text-[2.5rem]"
          />
        </div>
        <div className="mb-[-6vw] opacity-40 sm:mb-[-7.6vw]">
          <CurvedLoop
            text={piecesText}
            speed={0.65}
            curveAmount={-50}
            direction="right"
            className="font-display-demo text-[2.8rem] font-normal tracking-[0.08em] sm:text-[1.6rem]"
          />
        </div>
      </div>

      <p className="font-ui-demo mt-4 text-center text-[11px] tracking-[0.2em] text-white/35 uppercase">
        Drag to spin
      </p>
    </section>
  );
};
