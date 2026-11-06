import React, { useState } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F2F1EE] dark:bg-[#141417] text-stone-500 dark:text-zinc-400 p-4 text-center select-none">
        <span className="font-display text-sm tracking-[0.24em] uppercase opacity-80">
          SPARTA
        </span>
        {fallbackLabel && (
          <span className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500 line-clamp-1">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallbackLabel || 'SPARTA piece'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      {...rest}
    />
  );
};
