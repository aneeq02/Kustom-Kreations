'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// How close to the bottom of the page (px) before the button steps aside for
// the final call-to-action block and the footer, which have their own links.
const HIDE_NEAR_END = 900;

// "Upload now" pinned to the bottom-centre of the screen on the homepage, so
// the next step is always one tap away while scrolling.
export default function FloatingUpload() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - HIDE_NEAR_END;
      setVisible(!nearEnd);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Short delay so it arrives after the hero's own entrance animation
    const t = setTimeout(update, reduce ? 0 : 1600);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(t);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          className="fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center pointer-events-none"
        >
          <Link
            href="/configure"
            className="kk-float pointer-events-auto inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand text-white text-[15px] font-semibold whitespace-nowrap shadow-[0_12px_28px_-10px_rgba(0,0,0,.45)] hover:bg-brand-dark transition-colors"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
            </svg>
            Upload now
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
