'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { SCENES } from './scenes';

const face = (src: string) => ({
  backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.25) 0%, rgba(255,255,255,0) 45%), url("${src}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

export default function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const k = reduce ? 0 : 1;
  const r1 = useTransform(scrollYProgress, [0, 1], [-18 * k, 6 * k]);
  const r2 = useTransform(scrollYProgress, [0, 1], [16 * k, -8 * k]);
  const y1 = useTransform(scrollYProgress, [0, 1], [40 * k, -40 * k]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-30 * k, 50 * k]);

  return (
    <section ref={ref} className="bg-white px-4 py-16 sm:py-24">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-5xl mx-auto overflow-hidden rounded-2xl bg-brand px-6 py-16 sm:px-12 sm:py-24 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,rgba(255,255,255,.14),transparent)] pointer-events-none" />

        {/* Magnets tumbling at the corners */}
        <motion.div style={{ rotate: r1, y: y1, ...face(SCENES.coast) }} className="hidden sm:block absolute -left-6 top-10 w-32 lg:w-40 aspect-square rounded-[2px] shadow-[0_20px_40px_-12px_rgba(0,0,0,.5)]" />
        <motion.div style={{ rotate: r2, y: y2, ...face(SCENES.bloom) }} className="hidden sm:block absolute -right-8 bottom-8 w-36 lg:w-44 aspect-square rounded-[2px] shadow-[0_20px_40px_-12px_rgba(0,0,0,.5)]" />
        <motion.div style={{ rotate: r2, ...face(SCENES.night) }} className="sm:hidden absolute -right-6 -top-6 w-24 aspect-square rounded-[2px] opacity-90 shadow-[0_16px_30px_-10px_rgba(0,0,0,.5)]" />

        <div className="relative">
          <p className="text-white/65 text-sm font-medium uppercase tracking-[0.18em] mb-5">Ready to create something beautiful?</p>
          <h2 className="font-heading text-white text-[2.5rem] leading-[1.04] sm:text-6xl mb-6 max-w-2xl mx-auto">
            Your memories deserve to be on display
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-lg mx-auto">
            No account needed. Free to design. Pay only when you love it.
          </p>
          <Link
            href="/start"
            className="group inline-flex items-center justify-center gap-3 h-14 px-9 rounded-lg font-semibold text-brand bg-white hover:bg-brand-light transition-colors w-full sm:w-auto"
          >
            Create your magnets
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="mt-6 text-white/50 text-sm">Delivered to UK &amp; Isle of Man</p>
        </div>
      </motion.div>
    </section>
  );
}
