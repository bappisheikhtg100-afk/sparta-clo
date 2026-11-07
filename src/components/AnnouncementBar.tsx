import React from 'react';
import { useStore } from '../context/StoreContext';

export const AnnouncementBar: React.FC = () => {
  const { storeSettings } = useStore();

  if (!storeSettings.isAnnouncementActive || !storeSettings.announcementText) {
    return null;
  }

  const text = storeSettings.announcementText;

  return (
    <div className="w-full bg-[#111111] text-[#FAF9F6] dark:bg-[#000000] dark:text-[#EAE6DF] border-b border-white/10 overflow-hidden select-none py-2 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase relative z-30">
      <div className="flex whitespace-nowrap overflow-hidden">
        <div className="inline-flex items-center gap-8 animate-marquee shrink-0">
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
        </div>
        <div className="inline-flex items-center gap-8 animate-marquee shrink-0" aria-hidden="true">
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
          <span>{text}</span>
          <span className="text-amber-400">✦</span>
        </div>
      </div>
    </div>
  );
};
