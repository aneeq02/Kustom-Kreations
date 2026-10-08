'use client';

import { useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { SCENES } from './scenes';

const STEPS = [
  {
    title: 'Upload your photo',
    body: 'Choose any photo from your phone, tablet or computer. We instantly check it’s high enough quality for a crisp, professional print.',
  },
  {
    title: 'Design your magnet',
    body: 'Crop, zoom and position your photo exactly how you want it — then see it on a fridge before you order.',
  },
  {
    title: 'Delivered to your door',
    body: 'Printed, carefully packed and posted straight to you. Your magnets arrive ready to use, perfect for your fridge, or as a unique little gift.',
  },
];

const face = (src: string) => ({
  backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.25) 0%, rgba(255,255,255,0) 45%), url("${src}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

// ── Step visuals — each loops gently while it's on screen ───────────────────

function UploadVisual() {
  const thumbs = [SCENES.duck, SCENES.selfie, SCENES.shipside, SCENES.sculpture];
  return (
    <div className="relative w-[230px] h-[300px] rounded-[28px] bg-white shadow-[0_30px_60px_-25px_rgba(26,26,24,.35)] border border-border p-4 flex flex-col">
      <div className="w-14 h-1.5 rounded-full bg-border mx-auto mb-4" />
      <div className="grid grid-cols-2 gap-2 flex-1">
        {thumbs.map((src, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 160, delay: 0.15 + i * 0.12, repeat: Infinity, repeatDelay: 3.2 }}
            className="rounded-lg"
            style={face(src)}
          />
        ))}
      </div>
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="mt-3 h-10 rounded-lg bg-brand text-white text-sm font-semibold flex items-center justify-center"
      >
        Upload Photos
      </motion.div>
    </div>
  );
}

