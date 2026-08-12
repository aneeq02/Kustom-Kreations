'use client';

import { useState, useEffect } from 'react';
import { adminGet, adminPatch } from '@/lib/adminApi';

interface MagnetSize {
  id: string; label: string; size_mm: number; price: string; active: boolean;
}

interface TileLayout {
  id: string; slug: string; label: string; rows: number; cols: number;
  active: boolean; bulk_discount_pct: number; bulk_discount_qty: number | null;
}

function SizeCard({ size, onSave }: { size: MagnetSize; onSave: () => void }) {
  const [price, setPrice]     = useState(parseFloat(size.price).toFixed(2));
  const [active, setActive]   = useState(size.active);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  const save = async (overrideActive?: boolean) => {
    const activeValue = overrideActive !== undefined ? overrideActive : active;
    setSaving(true);
    setError('');
    try {
      await adminPatch(`/products/sizes/${size.id}`, { price: parseFloat(price), active: activeValue });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    const next = !active;
    setActive(next);
    save(next);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-heading font-bold text-navy">{size.label}</div>
          <div className="text-gray-500">{size.size_mm}mm magnet</div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-60 ${active ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>
      <div>
        <label className="block font-bold text-navy mb-2">Price (£)</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl pl-8 pr-4 py-3 text-base font-bold focus:outline-none focus:border-coral"
            />
          </div>
          <button
            onClick={() => save()}
            disabled={saving}
            className={`px-5 py-3 rounded-2xl font-bold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-coral text-white hover:bg-coral/90 active:scale-95'} disabled:opacity-50`}
          >
            {saving ? '…' : saved ? '✅' : '💾 Save'}
          </button>
        </div>
        {error && <div className="mt-2 text-red-600 text-sm font-semibold">⚠️ {error}</div>}
      </div>
    </div>
  );
}

const GRID_ICON: Record<string, string> = {
  '1x1': '⬜', '2x2': '⊞', '3x3': '⊟', '4x4': '⊠', '5x5': '⊡',
};

function LayoutCard({ layout, onSave }: { layout: TileLayout; onSave: () => void }) {
  const [active, setActive]     = useState(layout.active);
  const [discount, setDiscount] = useState(layout.bulk_discount_pct.toString());
  const [bulkQty, setBulkQty]   = useState(layout.bulk_discount_qty?.toString() ?? '');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  const save = async (overrideActive?: boolean) => {
    const activeValue = overrideActive !== undefined ? overrideActive : active;
    setSaving(true);
    setError('');
    try {
      const qty = parseInt(bulkQty, 10);
      await adminPatch(`/products/layouts/${layout.id}`, {
        active: activeValue,
        bulkDiscountPct: parseFloat(discount) || 0,
        bulkDiscountQty: Number.isFinite(qty) && qty > 0 ? qty : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    const next = !active;
    setActive(next);
    save(next);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{GRID_ICON[layout.slug] ?? '🔲'}</span>
          <div>
            <div className="font-bold text-navy text-lg">{layout.label}</div>
            <div className="text-gray-500 text-sm">{layout.rows}×{layout.cols} grid</div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${active ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block font-bold text-navy text-sm mb-1">Bulk Discount Qty</label>
          <input
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 8"
            value={bulkQty}
            onChange={e => setBulkQty(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-coral"
          />
        </div>
        <div className="flex-1">
          <label className="block font-bold text-navy text-sm mb-1">Discount %</label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-base focus:outline-none focus:border-coral"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
          </div>
        </div>
        <button
          onClick={() => save()}
          disabled={saving}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-coral text-white hover:bg-coral/90'} disabled:opacity-50`}
        >
          {saving ? '…' : saved ? '✅' : '💾'}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Customers who add this many {layout.label} products to their order get the discount % off. Leave quantity blank to turn off.
      </p>
      {error && (
        <div className="mt-2 text-red-600 text-xs font-semibold">⚠️ {error}</div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  const [sizes, setSizes]     = useState<MagnetSize[]>([]);
  const [layouts, setLayouts] = useState<TileLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        adminGet<MagnetSize[]>('/products/sizes'),
        adminGet<TileLayout[]>('/products/layouts'),
      ]);
      setSizes(s);
      setLayouts(l);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-16 text-4xl animate-pulse">🧲</div>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-heading font-bold text-navy">🧲 Products</h1>
        <p className="text-gray-500 mt-1 text-lg">Set prices and choose which sizes and layouts to offer.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          ⚠️ {error}
        </div>
      )}

      {/* Sizes */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-navy mb-4">📏 Magnet Sizes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sizes.map(s => <SizeCard key={s.id} size={s} onSave={load} />)}
        </div>
      </div>

      {/* Layouts */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-navy mb-4">🔲 Grid Layouts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map(l => <LayoutCard key={l.id} layout={l} onSave={load} />)}
        </div>
      </div>
    </div>
  );
}
