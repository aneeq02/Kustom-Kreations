'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPost, adminPatch, adminDelete } from '@/lib/adminApi';
import BottomSheet from '@/components/configurator/BottomSheet';
import { AffixInput, Alert, Btn, EmptyState, Field, Icon, PageHeader, SkeletonRows, Toggle, inputCls } from '@/components/admin/ui';

interface ShippingMethod {
  id: string; zone_id: string; zone_name: string;
  name: string; carrier: string | null; estimated_days_min: number | null; estimated_days_max: number | null;
  price: string; free_over_amount: string | null;
  active: boolean;
}

interface ShippingZone {
  id: string; name: string; country_codes: string[];
}

interface ShippingData {
  zones: ShippingZone[];
  methods: ShippingMethod[];
}

const blank = {
  zone_id: '', name: '', carrier: '', estimated_days_min: '3', estimated_days_max: '5',
  price: '0.00', free_over_amount: '',
};

function MethodCard({ method, onChanged }: { method: ShippingMethod; onChanged: () => void }) {
  const [active, setActive]     = useState(method.active);
  const [price, setPrice]       = useState(parseFloat(method.price).toFixed(2));
  const [freeOver, setFreeOver] = useState(method.free_over_amount ?? '');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [confirming, setConfirming] = useState(false);

  const save = async (activeValue = active) => {
    setSaving(true);
    setError('');
    try {
      await adminPatch(`/shipping/methods/${method.id}`, {
        active: activeValue,
        price: parseFloat(price),
        free_over_amount: freeOver ? parseFloat(freeOver) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    await adminDelete(`/shipping/methods/${method.id}`);
    setConfirming(false);
    onChanged();
  };

  const dirty = price !== parseFloat(method.price).toFixed(2) || freeOver !== (method.free_over_amount ?? '');

  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 flex flex-col gap-4 ${active ? 'border-border/80' : 'border-dashed border-border'}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-cream text-brand flex items-center justify-center shrink-0">
          <Icon name="shipping" />
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${active ? 'text-navy' : 'text-navy/55'}`}>{method.name}</p>
          <p className="text-sm text-text-secondary">
            {[method.carrier, method.estimated_days_min != null && `${method.estimated_days_min}–${method.estimated_days_max} days`].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* Toggling saves immediately, like everywhere else in the admin */}
        <Toggle
          checked={active}
          label={`${active ? 'Turn off' : 'Turn on'} ${method.name}`}
          disabled={saving}
          onChange={() => { const next = !active; setActive(next); save(next); }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Price" htmlFor={`p-${method.id}`}>
          <AffixInput id={`p-${method.id}`} prefix="£" type="number" inputMode="decimal" step="0.01" min="0"
            value={price} onChange={e => setPrice(e.target.value)} />
        </Field>
        <Field label="Free over" htmlFor={`f-${method.id}`}>
          <AffixInput id={`f-${method.id}`} prefix="£" type="number" inputMode="decimal" step="0.01" min="0"
            placeholder="Never" value={freeOver} onChange={e => setFreeOver(e.target.value)} />
        </Field>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-2">
        <Btn variant={dirty ? 'primary' : 'secondary'} onClick={() => save()} disabled={saving || (!dirty && !saved)} className="flex-1">
          {saving ? 'Saving…' : saved ? <><Icon name="check" className="w-4 h-4" /> Saved</> : 'Save'}
        </Btn>
        {confirming ? (
          <>
            <Btn variant="secondary" onClick={() => setConfirming(false)}>Cancel</Btn>
            <Btn variant="danger" onClick={del}>Delete</Btn>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${method.name}`}
            className="w-11 h-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-red-700 hover:border-red-200 hover:bg-red-50 cursor-pointer"
          >
            <Icon name="trash" className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminShippingPage() {
  const [data, setData]       = useState<ShippingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(blank);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const d = await adminGet<ShippingData>('/shipping');
      setData(d);
      setForm(f => (f.zone_id || !d.zones[0] ? f : { ...f, zone_id: d.zones[0].id }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setAdding(true);
    setError('');
    try {
      await adminPost('/shipping/methods', {
        zone_id:            form.zone_id,
        name:               form.name,
        carrier:            form.carrier || null,
        price:              parseFloat(form.price) || 0,
        free_over_amount:   form.free_over_amount ? parseFloat(form.free_over_amount) : null,
        estimated_days_min: Number(form.estimated_days_min),
        estimated_days_max: Number(form.estimated_days_max),
      });
      setShowAdd(false);
      setForm({ ...blank, zone_id: data?.zones[0]?.id ?? '' });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const zones = data?.zones ?? [];
  const methods = data?.methods ?? [];
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shipping"
        subtitle="Delivery options and prices customers see at checkout."
        action={
          <Btn onClick={() => { setError(''); setShowAdd(true); }} className="hidden sm:inline-flex">
            <Icon name="plus" className="w-4 h-4" /> Add method
          </Btn>
        }
      />

      <Btn size="lg" onClick={() => { setError(''); setShowAdd(true); }} className="sm:hidden w-full">
        <Icon name="plus" className="w-5 h-5" /> Add delivery method
      </Btn>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-xl border border-border/80">
          <EmptyState icon="shipping" title="No delivery methods yet" body="Customers can’t check out until you add at least one." />
        </div>
      ) : (
        zones.map(zone => {
          const zoneMethods = methods.filter(m => m.zone_id === zone.id);
          if (!zoneMethods.length) return null;
          return (
            <section key={zone.id} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{zone.name}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {zoneMethods.map(m => <MethodCard key={m.id} method={m} onChanged={load} />)}
              </div>
            </section>
          );
        })
      )}

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} label="New delivery method">
        <form onSubmit={e => { e.preventDefault(); if (form.name && form.zone_id) add(); }} className="flex flex-col gap-4">
          <h2 className="font-heading text-2xl text-navy">New delivery method</h2>

          <Field label="Zone" htmlFor="zone">
            <select id="zone" value={form.zone_id} onChange={set('zone_id')} className={inputCls}>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </Field>
          <Field label="Name customers see" htmlFor="name">
            <input id="name" value={form.name} onChange={set('name')} placeholder="Standard delivery" className={inputCls} />
          </Field>
          <Field label="Carrier" htmlFor="carrier">
            <input id="carrier" value={form.carrier} onChange={set('carrier')} placeholder="Royal Mail" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" htmlFor="price">
              <AffixInput id="price" prefix="£" type="number" inputMode="decimal" step="0.01" min="0" value={form.price} onChange={set('price')} />
            </Field>
            <Field label="Free over" hint="Optional" htmlFor="free">
              <AffixInput id="free" prefix="£" type="number" inputMode="decimal" step="0.01" min="0" placeholder="30" value={form.free_over_amount} onChange={set('free_over_amount')} />
            </Field>
            <Field label="Min days" htmlFor="dmin">
              <input id="dmin" type="number" inputMode="numeric" min="0" value={form.estimated_days_min} onChange={set('estimated_days_min')} className={inputCls} />
            </Field>
            <Field label="Max days" htmlFor="dmax">
              <input id="dmax" type="number" inputMode="numeric" min="0" value={form.estimated_days_max} onChange={set('estimated_days_max')} className={inputCls} />
            </Field>
          </div>

          {error && <Alert>{error}</Alert>}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Btn type="button" variant="secondary" size="lg" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn type="submit" size="lg" disabled={adding || !form.name || !form.zone_id}>{adding ? 'Adding…' : 'Add method'}</Btn>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
