'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { adminGet, adminPatch, adminPost } from '@/lib/adminApi';
import { SETTABLE_STATUSES, STATUS_LABEL, STATUS_TONE, gbp } from '@/lib/adminStatus';
import BottomSheet from '@/components/configurator/BottomSheet';
import { Alert, Btn, Field, Icon, Panel, StatusBadge, inputCls } from '@/components/admin/ui';

interface OrderItem {
  id: string;
  product_name: string | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
  image_url: string | null;
  print_file_url: string | null;
  image_quality: string | null;
  crop_data: { rows?: number; cols?: number; sizeMm?: number } | null;
}

interface PrintFileResult {
  itemId: string;
  url: string;
  fileName: string;
  rows: number;
  cols: number;
  sizeMm: number;
}

interface OrderDetail {
  id: string; order_number: string; status: string; total: string;
  subtotal: string; shipping_cost: string; discount_amount: string;
  created_at: string; dispatched_at: string | null; delivered_at: string | null;
  tracking_number: string | null; tracking_carrier: string | null; notes: string | null;
  referral_source: string | null; is_registered: boolean;
  shipping_first_name: string; shipping_last_name: string;
  shipping_address_line1: string; shipping_address_line2: string | null;
  shipping_city: string; shipping_postcode: string; shipping_country: string;
  email: string; phone: string | null;
  items: OrderItem[];
}

const QUALITY: Record<string, { label: string; cls: string }> = {
  good:    { label: 'Good quality', cls: 'bg-[#E5EFE8] text-[#2E6A44]' },
  warn:    { label: 'Low resolution', cls: 'bg-[#F3EEE4] text-[#76664A]' },
  blocked: { label: 'Too low to print', cls: 'bg-[#F6E4E2] text-[#973A31]' },
};

function gridLabel(cd: OrderItem['crop_data']) {
  const r = cd?.rows ?? 1, c = cd?.cols ?? 1;
  return r * c > 1 ? `${r}×${c} set` : 'Single';
}

function ItemThumb({ item, size }: { item: OrderItem; size: string }) {
  return item.image_url ? (
    <img src={item.image_url} alt={item.product_name ?? 'Customer photo'} className={`${size} rounded-lg object-cover border border-border bg-cream shrink-0`} />
  ) : (
    <div className={`${size} rounded-lg bg-cream border border-border shrink-0 flex items-center justify-center text-text-secondary`}>
      <Icon name="image" />
    </div>
  );
}

