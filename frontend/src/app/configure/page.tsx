'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import BottomSheet from '@/components/configurator/BottomSheet';
import { setPendingFiles } from '@/lib/pendingUpload';
import {
  fetchMagnetConfig,
  type ApiMagnetSize,
  type ApiTileLayout,
  type MagnetProductConfig,
} from '@/lib/tiledProducts';

// Soft glow ring shown around whichever size/layout card is currently selected
const SELECTED_GLOW = 'shadow-[0_0_0_3px_rgba(205,171,160,0.45),0_0_18px_4px_rgba(205,171,160,0.65)]';

type Stage = 'idle' | 'picking' | 'uploading';

function GridIcon({ rows, cols, active }: { rows: number; cols: number; active: boolean }) {
  const r = Math.max(rows, 1);
  const c = Math.max(cols, 1);
  const gap = 2;
  const size = 32;
  const cellW = (size - gap * (c - 1)) / c;
  const cellH = (size - gap * (r - 1)) / r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: r }, (_, ri) =>
        Array.from({ length: c }, (_, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * (cellW + gap)}
            y={ri * (cellH + gap)}
            width={cellW}
            height={cellH}
            rx={1.5}
            fill={active ? 'white' : '#6E9481'}
            opacity={active ? 1 : 0.85}
          />
        ))
      )}
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-1 h-20 rounded-xl bg-ivory animate-pulse" />
  );
}

function ConfigureWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [config, setConfig] = useState<MagnetProductConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<ApiMagnetSize | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<ApiTileLayout | null>(null);

  useEffect(() => {
    fetchMagnetConfig()
      .then((data: MagnetProductConfig) => {
        setConfig(data);
        const defaultSize = data.sizes.find(s => s.active) ?? data.sizes[0] ?? null;
        const defaultLayout =
          data.layouts.find(l => l.active && l.slug === '3x3') ??
          data.layouts.find(l => l.active) ??
          data.layouts[0] ??
          null;
        setSelectedSize(defaultSize);
        setSelectedLayout(defaultLayout);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const count = selectedLayout ? selectedLayout.rows * selectedLayout.cols : 0;

  const goToDesigner = () => {
    if (!selectedSize || !selectedLayout) return;
    if (selectedLayout.slug === '1x1') {
      router.push(`/configure/single?size=${selectedSize.sizeMm}`);
    } else {
      router.push(`/configure/tiled?size=${selectedSize.sizeMm}&layout=${selectedLayout.slug}`);
    }
  };

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setPendingFiles(Array.from(fileList));
    goToDesigner();
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      {/* ── Breathing "Start Creating" entry point ─────────────────── */}
      <button
        onClick={() => setStage('picking')}
        className="flex flex-col items-center gap-5 group"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-32 h-32 rounded-full bg-white shadow-xl shadow-coral/20 flex items-center justify-center group-hover:shadow-coral/30 group-active:scale-95 transition-shadow"
        >
          <svg className="w-12 h-12 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </motion.div>
        <span className="font-heading font-bold text-navy text-lg tracking-tight">
          Start Creating
        </span>
      </button>

      {/* ── Sheet 1: product picker ─────────────────────────────────── */}
      <BottomSheet open={stage === 'picking'} onClose={() => setStage('idle')}>
        <h2 className="font-heading text-xl font-bold text-navy mb-1">
          Choose your magnets
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          Pick a size and layout — you'll upload your photo next.
        </p>

        {/* Size */}
        <h3 className="text-xs font-bold text-navy uppercase tracking-widest mb-3">
          Magnet Size
        </h3>
        {loading ? (
          <div className="flex gap-3 mb-7">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="flex gap-3 mb-7">
            {config?.sizes.filter(s => s.active).map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSize(s)}
                className={`flex-1 py-3.5 px-4 rounded-xl border-2 text-left transition-all ${
                  selectedSize?.id === s.id
                    ? `border-coral bg-coral text-white ${SELECTED_GLOW}`
                    : 'border-coral-light bg-white text-navy hover:border-coral/50 hover:shadow-sm'
                }`}
              >
                <div className="font-bold text-base">{s.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Layout */}
        <h3 className="text-xs font-bold text-navy uppercase tracking-widest mb-3">
          Layout
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 mb-7">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-7">
            {config?.layouts.filter(l => l.active && l.slug !== 'custom' && l.rows > 0).map(l => {
              const isSelected = selectedLayout?.id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedLayout(l)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `border-coral bg-coral text-white ${SELECTED_GLOW}`
                      : 'border-coral-light bg-white text-navy hover:border-coral/50 hover:shadow-sm'
                  }`}
                >
                  {l.badge && (
                    <span
                      className={`absolute top-2.5 right-2.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-coral-light text-coral'
                      }`}
                    >
                      {l.badge}
                    </span>
                  )}
                  <div className="mb-3">
                    <GridIcon rows={l.rows} cols={l.cols} active={isSelected} />
                  </div>
                  <div className="font-bold text-base">{l.label}</div>
                  <div
                    className={`text-xs mt-0.5 ${
                      isSelected ? 'text-white/80' : 'text-text-secondary'
                    }`}
                  >
                    {l.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Button
          size="lg"
          fullWidth
          disabled={loading || !selectedSize || !selectedLayout}
          onClick={() => setStage('uploading')}
        >
          {selectedLayout ? `Continue with ${selectedLayout.label} →` : 'Continue →'}
        </Button>
      </BottomSheet>

      {/* ── Sheet 2: upload trigger ─────────────────────────────────── */}
      <BottomSheet open={stage === 'uploading'} onClose={() => setStage('idle')}>
        <button
          onClick={() => setStage('picking')}
          className="text-sm text-text-secondary hover:text-navy transition-colors mb-4"
        >
          ← Back
        </button>
        <h2 className="font-heading text-xl font-bold text-navy mb-1">
          Add your photo{count > 1 ? 's' : ''}
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          {selectedSize && selectedLayout
            ? `${selectedLayout.label} — ${selectedSize.label} magnets`
            : ''}
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-coral-light bg-coral-light/20 hover:bg-coral-light/40 hover:border-coral/50 transition-all"
        >
          <svg className="w-8 h-8 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
          </svg>
          <span className="font-semibold text-navy">Upload Photos</span>
          <span className="text-xs text-text-secondary">JPEG · PNG · HEIC — up to 30MB each</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFilesChosen(e.target.files)}
        />
      </BottomSheet>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">
          Loading…
        </div>
      }
    >
      <ConfigureWizard />
    </Suspense>
  );
}
