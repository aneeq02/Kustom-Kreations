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

export function calcItemTotal(unitPrice: number, qty: number, discountPct: number): number {
  return unitPrice * qty * (1 - discountPct / 100);
}

// Without layout config loaded yet, no bulk discount is assumed — matches
// what the checkout page falls back to before its own fetch resolves.
export function calcCartTotals(items: CartItem[], layoutDiscounts?: LayoutDiscountMap) {
  if (!layoutDiscounts) {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return { subtotal };
  }
  const groupQty = buildLayoutGroupQty(items);
  const subtotal = items.reduce((s, i) => {
    const pct = getItemBulkDiscountPct(i, groupQty, layoutDiscounts);
    return s + calcItemTotal(i.unitPrice, i.quantity, pct);
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
