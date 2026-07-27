'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { uploadImage } from '@/lib/api';
import type { PhotoState } from '@/components/designer/DesignerCanvas';
import type { TiledCanvasHandle } from '@/components/designer/TiledCanvas';
import {
  calcSetPrice,
  perMagnetPrice,
  checkTileQuality,
  estimateDpi,
  DEFAULT_PRINT_CONFIG,
  type ApiMagnetSize,
  type ApiTileLayout,
  type MagnetProductConfig,
} from '@/lib/tiledProducts';

const TiledCanvas = dynamic(
  () => import('@/components/designer/TiledCanvas'),
  { ssr: false },
);
const FridgePreview3D = dynamic(
  () => import('@/components/designer/FridgePreview3D'),
  { ssr: false },
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const CANVAS_SIZE = 360;

// ─── Inner component (needs useSearchParams → Suspense wrapper) ───────────────

function TiledDesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const canvasRef = useRef<TiledCanvasHandle>(null);

  const sizeMmParam = parseInt(searchParams.get('size') ?? '50', 10);
  const layoutSlug  = searchParams.get('layout') ?? '3x3';

  // Config from API
  const [size, setSize]         = useState<ApiMagnetSize | null>(null);
  const [layout, setLayout]     = useState<ApiTileLayout | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/magnets/config`)
      .then(r => r.json())
      .then((cfg: MagnetProductConfig) => {
        const s = cfg.sizes.find(x => x.sizeMm === sizeMmParam) ?? cfg.sizes[0];
        const l = cfg.layouts.find(x => x.slug === layoutSlug)
          ?? cfg.layouts.find(x => x.active && x.slug !== '1x1')
          ?? cfg.layouts[0];
        setSize(s ?? null);
        setLayout(l ?? null);
      })
      .catch(() => router.replace('/configure'))
      .finally(() => setConfigLoading(false));
  }, [sizeMmParam, layoutSlug, router]);

  // Image state
  const [photoUrl,    setPhotoUrl]    = useState('');
  const [imageKey,    setImageKey]    = useState('');
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [coverScale,  setCoverScale]  = useState(1);
  const [photoState,  setPhotoState]  = useState<PhotoState>({
    x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale: 1, rotation: 0,
  });
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [thumbUrl,     setThumbUrl]     = useState<string | null>(null);
  const [activeView,   setActiveView]   = useState<'edit' | 'grid' | 'fridge'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived quality / DPI
  const quality = (naturalSize.w > 0 && size && layout)
    ? checkTileQuality(naturalSize.w, naturalSize.h, layout, size, DEFAULT_PRINT_CONFIG)
    : 'good';

  const dpi = (naturalSize.w > 0 && size && layout)
    ? estimateDpi(naturalSize.w, naturalSize.h, layout, size)
    : 0;

  // Re-export thumbnail when position changes
  useEffect(() => {
    if (!photoUrl) return;
    const id = setTimeout(() => {
      const t = canvasRef.current?.exportThumbnail();
      if (t) setThumbUrl(t);
    }, 150);
    return () => clearTimeout(id);
  }, [photoState, photoUrl]);

  const handlePhotoLoad = useCallback(() => {
    requestAnimationFrame(() => {
      const t = canvasRef.current?.exportThumbnail();
      if (t) setThumbUrl(t);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadError('');
    setImageKey('');
    setThumbUrl(null);
    setActiveView('edit');

    const objUrl = URL.createObjectURL(file);
    setPhotoUrl(objUrl);

    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      setNaturalSize({ w, h });
      const cs = Math.max(CANVAS_SIZE / w, CANVAS_SIZE / h);
      setCoverScale(cs);
      setPhotoState({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale: cs, rotation: 0 });
    };
    img.src = objUrl;

    setUploading(true);
    try {
      const res = await uploadImage(file, 'photo-magnet-50mm');
      setImageKey(res.imageKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('too small') || msg.toLowerCase().includes('blocked')) {
        setUploadError('Image resolution may be too low — you can still preview, but print quality cannot be guaranteed.');
      }
    } finally {
      setUploading(false);
    }
  }, []);

  const handleAddToCart = () => {
    if (!photoUrl || !size || !layout || quality === 'blocked') return;
    const count = layout.rows * layout.cols;
    const price = calcSetPrice(layout, size);
    const thumb = canvasRef.current?.exportThumbnail() ?? thumbUrl ?? photoUrl;

    addItem({
      productId:   `photo-magnet-${size.sizeMm}mm-${layout.slug}`,
      productName: count > 1
        ? `${layout.label} Photo Magnet Set (${size.label})`
        : `Photo Magnet (${size.label})`,
      productSlug: 'photo-magnet',
      imageKey:    imageKey || 'pending',
      thumbUrl:    thumb ?? photoUrl,
      cropData: {
        x: photoState.x,
        y: photoState.y,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        scale: photoState.scale,
        rotation: photoState.rotation,
      },
      quantity:     1,
      unitPrice:    price,
      discountPct:  0,
      currency:     'GBP',
      imageQuality: quality,
      imageDpi:     dpi,
      tileConfig:   count > 1
        ? { rows: layout.rows, cols: layout.cols, magnetSizeMm: size.sizeMm }
        : undefined,
    });

    router.push('/cart');
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        Loading options…
      </div>
    );
  }

  if (!size || !layout) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-4">Couldn&apos;t load product config.</p>
        <Link href="/configure" className="text-coral font-semibold hover:underline">
          ← Go back
        </Link>
      </div>
    );
  }

  const count = layout.rows * layout.cols;
  const price = calcSetPrice(layout, size);
  const ppm   = perMagnetPrice(layout, size);
  const canAdd = !!photoUrl && quality !== 'blocked' && !uploading;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-secondary mb-6">
        <Link href="/configure" className="hover:text-coral transition-colors">
          ← Change size / layout
        </Link>
        <span>·</span>
        <span className="font-semibold text-navy">
          {layout.label} · {size.label}
        </span>
      </div>

      <h1 className="text-3xl font-heading font-bold text-navy mb-1">Design your set</h1>
      <p className="text-text-secondary mb-8">
        Upload one photo — it will be split across {count} magnets in a {layout.rows}×{layout.cols} grid.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

        {/* ── Canvas / Preview ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 mx-auto lg:mx-0">

          {/* View toggle — only when photo loaded */}
          {photoUrl && (
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-border shadow-sm">
              <button
                onClick={() => setActiveView('edit')}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  activeView === 'edit' ? 'bg-coral text-white shadow-sm' : 'text-navy hover:bg-ivory',
                ].join(' ')}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button
                onClick={() => {
                  const t = canvasRef.current?.exportThumbnail();
                  if (t) setThumbUrl(t);
                  setActiveView('grid');
                }}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  activeView === 'grid' ? 'bg-coral text-white shadow-sm' : 'text-navy hover:bg-ivory',
                ].join(' ')}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                Grid
              </button>
              <button
                onClick={() => {
                  const t = canvasRef.current?.exportThumbnail();
                  if (t) setThumbUrl(t);
                  setActiveView('fridge');
                }}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  activeView === 'fridge' ? 'bg-coral text-white shadow-sm' : 'text-navy hover:bg-ivory',
                ].join(' ')}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
                Fridge
              </button>
            </div>
          )}

          {/* Editor canvas (always mounted to keep Konva alive) */}
          <div style={{ display: activeView === 'edit' || !photoUrl ? 'block' : 'none' }}>
            <TiledCanvas
              ref={canvasRef}
              photoUrl={photoUrl}
              rows={layout.rows}
              cols={layout.cols}
              canvasSize={CANVAS_SIZE}
              photoState={photoState}
              onPhotoChange={setPhotoState}
              onPhotoLoad={handlePhotoLoad}
            />
          </div>

          {/* Tile grid preview */}
          {activeView === 'grid' && photoUrl && thumbUrl && (() => {
            const TILE_GAP = 4;
            const TILE_PX = Math.floor((CANVAS_SIZE - TILE_GAP * (layout.cols - 1)) / layout.cols);
            const BG_W = TILE_PX * layout.cols;
            const BG_H = TILE_PX * layout.rows;
            return (
              <div className="flex flex-col items-center gap-3">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layout.cols}, ${TILE_PX}px)`,
                    gap: `${TILE_GAP}px`,
                  }}
                >
                  {Array.from({ length: layout.rows }, (_, r) =>
                    Array.from({ length: layout.cols }, (_, c) => (
                      <div
                        key={`${r}-${c}`}
                        style={{
                          width: TILE_PX,
                          height: TILE_PX,
                          backgroundImage: `url(${thumbUrl})`,
                          backgroundSize: `${BG_W}px ${BG_H}px`,
                          backgroundPosition: `-${c * TILE_PX}px -${r * TILE_PX}px`,
                          borderRadius: 6,
                        }}
                        className="shadow-sm"
                      />
                    )),
                  )}
                </div>
                <p className="text-xs text-text-secondary">How your set looks side by side</p>
              </div>
            );
          })()}

          {/* Fridge preview */}
          {activeView === 'fridge' && photoUrl && (
            <FridgePreview3D
              textureUrl={thumbUrl}
              rows={layout.rows}
              cols={layout.cols}
              sizeMm={size.sizeMm}
              canvasSize={CANVAS_SIZE}
            />
          )}

          {/* Zoom / rotate sliders — edit mode only */}
          {photoUrl && (activeView === 'edit') && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-12 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={Math.round(coverScale * 50)}
                  max={Math.round(coverScale * 500)}
                  step={1}
                  value={Math.round(photoState.scale * 100)}
                  onChange={e => setPhotoState(p => ({ ...p, scale: parseInt(e.target.value) / 100 }))}
                  className="flex-1 accent-coral h-1"
                />
                <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
                  {Math.round(photoState.scale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-12 shrink-0">Rotate</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={photoState.rotation}
                  onChange={e => setPhotoState(p => ({ ...p, rotation: parseInt(e.target.value) }))}
                  className="flex-1 accent-coral h-1"
                />
                <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
                  {photoState.rotation}°
                </span>
              </div>
              <button
                onClick={() => setPhotoState({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale: coverScale, rotation: 0 })}
                className="text-xs text-coral hover:underline"
              >
                Reset position
              </button>
            </div>
          )}
        </div>

        {/* ── Controls sidebar ─────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Upload area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-navy">
                {photoUrl ? 'Your Photo' : 'Upload Your Photo'}
              </span>
              {photoUrl && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-coral font-semibold hover:underline"
                >
                  Change photo
                </button>
              )}
            </div>

            {!photoUrl ? (
              <div
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 p-8 rounded-xl border-2 border-dashed border-coral/40 bg-coral-light/20 hover:border-coral hover:bg-coral-light/30 cursor-pointer transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center gap-2 text-coral text-sm font-semibold">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Uploading…
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-coral/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-sm font-semibold text-coral">Tap or drag to upload</span>
                    <span className="text-xs text-text-secondary">JPEG · PNG · HEIC · up to 30 MB</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-coral-light/30 border border-coral-light">
                <div
                  className="w-10 h-10 rounded-lg bg-center bg-cover shrink-0 border border-white/60 shadow-sm"
                  style={{ backgroundImage: `url(${photoUrl})` }}
                />
                <span className="text-xs text-navy font-semibold flex-1 min-w-0 truncate">
                  Photo ready
                </span>
                {uploading && (
                  <svg className="w-4 h-4 text-coral animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
          </div>

          {/* Quality indicator */}
          {photoUrl && dpi > 0 && (
            <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs font-medium border ${
              quality === 'good'    ? 'bg-green-50 text-green-700 border-green-100'   :
              quality === 'warn'    ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                      'bg-red-50 text-red-700 border-red-100'
            }`}>
              <span className="text-base leading-none mt-px shrink-0">
                {quality === 'good' ? '✓' : quality === 'warn' ? '⚠' : '✕'}
              </span>
              <div className="leading-relaxed">
                {quality === 'good'    && <><strong>Great quality</strong> · {dpi} DPI — perfectly crisp for all {count} magnets.</>}
                {quality === 'warn'    && <><strong>Acceptable</strong> · {dpi} DPI — may look slightly soft on close inspection.</>}
                {quality === 'blocked' && <><strong>Too low resolution</strong> · {dpi} DPI — please use a higher resolution photo.</>}
              </div>
            </div>
          )}

          {/* Set info */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ivory border border-border/40">
            <div className="text-text-secondary text-xs">
              <div className="font-semibold text-navy">{layout.label} — {size.label} magnets</div>
              <div className="mt-0.5">
                {count} magnets · one photo split across the grid · high-gloss print
              </div>
            </div>
          </div>

          {/* Pricing + CTA */}
          <div className="bg-white rounded-xl border border-coral-light/40 p-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-text-secondary">
                {count} magnets · {size.label}
              </span>
              {layout.bulkDiscountPct > 0 && (
                <span className="text-xs font-semibold text-green-700">
                  {layout.bulkDiscountPct}% set discount
                </span>
              )}
            </div>
            {count > 1 && (
              <div className="flex items-baseline gap-1 text-xs text-text-secondary">
                <span>£{ppm.toFixed(2)} each</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-coral-light/30 pt-3">
              <span className="text-sm font-semibold text-navy">Total</span>
              <span className="text-2xl font-heading font-bold text-coral">
                £{price.toFixed(2)}
              </span>
            </div>
            <Button
              size="lg"
              fullWidth
              onClick={handleAddToCart}
              disabled={!canAdd}
              loading={uploading}
            >
              {quality === 'blocked'
                ? 'Image resolution too low'
                : !photoUrl
                ? 'Upload a photo first'
                : `Add to cart · £${price.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TiledDesignerPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
            Loading…
          </div>
        }
      >
        <TiledDesignerContent />
      </Suspense>
    </div>
  );
}
