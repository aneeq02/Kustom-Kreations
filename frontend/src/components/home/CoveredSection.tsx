'use client';

import { motion } from 'framer-motion';

// Brand-drawn line illustrations (logo green + blush) in place of emoji or
// stock icons — modelled on Mixtiles' "We've Got You Covered" row.
const INK = 'var(--color-brand)';
const BLUSH = '#EBD3C7';
const MINT = '#D9E8E5';

function ShippingArt() {
  return (
    <svg viewBox="0 0 120 96" className="w-28 h-24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="66" cy="50" rx="38" ry="30" fill={MINT} stroke="none" />
      <path d="M44 38l22-10 22 10v26L66 74 44 64z" fill="#fff" />
      <path d="M44 38l22 10 22-10M66 48v26" />
      <path d="M55 33l22 10v8" stroke={BLUSH} strokeWidth="5" />
      <path d="M14 42h18M20 52h14M10 62h20" />
      <path d="M95 22l2 4 4 1-4 2-2 4-2-4-4-2 4-1z" fill={INK} stroke="none" />
      <path d="M72 59c0-2 3-3 4-1 1-2 4-1 4 1 0 3-4 5-4 5s-4-2-4-5z" fill={BLUSH} stroke="none" />
    </svg>
  );
}

function CustomArt() {
  return (
    <svg viewBox="0 0 120 96" className="w-28 h-24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="62" cy="50" rx="40" ry="30" fill={BLUSH} stroke="none" opacity="0.7" />
      <rect x="44" y="24" width="40" height="40" rx="2" fill="#fff" transform="rotate(6 64 44)" />
      <g transform="rotate(6 64 44)">
        <circle cx="73" cy="34" r="4" fill={BLUSH} stroke="none" />
        <path d="M46 58l12-13 9 9 6-6 11 10" />
      </g>
      <rect x="30" y="38" width="26" height="26" rx="2" fill={MINT} transform="rotate(-8 43 51)" />
      <path d="M27 24l2.5 5 5 1.5-5 2-2.5 5-2.5-5-5-2 5-1.5z" fill={INK} stroke="none" />
      <path d="M96 66l1.6 3.2 3.4 1-3.4 1.4-1.6 3.2-1.6-3.2-3.4-1.4 3.4-1z" fill={INK} stroke="none" />
    </svg>
  );
}

function GuaranteeArt() {
  return (
    <svg viewBox="0 0 120 96" className="w-28 h-24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="60" cy="50" rx="38" ry="30" fill={MINT} stroke="none" />
      <circle cx="56" cy="46" r="20" fill="#fff" />
      <circle cx="49" cy="42" r="1.6" fill={INK} stroke="none" />
      <circle cx="63" cy="42" r="1.6" fill={INK} stroke="none" />
      <path d="M48 51c4 5 12 5 16 0" />
      <path d="M78 58c0-4 6-6 8-2 2-4 8-2 8 2 0 6-8 10-8 10s-8-4-8-10z" fill={BLUSH} />
      <path d="M86 22l2 4 4 1.4-4 1.6-2 4-2-4-4-1.6 4-1.4z" fill={INK} stroke="none" />
      <path d="M26 66l1.6 3 3.2 1-3.2 1.4-1.6 3-1.6-3-3.2-1.4 3.2-1z" fill={INK} stroke="none" />
    </svg>
  );
}

const CARDS = [
  { Art: ShippingArt, title: 'Fast & Free Shipping', body: 'Made to order, packed with care', note: 'On orders over £25' },
  { Art: CustomArt, title: 'Custom Made for You', body: 'Your designs, your magnets' },
  { Art: GuaranteeArt, title: 'Satisfaction Guaranteed', body: "Love your magnets or we'll make it right" },
];

export default function CoveredSection() {
  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center text-text-secondary text-sm uppercase tracking-widest mb-3"
        >
          Turning the photos in your phone into long-lasting memories
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center text-4xl md:text-5xl font-heading text-navy mb-12"
        >
          We&apos;ve Got You Covered
        </motion.h2>

        <div className="grid sm:grid-cols-3 gap-4 md:gap-6">
          {CARDS.map(({ Art, title, body, note }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group flex flex-col items-center text-center rounded-[6px] bg-[#F6F3EE] px-6 pt-8 pb-9"
            >
              <div className="transition-transform duration-300 group-hover:-translate-y-1">
                <Art />
              </div>
              <h3 className="mt-5 font-body text-lg font-semibold text-navy">{title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{body}</p>
              {note && <p className="mt-0.5 text-sm text-brand font-medium">{note}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
