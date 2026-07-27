'use client';

import { useState, useEffect } from 'react';
import { adminGet, adminPost, adminPatch, adminDelete } from '@/lib/adminApi';

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
  zone_id: '', name: '', carrier: '', estimated_days_min: 3, estimated_days_max: 5,
  price: '0.00', free_over_amount: '',
};

function MethodCard({
  method,
  onSaved,
  onDelete,
}: {
  method: ShippingMethod;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [active, setActive]   = useState(method.active);
  const [price, setPrice]     = useState(parseFloat(method.price).toFixed(2));
  const [freeOver, setFreeOver] = useState(method.free_over_amount ?? '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [confirming, setConfirming] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await adminPatch(`/shipping/methods/${method.id}`, {
        active,
        price: parseFloat(price),
        free_over_amount: freeOver ? parseFloat(freeOver) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    await adminDelete(`/shipping/methods/${method.id}`);
    onDelete();
  };

  const typeLabel = method.name.toLowerCase().includes('express') ? '⚡ Express'
    : method.name.toLowerCase().includes('free') ? '🎁 Free' : '📦 Standard';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-bold text-navy text-lg">{method.name}</div>
          <div className="text-sm text-gray-500">{method.zone_name} · {typeLabel}</div>
          {method.carrier && <div className="text-sm text-gray-400">{method.carrier}</div>}
          <div className="text-sm text-gray-400">{method.estimated_days_min}–{method.estimated_days_max} days</div>
        </div>
        <button
          onClick={() => setActive(a => !a)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (£)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">£</span>
              <input
                type="number" step="0.01" min="0"
                value={price} onChange={e => setPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-coral"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Free over (£)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">£</span>
              <input
                type="number" step="0.01" min="0"
                placeholder="e.g. 30"
                value={freeOver} onChange={e => setFreeOver(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-coral"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save} disabled={saving}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-coral text-white hover:bg-coral/90'} disabled:opacity-50`}
          >
            {saving ? '…' : saved ? '✅ Saved' : '💾 Save'}
          </button>
          {confirming ? (
            <button onClick={del} className="px-3 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">
              Confirm Delete
            </button>
          ) : (
            <button onClick={() => setConfirming(true)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-red-50 hover:text-red-600">
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminShippingPage() {
  const [data, setData]         = useState<ShippingData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(blank);
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminGet<ShippingData>('/shipping');
      setData(d);
      if (d.zones[0] && !form.zone_id) {
        setForm(f => ({ ...f, zone_id: d.zones[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-4xl animate-pulse">🚚</div>;

  const zones = data?.zones ?? [];
  const methods = data?.methods ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-heading font-bold text-navy">🚚 Shipping</h1>
          <p className="text-gray-500 mt-1 text-lg">Set your delivery options and prices.</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-coral text-white font-bold px-6 py-3 rounded-2xl hover:bg-coral/90 active:scale-95 transition-all text-lg"
        >
          ➕ Add Method
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-3xl border border-coral/30 shadow-sm p-6">
          <h2 className="text-xl font-heading font-bold text-navy mb-5">New Shipping Method</h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Zone */}
              <div>
                <label className="block font-bold text-navy mb-1">Shipping Zone</label>
                <select
                  value={form.zone_id}
                  onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral bg-white"
                >
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              {/* Name */}
              <div>
                <label className="block font-bold text-navy mb-1">Display Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Standard Delivery"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                />
              </div>
              {/* Carrier */}
              <div>
                <label className="block font-bold text-navy mb-1">Carrier</label>
                <input
                  value={form.carrier}
                  onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                  placeholder="Royal Mail"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                />
              </div>
              {/* Price */}
              <div>
                <label className="block font-bold text-navy mb-1">Price (£)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl pl-8 pr-4 py-3 text-base focus:outline-none focus:border-coral"
                  />
                </div>
              </div>
              {/* Days */}
              <div>
                <label className="block font-bold text-navy mb-1">Min Days</label>
                <input
                  type="number" min="0"
                  value={form.estimated_days_min}
                  onChange={e => setForm(f => ({ ...f, estimated_days_min: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                />
              </div>
              <div>
                <label className="block font-bold text-navy mb-1">Max Days</label>
                <input
                  type="number" min="0"
                  value={form.estimated_days_max}
                  onChange={e => setForm(f => ({ ...f, estimated_days_max: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                />
              </div>
              {/* Free over */}
              <div>
                <label className="block font-bold text-navy mb-1">Free over (£) — optional</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder="e.g. 30"
                    value={form.free_over_amount}
                    onChange={e => setForm(f => ({ ...f, free_over_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl pl-8 pr-4 py-3 text-base focus:outline-none focus:border-coral"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={add} disabled={adding || !form.name || !form.zone_id}
                className="flex-1 py-4 bg-coral text-white font-bold text-lg rounded-2xl hover:bg-coral/90 disabled:opacity-50"
              >
                {adding ? 'Adding…' : '✅ Add Shipping Method'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-5 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped by zone */}
      {zones.map(zone => {
        const zoneMethods = methods.filter(m => m.zone_id === zone.id);
        if (zoneMethods.length === 0) return null;
        return (
          <div key={zone.id}>
            <h2 className="text-xl font-heading font-bold text-navy mb-3">
              🌍 {zone.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zoneMethods.map(m => (
                <MethodCard key={m.id} method={m} onSaved={load} onDelete={load} />
              ))}
            </div>
          </div>
        );
      })}

      {methods.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-xl">
          No shipping methods yet — add one above! 🚚
        </div>
      )}
    </div>
  );
}
