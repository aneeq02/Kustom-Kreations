'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';

const WORDS = ['Family photos', 'Pet portraits', 'Holidays', 'Weddings', 'Birthdays', 'Little milestones', 'Thoughtful gifts', 'Days out'];

// An editorial ribbon of the moments people print — a pure CSS loop, paused
// whenever it's scrolled out of view.
export default function Marquee() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {WORDS.map(w => (
        <span key={w} className="flex items-center">
          <span className="font-heading italic text-3xl sm:text-5xl text-navy/85 px-6 sm:px-10 whitespace-nowrap">{w}</span>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg>
        </span>
      ))}
    </div>
  );
  return (
    <section ref={ref} className="bg-cream border-y border-border py-7 sm:py-10 overflow-hidden" aria-label="Family photos, pet portraits, holidays, weddings, birthdays and more">
      <div className="kk-marquee flex w-max" data-paused={!inView}>
        {row}
        {row}
      </div>
    </section>
  );
}
