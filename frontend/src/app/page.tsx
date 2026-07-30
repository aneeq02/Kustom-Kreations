'use client';

import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface MagnetSize {
  id: string;
  sizeMm: number;
  label: string;
  pricePerMagnet: number;
  bulkDiscountPct: number;
  active: boolean;
}

// ── Animation helpers ──────────────────────────────────────────
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport:  { once: true, margin: '-60px' },
  transition: { duration: 0.65, delay, ease: EASE_OUT },
});

const fadeIn = (delay = 0) => ({
  initial:   { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport:  { once: true },
  transition: { duration: 0.7, delay },
});

// ── Hero magnet grid data ──────────────────────────────────────
const HERO_MAGNETS = [
  { bg: 'linear-gradient(135deg,#FBBF8A,#F7A16A)', rot: -3, delay: 0.05 },
  { bg: 'linear-gradient(135deg,#93C5FD,#6EA8E8)', rot:  2, delay: 0.10 },
  { bg: 'linear-gradient(135deg,#F9A8D4,#EC7FAA)', rot: -1, delay: 0.15 },
  { bg: 'linear-gradient(135deg,#6EE7B7,#34D399)', rot:  3, delay: 0.20 },
  { bg: 'linear-gradient(135deg,#DDD6FE,#A78BFA)', rot: -2, delay: 0.00 },
  { bg: 'linear-gradient(135deg,#FDE68A,#FCD34D)', rot:  1, delay: 0.25 },
  { bg: 'linear-gradient(135deg,#FDBA74,#FB923C)', rot: -4, delay: 0.30 },
  { bg: 'linear-gradient(135deg,#A5F3FC,#67E8F9)', rot:  2, delay: 0.35 },
  { bg: 'linear-gradient(135deg,#FCA5A5,#F87171)', rot: -1, delay: 0.08 },
  { bg: 'linear-gradient(135deg,#C4985A,#E8C87A)', rot:  3, delay: 0.18 },
  { bg: 'linear-gradient(135deg,#818CF8,#6366F1)', rot: -2, delay: 0.28 },
  { bg: 'linear-gradient(135deg,#BEF264,#A3E635)', rot:  1, delay: 0.38 },
  { bg: 'linear-gradient(135deg,#F9A8D4,#FBCFE8)', rot:  4, delay: 0.12 },
  { bg: 'linear-gradient(135deg,#7DD3FC,#38BDF8)', rot: -3, delay: 0.22 },
  { bg: 'linear-gradient(135deg,#FDE68A,#C4985A)', rot:  2, delay: 0.32 },
  { bg: 'linear-gradient(135deg,#D9F99D,#86EFAC)', rot: -1, delay: 0.42 },
];

// ── Animated counter ───────────────────────────────────────────
function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = to / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) { setValue(to); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{inView ? value.toLocaleString() : 0}{suffix}</span>;
}

