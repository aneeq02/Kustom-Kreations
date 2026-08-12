'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  calcSetPrice,
  type ApiMagnetSize,
  type ApiTileLayout,
  type MagnetProductConfig,
} from '@/lib/tiledProducts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Soft glow ring shown around whichever size/layout card is currently selected
const SELECTED_GLOW = 'shadow-[0_0_0_3px_rgba(205,171,160,0.45),0_0_18px_4px_rgba(205,171,160,0.65)]';

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
            fill={active ? 'white' : '#4A7C3F'}
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

function SelectionContent() {
  const router = useRouter();
  const [config, setConfig] = useState<MagnetProductConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<ApiMagnetSize | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<ApiTileLayout | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/magnets/config`)
      .then(r => r.json())
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

  const handleContinue = () => {
    if (!selectedSize || !selectedLayout) return;
    if (selectedLayout.slug === '1x1') {
      router.push(`/configure/single?size=${selectedSize.sizeMm}`);
    } else {
      router.push(`/configure/tiled?size=${selectedSize.sizeMm}&layout=${selectedLayout.slug}`);
    }
  };

  const count = selectedLayout ? selectedLayout.rows * selectedLayout.cols : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-navy mb-3">
          Create Your Photo Magnet
        </h1>
        <p className="text-text-secondary max-w-md mx-auto">
          Upload a photo, pick your size and layout, and we'll print and post your magnets.
        </p>
      </div>

      {/* ── Size selection ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-navy uppercase tracking-widest mb-3">
          Magnet Size
        </h2>
        {loading ? (
          <div className="flex gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="flex gap-3">
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
                <div
                  className={`text-xs mt-0.5 ${
                    selectedSize?.id === s.id ? 'text-white/80' : 'text-text-secondary'
                  }`}
                >
                  from £{s.pricePerMagnet.toFixed(2)} each
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Layout selection ───────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-navy uppercase tracking-widest mb-3">
          Layout
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {config?.layouts.filter(l => l.active && l.slug !== 'custom' && l.rows > 0).map(l => {
                const lCount = l.rows * l.cols;
                const lPrice = selectedSize ? calcSetPrice(l, selectedSize) : 0;
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
                    {selectedSize && lCount > 0 && (
                      <div
                        className={`text-sm font-bold mt-2.5 ${
                          isSelected ? 'text-white' : 'text-coral'
                        }`}
                      >
                        £{lPrice.toFixed(2)}
                        {l.bulkDiscountPct > 0 && (
                          <span
                            className={`text-xs ml-1.5 ${
                              isSelected ? 'text-white/70' : 'text-green-600'
                            }`}
                          >
                            (save {l.bulkDiscountPct}%)
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Coming soon */}
            {config?.layouts.filter(l => !l.active && l.slug !== 'custom' && l.rows > 0).length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {config.layouts.filter(l => !l.active && l.slug !== 'custom' && l.rows > 0).map(l => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl border-2 border-dashed border-coral-light/40 bg-cream/50 opacity-55"
                  >
                    <div className="mb-2">
                      <GridIcon rows={l.rows} cols={l.cols} active={false} />
                    </div>
                    <div className="font-semibold text-navy text-sm">{l.label}</div>
                    <div className="text-xs text-text-secondary mt-0.5">Coming soon</div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* ── Summary + CTA ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-coral-light/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {loading || !selectedSize || !selectedLayout ? (
          <div className="h-12 flex-1 bg-ivory rounded-xl animate-pulse" />
        ) : (
          <>
            <div>
              <div className="font-semibold text-navy text-sm">
                {count > 1
                  ? `${count} × ${selectedSize.label} magnets`
                  : `1 × ${selectedSize.label} magnet`}
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleContinue}
              className="w-full sm:w-auto"
            >
              Upload Now →
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
              Loading options…
            </div>
          }
        >
          <SelectionContent />
        </Suspense>
      </div>
    </div>
  );
}
