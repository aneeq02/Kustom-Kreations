'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface CarouselPhoto {
  src: string;
  alt: string;
}

interface PhotoCarouselProps {
  photos: CarouselPhoto[];
  /** Auto-advance interval in ms. Set to 0 to disable. */
  intervalMs?: number;
  className?: string;
}

export default function PhotoCarousel({ photos, intervalMs = 4500, className = '' }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const go = useCallback((next: number, direction: number) => {
    setDir(direction);
    setIndex((next + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!intervalMs || photos.length <= 1) return;
    const id = setInterval(() => go(index + 1, 1), intervalMs);
    return () => clearInterval(id);
  }, [index, intervalMs, photos.length, go]);

  if (!photos.length) {
    return (
      <div className={`relative overflow-hidden rounded-[4px] aspect-4/3 flex items-center justify-center bg-[#EAE7DF] ${className}`}>
        <div className="text-center px-6">
          <svg className="w-8 h-8 mx-auto mb-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-text-secondary text-sm">Product photos coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[4px] ${className}`}>
      <div className="relative aspect-4/3">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={photos[index].src}
            src={photos[index].src}
            alt={photos[index].alt}
            custom={dir}
            initial={{ x: dir > 0 ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir > 0 ? '-100%' : '100%', opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {photos.length > 1 && (
          <>
            <button
              onClick={() => go(index - 1, -1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-[2px] bg-white/85 hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => go(index + 1, 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-[2px] bg-white/85 hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`h-1.5 rounded-[1px] transition-[width,background-color] ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
