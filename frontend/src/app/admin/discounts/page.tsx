'use client';

import { useState, useEffect } from 'react';
import { adminGet, adminPost, adminPatch, adminDelete } from '@/lib/adminApi';

interface Discount {
  id: string; code: string; type: string; value: string;
  min_order_amount: string | null; max_uses: number | null;
  used_count: number; active: boolean;
  expires_at: string | null; created_at: string;
}

interface Voucher {
  id: string; code: string; original_amount: string;
  remaining_amount: string; active: boolean; expires_at: string | null;
}

const TYPE_OPTS = [
  { value: 'percentage',    label: '% Off',         icon: '📉' },
  { value: 'fixed',         label: '£ Off',         icon: '💷' },
  { value: 'free_shipping', label: 'Free Shipping',  icon: '🚚' },
];

const blank = { code: '', type: 'percentage', value: '', minOrder: '', maxUses: '', expiresAt: '' };

function DiscountBadge({ type }: { type: string }) {
  const opts = { percentage: 'bg-blue-100 text-blue-800', fixed: 'bg-green-100 text-green-800', free_shipping: 'bg-indigo-100 text-indigo-800' };
  const label = { percentage: '% Off', fixed: '£ Off', free_shipping: 'Free Ship' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opts[type as keyof typeof opts] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[type as keyof typeof label] ?? type}
    </span>
  );
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [vouchers, setVouchers]   = useState<Voucher[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState(blank);
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState<'discounts' | 'vouchers'>('discounts');

  const load = async () => {
    setLoading(true);
    try {
      const [d, v] = await Promise.all([
        adminGet<Discount[]>('/discounts'),
        adminGet<Voucher[]>('/vouchers'),
      ]);
      setDiscounts(d);
      setVouchers(v);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    setAdding(true);
    setError('');
    try {
      await adminPost('/discounts', {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: form.type !== 'free_shipping' ? parseFloat(form.value) : 0,
        min_order_amount: form.minOrder ? parseFloat(form.minOrder) : null,
        max_uses: form.maxUses ? parseInt(form.maxUses) : null,
        expires_at: form.expiresAt || null,
      });
      setShowAdd(false);
      setForm(blank);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const toggleDiscount = async (d: Discount) => {
    await adminPatch(`/discounts/${d.id}`, { active: !d.active });
    load();
  };

  const deleteDiscount = async (id: string) => {
    await adminDelete(`/discounts/${id}`);
    load();
  };

  const toggleVoucher = async (v: Voucher) => {
    await adminPatch(`/vouchers/${v.id}`, { active: !v.active });
    load();
  };

  const formatValue = (d: Discount) => {
    if (d.type === 'percentage') return `${parseFloat(d.value)}% off`;
    if (d.type === 'fixed')      return `£${parseFloat(d.value).toFixed(2)} off`;
    return 'Free shipping';
  };

  if (loading) return <div className="text-center py-16 text-4xl animate-pulse">🎟️</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-heading font-bold text-navy">🎟️ Discounts</h1>
        <p className="text-gray-500 mt-1 text-lg">Create discount codes and manage gift vouchers.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['discounts', 'vouchers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 rounded-2xl font-bold text-base transition-all ${tab === t ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-navy'}`}
          >
            {t === 'discounts' ? '🎟️ Discount Codes' : '🎁 Gift Vouchers'}
          </button>
        ))}
      </div>

      {tab === 'discounts' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdd(s => !s)}
              className="bg-coral text-white font-bold px-6 py-3 rounded-2xl hover:bg-coral/90 active:scale-95 transition-all text-lg"
            >
              ➕ New Code
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="bg-white rounded-3xl border border-coral/30 shadow-sm p-6">
              <h2 className="text-xl font-heading font-bold text-navy mb-5">Create Discount Code</h2>
              <div className="flex flex-col gap-4">
                {/* Type selector */}
                <div>
                  <label className="block font-bold text-navy mb-2">Discount Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {TYPE_OPTS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`px-4 py-3 rounded-2xl font-bold border-2 transition-all ${form.type === t.value ? 'border-coral bg-coral/10 text-coral' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-navy mb-1">Code</label>
                    <input
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SUMMER20"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base font-bold tracking-widest uppercase focus:outline-none focus:border-coral"
                    />
                  </div>
                  {form.type !== 'free_shipping' && (
                    <div>
                      <label className="block font-bold text-navy mb-1">
                        {form.type === 'percentage' ? 'Percentage Off (%)' : 'Amount Off (£)'}
                      </label>
                      <input
                        type="number" step={form.type === 'percentage' ? '1' : '0.01'} min="0"
                        value={form.value}
                        onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                        placeholder={form.type === 'percentage' ? '20' : '5.00'}
                        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-navy mb-1">Min Order (£) — optional</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.minOrder}
                      onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                      placeholder="e.g. 15.00"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-navy mb-1">Max Uses — optional</label>
                    <input
                      type="number" step="1" min="1"
                      value={form.maxUses}
                      onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-navy mb-1">Expires — optional</label>
                    <input
                      type="date"
                      value={form.expiresAt}
                      onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={add} disabled={adding || !form.code}
                    className="flex-1 py-4 bg-coral text-white font-bold text-lg rounded-2xl hover:bg-coral/90 disabled:opacity-50"
                  >
                    {adding ? 'Creating…' : '✅ Create Code'}
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setError(''); }}
                    className="px-5 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discounts list */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {discounts.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xl">
                No discount codes yet — create one! 🎟️
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {discounts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-4 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold font-mono text-navy text-lg tracking-widest">{d.code}</span>
                        <DiscountBadge type={d.type} />
                        {!d.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-gray-500 text-sm mt-0.5">
                        {formatValue(d)}
                        {d.min_order_amount && ` · min £${parseFloat(d.min_order_amount).toFixed(2)}`}
                        {d.max_uses && ` · ${d.used_count}/${d.max_uses} used`}
                        {!d.max_uses && d.used_count > 0 && ` · used ${d.used_count}×`}
                        {d.expires_at && ` · expires ${new Date(d.expires_at).toLocaleDateString('en-GB')}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleDiscount(d)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${d.active ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${d.active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <button
                        onClick={() => deleteDiscount(d.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'vouchers' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {vouchers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xl">
              No gift vouchers yet 🎁
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {vouchers.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-navy text-lg tracking-widest">{v.code}</span>
                      {!v.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="text-gray-500 text-sm mt-0.5">
                      £{parseFloat(v.remaining_amount).toFixed(2)} remaining of £{parseFloat(v.original_amount).toFixed(2)}
                      {v.expires_at && ` · expires ${new Date(v.expires_at).toLocaleDateString('en-GB')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleVoucher(v)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${v.active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${v.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
