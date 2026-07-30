'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { calcCartTotals, formatPrice, countryToCurrency } from '@/lib/pricing';
import { ShippingMethod, ShippingAddress } from '@/types';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

type CheckoutStep = 'address' | 'shipping' | 'review';

const STEP_LABELS: Record<CheckoutStep, string> = {
  address: 'Delivery address',
  shipping: 'Delivery method',
  review: 'Review & place order',
};

const STEPS: CheckoutStep[] = ['address', 'shipping', 'review'];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, sessionId } = useCart();
  const { customer } = useAuth();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [address, setAddress] = useState<ShippingAddress>({
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    line1: '', line2: '', city: '', county: '', postcode: '', country: 'GB',
  });
  const [guestEmail, setGuestEmail] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currency = countryToCurrency(address.country);
  const meta = typeof sessionStorage !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('kk_checkout_meta') || '{}')
    : {};

  const { subtotal } = calcCartTotals(items);
  const selectedMethod = shippingMethods.find(m => m.id === selectedMethodId);
  const shippingAmt = selectedMethod?.price ?? 0;
  const discountAmt: number = meta.discountAmount ?? 0;
  const voucherAmt: number = meta.voucherAmount ?? 0;
  const total = Math.max(0, subtotal - discountAmt - voucherAmt + shippingAmt);

  useEffect(() => {
    if (customer) {
      setAddress(a => ({
        ...a,
        firstName: a.firstName || customer.firstName,
        lastName: a.lastName || customer.lastName,
      }));
    }
  }, [customer]);

  // Redirect to cart if it's empty — must be in useEffect, not render body
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length, router]);

  const fetchShipping = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ methods: ShippingMethod[] }>(
        `/shipping/methods?country=${address.country}&subtotal=${subtotal}&currency=${currency}`
      );
      setShippingMethods(res.methods);
      if (res.methods.length) setSelectedMethodId(res.methods[0].id);
      setStep('shipping');
    } catch (e: any) {
      setError(e.message || 'Could not load shipping options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer && !guestEmail) { setError('Please enter your email address'); return; }
    fetchShipping();
  };

  const handleShippingSubmit = () => {
    if (!selectedMethodId) { setError('Please select a delivery method'); return; }
    setError('');
    setStep('review');
  };

  const buildCartPayload = () => ({
    shippingAddress: address,
    shippingMethodId: selectedMethodId,
    cartItems: items.map(i => ({
      productId: i.productId,
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

  const handleCreatePayPalOrder = async () => {
    setError('');
    const res = await api.post<{ paypalOrderId: string }>(
      '/checkout/paypal/create-order',
      buildCartPayload(),
    );
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
      clearCart();
      await api.post('/cart/converted', { sessionId });
      sessionStorage.removeItem('kk_checkout_meta');
      router.push(`/checkout/confirmation?order=${res.orderNumber}`);
    } catch (e: any) {
      setError(e.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevPay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ orderId: string; orderNumber: string }>(
        '/checkout/dev-pay',
        buildCartPayload(),
      );
      clearCart();
      await api.post('/cart/converted', { sessionId });
      sessionStorage.removeItem('kk_checkout_meta');
      router.push(`/checkout/confirmation?order=${res.orderNumber}`);
    } catch (e: any) {
      setError(e.message || 'Test payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const isDevBypass = process.env.NEXT_PUBLIC_PAYPAL_DEV_BYPASS === 'true';

  if (items.length === 0) return null;

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
              step === s
                ? 'bg-coral text-white'
                : currentStepIndex > i
                  ? 'bg-green-500 text-white'
                  : 'bg-coral-light text-coral',
            ].join(' ')}>
              {currentStepIndex > i ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-semibold hidden sm:block ${step === s ? 'text-navy' : 'text-text-secondary'}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-coral-light mx-1 hidden sm:block" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main panel ── */}
        <div className="lg:col-span-2">

          {/* Step 1 — Address */}
          {step === 'address' && (
            <Card>
              <h2 className="font-heading font-bold text-navy text-xl mb-6">Delivery address</h2>
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
              <form onSubmit={handleAddressSubmit} className="flex flex-col gap-4">
                {!customer && (
                  <>
                    <Input
                      label="Your email"
                      type="email"
                      required
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      hint="We'll send your order confirmation here"
                    />
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-navy">
                        How did you hear about us?
                      </label>
                      <select
                        value={referralSource}
                        onChange={e => setReferralSource(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-coral-light focus:border-coral focus:outline-none bg-white text-navy min-h-[44px]"
                      >
                        <option value="">— Select an option —</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Google">Google</option>
                        <option value="Friend or family">Friend or family</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First name" required value={address.firstName}
                    onChange={e => setAddress(a => ({ ...a, firstName: e.target.value }))} />
                  <Input label="Last name" required value={address.lastName}
                    onChange={e => setAddress(a => ({ ...a, lastName: e.target.value }))} />
                </div>
                <Input label="Address line 1" required value={address.line1}
                  onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} />
                <Input label="Address line 2 (optional)" value={address.line2 ?? ''}
                  onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City / Town" required value={address.city}
                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
                  <Input label="County (optional)" value={address.county ?? ''}
                    onChange={e => setAddress(a => ({ ...a, county: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Postcode" required value={address.postcode}
                    onChange={e => setAddress(a => ({ ...a, postcode: e.target.value.toUpperCase() }))} />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-navy">
                      Country <span className="text-coral">*</span>
                    </label>
                    <select
                      required
                      value={address.country}
                      onChange={e => setAddress(a => ({ ...a, country: e.target.value as 'GB' | 'IM' | 'IE' }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-coral-light focus:border-coral focus:outline-none bg-white text-navy min-h-[44px]"
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="IM">Isle of Man</option>
                      <option value="IE">Republic of Ireland</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" size="lg" fullWidth loading={loading}>
                  Continue to delivery
                </Button>
              </form>
            </Card>
          )}

          {/* Step 2 — Shipping method */}
          {step === 'shipping' && (
            <Card>
              <h2 className="font-heading font-bold text-navy text-xl mb-6">Delivery method</h2>
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
              <div className="flex flex-col gap-3 mb-6">
                {shippingMethods.map(m => (
                  <label
                    key={m.id}
                    className={[
                      'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                      selectedMethodId === m.id
                        ? 'border-coral bg-coral-light/20'
                        : 'border-coral-light hover:border-coral/50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={m.id}
                      checked={selectedMethodId === m.id}
                      onChange={() => setSelectedMethodId(m.id)}
                      className="accent-coral"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-navy">{m.name}</div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {m.estimatedDaysMin}–{m.estimatedDaysMax} working days
                        {m.freeFrom !== null && !m.isFree && (
                          <> · Free over {formatPrice(m.freeFrom, currency as 'GBP' | 'EUR')}</>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-navy shrink-0">
                      {m.isFree
                        ? <Badge color="green">FREE</Badge>
                        : formatPrice(m.price, currency as 'GBP' | 'EUR')
                      }
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('address')}>← Back</Button>
                <Button fullWidth onClick={handleShippingSubmit}>Continue to review</Button>
              </div>
            </Card>
          )}

          {/* Step 3 — Review & place order */}
          {step === 'review' && (
            <Card>
              <h2 className="font-heading font-bold text-navy text-xl mb-6">Review your order</h2>
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              {/* Delivery summary */}
              <div className="mb-5 p-4 bg-cream rounded-xl text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-navy">Delivering to</span>
                  <button onClick={() => setStep('address')} className="text-coral text-xs hover:underline">Edit</button>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {address.firstName} {address.lastName}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                  {address.city}{address.county ? `, ${address.county}` : ''}, {address.postcode}<br />
                  {address.country === 'GB' ? 'United Kingdom' : address.country === 'IM' ? 'Isle of Man' : 'Republic of Ireland'}
                </p>
              </div>

              {/* Delivery method summary */}
              {selectedMethod && (
                <div className="mb-5 p-4 bg-cream rounded-xl text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-navy">Delivery</span>
                    <button onClick={() => setStep('shipping')} className="text-coral text-xs hover:underline">Edit</button>
                  </div>
                  <p className="text-text-secondary">
                    {selectedMethod.name} · {selectedMethod.estimatedDaysMin}–{selectedMethod.estimatedDaysMax} working days
                    {' · '}
                    {selectedMethod.isFree
                      ? <span className="text-green-600 font-semibold">FREE</span>
                      : formatPrice(selectedMethod.price, currency as 'GBP' | 'EUR')
                    }
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="mb-5">
                <p className="font-semibold text-navy text-sm mb-2">Items ({items.length})</p>
                <div className="flex flex-col gap-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2">
                      <div
                        className="w-12 h-12 rounded-[10px] shrink-0 bg-cover bg-center border border-coral-light"
                        style={{ backgroundImage: `url(${item.thumbUrl})` }}
                      />
                      <div className="flex-1 text-sm text-navy">
                        {item.productName} × {item.quantity}
                      </div>
                      <div className="text-sm font-semibold text-navy shrink-0">
                        {formatPrice(item.unitPrice * item.quantity * (1 - item.discountPct / 100))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="mt-4 text-center text-sm text-text-secondary animate-pulse">
                  Processing payment…
                </div>
              )}

              {!loading && isDevBypass && (
                <div className="mt-4">
                  <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-700 text-center font-semibold">
                    DEV MODE — payments are simulated
                  </div>
                  <Button size="lg" fullWidth onClick={handleDevPay}>
                    Complete test order (no payment)
                  </Button>
                </div>
              )}

              {!loading && !isDevBypass && (
                <div className="mt-4">
                  <PayPalScriptProvider options={{
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
                    currency: currency,
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
                </div>
              )}

              <p className="text-xs text-text-secondary text-center mt-3">
                By placing your order you agree to our{' '}
                <a href="/privacy" className="text-coral hover:underline">privacy policy</a>.
              </p>
            </Card>
          )}
        </div>

        {/* ── Order summary sidebar ── */}
        <Card className="sticky top-24 h-fit flex flex-col gap-3">
          <h3 className="font-heading font-bold text-navy">Order summary</h3>

          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-10 h-10 rounded-[8px] shrink-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.thumbUrl})` }}
              />
              <span className="flex-1 text-navy truncate">{item.productName} × {item.quantity}</span>
              <span className="text-text-secondary shrink-0">
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}

          <div className="border-t border-coral-light/40 pt-2 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span><span>−{formatPrice(discountAmt)}</span>
              </div>
            )}
            {voucherAmt > 0 && (
              <div className="flex justify-between text-sky">
                <span>Voucher</span><span>−{formatPrice(voucherAmt)}</span>
              </div>
            )}
            {selectedMethod && (
              <div className="flex justify-between text-text-secondary">
                <span>Delivery</span>
                <span>
                  {selectedMethod.isFree
                    ? <span className="text-green-600 font-semibold">FREE</span>
                    : formatPrice(shippingAmt)
                  }
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-navy text-base pt-1 border-t border-coral-light/40">
              <span>Total</span>
              <span>{formatPrice(total, currency as 'GBP' | 'EUR')}</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
