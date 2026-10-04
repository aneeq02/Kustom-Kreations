'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPost, adminPatch, adminDelete } from '@/lib/adminApi';
import { gbp } from '@/lib/adminStatus';
import BottomSheet from '@/components/configurator/BottomSheet';
import { AffixInput, Alert, Btn, EmptyState, Field, Icon, PageHeader, SkeletonRows, Toggle, inputCls } from '@/components/admin/ui';

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
  { value: 'percentage',    label: '% off' },
  { value: 'fixed',         label: '£ off' },
  { value: 'free_shipping', label: 'Free delivery' },
];

const blank = { code: '', type: 'percentage', value: '', minOrder: '', maxUses: '', expiresAt: '' };

function describe(d: Discount) {
  const parts = [
    d.type === 'percent' || d.type === 'percentage' ? `${parseFloat(d.value)}% off`
      : d.type === 'fixed_gbp' || d.type === 'fixed' ? `${gbp(d.value)} off`
      : d.type === 'free_shipping' ? 'Free delivery'
      : d.type,
  ];
  if (d.min_order_amount) parts.push(`min ${gbp(d.min_order_amount)}`);
  if (d.max_uses) parts.push(`${d.used_count}/${d.max_uses} used`);
  else if (d.used_count > 0) parts.push(`used ${d.used_count}×`);
  if (d.expires_at) parts.push(`ends ${new Date(d.expires_at).toLocaleDateString('en-GB')}`);
  return parts.join(' · ');
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
  const [confirmDelete, setConfirmDelete] = useState<Discount | null>(null);
  const [busyId, setBusyId]       = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

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
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try { await fn(); await load(); } finally { setBusyId(null); }
  };

  const canCreate = !!form.code.trim() && (form.type === 'free_shipping' || !!form.value);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Discounts"
        subtitle="Promo codes and gift vouchers."
        action={tab === 'discounts' && (
          <Btn onClick={() => { setError(''); setShowAdd(true); }} className="hidden sm:inline-flex">
            <Icon name="plus" className="w-4 h-4" /> New code
          </Btn>
        )}
      />

      {/* Segmented tabs */}
      <div className="grid grid-cols-2 sm:inline-grid sm:w-80 p-1 rounded-lg bg-white border border-border" role="tablist">
        {(['discounts', 'vouchers'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 rounded-md text-sm font-semibold transition-colors cursor-pointer ${tab === t ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy'}`}
          >
            {t === 'discounts' ? `Codes (${discounts.length})` : `Vouchers (${vouchers.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : tab === 'discounts' ? (
        <>
          <Btn size="lg" onClick={() => { setError(''); setShowAdd(true); }} className="sm:hidden w-full">
            <Icon name="plus" className="w-5 h-5" /> New code
          </Btn>

          {discounts.length === 0 ? (
            <div className="bg-white rounded-xl border border-border/80">
              <EmptyState icon="discounts" title="No discount codes yet" body="Create one to run a promotion or thank a loyal customer." />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {discounts.map(d => (
                <li key={d.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${d.active ? 'border-border/80' : 'border-dashed border-border'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono font-semibold tracking-wider text-[15px] ${d.active ? 'text-navy' : 'text-navy/50'}`}>{d.code}</span>
                      {!d.active && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cream text-text-secondary">Paused</span>}
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">{describe(d)}</p>
                  </div>
                  <Toggle
                    checked={d.active}
                    label={`${d.active ? 'Pause' : 'Activate'} ${d.code}`}
                    disabled={busyId === d.id}
                    onChange={() => run(d.id, () => adminPatch(`/discounts/${d.id}`, { active: !d.active }))}
                  />
                  <button
                    onClick={() => setConfirmDelete(d)}
                    aria-label={`Delete ${d.code}`}
                    className="w-11 h-11 -mr-1.5 shrink-0 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Icon name="trash" className="w-4.5 h-4.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : vouchers.length === 0 ? (
        <div className="bg-white rounded-xl border border-border/80">
          <EmptyState icon="gift" title="No gift vouchers yet" body="Vouchers bought by customers will appear here." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {vouchers.map(v => {
            const used = 1 - parseFloat(v.remaining_amount) / (parseFloat(v.original_amount) || 1);
            return (
              <li key={v.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${v.active ? 'border-border/80' : 'border-dashed border-border'}`}>
                <div className="flex-1 min-w-0">
                  <span className={`font-mono font-semibold tracking-wider text-[15px] ${v.active ? 'text-navy' : 'text-navy/50'}`}>{v.code}</span>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {gbp(v.remaining_amount)} left of {gbp(v.original_amount)}
                    {v.expires_at && ` · ends ${new Date(v.expires_at).toLocaleDateString('en-GB')}`}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-cream overflow-hidden max-w-xs">
                    <div className="h-full bg-brand/60" style={{ width: `${Math.min(100, Math.max(0, used * 100))}%` }} />
                  </div>
                </div>
                <Toggle
                  checked={v.active}
                  label={`${v.active ? 'Pause' : 'Activate'} voucher ${v.code}`}
                  disabled={busyId === v.id}
                  onChange={() => run(v.id, () => adminPatch(`/vouchers/${v.id}`, { active: !v.active }))}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Create code ── */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} label="New discount code">
        <form
          onSubmit={e => { e.preventDefault(); if (canCreate) add(); }}
          className="flex flex-col gap-4"
        >
          <h2 className="font-heading text-2xl text-navy">New discount code</h2>

          <div role="radiogroup" aria-label="Discount type" className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-cream">
            {TYPE_OPTS.map(t => (
              <button
                type="button"
                key={t.value}
                role="radio"
                aria-checked={form.type === t.value}
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
                className={`h-10 rounded-md text-sm font-semibold transition-colors cursor-pointer ${form.type === t.value ? 'bg-white text-navy shadow-sm' : 'text-navy/65'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={form.type === 'free_shipping' ? 'col-span-2' : ''}>
              <Field label="Code" htmlFor="code">
                <input
                  id="code"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  placeholder="SUMMER20"
                  autoCapitalize="characters"
                  className={`${inputCls} font-mono tracking-wider uppercase`}
                />
              </Field>
            </div>
            {form.type !== 'free_shipping' && (
              <Field label={form.type === 'percentage' ? 'Percent off' : 'Amount off'} htmlFor="value">
                <AffixInput
                  id="value"
                  prefix={form.type === 'fixed' ? '£' : undefined}
                  suffix={form.type === 'percentage' ? '%' : undefined}
                  type="number"
                  inputMode="decimal"
                  step={form.type === 'percentage' ? '1' : '0.01'}
                  min="0"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === 'percentage' ? '20' : '5.00'}
                />
              </Field>
            )}
            <Field label="Min order" hint="Optional" htmlFor="min">
              <AffixInput id="min" prefix="£" type="number" inputMode="decimal" step="0.01" min="0"
                value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} placeholder="15.00" />
            </Field>
            <Field label="Max uses" hint="Optional" htmlFor="max">
              <input id="max" type="number" inputMode="numeric" step="1" min="1"
                value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="100" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Expires" hint="Optional — leave empty to never expire" htmlFor="exp">
                <input id="exp" type="date" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
              </Field>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Btn type="button" variant="secondary" size="lg" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn type="submit" size="lg" disabled={adding || !canCreate}>{adding ? 'Creating…' : 'Create code'}</Btn>
          </div>
        </form>
      </BottomSheet>

      {/* ── Delete confirmation ── */}
      <BottomSheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} label="Delete code">
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl text-navy">Delete {confirmDelete.code}?</h2>
            <p className="text-sm text-text-secondary">
              Customers won’t be able to use this code any more. If it’s already been used on an order, it’s archived instead so that order keeps its record — either way it disappears from this list. To stop it temporarily, pause it instead.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="secondary" size="lg" onClick={() => setConfirmDelete(null)}>Keep it</Btn>
              <Btn
                variant="danger"
                size="lg"
                disabled={busyId === confirmDelete.id}
                onClick={async () => {
                  const d = confirmDelete;
                  await run(d.id, () => adminDelete(`/discounts/${d.id}`));
                  setConfirmDelete(null);
                }}
              >
                Delete
              </Btn>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
