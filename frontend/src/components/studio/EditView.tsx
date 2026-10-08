'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import type { CartItem } from '@/types';
import type { PhotoState } from '@/components/designer/DesignerCanvas';
import ResponsiveCanvasStage from '@/components/designer/ResponsiveCanvasStage';
import { formatPrice } from '@/lib/pricing';
import { calcSetPrice, type ApiMagnetSize, type ApiTileLayout } from '@/lib/tiledProducts';
import {
  CANVAS_SIZE, coverScaleFor, itemGrid, itemSizeMm,
  loadImage, photoStateFrom, renderCropThumb,
} from '@/lib/studio';

const DesignerCanvas = dynamic(() => import('@/components/designer/DesignerCanvas'), { ssr: false });
const TiledCanvas = dynamic(() => import('@/components/designer/TiledCanvas'), { ssr: false });
const FridgePreview3D = dynamic(() => import('@/components/designer/FridgePreview3D'), { ssr: false });

type Panel = null | 'layout' | 'size' | 'fridge';

interface EditViewProps {
  item: CartItem;
  photoUrl: string | null;
  layouts: ApiTileLayout[];
  sizes: ApiMagnetSize[];
  onDone: (photoState: PhotoState, thumbUrl: string | null, natural: { w: number; h: number } | null) => void;
  onLayout: (l: ApiTileLayout) => void;
  onSize: (s: ApiMagnetSize) => void;
  onReplace: () => void;
  onClone: () => void;
  onDelete: () => void;
}

