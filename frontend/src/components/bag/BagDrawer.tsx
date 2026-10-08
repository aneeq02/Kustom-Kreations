'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import MagnetPreview from '@/components/studio/MagnetPreview';
import dynamic from 'next/dynamic';

// PayPal's SDK wrapper only downloads once someone actually reaches checkout
const CheckoutPanel = dynamic(() => import('@/components/checkout/CheckoutPanel'), {
  ssr: false,
  loading: () => <p className="text-sm text-text-secondary py-10 text-center">Loading checkout…</p>,
});
import { api } from '@/lib/api';
import {
  applyMinimumTotal, buildLayoutGroupQty, calcCartTotals, calcItemTotal, DEFAULT_UPSELL_DISCOUNT_PCT,
  formatPrice, getItemBulkDiscountPct, type LayoutDiscountMap,
} from '@/lib/pricing';
import { buildLayoutDiscountMap, fetchMagnetConfig, type ApiTileLayout } from '@/lib/tiledProducts';
import { itemGrid, itemNeedsReplace, itemSizeMm, magnetsInItem } from '@/lib/studio';
import type { DiscountValidation, VoucherValidation } from '@/types';

type View = 'bag' | 'checkout';

export default function BagDrawer() {
  const router = useRouter();
  const { items, bagOpen, closeBag: hideBag, removeItem, updateQuantity, uploadingIds } = useCart();
  const [view, setView] = useState<View>('bag');
  const closeBag = useCallback(() => { setView('bag'); hideBag(); }, [hideBag]);
  const [layouts, setLayouts] = useState<ApiTileLayout[]>([]);
  const [layoutDiscounts, setLayoutDiscounts] = useState<LayoutDiscountMap | undefined>(undefined);
  const [upsellDiscountPct, setUpsellDiscountPct] = useState(DEFAULT_UPSELL_DISCOUNT_PCT);

  const [codesOpen, setCodesOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountValidation | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
  const [codeBusy, setCodeBusy] = useState<'promo' | 'voucher' | null>(null);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (!bagOpen || layouts.length) return;
    fetchMagnetConfig()
      .then(cfg => {
        setLayouts(cfg.layouts);
        setLayoutDiscounts(buildLayoutDiscountMap(cfg.layouts));
        setUpsellDiscountPct(cfg.printConfig.upsellDiscountPct);
      })
      .catch(() => {});
  }, [bagOpen, layouts.length]);

  useEffect(() => {
    if (!bagOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBag(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bagOpen, closeBag]);

  const { subtotal } = calcCartTotals(items, layoutDiscounts, upsellDiscountPct);
  const groupQty = buildLayoutGroupQty(items);
  const rawDiscount = appliedDiscount ? parseFloat(appliedDiscount.discountAmount) : 0;
  const freeDelivery = !!appliedDiscount?.isFreeShipping;
  const rawVoucher = appliedVoucher ? Math.min(parseFloat(appliedVoucher.balance), Math.max(0, subtotal - rawDiscount)) : 0;
  // Codes come off the basket TOTAL (never per item), and never below the £1
  // PayPal minimum. Delivery is added (or waived) at checkout.
  const priced = applyMinimumTotal(subtotal, 0, rawDiscount, rawVoucher);
  const discountAmt = priced.discount;
  const voucherAmt = priced.voucher;
  const discountedTotal = priced.amount;
  const hasSavings = discountAmt > 0 || voucherAmt > 0;

  // A promo's £ value depends on the basket (e.g. 10% of it) — re-check it
  // whenever the basket total changes so the shown saving stays accurate.
  const promoCodeApplied = appliedDiscount?.code;
  useEffect(() => {
    if (!promoCodeApplied || !(subtotal > 0)) return;
    let cancelled = false;
    api.post<DiscountValidation>('/discounts/validate', { code: promoCodeApplied, subtotal, currency: 'GBP' })
      .then(res => { if (!cancelled) setAppliedDiscount(res); })
      .catch(() => { if (!cancelled) { setAppliedDiscount(null); setCodeError(`${promoCodeApplied} no longer applies to this basket`); } });
    return () => { cancelled = true; };
  }, [promoCodeApplied, subtotal]);
  const magnetCount = items.reduce((s, i) => s + i.quantity * magnetsInItem(i), 0);

  // Bulk-discount progress: the layout in the bag closest to unlocking its discount
  const progress = (() => {
    let best: { layout: ApiTileLayout; have: number; need: number } | null = null;
    let unlocked: ApiTileLayout | null = null;
    for (const [slug, have] of groupQty) {
      const l = layouts.find(x => x.slug === slug);
      if (!l?.bulkDiscountQty || !l.bulkDiscountPct) continue;
      if (have >= l.bulkDiscountQty) { unlocked = l; continue; }
      const need = l.bulkDiscountQty - have;
      if (!best || need < best.need) best = { layout: l, have, need };
    }
    return { best, unlocked };
  })();

  const anyUploading = items.some(i => uploadingIds.has(i.id));
  const anyBroken = items.some(i => !uploadingIds.has(i.id) && (!i.imageKey || i.imageKey === 'pending'));
  const anyBlocked = items.some(i => i.imageQuality === 'blocked');
  const canCheckout = items.length > 0 && !anyUploading && !anyBroken && !anyBlocked;

  const applyPromo = async () => {
    setCodeBusy('promo'); setCodeError('');
    try {
      setAppliedDiscount(await api.post<DiscountValidation>('/discounts/validate', { code: promoCode, subtotal, currency: 'GBP' }));
      setPromoCode('');
    } catch (e: unknown) {
      setCodeError(e instanceof Error ? e.message : 'Code not valid');
    } finally { setCodeBusy(null); }
  };

  const applyVoucher = async () => {
    setCodeBusy('voucher'); setCodeError('');
    try {
      setAppliedVoucher(await api.post<VoucherValidation>('/vouchers/validate', { code: voucherCode, currency: 'GBP' }));
      setVoucherCode('');
    } catch (e: unknown) {
      setCodeError(e instanceof Error ? e.message : 'Voucher not valid');
    } finally { setCodeBusy(null); }
  };

  const goCheckout = () => {
    sessionStorage.setItem('kk_checkout_meta', JSON.stringify({
      discountCodeId: appliedDiscount?.id ?? null,
      voucherId: appliedVoucher?.id ?? null,
      discountCode: appliedDiscount?.code ?? null,
      discountAmount: rawDiscount,
      voucherAmount: rawVoucher,
      isFreeShipping: freeDelivery,
      subtotal,
    }));
    setView('checkout');
  };

  const editItem = (id: string) => {
    closeBag();
    router.push(`/configure?edit=${id}`);
  };

  const layoutName = (slug: string) => {
    const l = layouts.find(x => x.slug === slug);
    return l && l.rows * l.cols > 1 ? `${l.label} sets` : 'single magnets';
  };

  return (
    <AnimatePresence>
      {bagOpen && (
        <>
          <motion.div
            key="bag-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeBag}
            className="fixed inset-0 z-50 bg-navy/40"
          />
          <motion.aside
            key="bag-panel"
            role="dialog"
            aria-modal="true"
            aria-label={view === 'bag' ? 'Your basket' : 'Checkout'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-[420px] bg-white shadow-2xl flex flex-col"
          >
            <button
              onClick={closeBag}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-ivory/70 hover:bg-ivory z-10 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {view === 'checkout' ? (
              <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8">
                <CheckoutPanel onBack={() => setView('bag')} onComplete={closeBag} />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <h2 className="font-body text-lg font-semibold text-navy pr-10">
                    My Basket
                    {items.length > 0 && (
                      <>
                        {' · '}
                        {hasSavings && <span className="text-text-secondary font-normal line-through mr-1.5">{formatPrice(subtotal)}</span>}
                        <span className={hasSavings ? 'text-brand' : ''}>{formatPrice(discountedTotal)}</span>
                      </>
                    )}
                  </h2>

                  {items.length > 0 && (progress.best || progress.unlocked) && (
                    <div className="mt-3">
                      <p className="text-sm text-navy">
                        {progress.best
                          ? <>Add {progress.best.need} more {layoutName(progress.best.layout.slug)} to get <strong>{progress.best.layout.bulkDiscountPct}% off</strong> them</>
                          : <>Bulk discount unlocked — <strong>{progress.unlocked!.bulkDiscountPct}% off</strong> your {layoutName(progress.unlocked!.slug)}</>}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-ivory overflow-hidden">
                          <motion.div
                            className="h-full bg-brand rounded-full"
                            initial={false}
                            animate={{ width: `${progress.best ? (progress.best.have / progress.best.layout.bulkDiscountQty!) * 100 : 100}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-navy bg-ivory rounded-full px-2 py-0.5">
                          {(progress.best?.layout ?? progress.unlocked)!.bulkDiscountPct}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16">
                      <MagnetPreview thumbUrl={null} rows={2} cols={2} size={72} className="opacity-60 mb-5" />
                      <p className="text-navy font-medium mb-1">Your basket is empty</p>
                      <p className="text-sm text-text-secondary mb-6">Turn a favourite photo into magnets.</p>
                      <button
                        onClick={() => { closeBag(); router.push('/configure'); }}
                        className="px-6 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors cursor-pointer"
                      >
                        Start creating
                      </button>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {items.map(item => {
                        const { rows, cols } = itemGrid(item);
                        const uploading = uploadingIds.has(item.id);
                        const pct = layoutDiscounts ? getItemBulkDiscountPct(item, groupQty, layoutDiscounts) : 0;
                        const line = calcItemTotal(item.unitPrice, item.quantity, pct, item.isUpsellSet, upsellDiscountPct);
                        const hasLineDiscount = pct > 0 || item.isUpsellSet;
                        const needsReplace = itemNeedsReplace(item, uploading);
                        return (
                          <li key={item.id} className="py-4 first:pt-1">
                            <div className="flex gap-4">
                              <button onClick={() => editItem(item.id)} className="shrink-0 cursor-pointer" aria-label="Edit">
                                <MagnetPreview thumbUrl={item.thumbUrl} rows={rows} cols={cols} size={64} uploading={uploading} />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[15px] text-navy leading-snug">
                                    {rows * cols > 1 ? `${rows}×${cols} Magnet Set` : 'Photo Magnet'}, {itemSizeMm(item)}mm
                                    {item.isUpsellSet && (
                                      <span className="ml-1.5 inline-block rounded-full bg-brand/10 text-brand text-[11px] font-semibold px-1.5 py-0.5 align-middle">
                                        Gift set
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      aria-label="Decrease quantity"
                                      className="w-6 h-6 flex items-center justify-center text-navy disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
                                    >−</button>
                                    <span className="text-sm w-4 text-center tabular-nums">{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      aria-label="Increase quantity"
                                      className="w-6 h-6 flex items-center justify-center text-navy cursor-pointer"
                                    >+</button>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-sm">
                                  <button onClick={() => editItem(item.id)} className="underline text-navy cursor-pointer">Edit</button>
                                  <span className="text-border">|</span>
                                  {hasLineDiscount && <span className="text-text-secondary line-through">{formatPrice(item.unitPrice * item.quantity)}</span>}
                                  <span className="text-navy">{formatPrice(line)}</span>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="ml-auto text-xs text-text-secondary hover:text-red-600 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                            {uploading && (
                              <p className="mt-2 text-xs text-text-secondary">Uploading photo…</p>
                            )}
                            {needsReplace && (
                              <div
                                role="alert"
                                className="mt-2.5 flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-sm font-medium bg-red-50 border-red-300 text-red-800"
                              >
                                <svg
                                  className="w-5 h-5 shrink-0 text-red-600"
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12 3.5 21.5 20.5 2.5 20.5Z" />
                                  <path d="M12 9.5v4.25" />
                                  <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
                                </svg>
                                <span className="flex-1">
                                  {!item.imageKey || item.imageKey === 'pending'
                                    ? 'Photo upload didn’t finish.'
                                    : item.imageQuality === 'blocked'
                                      ? 'Resolution too low for this size.'
                                      : 'Low resolution photo.'}{' '}
                                  <button onClick={() => editItem(item.id)} className="underline font-semibold cursor-pointer">Replace</button>
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Promo / voucher */}
                  {items.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      {(appliedDiscount || appliedVoucher) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {appliedDiscount && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-ivory text-navy px-2 py-1 rounded-[3px]">
                              {appliedDiscount.code} · {freeDelivery ? 'Free delivery' : `−${formatPrice(discountAmt)}`}
                              <button onClick={() => setAppliedDiscount(null)} aria-label="Remove promo code" className="text-text-secondary hover:text-navy cursor-pointer">✕</button>
                            </span>
                          )}
                          {appliedVoucher && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-ivory text-navy px-2 py-1 rounded-[3px]">
                              Voucher {appliedVoucher.code} · −{formatPrice(voucherAmt)}
                              <button onClick={() => setAppliedVoucher(null)} aria-label="Remove voucher" className="text-text-secondary hover:text-navy cursor-pointer">✕</button>
                            </span>
                          )}
                        </div>
                      )}
                      {!codesOpen ? (
                        <button onClick={() => setCodesOpen(true)} className="text-sm text-navy underline cursor-pointer">
                          Add promo code or gift voucher
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {!appliedDiscount && (
                            <div className="flex gap-2">
                              <input
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                placeholder="Promo code"
                                aria-label="Promo code"
                                className="flex-1 min-w-0 px-3 py-2 border border-border rounded-[2px] text-sm focus:border-brand focus:outline-none"
                              />
                              <button
                                onClick={applyPromo}
                                disabled={!promoCode || codeBusy !== null}
                                className="px-4 py-2 text-sm font-medium border border-navy/20 rounded-[2px] hover:border-navy/50 disabled:opacity-40 cursor-pointer"
                              >
                                {codeBusy === 'promo' ? '…' : 'Apply'}
                              </button>
                            </div>
                          )}
                          {!appliedVoucher && (
                            <div className="flex gap-2">
                              <input
                                value={voucherCode}
                                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                                placeholder="Gift voucher"
                                aria-label="Gift voucher code"
                                className="flex-1 min-w-0 px-3 py-2 border border-border rounded-[2px] text-sm focus:border-brand focus:outline-none"
                              />
                              <button
                                onClick={applyVoucher}
                                disabled={!voucherCode || codeBusy !== null}
                                className="px-4 py-2 text-sm font-medium border border-navy/20 rounded-[2px] hover:border-navy/50 disabled:opacity-40 cursor-pointer"
                              >
                                {codeBusy === 'voucher' ? '…' : 'Apply'}
                              </button>
                            </div>
                          )}
                          {codeError && <p className="text-xs text-red-600">{codeError}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                  <div className="px-6 pt-4 pb-6 border-t border-border">
                    <dl className="flex flex-col gap-1.5 text-sm mb-4">
                      <div className="flex justify-between text-navy/80">
                        <dt>Subtotal ({magnetCount} magnet{magnetCount !== 1 ? 's' : ''})</dt>
                        <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                      </div>
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-brand">
                          <dt>Promo {appliedDiscount?.code}</dt>
                          <dd className="tabular-nums">−{formatPrice(discountAmt)}</dd>
                        </div>
                      )}
                      {voucherAmt > 0 && (
                        <div className="flex justify-between text-brand">
                          <dt>Gift voucher</dt>
                          <dd className="tabular-nums">−{formatPrice(voucherAmt)}</dd>
                        </div>
                      )}
                      {freeDelivery && (
                        <div className="flex justify-between text-brand">
                          <dt>Delivery ({appliedDiscount?.code})</dt>
                          <dd>Free</dd>
                        </div>
                      )}
                      <div className="flex justify-between text-navy font-semibold text-base pt-1.5 border-t border-border/70">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{formatPrice(discountedTotal)}</dd>
                      </div>
                      {priced.adjusted && (
                        <p className="text-xs text-text-secondary">Orders have a £1.00 minimum, so the discount is capped here.</p>
                      )}
                      {!freeDelivery && <p className="text-xs text-text-secondary">Delivery calculated at checkout</p>}
                    </dl>
                    <button
                      onClick={goCheckout}
                      disabled={!canCheckout}
                      className="w-full py-3.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Checkout
                    </button>
                    {!canCheckout && (
                      <p className="text-xs text-text-secondary text-center mt-2">
                        {anyUploading ? 'Waiting for photos to finish uploading…' : 'Replace the flagged photos to continue'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
