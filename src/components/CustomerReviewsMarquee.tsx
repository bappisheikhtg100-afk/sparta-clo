import React from 'react';
import { Star, CheckCircle, Quote } from 'lucide-react';

interface ReviewItem {
  id: string;
  name: string;
  location: string;
  rating: number;
  comment: string;
  product: string;
  date: string;
}

const BENGALI_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'আসিফুর রহমান',
    location: 'গুলশান, ঢাকা',
    rating: 5,
    comment: 'কাপড়ের জিএসএম এবং কোয়ালিটি সত্যিই অসাধারণ! ড্রপ শোল্ডার ফিটিং একদম মনের মতো হয়েছে।',
    product: 'Signature Heavyweight Tee',
    date: '২ দিন আগে',
  },
  {
    id: 'rev-2',
    name: 'তানভীর আহমেদ',
    location: 'জিইসি, চট্টগ্রাম',
    rating: 5,
    comment: 'ক্যাশ অন ডেলিভারিতে মাত্র ২ দিনে পার্সেল পেয়েছি। আনবক্সিং এক্সপেরিয়েন্স আন্তর্জাতিক ব্র্যান্ডের মতো!',
    product: 'Atelier Tailored Pant',
    date: '৩ দিন আগে',
  },
  {
    id: 'rev-3',
    name: 'সাদমান সাকিব',
    location: 'উপশহর, সিলেট',
    rating: 5,
    comment: 'পারফিউমের স্মেল দীর্ঘস্থায়ী এবং প্রিমিয়াম। ৮-১০ ঘণ্টা পরেও কাপড়ে দারুণ মিষ্টি সুবাস পাওয়া যায়।',
    product: 'SPARTA Parfum 100ml',
    date: '১ দিন আগে',
  },
  {
    id: 'rev-4',
    name: 'রাফসান জামিল',
    location: 'বোয়ালিয়া, রাজশাহী',
    rating: 5,
    comment: 'প্রোডাক্টের স্টিচিং এবং মেটেরিয়াল ফিনিশিং নিখুঁত। সাইজ চার্ট অনুযায়ী ১০০% পারফেক্ট হয়েছে।',
    product: 'Heavyweight Zip Hoodie',
    date: '৪ দিন আগে',
  },
  {
    id: 'rev-5',
    name: 'ফারহান কবির',
    location: 'উত্তরা সেক্টর ৭, ঢাকা',
    rating: 5,
    comment: 'স্পার্টার কোয়ালিটি দেখে মুগ্ধ হয়েছি। প্রিমিয়াম প্যাকিং এবং সাথে সাথে ডেলিভারি ট্র্যাকিং আপডেট পেয়েছি।',
    product: 'Minimalist Sweatshirt',
    date: 'গতকাল',
  },
  {
    id: 'rev-6',
    name: 'মেহেদী হাসান',
    location: 'ধানমন্ডি, ঢাকা',
    rating: 5,
    comment: 'ধোয়ার পরেও কাপড়ের রঙ বা ফেব্রিক একটুকুও নষ্ট হয়নি। শতভাগ খাঁটি রিইনফোর্সড কটন।',
    product: 'Boxy Silhouette Tee',
    date: '৫ দিন আগে',
  },
  {
    id: 'rev-7',
    name: 'জুবায়ের হোসেন',
    location: 'খালিশপুর, খুলনা',
    rating: 5,
    comment: 'ঢাকার বাইরে ক্যারি বি ও পাঠাও কুরিয়ারে এত ফাস্ট হোম ডেলিভারি পাওয়া অভাবনীয়। ১০ এ ১০!',
    product: 'Pleated Flare Trouser',
    date: '৩ দিন আগে',
  },
  {
    id: 'rev-8',
    name: 'তাহমিদ ইসলাম',
    location: 'চৌহাট্টা, সিলেট',
    rating: 5,
    comment: 'মিনিমালিস্ট ও লাক্সারি ভাইব একসাথে পেতে চাইলে স্পার্টা ক্লো এর বিকল্প নেই। আবার অর্ডার করব।',
    product: 'Signature Cologne 50ml',
    date: 'আজকে',
  },
];

export const CustomerReviewsMarquee: React.FC = () => {
  // Duplicate array for infinite seamless looping
  const duplicatedReviews = [...BENGALI_REVIEWS, ...BENGALI_REVIEWS];

  return (
    <div className="w-full overflow-hidden py-4 select-none">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-2">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500 dark:text-zinc-400">
            Verified Customer Feedback · পর্যালোচনা
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-light text-[#111111] dark:text-[#F5F4F0] mt-1">
            গ্রাহকদের বাস্তব অভিজ্ঞতা ও রিভিউ
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 font-mono">
          <div className="flex text-amber-500">
            {'★'.repeat(5)}
          </div>
          <span className="font-semibold text-stone-800 dark:text-zinc-200">৪.৯/৫.০</span>
          <span>(৫০০+ সফল ক্যাশ অন ডেলিভারি)</span>
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
                    <span>ভেরিফাইড ক্রেতা</span>
                  </div>
                </div>

                {/* Bengali Review Text */}
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