function Tool({ label, onClick, active, children, danger }: {
  label: string; onClick: () => void; active?: boolean; danger?: boolean; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1 min-w-[52px] px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
        active ? 'text-brand' : danger ? 'text-navy/80 hover:text-red-600' : 'text-navy/80 hover:text-navy'
      }`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      {label}
    </button>
  );
}

export default function EditView({
  item, photoUrl, layouts, sizes, onDone, onLayout, onSize, onReplace, onClone, onDelete,
}: EditViewProps) {
  const { rows, cols } = itemGrid(item);
  const sizeMm = itemSizeMm(item);
  const [photoState, setPhotoState] = useState<PhotoState>(() => photoStateFrom(item.cropData));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    item.naturalW && item.naturalH ? { w: item.naturalW, h: item.naturalH } : null,
  );
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [fridgeThumb, setFridgeThumb] = useState<string | null>(null);

  // Load the original once — for natural size and to render the final thumbnail
  useEffect(() => {
    if (!photoUrl) return;
    let cancelled = false;
    loadImage(photoUrl).then(el => {
      if (cancelled) return;
      setImg(el);
      const n = { w: el.naturalWidth, h: el.naturalHeight };
      setNatural(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [photoUrl]);

  const cover = natural ? coverScaleFor(natural.w, natural.h) : 1;
  const minZoom = cover;
  const maxZoom = cover * 4;

  const finish = () => {
    const thumb = img ? renderCropThumb(img, photoState) : null;
    onDone(photoState, thumb, natural);
  };

  const openFridge = () => {
    if (panel === 'fridge') { setPanel(null); return; }
    setFridgeThumb(img ? renderCropThumb(img, photoState, 480) : item.thumbUrl);
    setPanel('fridge');
  };

  const countLabel = rows * cols > 1 ? `${rows}×${cols} set` : 'Single';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 bg-[#F2EFEA] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Edit magnet"
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 pt-16 pb-6">
        {!photoUrl ? (
          <div className="max-w-xs text-center">
            <p className="text-navy font-medium mb-2">This photo needs to be uploaded again</p>
            <p className="text-sm text-text-secondary mb-5">
              We couldn&apos;t find the original — choose the photo again to keep editing.
            </p>
            <button onClick={onReplace} className="px-5 py-2.5 rounded-[3px] bg-brand text-white text-sm font-medium hover:bg-brand-dark cursor-pointer">
              Choose photo
            </button>
          </div>
        ) : panel === 'fridge' ? (
          <div className="w-full max-w-[480px]">
            <FridgePreview3D textureUrl={fridgeThumb} rows={rows} cols={cols} sizeMm={sizeMm} canvasSize={480} />
          </div>
        ) : (
          <>
            <ResponsiveCanvasStage size={CANVAS_SIZE}>
              <div className="shadow-[0_2px_4px_rgba(26,26,24,0.12),0_24px_48px_-12px_rgba(26,26,24,0.35)]">
                {rows * cols > 1 ? (
                  <TiledCanvas
                    photoUrl={photoUrl}
                    rows={rows}
                    cols={cols}
                    canvasSize={CANVAS_SIZE}
                    photoState={photoState}
                    onPhotoChange={setPhotoState}
                  />
                ) : (
                  <DesignerCanvas
                    photoUrl={photoUrl}
                    canvasSize={CANVAS_SIZE}
                    photoState={photoState}
                    onPhotoChange={setPhotoState}
                  />
                )}
              </div>
            </ResponsiveCanvasStage>

            <div className="w-full max-w-[220px] mt-7">
              <input
                type="range"
                aria-label="Zoom"
                min={Math.round(minZoom * 1000)}
                max={Math.round(maxZoom * 1000)}
                step={1}
                value={Math.round(Math.min(Math.max(photoState.scale, minZoom), maxZoom) * 1000)}
                onChange={e => setPhotoState(p => ({ ...p, scale: parseInt(e.target.value, 10) / 1000 }))}
                className="w-full accent-navy h-1 cursor-pointer"
              />
              <p className="text-center text-sm text-text-secondary mt-2">Drag to adjust crop</p>
            </div>

            {item.imageQuality !== 'good' && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2.5 rounded-lg border-2 px-3.5 py-2.5 text-sm font-medium bg-red-50 border-red-300 text-red-800"
              >
                <svg
                  className="w-5 h-5 shrink-0 text-red-600"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3.5 21.5 20.5 2.5 20.5Z" />
                  <path d="M12 9.5v4.25" />
                  <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
                </svg>
                {item.imageQuality === 'blocked'
                  ? 'Resolution too low to print sharply at this size.'
                  : 'Low resolution — may print slightly soft.'}
                <button onClick={onReplace} className="underline font-semibold cursor-pointer">Replace</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom: options panel + toolbar ─────────────────────── */}
      <div className="shrink-0 px-4 pb-5 flex flex-col items-center gap-3">
        {panel === 'layout' && (
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {layouts.map(l => {
              const on = l.rows === rows && l.cols === cols;
              const size = sizes.find(s => s.sizeMm === sizeMm);
              return (
                <button
                  key={l.id}
                  onClick={() => onLayout(l)}
                  className={`px-3.5 py-2 rounded-[3px] text-sm border transition-colors cursor-pointer ${
                    on ? 'bg-navy text-white border-navy' : 'bg-white border-border text-navy hover:border-navy/40'
                  }`}
                >
                  {l.rows * l.cols === 1 ? 'Single' : l.label}
                  {size && <span className={on ? 'text-white/70' : 'text-text-secondary'}> · {formatPrice(calcSetPrice(l, size))}</span>}
                </button>
              );
            })}
          </div>
        )}
        {panel === 'size' && (
          <div className="flex flex-wrap justify-center gap-2">
            {sizes.map(s => {
              const on = s.sizeMm === sizeMm;
              return (
                <button
                  key={s.id}
                  onClick={() => onSize(s)}
                  className={`min-w-[88px] px-3.5 py-2 rounded-[3px] text-sm border transition-colors cursor-pointer ${
                    on ? 'bg-navy text-white border-navy' : 'bg-white border-border text-navy hover:border-navy/40'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-navy font-medium">
              Edit <span className="text-text-secondary text-sm font-normal">({countLabel} · {sizeMm}mm · {formatPrice(item.unitPrice)})</span>
            </span>
            <button
              onClick={finish}
              className="px-4 py-1.5 rounded-full bg-brand-light text-brand text-sm font-semibold hover:bg-brand hover:text-white transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-[0_8px_30px_-8px_rgba(26,26,24,0.18)] border border-border/60 px-2 py-2 flex items-center justify-around">
            <Tool label="Layout" onClick={() => setPanel(p => p === 'layout' ? null : 'layout')} active={panel === 'layout'}>
              <rect x="3" y="3" width="7.5" height="7.5" /><rect x="13.5" y="3" width="7.5" height="7.5" />
              <rect x="3" y="13.5" width="7.5" height="7.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" />
            </Tool>
            {sizes.length > 1 && (
              <Tool label="Size" onClick={() => setPanel(p => p === 'size' ? null : 'size')} active={panel === 'size'}>
                <rect x="3" y="3" width="18" height="18" /><path d="M9 15l6-6M10 9h5v5" />
              </Tool>
            )}
            <Tool label="Rotate" onClick={() => setPhotoState(p => ({ ...p, rotation: (p.rotation + 90) % 360 }))}>
              <path d="M20 11a8 8 0 10-2.34 5.66" /><path d="M20 4v7h-7" />
            </Tool>
            <Tool label="Fridge" onClick={openFridge} active={panel === 'fridge'}>
              <rect x="5" y="2" width="14" height="20" rx="1.5" /><path d="M5 9h14M8 5v2M8 12v3" />
            </Tool>
            <Tool label="Replace" onClick={onReplace}>
              <rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" />
            </Tool>
            <Tool label="Clone" onClick={onClone}>
              <rect x="8" y="8" width="13" height="13" rx="1" /><path d="M16 8V4a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1h4" /><path d="M14.5 12v6M11.5 15h6" />
            </Tool>
            <Tool label="Delete" onClick={onDelete} danger>
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </Tool>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
