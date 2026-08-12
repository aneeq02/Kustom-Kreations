'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { uploadImage } from '@/lib/api';
import type { PhotoState } from '@/components/designer/DesignerCanvas';
import type { TiledCanvasHandle } from '@/components/designer/TiledCanvas';
import ResponsiveCanvasStage from '@/components/designer/ResponsiveCanvasStage';
import {
  calcSetPrice,
  perMagnetPrice,
  checkTileQuality,
  estimateDpi,
  layoutBulkDiscountQualifies,
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
const BulkDiscountPopup = dynamic(
  () => import('@/components/configurator/BulkDiscountPopup'),
  { ssr: false },
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const CANVAS_SIZE = 360;

interface PhotoSlot {
  id: string;
  photoUrl: string;
  imageKey: string;
  naturalSize: { w: number; h: number };
  coverScale: number;
  photoState: PhotoState;
  thumbUrl: string | null;
  uploading: boolean;
  uploadError: string;
}

const centeredState = (scale: number): PhotoState => ({
  x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale, rotation: 0,
});

// ─── Inner component (needs useSearchParams → Suspense wrapper) ───────────────

function TiledDesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const canvasRef = useRef<TiledCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Photo state — one entry per uploaded photo, each becomes its own set
  const [photos, setPhotos]           = useState<PhotoSlot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView]   = useState<'edit' | 'grid' | 'fridge'>('edit');

  const active = photos[activeIndex] ?? null;

  // Derived quality / DPI — for the photo currently being edited
  const quality = (active && active.naturalSize.w > 0 && size && layout)
    ? checkTileQuality(active.naturalSize.w, active.naturalSize.h, layout, size, DEFAULT_PRINT_CONFIG)
    : 'good';
  const dpi = (active && active.naturalSize.w > 0 && size && layout)
    ? estimateDpi(active.naturalSize.w, active.naturalSize.h, layout, size)
    : 0;

  // Bulk discount — based on how many sets (products), not total magnets
  const [bulkPopupShown, setBulkPopupShown] = useState(false);
  const threshold = layout?.bulkDiscountQty ?? null;
  const bulkPct   = layout?.bulkDiscountPct ?? 0;
  const numPhotosForDiscount = photos.length;
  const qualifies = layout ? layoutBulkDiscountQualifies(layout, numPhotosForDiscount) : false;

  useEffect(() => {
    if (!threshold) return;
    const half = Math.floor(threshold / 2);
    if (half > 0 && numPhotosForDiscount === half) setBulkPopupShown(true);
  }, [numPhotosForDiscount, threshold]);

  const updateActivePhoto = useCallback((patch: Partial<PhotoSlot>) => {
    setPhotos(prev => prev.map((p, i) => i === activeIndex ? { ...p, ...patch } : p));
  }, [activeIndex]);

  // Re-export thumbnail for the active photo when its position changes
  useEffect(() => {
    if (!active) return;
    const slotId = active.id;
    const id = setTimeout(() => {
      const t = canvasRef.current?.exportThumbnail();
      if (t) setPhotos(prev => prev.map(p => p.id === slotId ? { ...p, thumbUrl: t } : p));
    }, 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.photoState, active?.photoUrl]);

  const handlePhotoLoad = useCallback(() => {
    requestAnimationFrame(() => {
      const t = canvasRef.current?.exportThumbnail();
      if (t) updateActivePhoto({ thumbUrl: t });
    });
  }, [updateActivePhoto]);

  const uploadOneFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const id = uuidv4();
    const objUrl = URL.createObjectURL(file);

    setPhotos(prev => [...prev, {
      id,
      photoUrl: objUrl,
      imageKey: '',
      naturalSize: { w: 0, h: 0 },
      coverScale: 1,
      photoState: centeredState(1),
      thumbUrl: null,
      uploading: true,
      uploadError: '',
    }]);

    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const cs = Math.max(CANVAS_SIZE / w, CANVAS_SIZE / h);
      setPhotos(prev => prev.map(p => p.id === id
        ? { ...p, naturalSize: { w, h }, coverScale: cs, photoState: centeredState(cs) }
        : p));
    };
    img.src = objUrl;

    uploadImage(file, 'photo-magnet-50mm')
      .then(res => {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, imageKey: res.imageKey } : p));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        const friendly = msg.toLowerCase().includes('too small') || msg.toLowerCase().includes('blocked')
          ? 'Image resolution may be too low — you can still preview, but print quality cannot be guaranteed.'
          : '';
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, uploadError: friendly } : p));
      })
      .finally(() => {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, uploading: false } : p));
      });
  }, []);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const wasEmpty = photos.length === 0;
    files.forEach(uploadOneFile);
    setActiveView('edit');
    if (wasEmpty) setActiveIndex(0);
    else setActiveIndex(photos.length); // jump to the first newly added photo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, uploadOneFile]);

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setActiveIndex(i => Math.max(0, Math.min(i, photos.length - 2)));
  };

  const goTo = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, photos.length - 1)));
  };

  const handleAddToCart = () => {
    if (!photos.length || !size || !layout || photos.some(p => p.uploading)) return;
    const count = layout.rows * layout.cols;
    const setPrice = calcSetPrice(layout, size);

    for (const photo of photos) {
      const q = (photo.naturalSize.w > 0)
        ? checkTileQuality(photo.naturalSize.w, photo.naturalSize.h, layout, size, DEFAULT_PRINT_CONFIG)
        : 'good';
      const d = (photo.naturalSize.w > 0)
        ? estimateDpi(photo.naturalSize.w, photo.naturalSize.h, layout, size)
        : 0;

      addItem({
        productId:   `photo-magnet-${size.sizeMm}mm-${layout.slug}`,
        productName: count > 1
          ? `${layout.label} Photo Magnet Set (${size.label})`
          : `Photo Magnet (${size.label})`,
        productSlug: 'photo-magnet',
        imageKey:    photo.imageKey || 'pending',
        thumbUrl:    photo.thumbUrl ?? photo.photoUrl,
        cropData: {
          x: photo.photoState.x,
          y: photo.photoState.y,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          scale: photo.photoState.scale,
          rotation: photo.photoState.rotation,
        },
        quantity:     1,
        unitPrice:    setPrice,
        discountPct:  qualifies ? bulkPct : 0,
        currency:     'GBP',
        imageQuality: q,
        imageDpi:     d,
        tileConfig:   count > 1
          ? { rows: layout.rows, cols: layout.cols, magnetSizeMm: size.sizeMm }
          : undefined,
      });
    }

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
  const setPrice = calcSetPrice(layout, size);
  const ppm = perMagnetPrice(layout, size);
  const numPhotos = photos.length;
  const totalPrice = setPrice * numPhotos * (qualifies ? 1 - bulkPct / 100 : 1);
  const totalMagnets = count * numPhotos;
  const anyUploading = photos.some(p => p.uploading);
  const anyBlocked = photos.some(p => {
    if (p.naturalSize.w === 0) return false;
    return checkTileQuality(p.naturalSize.w, p.naturalSize.h, layout, size, DEFAULT_PRINT_CONFIG) === 'blocked';
  });
  const canAdd = numPhotos > 0 && !anyUploading && !anyBlocked;

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

      <h1 className="text-3xl font-heading font-bold text-navy mb-1">Design your sets</h1>
      <p className="text-text-secondary mb-8">
        Upload as many photos as you like — each one becomes its own {layout.rows}×{layout.cols} set of {count} magnets.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-8 items-start">

        {/* ── Canvas / Preview ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 mx-auto lg:mx-0 min-w-0 w-full">

          {/* View toggle — only when a photo is loaded */}
          {active && (
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
                  if (t) updateActivePhoto({ thumbUrl: t });
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
                  if (t) updateActivePhoto({ thumbUrl: t });
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

          {/* Editor canvas */}
          <ResponsiveCanvasStage size={CANVAS_SIZE} hidden={activeView !== 'edit' && !!active}>
            <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
              <TiledCanvas
                ref={canvasRef}
                photoUrl={active?.photoUrl ?? ''}
                rows={layout.rows}
                cols={layout.cols}
                canvasSize={CANVAS_SIZE}
                photoState={active?.photoState ?? centeredState(1)}
                onPhotoChange={p => updateActivePhoto({ photoState: p })}
                onPhotoLoad={handlePhotoLoad}
              />

              {photos.length > 1 && activeView === 'edit' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  Set {activeIndex + 1} of {photos.length}
                </div>
              )}
            </div>
          </ResponsiveCanvasStage>

          {/* Tile grid preview — for the active photo */}
          {activeView === 'grid' && active?.thumbUrl && (() => {
            const TILE_GAP = 4;
            const TILE_PX = Math.floor((CANVAS_SIZE - TILE_GAP * (layout.cols - 1)) / layout.cols);
            const BG_W = TILE_PX * layout.cols;
            const BG_H = TILE_PX * layout.rows;
            return (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveCanvasStage size={CANVAS_SIZE}>
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
                          backgroundImage: `url(${active.thumbUrl})`,
                          backgroundSize: `${BG_W}px ${BG_H}px`,
                          backgroundPosition: `-${c * TILE_PX}px -${r * TILE_PX}px`,
                          borderRadius: 6,
                        }}
                        className="shadow-sm"
                      />
                    )),
                  )}
                </div>
                </ResponsiveCanvasStage>
                <p className="text-xs text-text-secondary">How this set looks side by side</p>
              </div>
            );
          })()}

          {/* Fridge preview — for the active photo */}
          {activeView === 'fridge' && active && (
            <FridgePreview3D
              textureUrl={active.thumbUrl}
              rows={layout.rows}
              cols={layout.cols}
              sizeMm={size.sizeMm}
              canvasSize={480}
            />
          )}

          {/* Thumbnail strip — jump straight to a photo, or remove it */}
          {photos.length > 1 && (
            <div className="w-full flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative group">
                  <button
                    onClick={() => goTo(i)}
                    className={[
                      'w-12 h-12 rounded-lg bg-center bg-cover border-2 transition-all',
                      i === activeIndex ? 'border-coral' : 'border-transparent opacity-70 hover:opacity-100',
                    ].join(' ')}
                    style={{ backgroundImage: `url(${p.thumbUrl ?? p.photoUrl})` }}
                  >
                    {p.uploading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                        <svg className="w-3.5 h-3.5 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-navy text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Zoom / rotate sliders — edit mode only */}
          {active && activeView === 'edit' && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-12 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={Math.round(active.coverScale * 50)}
                  max={Math.round(active.coverScale * 500)}
                  step={1}
                  value={Math.round(active.photoState.scale * 100)}
                  onChange={e => updateActivePhoto({ photoState: { ...active.photoState, scale: parseInt(e.target.value) / 100 } })}
                  className="flex-1 accent-coral h-1"
                />
                <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
                  {Math.round(active.photoState.scale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-12 shrink-0">Rotate</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={active.photoState.rotation}
                  onChange={e => updateActivePhoto({ photoState: { ...active.photoState, rotation: parseInt(e.target.value) } })}
                  className="flex-1 accent-coral h-1"
                />
                <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
                  {active.photoState.rotation}°
                </span>
              </div>
              <button
                onClick={() => updateActivePhoto({ photoState: centeredState(active.coverScale) })}
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
                {active ? `Your Photos (${numPhotos})` : 'Upload Your Photo'}
              </span>
              {active && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-coral font-semibold hover:underline"
                >
                  + Add more photos
                </button>
              )}
            </div>

            {!active ? (
              <div
                onDrop={e => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 p-8 rounded-xl border-2 border-dashed border-coral/40 bg-coral-light/20 hover:border-coral hover:bg-coral-light/30 cursor-pointer transition-colors"
              >
                <svg className="w-10 h-10 text-coral/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm font-semibold text-coral">Tap or drag to upload</span>
                <span className="text-xs text-text-secondary">Upload as many as you like · JPEG · PNG · HEIC · up to 30 MB each</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-coral-light/30 border border-coral-light">
                <div
                  className="w-10 h-10 rounded-lg bg-center bg-cover shrink-0 border border-white/60 shadow-sm"
                  style={{ backgroundImage: `url(${active.thumbUrl ?? active.photoUrl})` }}
                />
                <span className="text-xs text-navy font-semibold flex-1 min-w-0 truncate">
                  {numPhotos} photo{numPhotos > 1 ? 's' : ''} ready
                </span>
                {anyUploading && (
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
              multiple
              className="sr-only"
              onChange={e => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {active?.uploadError && <p className="text-xs text-red-600 mt-1.5">{active.uploadError}</p>}
          </div>

          {/* Quality indicator — for the photo being edited */}
          {active && dpi > 0 && (
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
                {count} magnets per set · one photo split across the grid · high-gloss print
              </div>
            </div>
          </div>

          {/* Pricing + CTA */}
          <div className="bg-white rounded-xl border border-coral-light/40 p-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-text-secondary">
                {numPhotos} set{numPhotos === 1 ? '' : 's'} · {totalMagnets} magnets total
              </span>
            </div>
            {count > 1 && (
              <div className="flex items-baseline gap-1 text-xs text-text-secondary">
                <span>£{ppm.toFixed(2)} each · £{setPrice.toFixed(2)} per set</span>
              </div>
            )}
            {threshold && (
              qualifies ? (
                <p className="text-xs text-green-700 font-semibold">
                  🎉 Bulk discount applied — {bulkPct}% off!
                </p>
              ) : (
                <p className="text-xs text-coral font-semibold">
                  Add {threshold - numPhotos} more set{threshold - numPhotos === 1 ? '' : 's'} to save {bulkPct}%!
                </p>
              )
            )}
            <div className="flex items-baseline justify-between border-t border-coral-light/30 pt-3">
              <span className="text-sm font-semibold text-navy">Total</span>
              <span className="text-2xl font-heading font-bold text-coral">
                £{totalPrice.toFixed(2)}
              </span>
            </div>
            <Button
              size="lg"
              fullWidth
              onClick={handleAddToCart}
              disabled={!canAdd}
              loading={anyUploading}
            >
              {anyBlocked
                ? 'One or more photos too low resolution'
                : !active
                ? 'Upload a photo first'
                : `Add ${numPhotos} set${numPhotos === 1 ? '' : 's'} to cart · £${totalPrice.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>

      {bulkPopupShown && threshold && (
        <BulkDiscountPopup
          remaining={threshold - numPhotos}
          pct={bulkPct}
          onClose={() => setBulkPopupShown(false)}
        />
      )}
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
