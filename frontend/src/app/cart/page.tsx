'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { calcCartTotals, formatPrice, roundToCharmPrice, buildLayoutGroupQty, getItemBulkDiscountPct, type LayoutDiscountMap } from '@/lib/pricing';
import { buildLayoutDiscountMap, type MagnetProductConfig } from '@/lib/tiledProducts';
import { DiscountValidation, VoucherValidation } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountValidation | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [layoutDiscounts, setLayoutDiscounts] = useState<LayoutDiscountMap | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/magnets/config`)
      .then(r => r.json())
      .then((cfg: MagnetProductConfig) => setLayoutDiscounts(buildLayoutDiscountMap(cfg.layouts)))
      .catch(() => {});
  }, []);

  const { subtotal } = calcCartTotals(items, layoutDiscounts);
  const groupQty = buildLayoutGroupQty(items);
  const discountAmt = appliedDiscount ? parseFloat(appliedDiscount.discountAmount) : 0;
  const voucherAmt = appliedVoucher ? Math.min(parseFloat(appliedVoucher.balance), subtotal - discountAmt) : 0;
  const estimatedTotal = roundToCharmPrice(Math.max(0, subtotal - discountAmt - voucherAmt));

  // Total physical magnets (sets count their tiles × quantity)
  const magnetCount = items.reduce((sum, item) => {
    const tilesPerSet = item.tileConfig
      ? item.tileConfig.rows * item.tileConfig.cols
      : 1;
    return sum + item.quantity * tilesPerSet;
  }, 0);

  const applyPromo = async () => {
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await api.post<DiscountValidation>('/discounts/validate', { code: promoCode, subtotal, currency: 'GBP' });
      setAppliedDiscount(res);
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const applyVoucher = async () => {
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const res = await api.post<VoucherValidation>('/vouchers/validate', { code: voucherCode, currency: 'GBP' });
      setAppliedVoucher(res);
    } catch (e: any) {
      setVoucherError(e.message);
    } finally {
      setVoucherLoading(false);
    }
  };

  const proceedToCheckout = () => {
    // Persist discount/voucher selections in sessionStorage for checkout
    sessionStorage.setItem('kk_checkout_meta', JSON.stringify({
      discountCodeId: appliedDiscount?.id ?? null,
      voucherId: appliedVoucher?.id ?? null,
      discountAmount: discountAmt,
      voucherAmount: voucherAmt,
      subtotal,
    }));
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-heading font-bold text-navy mb-2">Your cart is empty</h1>
        <p className="text-text-secondary mb-8">Upload some photos and create your first magnets!</p>
        <Link href="/configure"><Button size="lg">Create magnets</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-navy mb-8">Your cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map(item => {
            const disc = layoutDiscounts ? getItemBulkDiscountPct(item, groupQty, layoutDiscounts) : 0;
            const lineTotal = item.unitPrice * item.quantity * (1 - disc / 100);

            return (
              <Card key={item.id} padding="sm" className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl shrink-0 bg-center bg-cover border-2 border-coral-light"
                  style={{ backgroundImage: `url(${item.thumbUrl})` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{item.productName}</div>
                  {item.imageQuality === 'warn' && (
                    <span className="text-xs text-yellow-700">⚠️ May look slightly blurry</span>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 rounded-full bg-coral-light text-coral font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >−</button>
                    <span className="font-bold text-navy w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-coral-light text-coral font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {disc > 0 && (
                    <div className="text-xs text-text-secondary line-through">{formatPrice(item.unitPrice * item.quantity)}</div>
                  )}
                  <div className="font-bold text-navy">{formatPrice(lineTotal)}</div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-text-secondary hover:text-red-500 mt-1 transition-colors"
                  >Remove</button>
                </div>
              </Card>
            );
          })}

          <Link href="/configure" className="text-sm text-coral font-semibold hover:underline">
            + Add more magnets
          </Link>

          {/* Promo code */}
          <Card padding="md">
            <h3 className="font-heading font-bold text-navy mb-3">Have a promo code?</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                error={promoError}
                className="flex-1"
              />
              <Button variant="outline" onClick={applyPromo} loading={promoLoading} disabled={!!appliedDiscount}>
                Apply
              </Button>
            </div>
            {appliedDiscount && (
              <div className="mt-2 flex items-center gap-2">
                <Badge color="green">✓ {appliedDiscount.code}</Badge>
                <button onClick={() => setAppliedDiscount(null)} className="text-xs text-text-secondary hover:text-red-500">Remove</button>
              </div>
            )}
          </Card>

          {/* Gift voucher */}
          <Card padding="md">
            <h3 className="font-heading font-bold text-navy mb-3">Have a gift voucher?</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter voucher code"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                error={voucherError}
                className="flex-1"
              />
              <Button variant="outline" onClick={applyVoucher} loading={voucherLoading} disabled={!!appliedVoucher}>
                Apply
              </Button>
            </div>
            {appliedVoucher && (
              <div className="mt-2 flex items-center gap-2">
                <Badge color="sky">✓ {appliedVoucher.code} (balance: {formatPrice(parseFloat(appliedVoucher.balance))})</Badge>
                <button onClick={() => setAppliedVoucher(null)} className="text-xs text-text-secondary hover:text-red-500">Remove</button>
              </div>
            )}
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 flex flex-col gap-3">
            <h2 className="font-heading font-bold text-navy">Order summary</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal ({magnetCount} magnet{magnetCount !== 1 ? 's' : ''})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Promo discount</span>
                  <span>−{formatPrice(discountAmt)}</span>
                </div>
              )}
              {voucherAmt > 0 && (
                <div className="flex justify-between text-sky">
                  <span>Gift voucher</span>
                  <span>−{formatPrice(voucherAmt)}</span>
                </div>
              )}
              <div className="text-xs text-text-secondary">Shipping calculated at checkout</div>
              <div className="flex justify-between font-bold text-navy border-t border-coral-light/40 pt-2 text-base">
                <span>Estimated total</span>
                <span>{formatPrice(estimatedTotal)}</span>
              </div>
            </div>

            <Button size="lg" fullWidth onClick={proceedToCheckout}>
              Checkout securely →
            </Button>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-3 text-xs text-text-secondary pt-2">
              <span>🔒 Secure</span>
              <span>💳 Secure payment</span>
              <span>🛡️ Guaranteed</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
