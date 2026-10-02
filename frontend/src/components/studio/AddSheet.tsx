'use client';

import { useRef, useState } from 'react';
import BottomSheet from '@/components/configurator/BottomSheet';
import MagnetPreview from '@/components/studio/MagnetPreview';
import { formatPrice } from '@/lib/pricing';
import { calcSetPrice, type ApiMagnetSize, type ApiTileLayout } from '@/lib/tiledProducts';

// One picture split across each layout's magnets — shows the jigsaw idea
// (pre-rendered bitmap, see scripts/build-scenes.mjs)
const SAMPLE_PHOTO = '/scenes/hills.webp';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  layouts: ApiTileLayout[];
  sizes: ApiMagnetSize[];
  size: ApiMagnetSize | null;
  onSizeChange: (s: ApiMagnetSize) => void;
  onFiles: (files: File[], layout: ApiTileLayout) => void;
  /** Skip straight to the upload step with this layout (used by "Replace") */
  presetLayout?: ApiTileLayout | null;
}

export default function AddSheet({
  open, onClose, layouts, sizes, size, onSizeChange, onFiles, presetLayout,
}: AddSheetProps) {
  const [picked, setLayout] = useState<ApiTileLayout | null>(null);
  const layout = presetLayout ?? picked;
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => { setLayout(null); onClose(); };

  const single = layouts.find(l => l.rows * l.cols === 1);
  const sets = layouts.filter(l => l.rows * l.cols > 1);

  const card = (l: ApiTileLayout, big: boolean) => (
    <button
      key={l.id}
      onClick={() => setLayout(l)}
      className="group relative flex flex-col items-center justify-end gap-3 rounded-xl bg-[#EFEDE8] hover:bg-[#E9E6DF] transition-colors pt-6 pb-4 px-3 cursor-pointer text-navy"
    >
      {l.badge && (
        <span className="absolute top-2.5 right-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-brand text-white">
          {l.badge}
        </span>
      )}
      <MagnetPreview
        thumbUrl={SAMPLE_PHOTO}
        rows={l.rows}
        cols={l.cols}
        size={big ? 116 : 84}
        className="transition-transform duration-200 group-hover:-translate-y-0.5"
      />
      <span className="text-center leading-tight">
        <span className="block font-semibold text-[15px]">
          {l.rows * l.cols === 1 ? 'Single Magnet' : `${l.label}`}
        </span>
        <span className="block text-xs text-text-secondary mt-0.5">
          {l.rows * l.cols === 1 ? '1 magnet' : `${l.rows * l.cols} magnets · one photo`}
          {size && <> · {formatPrice(calcSetPrice(l, size))}</>}
        </span>
      </span>
    </button>
  );

  return (
    <BottomSheet open={open} onClose={close} wide label="Add magnets">
      {!layout ? (
        <>
          <h2 className="font-body text-lg font-semibold text-navy text-center mb-5">
            What do you want to add?
          </h2>

          {layouts.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-ivory animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {single && <div className="col-span-2">{card(single, true)}</div>}
              {sets.map(l => card(l, false))}
            </div>
          )}

          {sizes.length > 1 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 text-center">
                Magnet size
              </p>
              <div className="flex justify-center gap-2" role="radiogroup" aria-label="Magnet size">
                {sizes.map(s => (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={size?.id === s.id}
                    onClick={() => onSizeChange(s)}
                    className={`min-w-[88px] px-4 py-2 rounded-[3px] text-sm font-medium border transition-colors cursor-pointer ${
                      size?.id === s.id
                        ? 'border-navy bg-navy text-white'
                        : 'border-border text-navy hover:border-navy/40'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {!presetLayout && (
            <button
              onClick={() => setLayout(null)}
              className="text-sm text-text-secondary hover:text-navy transition-colors mb-3 cursor-pointer"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 py-9 rounded-xl border border-border hover:border-brand/50 hover:bg-brand-light/40 transition-colors cursor-pointer"
          >
            <svg className="w-8 h-8 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
            </svg>
            <span className="font-medium text-navy">
              {presetLayout ? 'Choose a new photo' : 'Upload Photos'}
            </span>
            <span className="text-xs text-text-secondary text-center px-6">
              {layout.rows * layout.cols === 1
                ? 'Pick as many as you like — each photo becomes its own magnet'
                : `Each photo becomes its own ${layout.label} set of ${layout.rows * layout.cols} magnets`}
            </span>
          </button>
          <p className="text-[11px] text-text-secondary text-center mt-3">
            JPEG · PNG · HEIC — up to 30MB each
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={!presetLayout}
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length) { setLayout(null); onFiles(files, layout); }
            }}
          />
        </>
      )}
    </BottomSheet>
  );
}
