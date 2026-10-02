'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { SCENES } from './scenes';

const POINTS = [
  ['Checked before it prints', 'Our quality check flags blurry photos while you design — not after you’ve paid.'],
  ['Professional 300 DPI print', 'Rich colour and crisp detail on a premium gloss finish.'],
  ['Strong magnetic backing', 'Holds firm on the fridge, the filing cabinet, or anywhere magnetic.'],
];

function Piece({ i, spread, src }: { i: number; spread: MotionValue<number>; src: string }) {
  const row = Math.floor(i / 3) - 1; // -1, 0, 1
  const col = (i % 3) - 1;
  const x = useTransform(spread, s => col * s);
  const y = useTransform(spread, s => row * s);
  const rotate = useTransform(spread, s => ((i * 37) % 9 - 4) * (s / 28));
  return (
    <motion.div
      style={{
        x, y, rotate,
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.24) 0%, rgba(255,255,255,0) 45%), url("${src}")`,
        backgroundSize: '100% 100%, 300% 300%',
        backgroundPosition: `0 0, ${(col + 1) * 50}% ${(row + 1) * 50}%`,
      }}
      className="rounded-[2px] shadow-[0_2px_3px_rgba(0,0,0,.18),0_16px_30px_-12px_rgba(0,0,0,.4)]"
    />
  );
}

export default function JigsawSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // Together → apart → together as the section passes through the viewport
  const raw = useTransform(scrollYProgress, [0.15, 0.45, 0.6, 0.85], [0, 26, 26, 4]);
  const spread = useSpring(raw, { stiffness: 90, damping: 22 });
  const still = useTransform(spread, () => 6);

  return (
    <section ref={ref} className="bg-white py-20 sm:py-28 px-5 overflow-hidden">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div className="relative mx-auto w-full max-w-[420px] py-6">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,#EFE6DC,transparent)]" />
          <div className="relative grid grid-cols-3 gap-[3px] aspect-square w-[78%] mx-auto">
            {Array.from({ length: 9 }, (_, i) => (
              <Piece key={i} i={i} spread={reduce ? still : spread} src={SCENES.hills} />
            ))}
          </div>
        </div>

        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-brand text-sm font-medium uppercase tracking-[0.16em] mb-4"
          >
            The jigsaw set
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
            className="font-heading text-[2.6rem] sm:text-6xl leading-[1.02] text-navy mb-6"
          >
            One photo.<br /><em className="text-brand">Nine magnets.</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-text-secondary text-lg leading-relaxed mb-9 max-w-lg"
          >
            Split a favourite picture across a 2×2 all the way up to a 5×5 set. Arrange them together, or spread them out — every piece is a magnet in its own right.
          </motion.p>

          <ul className="flex flex-col gap-5 mb-10">
            {POINTS.map(([title, body], i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                className="flex gap-4"
              >
                <span className="mt-0.5 w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                <span>
                  <span className="block font-semibold text-navy">{title}</span>
                  <span className="block text-sm text-text-secondary mt-0.5">{body}</span>
                </span>
              </motion.li>
            ))}
          </ul>

          <Link href="/configure" className="inline-flex items-center justify-center h-13 px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors w-full sm:w-auto">
            Make a jigsaw set
          </Link>
        </div>
      </div>
    </section>
  );
}
