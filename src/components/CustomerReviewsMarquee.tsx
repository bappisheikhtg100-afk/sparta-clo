import React from 'react';
import { Star, CheckCircle } from 'lucide-react';

interface ReviewItem {
  id: string;
  name: string;
  location: string;
  rating: number;
  comment: string;
  product: string;
  date: string;
}

const CURATED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Asifur Rahman',
    location: 'Gulshan 2, Dhaka',
    rating: 5,
    comment: 'The GSM weight and silhouette are truly on another level. Fits effortlessly with that quiet luxury drape.',
    product: 'Spartan Cable Knit',
    date: '2 days ago',
  },
  {
    id: 'rev-2',
    name: 'Tanvir Ahmed',
    location: 'GEC Circle, Chattogram',
    rating: 5,
    comment: 'Bhai seriously bolchi, fabric quality pura Zara/Massimo Dutti level! Delivery o matro 2 dine peyechi.',
    product: 'Spartan Flare Formal',
    date: '3 days ago',
  },
  {
    id: 'rev-3',
    name: 'Sazzadul Islam',
    location: 'Dhanmondi 27, Dhaka',
    rating: 5,
    comment: 'Hands down the best bespoke knitwear in Bangladesh. Cash on delivery was seamless and packaging was immaculate.',
    product: 'Heritage Cable Polo',
    date: 'Yesterday',
  },
  {
    id: 'rev-4',
    name: 'Rafsan Jamil',
    location: 'Sylhet Sadar, Sylhet',
    rating: 5,
    comment: 'The Spartan Man EDP projection is incredible. Lasts easily over 10+ hours with subtle woody undertones.',
    product: 'SPARTAN MAN EDP',
    date: '4 days ago',
  },
  {
    id: 'rev-5',
    name: 'Farhan Kabir',
    location: 'Uttara Sector 7, Dhaka',
    rating: 5,
    comment: 'Double-pleated trousers er fall ta osadharon! Sneakers er sathe perfectly drape kore, 10/10 recommendation.',
    product: 'Spartan Flare Formal',
    date: '1 day ago',
  },
  {
    id: 'rev-6',
    name: 'Mahir Faisal',
    location: 'Banani 11, Dhaka',
    rating: 5,
    comment: 'Minimalist craftsmanship done right. Washed it twice already and no shrinkage or collar distortion whatsoever.',
    product: 'Spartan Cable Knit',
    date: '5 days ago',
  },
  {
    id: 'rev-7',
    name: 'Zubair Hossain',
    location: 'Khalishpur, Khulna',
    rating: 5,
    comment: 'Khulna te Pathao express delivery te eto fast doorstep parcel pabo expect kori nai. Pure architectural luxury!',
    product: 'Spartan Head Cap',
    date: '3 days ago',
  },
  {
    id: 'rev-8',
    name: 'Tahmid Chowdhury',
    location: 'Agrabad, Chattogram',
    rating: 5,
    comment: 'Vampire Blood perfume ta ekdom niche dark fragrance. Evening wear er jonno unmatched signature scent.',
    product: 'Spartan Vampired Blood',
    date: 'Just now',
  },
];

export const CustomerReviewsMarquee: React.FC = () => {
  // Duplicate array for infinite seamless looping
  const duplicatedReviews = [...CURATED_REVIEWS, ...CURATED_REVIEWS];

  return (
    <div className="w-full overflow-hidden py-4 select-none">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-2">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500 dark:text-zinc-400">
            Verified Patron Testimonials · Client Archive
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-light text-[#111111] dark:text-[#F5F4F0] mt-1">
            Real Experiences &amp; Editorial Reviews
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 font-mono">
          <div className="flex text-amber-500">
            {'★'.repeat(5)}
          </div>
          <span className="font-semibold text-stone-800 dark:text-zinc-200">4.9 / 5.0</span>
          <span>(500+ Verified COD Dispatches)</span>
        </div>
      </div>

      {/* Marquee Track Container */}
      <div className="relative w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
        <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
          {duplicatedReviews.map((rev, idx) => (
            <div
              key={`${rev.id}-${idx}`}
              className="w-[300px] sm:w-[340px] shrink-0 p-5 bg-white/80 dark:bg-[#141418]/90 border border-stone-200/90 dark:border-white/10 rounded-sm shadow-2xs backdrop-blur-xs flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div>
                {/* Header: Stars & Verified Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified Buyer</span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-[13px] text-stone-800 dark:text-zinc-200 leading-relaxed font-sans line-clamp-3">
                  "{rev.comment}"
                </p>
              </div>

              {/* Author & Product Info */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                <div>
                  <div className="font-semibold text-stone-900 dark:text-white">
                    {rev.name}
                  </div>
                  <div className="text-stone-400 text-[10px]">
                    {rev.location} · {rev.product}
                  </div>
                </div>
                <div className="text-[10px] text-stone-400 font-mono">
                  {rev.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