// ── Product showcase "video" scene ─────────────────────────────
const SCENE_MAGNETS = [
  { bg: '#FDE68A', top: '8%',  left: '10%', rot: -4, delay: 0.2 },
  { bg: '#93C5FD', top: '5%',  left: '40%', rot:  2, delay: 0.4 },
  { bg: '#F9A8D4', top: '10%', left: '70%', rot: -2, delay: 0.6 },
  { bg: '#BEF264', top: '42%', left: '5%',  rot:  3, delay: 0.8 },
  { bg: '#C4985A', top: '38%', left: '37%', rot: -1, delay: 1.0 },
  { bg: '#A5F3FC', top: '40%', left: '68%', rot:  4, delay: 1.2 },
  { bg: '#DDD6FE', top: '72%', left: '12%', rot: -3, delay: 1.4 },
  { bg: '#FCA5A5', top: '70%', left: '42%', rot:  2, delay: 1.6 },
  { bg: '#FDBA74', top: '74%', left: '72%', rot: -2, delay: 1.8 },
];

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const [magnetSizes, setMagnetSizes] = useState<MagnetSize[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/magnets/config`)
      .then(r => r.json())
      .then(d => setMagnetSizes((d.sizes as MagnetSize[]).filter(s => s.active)))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* ━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0C1A0C 0%, #162816 60%, #0F1F0F 100%)' }}
      >
        {/* Ambient glow orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,124,63,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,142,125,0.1) 0%, transparent 70%)' }} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-5 sm:px-8 w-full pt-24 pb-16 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
        >
          {/* Left: Copy */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
              className="text-[2.2rem] sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold text-white leading-[1.1] mb-5"
            >
              Turn memories into{' '}
              <span className="text-gradient-gold">treasured</span>
              {' '}keepsakes
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg"
            >
              Upload any photo, choose a beautiful template, and receive stunning handcrafted magnets at your door. Simple enough for any age, beautiful enough for any home.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <Link
                href="/start"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white text-lg overflow-hidden transition-all hover:-translate-y-0.5 animate-pulse-gold w-full sm:w-auto"
                style={{ background: 'linear-gradient(135deg, #4A7C3F 0%, #6AAD5A 50%, #4A7C3F 100%)', backgroundSize: '200% auto' }}
              >
                <span className="relative z-10">Start creating now</span>
                <svg className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="#showcase"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-medium text-white/70 hover:text-white transition-all glass w-full sm:w-auto"
              >
                See it in action
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-5 text-sm text-white/40"
            >
              {['Free UK delivery over £15', 'Next-day dispatch available', 'Ships to UK, IoM & Ireland'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-coral" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: Animated magnet grid */}
          <div className="hidden lg:flex items-center justify-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-4 gap-3"
            >
              {HERO_MAGNETS.map((m, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0.4, rotate: 0 },
                    show:   { opacity: 1, scale: 1, rotate: m.rot, transition: { type: 'spring', damping: 12, stiffness: 200 } },
                  }}
                  whileHover={{ scale: 1.1, rotate: 0, zIndex: 10 }}
                  className="w-[90px] h-[90px] rounded-[14px] shadow-2xl cursor-pointer"
                  style={{
                    background: m.bg,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                    animation: `float ${3.5 + (i % 4) * 0.5}s ease-in-out ${i * 0.15}s infinite`,
                    ['--rot' as any]: `${m.rot}deg`,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>

      </section>

      {/* ━━━━━━━━━━ STATS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 25000, suffix: '+', label: 'Happy customers' },
            { value: 150000, suffix: '+', label: 'Magnets printed' },
            { value: 3, suffix: '', label: 'Countries shipping' },
            { value: 98, suffix: '%', label: 'Five-star reviews' },
          ].map(({ value, suffix, label }) => (
            <motion.div key={label} {...fadeIn(0.1)}>
              <div className="text-3xl md:text-4xl font-heading font-bold text-gradient-gold mb-1">
                <AnimatedCounter to={value} suffix={suffix} />
              </div>
              <div className="text-sm text-text-secondary font-medium">{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━ PRODUCT SHOWCASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="showcase"
        className="relative py-28 px-4 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0C1A0C 0%, #142414 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(74,124,63,0.08) 0%, transparent 60%)' }} />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <motion.div {...fadeUp(0)}>
              <p className="text-coral text-sm font-medium uppercase tracking-widest mb-4">Your memories, beautifully displayed</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                Printed to a{' '}
                <span className="text-gradient-gold">professional</span>{' '}
                standard
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Every magnet is printed at a minimum of 300 DPI on premium gloss material. Our automated quality checker rejects blurry photos before printing — so what you see is what you get.
              </p>
              <ul className="flex flex-col gap-3 mb-8">
                {[
                  'Automatic image quality check',
                  'Professional 300 DPI printing',
                  'Premium gloss finish',
                  'Strong magnetic backing',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-white/70">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(74,124,63,0.2)', border: '1px solid rgba(74,124,63,0.4)' }}>
                      <svg className="w-3 h-3 text-coral" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/start"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #4A7C3F, #6AAD5A)' }}
              >
                Try it free →
              </Link>
            </motion.div>

            {/* Animated product "scene" — magnets on a dark surface */}
            <motion.div
              {...fadeIn(0.2)}
              className="relative rounded-3xl overflow-hidden h-65 sm:h-90 lg:h-120"
              style={{
                background: 'linear-gradient(135deg, #142414 0%, #0C1A0C 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Surface grid texture */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

              {/* Animated magnets appearing on surface */}
              {SCENE_MAGNETS.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0, rotate: 0 }}
                  whileInView={{ scale: 1, opacity: 1, rotate: m.rot }}
                  viewport={{ once: true }}
                  transition={{ delay: m.delay, type: 'spring', damping: 10, stiffness: 180 }}
                  whileHover={{ scale: 1.12, rotate: 0, zIndex: 10 }}
                  className="absolute w-[100px] h-[100px] rounded-[14px] cursor-pointer"
                  style={{
                    top: m.top, left: m.left,
                    background: m.bg,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4)',
                  }}
                />
              ))}

              {/* Label */}
              <div className="absolute bottom-4 right-4 glass rounded-xl px-4 py-2 text-sm text-white/70">
                50mm × 50mm
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <p className="text-coral text-sm font-medium uppercase tracking-widest mb-3">Effortlessly simple</p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-4">Order in under 3 minutes</h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              Simple enough for a 10-year-old, beautiful enough for an 80-year-old.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', icon: '📤', title: 'Upload your photo', desc: "Choose any photo from your phone, tablet or computer. We instantly check it's high enough quality for a crisp, professional print.", color: '#FDE68A' },
              { n: '02', icon: '✨', title: 'Design your magnet', desc: 'Pick from 45+ seasonal template frames, add a personal text message, and reposition your photo using our easy drag-and-drop canvas.', color: '#F9A8D4' },
              { n: '03', icon: '📬', title: 'Delivered to your door', desc: 'Order before 2pm for next-day dispatch. Every order arrives beautifully gift-boxed and ready to give as a present.', color: '#A5F3FC' },
            ].map(({ n, icon, title, desc, color }, i) => (
              <motion.div key={n} {...fadeUp(i * 0.12)}>
                <div
                  className="relative rounded-3xl p-8 h-full border border-border hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
                  style={{ '--card-color': color } as any}
                >
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${color}18, transparent)` }} />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <span
                        className="text-4xl"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                          animation: `floatSlow ${4 + i}s ease-in-out ${i * 0.4}s infinite`,
                        }}
                      >{icon}</span>
                      <span className="text-6xl font-heading font-bold opacity-[0.07] text-navy leading-none">{n}</span>
                    </div>
                    <h3 className="font-heading font-bold text-navy text-2xl mb-3">{title}</h3>
                    <p className="text-text-secondary leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.3)} className="text-center mt-12">
            <Link
              href="/start"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:-translate-y-0.5 shadow-xl shadow-coral/25"
              style={{ background: 'linear-gradient(135deg, #4A7C3F, #6AAD5A)' }}
            >
              Start creating — it's free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━ PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-28 px-4"
        style={{ background: 'linear-gradient(160deg, #162816, #0C1A0C)' }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <p className="text-coral text-sm font-medium uppercase tracking-widest mb-3">The more you order</p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#fff] mb-4">The more you save</h2>
            <p className="text-white/50 text-lg max-w-md mx-auto">
              Bulk discounts applied automatically at checkout — perfect for events, gifts and businesses.
            </p>
          </motion.div>

          <div className={`grid gap-4 ${
            magnetSizes.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
            magnetSizes.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' :
            'grid-cols-2 md:grid-cols-3'
          }`}>
            {magnetSizes.map((size, i) => {
              const discountedPrice = size.pricePerMagnet * (1 - size.bulkDiscountPct / 100);
              const hasBulk = size.bulkDiscountPct > 0;
              return (
                <motion.div key={size.id} {...fadeUp(i * 0.08)}>
                  <div className="relative rounded-3xl p-6 text-center border border-white/10 bg-white/5 transition-all hover:-translate-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-white/40">
                      {size.label}
                    </div>
                    <div className="text-3xl font-heading font-bold text-white mb-1">
                      £{size.pricePerMagnet.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/40 mb-3">per magnet</div>
                    {hasBulk && (
                      <div className="rounded-xl bg-[#C4985A]/10 border border-[#C4985A]/25 px-3 py-2 mt-2">
                        <div className="text-[10px] text-white/40 mb-0.5">10+ magnets</div>
                        <div className="text-lg font-heading font-bold text-coral">
                          £{discountedPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-coral/70">save {size.bulkDiscountPct}%</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {magnetSizes.length === 0 && (
              [
                { qty: '1–9',   price: '£2.99', label: 'Standard'    },
                { qty: '10+',   price: '£2.54', label: 'Bulk saving'  },
              ].map(({ qty, price, label }, i) => (
                <motion.div key={qty} {...fadeUp(i * 0.08)}>
                  <div className="relative rounded-3xl p-6 text-center border border-white/10 bg-white/5 transition-all hover:-translate-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-white/40">{qty} magnets</div>
                    <div className="text-3xl font-heading font-bold text-white mb-1">{price}</div>
                    <div className="text-xs text-white/40 mb-3">per magnet</div>
                    <div className="text-xs font-semibold text-white/50">{label}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 px-4" style={{ background: '#FAF8F5' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            {...fadeUp()}
            className="relative rounded-[2rem] overflow-hidden p-12 md:p-20"
            style={{ background: 'linear-gradient(135deg, #162816 0%, #0C1A0C 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(74,124,63,0.12), transparent 60%)' }} />

            <div className="relative">
              <div className="flex justify-center gap-2 mb-6">
                {['🎂','❤️','🎄','🐾','💍','🎓'].map((e, i) => (
                  <motion.span
                    key={e}
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 + 0.2, type: 'spring', damping: 12 }}
                    className="text-2xl"
                    style={{ animation: `floatSlow ${4 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` }}
                  >
                    {e}
                  </motion.span>
                ))}
              </div>

              <p className="text-coral text-sm font-medium uppercase tracking-widest mb-4">Ready to create something beautiful?</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                Your memories deserve
                <span className="block text-gradient-gold">to be on display</span>
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">
                No account needed. Free to design. Pay only when you love it.
              </p>

              <Link
                href="/start"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-white text-xl transition-all hover:-translate-y-1 shadow-2xl shadow-[#C4985A]/30"
                style={{ background: 'linear-gradient(135deg, #4A7C3F 0%, #6AAD5A 100%)' }}
              >
                Create your magnets
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>

              <p className="mt-6 text-white/25 text-sm">Delivered to UK, Isle of Man & Republic of Ireland</p>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
