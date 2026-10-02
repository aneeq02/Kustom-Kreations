import type { CartItem, CropData } from '@/types';
import type { PhotoState } from '@/components/designer/DesignerCanvas';
import {
  calcSetPrice,
  checkTileQuality,
  estimateDpi,
  DEFAULT_PRINT_CONFIG,
  type ApiMagnetSize,
  type ApiTileLayout,
  type MagnetProductConfig,
} from '@/lib/tiledProducts';

// The editor's fixed coordinate frame. The backend's print pipeline
// (buildPrintBuffer) crops from cropData in this same 360px frame — never change it.
export const CANVAS_SIZE = 360;

// ── Product id <-> size/layout ──────────────────────────────────────────
// Backend contract: 'photo-magnet-50mm' (single) or 'photo-magnet-50mm-3x3' (set).

export function itemSizeMm(item: Pick<CartItem, 'productId' | 'tileConfig'>): number {
  if (item.tileConfig?.magnetSizeMm) return item.tileConfig.magnetSizeMm;
  const m = item.productId.match(/(\d+)mm/);
  return m ? parseInt(m[1], 10) : 50;
}

export function itemGrid(item: Pick<CartItem, 'tileConfig'>): { rows: number; cols: number } {
  return item.tileConfig ? { rows: item.tileConfig.rows, cols: item.tileConfig.cols } : { rows: 1, cols: 1 };
}

export function itemLayoutSlug(item: Pick<CartItem, 'tileConfig'>): string {
  const { rows, cols } = itemGrid(item);
  return `${rows}x${cols}`;
}

export function magnetsInItem(item: Pick<CartItem, 'tileConfig'>): number {
  const { rows, cols } = itemGrid(item);
  return rows * cols;
}

export function productIdFor(size: ApiMagnetSize, layout: ApiTileLayout): string {
  return layout.rows * layout.cols > 1
    ? `photo-magnet-${size.sizeMm}mm-${layout.slug}`
    : `photo-magnet-${size.sizeMm}mm`;
}

export function productNameFor(size: ApiMagnetSize, layout: ApiTileLayout): string {
  return layout.rows * layout.cols > 1
    ? `${layout.label} Photo Magnet Set (${size.label})`
    : `Photo Magnet (${size.label})`;
}

// Everything on a cart item that depends on the chosen size + layout.
export function productFields(size: ApiMagnetSize, layout: ApiTileLayout, naturalW?: number, naturalH?: number) {
  const count = layout.rows * layout.cols;
  const hasDims = !!naturalW && !!naturalH;
  return {
    productId: productIdFor(size, layout),
    productName: productNameFor(size, layout),
    productSlug: 'photo-magnet',
    unitPrice: calcSetPrice(layout, size),
    tileConfig: count > 1 ? { rows: layout.rows, cols: layout.cols, magnetSizeMm: size.sizeMm } : undefined,
    imageQuality: hasDims
      ? checkTileQuality(naturalW!, naturalH!, layout, size, DEFAULT_PRINT_CONFIG)
      : ('good' as const),
    imageDpi: hasDims ? estimateDpi(naturalW!, naturalH!, layout, size) : 0,
  };
}

export function findSize(cfg: MagnetProductConfig | null, sizeMm: number) {
  return cfg?.sizes.find(s => s.sizeMm === sizeMm) ?? null;
}

export function findLayout(cfg: MagnetProductConfig | null, slug: string) {
  return cfg?.layouts.find(l => l.slug === slug) ?? null;
}

// Layouts a customer can pick (excludes the old 'custom' contact card).
export function pickableLayouts(cfg: MagnetProductConfig | null) {
  return (cfg?.layouts ?? []).filter(l => l.active && l.slug !== 'custom' && l.rows > 0);
}

// ── Crop maths ──────────────────────────────────────────────────────────

export function coverScaleFor(w: number, h: number) {
  return Math.max(CANVAS_SIZE / w, CANVAS_SIZE / h);
}

export function centeredPhotoState(scale: number): PhotoState {
  return { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale, rotation: 0 };
}

export function cropDataFrom(p: PhotoState): CropData {
  return { x: p.x, y: p.y, width: CANVAS_SIZE, height: CANVAS_SIZE, scale: p.scale, rotation: p.rotation };
}

export function photoStateFrom(c: CropData): PhotoState {
  return { x: c.x, y: c.y, scale: c.scale, rotation: c.rotation };
}

// Renders exactly what the Konva editor shows (image centred on x/y, scaled,
// rotated about its centre) into a small JPEG — used for every magnet preview
// in the studio and bag, so they never depend on a Konva stage being mounted.
export function renderCropThumb(img: HTMLImageElement, p: PhotoState, outPx = CANVAS_SIZE): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = outPx;
    canvas.height = outPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const k = outPx / CANVAS_SIZE;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outPx, outPx);
    ctx.scale(k, k);
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    const w = img.naturalWidth * p.scale;
    const h = img.naturalHeight * p.scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    // Tainted canvas (image served without CORS) — caller keeps the old thumb
    return null;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Needs attention in the bag: low resolution, or the upload never finished.
export function itemNeedsReplace(item: CartItem, uploading: boolean) {
  if (uploading) return false;
  return !item.imageKey || item.imageKey === 'pending' || item.imageQuality !== 'good';
}