function CropVisual() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[230px] h-[230px] rounded-[3px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(26,26,24,.45)]">
        <motion.div
          className="absolute -inset-[25%]"
          style={face(SCENES.selfie)}
          animate={{ scale: [1, 1.18, 1.1, 1], x: [0, -18, 12, 0], y: [0, 10, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* rule-of-thirds guides */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {Array.from({ length: 9 }, (_, i) => <div key={i} className="border border-white/25" />)}
        </div>
      </div>
      <div className="w-[180px]">
        <div className="relative h-1 rounded-full bg-navy/15">
          <motion.span
            className="absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full bg-white border border-navy/30 shadow"
            animate={{ left: ['15%', '65%', '45%', '15%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-center text-sm text-text-secondary mt-3">Drag to adjust crop</p>
      </div>
    </div>
  );
}

function DeliverVisual() {
  const mags = [SCENES.village, SCENES.walk, SCENES.pool];
  return (
    <div className="relative w-[260px] h-[280px]">
      {mags.map((src, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[44%] w-[86px] aspect-square rounded-[2px] shadow-[0_10px_20px_-8px_rgba(0,0,0,.4)]"
          style={{ ...face(src), marginLeft: -43 }}
          initial={{ y: 40, x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: [40, -110 + i * 6, -110 + i * 6], x: [0, (i - 1) * 78, (i - 1) * 78], rotate: [0, (i - 1) * 9, (i - 1) * 9], opacity: [0, 1, 1] }}
          transition={{ duration: 1.3, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatDelay: 2.6 }}
        />
      ))}
      {/* parcel */}
      <svg className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[220px]" viewBox="0 0 220 150" aria-hidden="true">
        <path d="M10 40h200v100a6 6 0 01-6 6H16a6 6 0 01-6-6z" fill="#E8D6C2" />
        <path d="M10 40h200v26H10z" fill="#DCC5AD" />
        <path d="M96 40h28v106H96z" fill="#006E71" opacity=".85" />
        <path d="M0 32l14-22h192l14 22-8 10H8z" fill="#EFE2D2" />
        {/* brand logo, turned white, on the strap */}
        <image href="/logo-teal.png" x="98" y="80" width="24" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
      </svg>
    </div>
  );
}

const VISUALS = [UploadVisual, CropVisual, DeliverVisual];

// Only one layout is ever mounted — the hidden one used to keep its looping
// animations running in the background.
const DESKTOP = '(min-width: 1024px)';
function useIsDesktop() {
  return useSyncExternalStore(
    cb => { const mq = window.matchMedia(DESKTOP); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

// Mounts a looping visual only while it's on screen, so off-screen steps cost nothing
function WhenVisible({ Visual, className }: { Visual: ComponentType; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '120px 0px' });
  return <div ref={ref} className={className}>{inView ? <Visual /> : <div className="h-[300px]" />}</div>;
}

function StepNumber({ n, active }: { n: number; active: boolean }) {
  return (
    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-xl shrink-0 transition-colors duration-300 ${
      active ? 'bg-brand text-white' : 'bg-white border border-border text-navy/50'
    }`}>
      {n}
    </span>
  );
}

const HEADER = (
  <div className="max-w-xl">
    <p className="text-brand text-sm font-medium uppercase tracking-[0.16em] mb-3">Effortlessly simple</p>
    <h2 className="font-heading text-[2.6rem] sm:text-6xl leading-[1.02] text-navy">Order in<br />minutes</h2>
    <p className="text-text-secondary text-lg mt-4">Simple enough for a 10-year-old, beautiful enough for an 80-year-old.</p>
  </div>
);

// Phones & tablets: stacked, each step animates in as you reach it
function StackedSteps() {
  const reduce = useReducedMotion();
  return (
    <div className="px-5 py-20">
      {HEADER}
      <ol className="mt-12 flex flex-col gap-14">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <StepNumber n={i + 1} active />
              <h3 className="font-heading text-3xl text-navy">{s.title}</h3>
            </div>
            <p className="text-text-secondary leading-relaxed mb-8">{s.body}</p>
            <WhenVisible Visual={VISUALS[i]} className="flex justify-center rounded-2xl bg-white/60 border border-border py-10" />
          </motion.li>
        ))}
      </ol>
      <Link id="how-it-works-cta" href="/configure" className="mt-14 flex items-center justify-center h-14 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors">
        Start creating — it’s free
      </Link>
    </div>
  );
}

// Desktop: the visual stays pinned while the steps scroll past
function PinnedStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const stageInView = useInView(ref);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // Re-render only when the step actually changes, not on every scroll frame
  const activeRef = useRef(0);
  useMotionValueEvent(scrollYProgress, 'change', v => {
    const next = Math.min(2, Math.max(0, Math.floor(v * 3)));
    if (next !== activeRef.current) { activeRef.current = next; setActive(next); }
  });
  const Visual = VISUALS[active];

  return (
    <div ref={ref} className="relative h-[300vh]">
      {/* min-h is a floor under the viewport-relative height: on a short window
          h-[calc(100vh-72px)] alone would reserve less space than the header +
          3 steps + CTA actually need, and the overflow would bleed into
          whatever section follows. With the floor, the reserved space always
          covers the real content, so the next section can never start too
          soon — on a short window this section just takes a little more
          scrolling to clear, rather than visually overlapping. */}
      <div className="sticky top-[72px] h-[calc(100vh-72px)] min-h-[620px] max-w-6xl mx-auto px-10 grid grid-cols-2 gap-20 items-center">
        <div>
          {HEADER}
          <ol className="mt-8 flex flex-col gap-1.5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <StepNumber n={i + 1} active={i <= active} />
                  {i < STEPS.length - 1 && (
                    <span className="w-px flex-1 min-h-5 bg-border relative overflow-hidden my-1">
                      {/* scaleY (a transform) instead of animating height */}
                      <motion.span
                        className="absolute inset-0 bg-brand origin-top"
                        initial={false}
                        animate={{ scaleY: i < active ? 1 : 0 }}
                        transition={{ duration: 0.5 }}
                      />
                    </span>
                  )}
                </div>
                <div className={`pb-4 transition-opacity duration-300 ${i === active ? 'opacity-100' : 'opacity-40'}`}>
                  <h3 className="font-heading text-3xl text-navy leading-tight">{s.title}</h3>
                  {/* Only the active step's description is rendered — an inactive one
                      is fully invisible (opacity-0) anyway, so keeping it in the DOM
                      bought no visual benefit, only reserved layout height. With all
                      three always rendered, a longer description (like step 3's) grew
                      the list's total height and bled into whatever follows this
                      section. Rendering just the active one keeps the list's height
                      constant and sized to a single description, not the sum of three. */}
                  {i === active && (
                    <p className="text-text-secondary leading-relaxed mt-1.5 max-w-md">{s.body}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Link id="how-it-works-cta" href="/configure" className="mt-4 inline-flex items-center h-12 px-8 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors">
            Start creating — it’s free
          </Link>
        </div>

        <div className="relative h-[480px] rounded-3xl bg-white border border-border flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(closest-side,#F3ECE3,transparent)]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {stageInView && <Visual />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const isDesktop = useIsDesktop();
  return (
    <section id="how-it-works" className="bg-cream scroll-mt-20">
      {isDesktop ? <PinnedStory /> : <StackedSteps />}
    </section>
  );
}
