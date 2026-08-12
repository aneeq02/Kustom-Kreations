// Types matching the /api/magnets/config response

export interface ApiMagnetSize {
  id: string;
  sizeMm: number;
  label: string;
  pricePerMagnet: number;
  active: boolean;
  sortOrder: number;
}

export interface ApiTileLayout {
  id: string;
  slug: string;
  label: string;
  description: string;
  rows: number;
  cols: number;
  active: boolean;
  badge: string | null;
  bulkDiscountPct: number;
  bulkDiscountQty: number | null;
  sortOrder: number;
}

export interface ApiPrintConfig {
  targetDpi: number;
  bleedMm: number;
  safeAreaMm: number;
}

export interface MagnetProductConfig {
  sizes: ApiMagnetSize[];
  layouts: ApiTileLayout[];
  printConfig: ApiPrintConfig;
}

// Fallback while API is loading
export const DEFAULT_PRINT_CONFIG: ApiPrintConfig = {
  targetDpi: 300,
  bleedMm: 3,
  safeAreaMm: 2,
};

// ── Calculation helpers ──────────────────────────────────────────────

export function calcSetPrice(layout: ApiTileLayout, size: ApiMagnetSize): number {
  const count = layout.rows * layout.cols;
  if (count === 0) return size.pricePerMagnet;
  return Math.round(size.pricePerMagnet * count * 100) / 100;
}

// A layout's bulk discount only applies once enough *products* of that
// layout are in the order (bulkDiscountQty), not based on magnet count.
export function layoutBulkDiscountQualifies(layout: ApiTileLayout, numProducts: number): boolean {
  return !!layout.bulkDiscountQty && numProducts >= layout.bulkDiscountQty;
}

// For the cart/checkout pages, which only need { qty, pct } keyed by slug.
export function buildLayoutDiscountMap(layouts: ApiTileLayout[]): Map<string, { qty: number | null; pct: number }> {
  const map = new Map<string, { qty: number | null; pct: number }>();
  for (const l of layouts) map.set(l.slug, { qty: l.bulkDiscountQty, pct: l.bulkDiscountPct });
  return map;
}

export function perMagnetPrice(layout: ApiTileLayout, size: ApiMagnetSize): number {
  const count = layout.rows * layout.cols;
  if (count === 0) return size.pricePerMagnet;
  return Math.round((calcSetPrice(layout, size) / count) * 100) / 100;
}

export function checkTileQuality(
  naturalW: number,
  naturalH: number,
  layout: ApiTileLayout,
  size: ApiMagnetSize,
  printConfig: ApiPrintConfig = DEFAULT_PRINT_CONFIG,
): 'good' | 'warn' | 'blocked' {
  if (layout.cols === 0 || layout.rows === 0) return 'good';
  const totalMm = size.sizeMm + printConfig.bleedMm * 2;
  const minPx = Math.ceil((totalMm / 25.4) * printConfig.targetDpi);
  const ratio = Math.min(naturalW / (minPx * layout.cols), naturalH / (minPx * layout.rows));
  if (ratio >= 1) return 'good';
  if (ratio >= 0.5) return 'warn';
  return 'blocked';
}

export function estimateDpi(
  naturalW: number,
  naturalH: number,
  layout: ApiTileLayout,
  size: ApiMagnetSize,
): number {
  if (layout.cols === 0 || layout.rows === 0) return 0;
  return Math.round(
    Math.min(
      (naturalW / layout.cols) / (size.sizeMm / 25.4),
      (naturalH / layout.rows) / (size.sizeMm / 25.4),
    ),
  );
}
