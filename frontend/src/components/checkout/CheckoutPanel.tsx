'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import BottomSheet from '@/components/configurator/BottomSheet';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { calcCartTotals, formatPrice, roundToCharmPrice, type LayoutDiscountMap } from '@/lib/pricing';
import { buildLayoutDiscountMap, fetchMagnetConfig } from '@/lib/tiledProducts';
import type { ShippingMethod, ShippingAddress } from '@/types';

const COUNTRY_LABEL = { GB: 'United Kingdom', IM: 'Isle of Man' } as const;

const REFERRAL_OPTIONS = ['Instagram', 'Facebook', 'TikTok', 'Google', 'Friend or family', 'Other'];

interface CheckoutPanelProps {
  /** Shown as a back arrow (drawer: return to bag) */
  onBack?: () => void;
  /** Called after a successful order, before navigating to confirmation */
  onComplete?: () => void;
}

const selectClass =
  'w-full px-4 py-3 rounded-[2px] border border-border focus:border-brand focus:outline-none bg-white text-navy min-h-[44px]';

export default function CheckoutPanel({ onBack, onComplete }: CheckoutPanelProps) {
  const router = useRouter();
  const { items, clearCart, sessionId } = useCart();
  const { customer } = useAuth();

  const [address, setAddress] = useState<ShippingAddress>({
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    line1: '', line2: '', city: '', county: '', postcode: '', country: 'GB',
  });
  const [guestEmail, setGuestEmail] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [layoutDiscounts, setLayoutDiscounts] = useState<LayoutDiscountMap | undefined>(undefined);

  useEffect(() => {
    fetchMagnetConfig()
      .then(cfg => setLayoutDiscounts(buildLayoutDiscountMap(cfg.layouts)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (customer) {
      setAddress(a => ({
        ...a,
        firstName: a.firstName || customer.firstName,
        lastName: a.lastName || customer.lastName,
      }));
    }
  }, [customer]);

  const currency = 'GBP';
  const meta = typeof sessionStorage !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('kk_checkout_meta') || '{}')
    : {};

  const { subtotal } = calcCartTotals(items, layoutDiscounts);
  const selectedMethod = shippingMethods.find(m => m.id === selectedMethodId);
  const shippingAmt = selectedMethod?.price ?? 0;
  const discountAmt: number = meta.discountAmount ?? 0;
  const voucherAmt: number = meta.voucherAmount ?? 0;
  const total = roundToCharmPrice(Math.max(0, subtotal - discountAmt - voucherAmt + shippingAmt));
  const ready = addressSaved && !!selectedMethodId && items.length > 0;

  const fetchShipping = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ methods: ShippingMethod[] }>(
        `/shipping/methods?country=${address.country}&subtotal=${subtotal}&currency=${currency}`,
      );
      setShippingMethods(res.methods);
      setSelectedMethodId(res.methods[0]?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load delivery options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = (e?: FormEvent) => {
    e?.preventDefault();
    const missing =
      (!customer && !guestEmail.trim()) ||
      !address.firstName.trim() || !address.lastName.trim() ||
      !address.line1.trim() || !address.city.trim() || !address.postcode.trim();
    if (missing) { setAddressError('Please fill all required fields to continue'); return; }
    setAddressError('');
    setAddressSaved(true);
    setAddressOpen(false);
    fetchShipping();
  };

  const buildCartPayload = () => ({
    shippingAddress: address,
    shippingMethodId: selectedMethodId,
    cartItems: items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      imageKey: i.imageKey,
      cropData: i.cropData,
      tileConfig: i.tileConfig,
      imageQuality: i.imageQuality,
      imageDpi: i.imageDpi,
    })),
    currency,
    guestEmail: guestEmail || null,
    referralSource: customer ? null : (referralSource || null),
    discountCodeId: meta.discountCodeId ?? null,
    voucherId: meta.voucherId ?? null,
  });

  const finishOrder = async (orderNumber: string) => {
    clearCart();
    await api.post('/cart/converted', { sessionId }).catch(() => {});
    sessionStorage.removeItem('kk_checkout_meta');
    onComplete?.();
    router.push(`/checkout/confirmation?order=${orderNumber}`);
  };

  const handleCreatePayPalOrder = async () => {
    setError('');
    const res = await api.post<{ paypalOrderId: string }>('/checkout/paypal/create-order', buildCartPayload());
    return res.paypalOrderId;
  };

  const handlePayPalApprove = async ({ orderID }: { orderID: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ orderId: string; orderNumber: string }>(
        '/checkout/paypal/capture',
        { ...buildCartPayload(), paypalOrderId: orderID },
      );
      await finishOrder(res.orderNumber);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevPay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ orderId: string; orderNumber: string }>('/checkout/dev-pay', buildCartPayload());
      await finishOrder(res.orderNumber);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Test payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const isDevBypass = process.env.NEXT_PUBLIC_PAYPAL_DEV_BYPASS === 'true';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        {onBack && (
          <button onClick={onBack} aria-label="Back to bag" className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full hover:bg-ivory cursor-pointer">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <h2 className="font-body text-2xl font-semibold text-navy">Checkout</h2>
      </div>

      {/* Address row */}
      <button
        onClick={() => setAddressOpen(true)}
        className="flex items-start gap-3 py-3 text-left group cursor-pointer"
      >
        <svg className="w-5 h-5 text-brand mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
        </svg>
        {addressSaved ? (
          <span className="flex-1 text-sm text-navy leading-relaxed">
            <span className="font-medium">{address.firstName} {address.lastName}</span><br />
            {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.postcode}<br />
            <span className="text-text-secondary">{COUNTRY_LABEL[address.country]}</span>
          </span>
        ) : (
          <span className="flex-1 font-medium text-brand group-hover:underline">Add Address</span>
        )}
        {addressSaved && <span className="text-xs text-text-secondary underline">Change</span>}
      </button>

      {/* Delivery */}
      {addressSaved && (
        <div className="py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-brand mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" />
          </svg>
          <div className="flex-1">
            {loading && !shippingMethods.length ? (
              <p className="text-sm text-text-secondary">Loading delivery options…</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {shippingMethods.map(m => (
                  <label key={m.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedMethodId === m.id}
                      onChange={() => setSelectedMethodId(m.id)}
                      className="accent-[var(--color-brand)]"
                    />
                    <span className="flex-1 text-navy">
                      {m.name}
                      <span className="text-text-secondary"> · {m.estimatedDaysMin}–{m.estimatedDaysMax} working days</span>
                    </span>
                    <span className="text-navy">{m.isFree ? 'Free' : formatPrice(m.price)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment method */}
      <div className="flex items-center gap-3 py-3">
        <svg className="w-5 h-5 text-brand shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="M2.5 10h19" />
        </svg>
        <span className="text-sm font-medium text-navy">Paying with PayPal or card</span>
      </div>

      {/* Totals */}
      <div className="border-t border-border mt-3 pt-4 flex flex-col gap-2 text-[15px]">
        <div className="flex justify-between text-navy"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-brand"><span>Promo</span><span>−{formatPrice(discountAmt)}</span></div>
        )}
        {voucherAmt > 0 && (
          <div className="flex justify-between text-brand"><span>Gift voucher</span><span>−{formatPrice(voucherAmt)}</span></div>
        )}
        <div className="flex justify-between text-navy">
          <span>Shipping</span>
          <span>{selectedMethod ? (selectedMethod.isFree ? 'Free' : formatPrice(shippingAmt)) : '—'}</span>
        </div>
        <div className="flex justify-between text-navy font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-[3px]">{error}</p>
      )}

      <div className="mt-5">
        {!ready ? (
          <>
            <button
              disabled
              className="w-full py-3.5 rounded-lg bg-brand text-white font-semibold opacity-40 cursor-not-allowed"
            >
              Place Order
            </button>
            <p className="text-xs text-text-secondary text-center mt-2">
              {addressSaved ? 'Choose a delivery option to continue' : 'Add your delivery address to continue'}
            </p>
          </>
        ) : loading ? (
          <p className="text-center text-sm text-text-secondary animate-pulse py-3">Processing payment…</p>
        ) : isDevBypass ? (
          <>
            <p className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-[3px] text-xs text-amber-700 text-center font-semibold">
              DEV MODE — payments are simulated
            </p>
            <button onClick={handleDevPay} className="w-full py-3.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors cursor-pointer">
              Place Order (test)
            </button>
          </>
        ) : (
          <PayPalScriptProvider options={{
            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
            currency,
            intent: 'capture',
            components: 'buttons',
          }}>
            <PayPalButtons
              style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 }}
              createOrder={handleCreatePayPalOrder}
              onApprove={handlePayPalApprove}
              onError={(err) => {
                console.error('[PayPal]', err);
                setError('Payment could not be completed. Please try again.');
              }}
              onCancel={() => setError('Payment was cancelled.')}
            />
          </PayPalScriptProvider>
        )}
        <p className="text-xs text-text-secondary text-center mt-3">
          By placing your order you agree to our{' '}
          <a href="/privacy" className="underline hover:text-navy">privacy policy</a>.
        </p>
      </div>

      {/* ── Add Address modal ─────────────────────────────────────── */}
      <BottomSheet open={addressOpen} onClose={() => setAddressOpen(false)} label="Add address">
        <form onSubmit={saveAddress} noValidate>
          <div className="flex items-center justify-between -mt-1 mb-5">
            <button type="button" onClick={() => setAddressOpen(false)} aria-label="Close" className="w-8 h-8 -ml-1 flex items-center justify-center rounded-full hover:bg-ivory cursor-pointer">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <h3 className="font-body text-base font-semibold text-navy">Add Address</h3>
            <button type="submit" className="text-brand font-semibold text-sm cursor-pointer hover:underline">Done</button>
          </div>

          {addressError && (
            <p role="alert" className="mb-4 text-sm text-center text-navy bg-[#F6E6E0] border border-[#E7C3B6] px-3 py-2.5 rounded-[3px]">
              {addressError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {!customer && (
              <Input label="Email" type="email" required autoComplete="email" value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)} hint="We'll send your order confirmation here" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" required autoComplete="given-name" value={address.firstName}
                onChange={e => setAddress(a => ({ ...a, firstName: e.target.value }))} />
              <Input label="Last name" required autoComplete="family-name" value={address.lastName}
                onChange={e => setAddress(a => ({ ...a, lastName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="country" className="text-sm font-semibold text-navy">Country or region</label>
              <select
                id="country"
                value={address.country}
                onChange={e => {
                  setAddress(a => ({ ...a, country: e.target.value as 'GB' | 'IM' }));
                  setShippingMethods([]);
                  setSelectedMethodId(null);
                }}
                className={selectClass}
              >
                <option value="GB">United Kingdom</option>
                <option value="IM">Isle of Man</option>
              </select>
            </div>
            <Input label="Address line 1" required autoComplete="address-line1" value={address.line1}
              onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} />
            <Input label="Address line 2" autoComplete="address-line2" placeholder="Apt, suite, unit (optional)" value={address.line2 ?? ''}
              onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} />
            <Input label="Town or city" required autoComplete="address-level2" value={address.city}
              onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Postcode" required autoComplete="postal-code" value={address.postcode}
                onChange={e => setAddress(a => ({ ...a, postcode: e.target.value.toUpperCase() }))} />
              <Input label="County" autoComplete="address-level1" placeholder="Optional" value={address.county ?? ''}
                onChange={e => setAddress(a => ({ ...a, county: e.target.value }))} />
            </div>
            {!customer && (
              <div className="flex flex-col gap-1">
                <label htmlFor="referral" className="text-sm font-semibold text-navy">How did you hear about us?</label>
                <select id="referral" value={referralSource} onChange={e => setReferralSource(e.target.value)} className={selectClass}>
                  <option value="">— Select an option —</option>
                  {REFERRAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="w-full mt-1 py-3.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors cursor-pointer">
              Save address
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
