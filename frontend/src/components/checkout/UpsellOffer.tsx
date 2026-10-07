'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { calcCartTotals, DEFAULT_UPSELL_DISCOUNT_PCT, formatPrice, type LayoutDiscountMap } from '@/lib/pricing';

const EASE = [0.22, 1, 0.36, 1] as const;

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 21s-7.5-4.7-10-9.3C.3 8.4 2 4.8 5.6 4.3c2-.3 3.9.7 4.9 2.3 1-1.6 2.9-2.6 4.9-2.3 3.6.5 5.3 4.1 3.6 7.4C19.5 16.3 12 21 12 21z" />
  </svg>
);

interface UpsellOfferProps {
  layoutDiscounts?: LayoutDiscountMap;
  /** Admin-configurable, from magnet_print_config key upsell_discount_pct */
  upsellDiscountPct?: number;
}

export default function UpsellOffer({ layoutDiscounts, upsellDiscountPct = DEFAULT_UPSELL_DISCOUNT_PCT }: UpsellOfferProps) {
  const { items, hasUpsellSet, duplicateSet, removeUpsellSet } = useCart();
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);

  const originals = items.filter(i => !i.isUpsellSet);
  if (originals.length === 0) return null;
  if (!hasUpsellSet && dismissed) return null;

  const duplicatePreview = originals.map(i => ({ ...i, isUpsellSet: true as const }));
  const { subtotal: upsellPrice } = calcCartTotals(duplicatePreview, layoutDiscounts, upsellDiscountPct);

  return (
    <AnimatePresence initial={false} mode="wait">
      {hasUpsellSet ? (
        <motion.div
          key="accepted"
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3.5"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <HeartIcon className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-navy leading-snug">
              <span className="font-semibold">Second set added</span>
              <span className="text-text-secondary"> — a gift, ready to go</span>
            </p>
          </div>
          <button
            type="button"
            onClick={removeUpsellSet}
            className="shrink-0 min-h-[44px] px-2 text-xs text-text-secondary underline hover:text-navy cursor-pointer"
          >
            Remove
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="offer"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mb-5 rounded-2xl border border-[#F0DCC8] bg-gradient-to-br from-[#FBF3EA] to-[#F7F6F2] px-5 py-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <HeartIcon className="w-5 h-5 text-[#D4654A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-body text-lg font-semibold text-navy leading-snug">Double your memories.</h3>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                They’ll love these just as much as you do. Add a second set for someone special.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-white/70 px-4 py-3 text-sm text-navy leading-relaxed">
            Add an identical second set for just{' '}
            <span className="font-semibold text-brand">{formatPrice(upsellPrice)}</span>
            {' '}— save {upsellDiscountPct}%.
          </div>
          <p className="mt-2 text-xs text-text-secondary">No need to upload again.</p>

          <div className="mt-4 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={duplicateSet}
              className="w-full min-h-[44px] py-3.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark active:scale-[0.98] transition-all cursor-pointer"
            >
              Yes — Add a second set
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-full min-h-[44px] text-sm text-text-secondary hover:text-navy transition-colors cursor-pointer"
            >
              No thanks
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
