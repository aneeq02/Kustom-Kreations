'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPatch } from '@/lib/adminApi';
import { gbp } from '@/lib/adminStatus';
import { AffixInput, Alert, Btn, Field, Icon, PageHeader, Toggle } from '@/components/admin/ui';
import MagnetPreview from '@/components/studio/MagnetPreview';

interface MagnetSize {
  id: string; label: string; size_mm: number; price: string; active: boolean;
}

interface TileLayout {
  id: string; slug: string; label: string; rows: number; cols: number;
  active: boolean; bulk_discount_pct: number; bulk_discount_qty: number | null;
}

function useSaveFlag() {
  const [saved, setSaved] = useState(false);
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return [saved, flash] as const;
}

function SizeCard({ size, onSave }: { size: MagnetSize; onSave: () => void }) {
  const [price, setPrice]   = useState(parseFloat(size.price).toFixed(2));
  const [active, setActive] = useState(size.active);
  const [saving, setSaving] = useState(false);
  const [saved, flash]      = useSaveFlag();
  const [error, setError]   = useState('');

  const save = async (activeValue = active) => {
    setSaving(true);
    setError('');
    try {
      await adminPatch(`/products/sizes/${size.id}`, { price: parseFloat(price), active: activeValue });
      flash();
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const dirty = price !== parseFloat(size.price).toFixed(2);

  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 flex flex-col gap-4 transition-opacity ${active ? 'border-border/80' : 'border-dashed border-border opacity-75'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-3xl text-navy leading-none">{size.label}</p>
          <p className="text-sm text-text-secondary mt-1.5">{active ? 'Offered in the shop' : 'Hidden from customers'}</p>
        </div>
        <Toggle
          checked={active}
          label={`Offer ${size.label} magnets`}
          disabled={saving}
          onChange={() => { const next = !active; setActive(next); save(next); }}
        />
      </div>
      <Field label="Price per magnet" htmlFor={`price-${size.id}`}>
        <div className="flex gap-2">
          <div className="flex-1">
            <AffixInput
              id={`price-${size.id}`}
              prefix="£"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>
          <Btn onClick={() => save()} disabled={saving || (!dirty && !saved)} className="w-24">
            {saving ? '…' : saved ? <Icon name="check" className="w-5 h-5" /> : 'Save'}
          </Btn>
        </div>
      </Field>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

function LayoutCard({ layout, pricePerMagnet, onSave }: { layout: TileLayout; pricePerMagnet: number | null; onSave: () => void }) {
  const [active, setActive]     = useState(layout.active);
  const [discount, setDiscount] = useState(layout.bulk_discount_pct.toString());
  const [bulkQty, setBulkQty]   = useState(layout.bulk_discount_qty?.toString() ?? '');
  const [saving, setSaving]     = useState(false);
  const [saved, flash]          = useSaveFlag();
  const [error, setError]       = useState('');

  const save = async (activeValue = active) => {
    setSaving(true);
    setError('');
    try {
      const qty = parseInt(bulkQty, 10);
      await adminPatch(`/products/layouts/${layout.id}`, {
        active: activeValue,
        bulkDiscountPct: parseFloat(discount) || 0,
        bulkDiscountQty: Number.isFinite(qty) && qty > 0 ? qty : null,
      });
      flash();
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const count = layout.rows * layout.cols;
  const dirty = discount !== layout.bulk_discount_pct.toString() || bulkQty !== (layout.bulk_discount_qty?.toString() ?? '');

  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 flex flex-col gap-4 transition-opacity ${active ? 'border-border/80' : 'border-dashed border-border opacity-75'}`}>
      <div className="flex items-start gap-3.5">
        <MagnetPreview thumbUrl={null} rows={layout.rows} cols={layout.cols} size={48} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy">{count === 1 ? 'Single magnet' : layout.label}</p>
          <p className="text-sm text-text-secondary">
            {count} magnet{count > 1 ? 's' : ''}
            {pricePerMagnet !== null && <> · {gbp(pricePerMagnet * count)} at 50mm</>}
          </p>
        </div>
        <Toggle
          checked={active}
          label={`Offer ${layout.label}`}
          disabled={saving}
          onChange={() => { const next = !active; setActive(next); save(next); }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Bulk from (qty)" htmlFor={`qty-${layout.id}`}>
          <input
            id={`qty-${layout.id}`}
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            placeholder="Off"
            value={bulkQty}
            onChange={e => setBulkQty(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg border border-border bg-white text-navy text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </Field>
        <Field label="Discount" htmlFor={`pct-${layout.id}`}>
          <AffixInput
            id={`pct-${layout.id}`}
            suffix="%"
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            max="100"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs text-text-secondary -mt-1.5">
        {bulkQty && Number(bulkQty) > 0
          ? `Orders with ${bulkQty}+ of these get ${discount || 0}% off them.`
          : 'Leave the quantity empty to turn the bulk discount off.'}
      </p>
      {error && <Alert>{error}</Alert>}
      <Btn variant={dirty ? 'primary' : 'secondary'} onClick={() => save()} disabled={saving || (!dirty && !saved)} className="w-full">
        {saving ? 'Saving…' : saved ? <><Icon name="check" className="w-4 h-4" /> Saved</> : 'Save discount'}
      </Btn>
    </div>
  );
}

export default function AdminProductsPage() {
  const [sizes, setSizes]     = useState<MagnetSize[]>([]);
  const [layouts, setLayouts] = useState<TileLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const base = sizes.find(s => s.size_mm === 50) ?? sizes[0];
  const basePrice = base ? parseFloat(base.price) : null;
  const visibleLayouts = layouts.filter(l => l.slug !== 'custom' && l.rows > 0);

  return (
    <div className="flex flex-col gap-7 sm:gap-9">
      <PageHeader title="Products" subtitle="Set prices and choose which sizes and layouts customers can order." />

      {error && <Alert>{error}</Alert>}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Magnet sizes</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[0, 1].map(i => <div key={i} className="h-44 rounded-xl bg-white border border-border/70 animate-pulse" />)}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {sizes.map(s => <SizeCard key={s.id} size={s} onSave={load} />)}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Layouts &amp; bulk discounts</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[0, 1, 2].map(i => <div key={i} className="h-60 rounded-xl bg-white border border-border/70 animate-pulse" />)}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleLayouts.map(l => <LayoutCard key={l.id} layout={l} pricePerMagnet={basePrice} onSave={load} />)}
          </div>
        )}
      </section>
    </div>
  );
}
