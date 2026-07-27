import { BulkDiscountTier, CartItem } from '@/types';

export function getApplicableTier(qty: number, tiers: BulkDiscountTier[]): BulkDiscountTier | null {
  return tiers
    .filter(t => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty))
    .sort((a, b) => b.discountPct - a.discountPct)[0] ?? null;
}

export function calcItemTotal(unitPrice: number, qty: number, discountPct: number): number {
  return unitPrice * qty * (1 - discountPct / 100);
}

export function calcCartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i.unitPrice, i.quantity, i.discountPct), 0);
  return { subtotal };
}

export function formatPrice(amount: number, currency: 'GBP' | 'EUR' = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
}

export function countryToCurrency(country: string): 'GBP' | 'EUR' {
  return country === 'IE' ? 'EUR' : 'GBP';
}
