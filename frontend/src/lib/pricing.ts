import { CartItem } from '@/types';

export type LayoutDiscountMap = Map<string, { qty: number | null; pct: number }>;

// 'photo-magnet-50mm' items have no tileConfig -> single magnet, slug '1x1'.
// Tiled sets carry their grid size directly on the cart item.
export function resolveItemLayoutSlug(item: Pick<CartItem, 'tileConfig'>): string {
  return item.tileConfig ? `${item.tileConfig.rows}x${item.tileConfig.cols}` : '1x1';
}

// A layout's bulk discount unlocks once the cart holds at least `qty`
// *products* sharing that layout — not a count of physical magnets.
export function buildLayoutGroupQty(items: CartItem[]): Map<string, number> {
  const groupQty = new Map<string, number>();
  for (const item of items) {
    const slug = resolveItemLayoutSlug(item);
    groupQty.set(slug, (groupQty.get(slug) ?? 0) + item.quantity);
  }
  return groupQty;
}

export function getItemBulkDiscountPct(
  item: CartItem,
  groupQty: Map<string, number>,
  layoutDiscounts: LayoutDiscountMap,
): number {
  const slug = resolveItemLayoutSlug(item);
  const cfg = layoutDiscounts.get(slug);
  if (!cfg?.qty) return 0;
  return (groupQty.get(slug) ?? 0) >= cfg.qty ? cfg.pct : 0;
}

// Checkout "double your order" upsell — admin-configurable extra discount on
// a duplicated second set (magnet_print_config key upsell_discount_pct),
// stacked on top of whatever bulk discount already applies. This default is
// only a fallback for before that config has loaded.
export const DEFAULT_UPSELL_DISCOUNT_PCT = 25;

export function calcItemTotal(
  unitPrice: number, qty: number, discountPct: number,
  isUpsellSet = false, upsellDiscountPct = DEFAULT_UPSELL_DISCOUNT_PCT,
): number {
  const base = unitPrice * qty * (1 - discountPct / 100);
  return isUpsellSet ? base * (1 - upsellDiscountPct / 100) : base;
}

// Without layout config loaded yet, no bulk discount is assumed — matches
// what the checkout page falls back to before its own fetch resolves.
export function calcCartTotals(
  items: CartItem[], layoutDiscounts?: LayoutDiscountMap, upsellDiscountPct = DEFAULT_UPSELL_DISCOUNT_PCT,
) {
  if (!layoutDiscounts) {
    const subtotal = items.reduce((s, i) => s + calcItemTotal(i.unitPrice, i.quantity, 0, i.isUpsellSet, upsellDiscountPct), 0);
    return { subtotal };
  }
  const groupQty = buildLayoutGroupQty(items);
  const subtotal = items.reduce((s, i) => {
    const pct = getItemBulkDiscountPct(i, groupQty, layoutDiscounts);
    return s + calcItemTotal(i.unitPrice, i.quantity, pct, i.isUpsellSet, upsellDiscountPct);
  }, 0);
  return { subtotal };
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

// Charm pricing for the final order total: round down to the nearest 50p
// strictly below the raw amount, e.g. 18.74 -> 18.50, 20.00 -> 19.50.
// Only applied to the bottom-line total — line items stay exact.
export function roundToCharmPrice(amount: number): number {
  const pence = Math.round(amount * 100);
  const flooredPence = Math.max(0, Math.floor((pence - 1) / 50) * 50);
  return flooredPence / 100;
}

// Shop policy: no order totals under £1 (PayPal itself has no minimum, but its
// fixed per-sale fee makes tiny orders loss-making). Mirrors backend services/pricing.ts:
// if codes would push the total under £1, give back part of the voucher
// first, then the promo, so the order still totals at least £1.
export const MIN_ORDER_TOTAL = 1;

export function applyMinimumTotal(subtotal: number, shipping: number, discount: number, voucher: number) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  let raw = subtotal - discount - voucher + shipping;
  let adjusted = false;
  if (raw < MIN_ORDER_TOTAL) {
    adjusted = true;
    let shortfall = MIN_ORDER_TOTAL - raw;
    const fromVoucher = Math.min(voucher, shortfall);
    voucher = round2(voucher - fromVoucher);
    shortfall = round2(shortfall - fromVoucher);
    discount = round2(Math.max(0, discount - shortfall));
    raw = subtotal - discount - voucher + shipping;
  }
  return {
    discount,
    voucher,
    /** before charm rounding — what the basket shows */
    amount: round2(raw),
    /** final charged total (charm-rounded, never below the minimum) */
    total: Math.max(MIN_ORDER_TOTAL, roundToCharmPrice(raw)),
    adjusted,
  };
}
