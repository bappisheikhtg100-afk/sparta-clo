import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { MEDIA_ASSETS, PRODUCTS } from '../data/storeData';
import { useStore } from '../context/StoreContext';

export const HeroSection: React.FC = () => {
  const { jumpToCategory, navigate, theme, products } = useStore();
  const sectionRef = useRef<HTMLElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const userPausedRef = useRef(false);

  useEffect(() => {
    const syncPlayback = (shouldPlay: boolean) => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      const activeVid = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
      const inactiveVid = isDesktop ? mobileVideoRef.current : desktopVideoRef.current;

      if (inactiveVid && !inactiveVid.paused) {
        inactiveVid.pause();
      }

      if (!activeVid) return;

      if (shouldPlay && !userPausedRef.current) {
        const playPromise = activeVid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      } else {
        activeVid.pause();
        if (userPausedRef.current) setIsPlaying(false);
      }
    };

    syncPlayback(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        syncPlayback(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const handleResize = () => syncPlayback(true);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTogglePlay = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const vid = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!vid) return;

    if (vid.paused) {
      userPausedRef.current = false;
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      userPausedRef.current = true;
      vid.pause();
      setIsPlaying(false);
    }
  };

  const signaturePiece = products && products.length > 0 ? products[0] : PRODUCTS[0];

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative w-full border-b border-stone-200/90 dark:border-zinc-800/90 overflow-hidden"
    >
      {/* MOBILE & TABLET (<1024px): Full-Bleed Campaign Cinema */}
      <div className="relative lg:hidden min-h-[85svh] w-full flex flex-col justify-end bg-[#0A0A0C] overflow-hidden">
        <img
          src={MEDIA_ASSETS.heroPoster}
          alt="SPARTA seasonal campaign"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        />
        <video
          ref={mobileVideoRef}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          poster={MEDIA_ASSETS.heroPoster}
          onCanPlay={() => setIsVideoReady(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center gpu-layer pointer-events-none transition-opacity duration-700 ${
            isVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={MEDIA_ASSETS.heroVideo} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none" />

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause campaign film' : 'Play campaign film'}
          className="absolute top-4 right-4 z-10 min-h-[44px] min-w-[44px] bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 px-5 pt-24 pb-9 max-w-xl"
        >
          <p className="text-xs font-medium text-stone-300 tracking-wider mb-3">
            Autumn / Winter Edition · Dhaka
          </p>
          <h1 className="font-display text-[2.75rem] sm:text-6xl font-normal text-white leading-[1.02] tracking-tight [text-wrap:balance] mb-4">
            The season&apos;s{' '}
            <em className="italic font-normal">defining silhouettes.</em>
          </h1>
          <p className="text-sm text-stone-300 leading-relaxed max-w-md mb-7">
            Tailored cable knitwear, double-pleated formal trousers, court footwear, and signature Eau de Parfum.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => jumpToCategory('All')}
              className="min-h-[48px] px-7 py-3 bg-[#FAF9F6] text-[#111111] text-xs sm:text-sm font-medium tracking-wide inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('product', signaturePiece)}
              className="min-h-[48px] px-5 py-3 bg-transparent border border-white/35 text-white text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform"
            >
              Spartan Cable Knit
            </button>
          </div>
        </motion.div>
      </div>

      {/* DESKTOP (1024px+): Flush Edge-to-Edge Split Editorial Curtain */}
      <div className="hidden lg:grid lg:grid-cols-12 min-h-[86vh] w-full bg-[#FAF9F6] dark:bg-[#08080A] transition-colors duration-200">
        {/* Left Editorial Salon */}
        <div className="col-span-7 flex flex-col justify-between px-12 xl:px-20 py-14 xl:py-16">
          <div className="flex items-center gap-2.5 text-xs text-stone-500 dark:text-zinc-400">
            <span>Seasonal Lookbook</span>
            <span aria-hidden="true">·</span>
            <span>Leveling Up Your Style</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="my-auto py-10 max-w-2xl"
          >
            <img
              src={theme === 'dark' ? MEDIA_ASSETS.logoWhite : MEDIA_ASSETS.logoBlack}
              alt="SPARTA"
              referrerPolicy="no-referrer"
              className="h-6 sm:h-7 w-auto object-contain mb-7 opacity-90"
            />

            <h1 className="font-display text-[clamp(3.25rem,4.8vw,4.75rem)] font-normal text-[#111111] dark:text-[#F5F4F0] leading-[1.02] tracking-[-0.01em] [text-wrap:balance] mb-6">
              The season&apos;s{' '}
              <em className="italic font-normal">defining silhouettes,</em> all in one house.
            </h1>

            <p className="text-[15px] text-stone-600 dark:text-zinc-400 leading-[1.7] max-w-lg mb-10">
              Designed with classical restraint and modern proportion—from combed cable-knit quarters and tailored flare trousers to small-batch Eau de Parfum.
            </p>

            <div className="flex items-center gap-7">
              <button
                type="button"
                onClick={() => jumpToCategory('All')}
                className="min-h-[50px] px-8 py-3.5 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] text-sm font-medium tracking-wide inline-flex items-center gap-3 whitespace-nowrap shrink-0 hover:opacity-85 active:scale-[0.99] transition-all duration-150 cursor-pointer"
              >
                <span>Explore Collection</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigate('product', signaturePiece)}
                className="min-h-[48px] py-2 text-sm font-medium text-stone-800 dark:text-zinc-200 border-b border-stone-400 dark:border-zinc-600 hover:border-[#111111] dark:hover:border-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Shop Spartan Cable Knit
              </button>
            </div>
          </motion.div>

          {/* Quiet Single-Line House Note */}
          <div className="pt-6 border-t border-stone-200/90 dark:border-zinc-800/90 flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
            <span>Cash on Delivery Across Bangladesh</span>
            <span>Complimentary Delivery Over ৳5,000</span>
          </div>
        </div>

        {/* Right Flush Full-Bleed Portrait Campaign Film */}
        <div className="col-span-5 relative min-h-[86vh] bg-[#0A0A0C] border-l border-stone-200/90 dark:border-zinc-800/90 overflow-hidden">
          <img
            src={MEDIA_ASSETS.heroPoster}
            alt="SPARTA campaign film poster"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
          />
          <video
            ref={desktopVideoRef}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            poster={MEDIA_ASSETS.heroPoster}
            onCanPlay={() => setIsVideoReady(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center gpu-layer pointer-events-none transition-opacity duration-700 ${
              isVideoReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={MEDIA_ASSETS.heroVideo} type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <span className="text-xs font-medium text-white/90 tracking-wider">
              Campaign Film · 01
            </span>
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause campaign film' : 'Play campaign film'}
              className="min-h-[40px] min-w-[40px] bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