// Statuses that warrant a "double-check before packing" confirmation
const PACK_CONFIRM_STATUSES = new Set(['in_production', 'dispatched']);

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder]           = useState<OrderDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
  const [generating, setGenerating] = useState(false);
  const [printFiles, setPrintFiles] = useState<PrintFileResult[]>([]);
  const [genError, setGenError]     = useState('');
  const [showPackConfirm, setShowPackConfirm] = useState(false);

  const [status, setStatus]     = useState('');
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier]   = useState('');
  const [notes, setNotes]       = useState('');

  const load = useCallback(() =>
    adminGet<OrderDetail>(`/orders/${id}`)
      .then(o => {
        setOrder(o);
        setStatus(o.status);
        setTracking(o.tracking_number ?? '');
        setCarrier(o.tracking_carrier ?? '');
        setNotes(o.notes ?? '');
        setPrintFiles(o.items
          .filter(i => i.print_file_url)
          .map(i => ({
            itemId:   i.id,
            url:      i.print_file_url!,
            fileName: `print_${i.crop_data?.sizeMm ?? 50}mm_${i.crop_data?.rows ?? 1}x${i.crop_data?.cols ?? 1}.jpg`,
            rows:     i.crop_data?.rows  ?? 1,
            cols:     i.crop_data?.cols  ?? 1,
            sizeMm:   i.crop_data?.sizeMm ?? 50,
          })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false)), [id]);

  useEffect(() => { load(); }, [load]);

  const doSave = async () => {
    setSaving(true);
    setError('');
    setShowPackConfirm(false);
    try {
      const updated = await adminPatch<OrderDetail>(`/orders/${id}`, {
        status,
        trackingNumber:  tracking || null,
        trackingCarrier: carrier  || null,
        notes:           notes    || null,
      });
      setOrder(o => (o ? { ...o, ...updated, items: updated.items ?? o.items } : updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (order && PACK_CONFIRM_STATUSES.has(status) && status !== order.status) setShowPackConfirm(true);
    else doSave();
  };

  const generatePrintFiles = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await adminPost<{ files: PrintFileResult[] }>(`/orders/${id}/print-files/generate`, {});
      setPrintFiles(result.files);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-10 w-48 rounded-lg bg-white animate-pulse" />
        <div className="h-64 rounded-xl bg-white border border-border/70 animate-pulse" />
        <div className="h-40 rounded-xl bg-white border border-border/70 animate-pulse" />
      </div>
    );
  }
  if (!order) return <Alert>{error || 'Order not found'}</Alert>;

  const fullName = `${order.shipping_first_name} ${order.shipping_last_name}`;
  const statusDirty = status !== order.status
    || tracking !== (order.tracking_number ?? '')
    || carrier !== (order.tracking_carrier ?? '')
    || notes !== (order.notes ?? '');

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/admin/orders" className="inline-flex items-center gap-1 h-9 -ml-1 text-sm font-medium text-navy/70 hover:text-navy w-fit">
            <Icon name="back" className="w-4 h-4" /> Orders
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading text-[2rem] sm:text-[2.6rem] leading-none text-navy">{order.order_number}</h1>
                <StatusBadge status={order.status} size="md" />
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Placed {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Link
              href={`/admin/orders/${id}/packing-slip`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 w-full sm:w-auto"
            >
              <Icon name="print" className="w-4.5 h-4.5" /> Packing slip &amp; label
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4 sm:gap-5 items-start">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
            <Panel title={`Items (${order.items.length})`} flush>
              <ul className="divide-y divide-border/70 border-t border-border/70">
                {order.items.map(item => {
                  const q = item.image_quality ? QUALITY[item.image_quality] : null;
                  return (
                    <li key={item.id} className="flex gap-3.5 sm:gap-5 p-4 sm:p-5">
                      {item.image_url ? (
                        <a href={item.image_url} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Open full photo">
                          <ItemThumb item={item} size="w-24 h-24 sm:w-32 sm:h-32" />
                        </a>
                      ) : (
                        <ItemThumb item={item} size="w-24 h-24 sm:w-32 sm:h-32" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy leading-snug">{item.product_name ?? 'Photo magnet'}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cream text-navy/75">
                            {item.crop_data?.sizeMm ?? 50}mm · {gridLabel(item.crop_data)}
                          </span>
                          {q && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${q.cls}`}>{q.label}</span>}
                        </div>
                        <div className="flex items-baseline justify-between gap-2 mt-3">
                          <span className="text-sm text-text-secondary">{item.quantity} × {gbp(item.unit_price)}</span>
                          <span className="font-semibold text-navy tabular-nums">{gbp(item.subtotal)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <dl className="bg-cream/60 border-t border-border/70 px-4 sm:px-5 py-4 flex flex-col gap-1.5 text-sm rounded-b-xl">
                <div className="flex justify-between text-navy/75"><dt>Subtotal</dt><dd className="tabular-nums">{gbp(order.subtotal)}</dd></div>
                <div className="flex justify-between text-navy/75"><dt>Shipping</dt><dd className="tabular-nums">{gbp(order.shipping_cost)}</dd></div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-brand"><dt>Discount</dt><dd className="tabular-nums">−{gbp(order.discount_amount)}</dd></div>
                )}
                <div className="flex justify-between text-navy font-semibold text-base border-t border-border pt-2 mt-1">
                  <dt>Total</dt><dd className="tabular-nums">{gbp(order.total)}</dd>
                </div>
              </dl>
            </Panel>

            <Panel
              title="Print-ready files"
              action={
                <Btn size="sm" variant={printFiles.length ? 'secondary' : 'primary'} onClick={generatePrintFiles} disabled={generating}>
                  <Icon name={printFiles.length ? 'refresh' : 'download'} className="w-4 h-4" />
                  {generating ? 'Generating…' : printFiles.length ? 'Regenerate' : 'Generate'}
                </Btn>
              }
            >
              {genError && <div className="mb-3"><Alert>{genError}</Alert></div>}
              {printFiles.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {printFiles.map(f => {
                    const px = Math.round((f.sizeMm / 25.4) * 300);
                    return (
                      <li key={f.itemId} className="flex items-center gap-3 rounded-lg bg-cream/70 px-3.5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-navy text-sm truncate">{f.fileName}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {f.rows}×{f.cols} · {f.sizeMm}mm · {px * f.cols}×{px * f.rows}px @ 300 DPI
                          </p>
                        </div>
                        <a
                          href={f.url}
                          download={f.fileName}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Download ${f.fileName}`}
                          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark shrink-0"
                        >
                          <Icon name="download" className="w-4 h-4" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">No print files yet — generate them when you’re ready to print.</p>
              )}
            </Panel>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-8">
            <Panel title="Customer">
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{fullName}</p>
                  {order.email && <a href={`mailto:${order.email}`} className="text-brand break-all hover:underline">{order.email}</a>}
                  {order.phone && <p><a href={`tel:${order.phone}`} className="text-navy/80">{order.phone}</a></p>}
                </div>
                <address className="not-italic text-navy/80 leading-relaxed">
                  {order.shipping_address_line1}<br />
                  {order.shipping_address_line2 && <>{order.shipping_address_line2}<br /></>}
                  {order.shipping_city}, {order.shipping_postcode}<br />
                  {order.shipping_country}
                </address>
                <p className="text-xs text-text-secondary">
                  {order.is_registered ? 'Registered customer' : order.referral_source ? `Guest · heard via ${order.referral_source}` : 'Guest checkout'}
                </p>
              </div>
            </Panel>

            <Panel title="Update order">
              <div className="flex flex-col gap-4">
                <div role="radiogroup" aria-label="Order status" className="grid grid-cols-2 gap-2">
                  {SETTABLE_STATUSES.map(s => {
                    const on = status === s;
                    const tone = STATUS_TONE[s];
                    return (
                      <button
                        key={s}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setStatus(s)}
                        className={`h-11 px-3 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors cursor-pointer ${
                          on ? 'border-navy bg-navy text-white' : 'border-border text-navy/80 hover:border-navy/40'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${on ? 'bg-white' : tone.dot}`} />
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <Field label="Carrier" htmlFor="carrier">
                    <input id="carrier" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Royal Mail" className={inputCls} />
                  </Field>
                  <Field label="Tracking number" htmlFor="tracking">
                    <input
                      id="tracking"
                      value={tracking}
                      onChange={e => setTracking(e.target.value.toUpperCase())}
                      placeholder="AB123456789GB"
                      autoCapitalize="characters"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Internal notes" htmlFor="notes">
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Only visible to you"
                    className={`${inputCls} h-auto py-2.5 resize-none`}
                  />
                </Field>

                {error && <Alert>{error}</Alert>}

                <Btn size="lg" onClick={handleSave} disabled={saving || (!statusDirty && !saved)} className="w-full">
                  {saving ? 'Saving…' : saved ? <><Icon name="check" className="w-5 h-5" /> Saved</> : 'Save changes'}
                </Btn>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* ── Pack confirmation ── */}
      <BottomSheet open={showPackConfirm} onClose={() => setShowPackConfirm(false)} label="Confirm status change">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-2xl text-navy">
              {status === 'in_production' ? 'Mark as being made?' : 'Mark as shipped?'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Double-check the details below. This updates the customer’s tracking page.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {order.items.map(item => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg bg-cream/70 p-2.5">
                <ItemThumb item={item} size="w-14 h-14" />
                <div className="min-w-0">
                  <p className="font-medium text-navy text-sm truncate">{item.product_name ?? 'Photo magnet'}</p>
                  <p className="text-xs text-text-secondary">
                    {item.crop_data?.sizeMm ?? 50}mm · {gridLabel(item.crop_data)} · Qty {item.quantity}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-border p-3.5 text-sm">
            <p className="font-semibold text-navy mb-1">Shipping to</p>
            <p className="text-navy/80 leading-relaxed">
              {fullName}<br />
              {order.shipping_address_line1}{order.shipping_address_line2 && `, ${order.shipping_address_line2}`}<br />
              {order.shipping_city}, {order.shipping_postcode} · {order.shipping_country}
            </p>
            {status === 'dispatched' && !tracking && (
              <p className="text-xs text-[#76664A] mt-2">No tracking number added — the customer won’t see one.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" size="lg" onClick={() => setShowPackConfirm(false)}>Cancel</Btn>
            <Btn size="lg" onClick={doSave} disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</Btn>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
