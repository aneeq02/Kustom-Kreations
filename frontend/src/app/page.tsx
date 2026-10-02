'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';

// Below-the-fold sections ship as separate chunks so the hero becomes
// interactive sooner (still server-rendered, so their text stays crawlable)
const CoveredSection = dynamic(() => import('@/components/home/CoveredSection'));
const JigsawSection = dynamic(() => import('@/components/home/JigsawSection'));
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'));
const FinalCta = dynamic(() => import('@/components/home/FinalCta'));
const PhotoCarousel = dynamic(() => import('@/components/ui/PhotoCarousel'));

// TODO(client): add real photos of the magnets here — on a fridge, held in a
// hand, a close-up of the print quality — and a "See them for real" carousel
// section appears on the homepage. Drop the files in /public and list them, e.g.:
// { src: '/showcase-1.jpg', alt: 'Photo magnets on a fridge' },
const SHOWCASE_PHOTOS: { src: string; alt: string }[] = [];

export default function HomePage() {
  return (
    <div className="flex flex-col overflow-x-clip">
      <Hero />
      <Marquee />
      {/* kk-defer = content-visibility:auto — the browser skips laying out and
          painting these until they approach the viewport */}
      <div className="kk-defer"><CoveredSection /></div>
      <div className="kk-defer"><JigsawSection /></div>
      {/* not deferred: its pinned (sticky) layout needs normal rendering */}
      <HowItWorks />

      {SHOWCASE_PHOTOS.length > 0 && (
        <section className="py-20 sm:py-28 px-5 bg-cream">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading text-[2.6rem] sm:text-6xl text-navy text-center mb-10"
            >
              See them for real
            </motion.h2>
            <PhotoCarousel photos={SHOWCASE_PHOTOS} />
          </div>
        </section>
      )}

      <div className="kk-defer"><FinalCta /></div>
    </div>
  );
}
