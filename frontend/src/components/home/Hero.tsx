'use client';

import { useRef, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { SCENES } from './scenes';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Word-by-word headline reveal ─────────────────────────────────────────────
function RevealHeadline({ text, className }: { text: string; className: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em] mr-[0.24em]">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 + i * 0.07, ease: EASE }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

// ── A single physical magnet ─────────────────────────────────────────────────
const magnetFace = (src: string): CSSProperties => ({
  backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 40%), url("${src}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

// Mouse/trackpad users get drag + parallax; touch keeps normal page scrolling
const FINE = '(pointer: fine)';
function useFinePointer() {
  return useSyncExternalStore(
    cb => { const mq = window.matchMedia(FINE); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia(FINE).matches,
    () => false,
  );
}

interface PlacedProps {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  style: CSSProperties;
  rotate: number;
  delay: number;
  constraints: React.RefObject<HTMLDivElement | null>;
  draggable: boolean;
  children: React.ReactNode;
  className?: string;
}

// Positioned on the door; drifts with the cursor (parallax by depth), drops in
// with a spring, and — on desktop — can be picked up and moved like the real thing.
function Placed({ mx, my, depth, style, rotate, delay, constraints, draggable, children, className = '' }: PlacedProps) {
  const reduce = useReducedMotion();
  const px = useTransform(mx, v => v * depth);
  const py = useTransform(my, v => v * depth);
  return (
    <motion.div className={`absolute ${className}`} style={{ ...style, x: px, y: py }}>
      <motion.div
        initial={reduce ? false : { y: -70, opacity: 0, rotate: rotate - 10, scale: 1.08 }}
        animate={{ y: 0, opacity: 1, rotate, scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 140, delay }}
        drag={draggable}
        dragConstraints={constraints}
        dragElastic={0.12}
        dragMomentum={false}
        whileDrag={{ scale: 1.07, rotate: 0, zIndex: 20, cursor: 'grabbing' }}
        whileHover={draggable ? { scale: 1.03 } : undefined}
        className={draggable ? 'cursor-grab' : ''}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// Scatter offsets for the 3×3 pieces (fixed, so server and client render alike)
const SCATTER = [
  [-90, -70, -18], [10, -110, 12], [110, -60, 20],
  [-120, 10, 14], [0, 0, -6], [130, 30, -16],
  [-80, 110, 10], [20, 130, -14], [100, 100, 18],
];

function AssemblingSet({ src, delay }: { src: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-3 gap-[3px] w-full aspect-square">
      {SCATTER.map(([x, y, r], i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <motion.div
            key={i}
            initial={reduce ? false : { x, y, rotate: r, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 120, delay: delay + i * 0.06 }}
            className="rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,.22),0_8px_16px_-6px_rgba(0,0,0,.35)]"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 45%), url("${src}")`,
              backgroundSize: '100% 100%, 300% 300%',
              backgroundPosition: `0 0, ${col * 50}% ${row * 50}%`,
            }}
          />
        );
      })}
    </div>
  );
}

function HeroFridge() {
  const doorRef = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 18 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    if (!fine || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mxRaw.set(((e.clientX - r.left) / r.width - 0.5) * 24);
    myRaw.set(((e.clientY - r.top) / r.height - 0.5) * 24);
  };
  const onLeave = () => { mxRaw.set(0); myRaw.set(0); };

  const single = 'w-full aspect-square rounded-[2px] shadow-[0_2px_3px_rgba(0,0,0,.2),0_14px_24px_-8px_rgba(0,0,0,.4)]';

  return (
    <div className="relative w-full max-w-[460px] mx-auto" onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* Soft glow behind the door */}
      <div className="absolute -inset-12 bg-[radial-gradient(closest-side,rgba(0,110,113,.4),transparent)] pointer-events-none" />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative"
      >
        <div
          ref={doorRef}
          className="relative aspect-[4/5] rounded-[22px] overflow-hidden bg-[linear-gradient(160deg,#FDFCF9_0%,#F1EEE7_55%,#E6E2D9_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.9),inset_0_-30px_60px_-30px_rgba(0,0,0,.12),0_40px_80px_-30px_rgba(0,0,0,.55)]"
        >
          {/* Freezer seam + handles */}
          <div className="absolute inset-x-0 top-[27%] h-px bg-black/10 shadow-[0_1px_0_rgba(255,255,255,.8)]" />
          <div className="absolute left-[5%] top-[8%] h-[13%] w-[2.2%] rounded-full bg-[linear-gradient(90deg,#CFCAC0,#F4F1EA,#BDB8AE)] shadow-[0_2px_4px_rgba(0,0,0,.18)]" />
          <div className="absolute left-[5%] top-[34%] h-[30%] w-[2.2%] rounded-full bg-[linear-gradient(90deg,#CFCAC0,#F4F1EA,#BDB8AE)] shadow-[0_2px_4px_rgba(0,0,0,.18)]" />
          {/* Vertical sheen */}
          <div className="absolute inset-y-0 left-[50%] w-[28%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)] pointer-events-none" />

          {/* Magnets */}
          <Placed mx={mx} my={my} depth={0.6} rotate={-4} delay={1.25} constraints={doorRef} draggable={fine}
            style={{ left: '17%', top: '7%', width: '19%' }}>
            <div className={single} style={magnetFace(SCENES.duck)} />
          </Placed>
          <Placed mx={mx} my={my} depth={1} rotate={5} delay={1.4} constraints={doorRef} draggable={fine}
            style={{ left: '62%', top: '5%', width: '22%' }}>
            <div className={single} style={magnetFace(SCENES.shipside)} />
          </Placed>

          <Placed mx={mx} my={my} depth={0.35} rotate={0} delay={0.35} constraints={doorRef} draggable={fine}
            style={{ left: '22%', top: '33%', width: '52%' }}>
            <AssemblingSet src={SCENES.village} delay={0.45} />
          </Placed>

          <Placed mx={mx} my={my} depth={1.2} rotate={-7} delay={1.55} constraints={doorRef} draggable={fine}
            style={{ left: '10%', top: '67%', width: '20%' }}>
            <div className={single} style={magnetFace(SCENES.selfie)} />
          </Placed>
          <Placed mx={mx} my={my} depth={0.8} rotate={3} delay={1.7} constraints={doorRef} draggable={fine}
            style={{ left: '42%', top: '69%', width: '17%' }}>
            <div className={single} style={magnetFace(SCENES.pool)} />
          </Placed>
          <Placed mx={mx} my={my} depth={1.4} rotate={8} delay={1.85} constraints={doorRef} draggable={fine}
            style={{ left: '71%', top: '64%', width: '21%' }}>
            <div className={single} style={magnetFace(SCENES.walk)} />
          </Placed>
        </div>
      </motion.div>

      {fine && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          className="hidden lg:block text-center text-white/55 text-sm mt-5 font-heading italic"
        >
          Go on — drag the magnets around
        </motion.p>
      )}
    </div>
  );
}

// ── Hero section ─────────────────────────────────────────────────────────────
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const fridgeY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);

  const fadeUp = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#22332A] text-white">
      {/* Atmosphere: soft light + fine grain */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(80%_60%_at_85%_30%,rgba(0,110,113,.35),transparent_60%),radial-gradient(60%_50%_at_0%_100%,rgba(205,171,160,.14),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-10 pb-16 sm:pt-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-x-14 gap-y-14 lg:gap-y-10 items-center lg:min-h-[calc(100svh-72px)]">
        {/* A: logo + headline */}
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <motion.div {...fadeUp(0)} className="flex items-center justify-center lg:justify-start gap-3 mb-7">
            <Image src="/logo-teal.png" alt="Kustom Kreations" width={112} height={112} priority className="w-24 h-24 sm:w-28 sm:h-28 lg:w-16 lg:h-16 brightness-0 invert" />
            <span className="hidden lg:inline font-heading text-3xl leading-none" aria-hidden="true">kustom kreations</span>
          </motion.div>
          <RevealHeadline
            text="Bring Your Favourite Memories to Life"
            className="text-center lg:text-left font-heading font-bold text-[#FBF7F0] text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.4rem] xl:text-[5rem] tracking-[-0.015em]"
          />
        </div>

        {/* Fridge — between headline and copy on phones, right column on desktop */}
        <motion.div style={{ y: fridgeY }} className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <HeroFridge />
        </motion.div>

        {/* B: copy + CTA */}
        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <motion.p {...fadeUp(0.55)} className="text-white/75 text-base sm:text-lg leading-relaxed max-w-xl mb-4">
            Give your kitchen a personal touch with beautiful photo magnets made from the moments you love most. Whether it&rsquo;s a favourite family photo, a special celebration, a memorable holiday or your four-legged friend&rsquo;s funniest face, turn those precious memories into something you can see every day.
          </motion.p>
          <motion.p {...fadeUp(0.65)} className="text-white/75 text-base sm:text-lg leading-relaxed max-w-xl mb-9">
            Perfect for your own fridge or as a thoughtful gift, personalised photo magnets are a lovely way to keep special moments close. Forget the usual holiday souvenir, create a unique keepsake from a photo that means something to you and enjoy that memory every time you walk into the kitchen.
          </motion.p>
          <motion.div {...fadeUp(0.75)} className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link
              href="/start"
              className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-lg font-semibold text-brand bg-white hover:bg-brand-light transition-colors"
            >
              Start creating now
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center h-14 px-6 rounded-lg text-white/85 hover:text-white border border-white/20 hover:border-white/45 transition-colors">
              See how it works
            </a>
          </motion.div>
          <motion.p {...fadeUp(0.85)} className="mt-6 text-sm text-white/50">
            50mm photo magnets · Delivered to the UK &amp; Isle of Man
          </motion.p>
        </div>
      </div>
    </section>
  );
}
