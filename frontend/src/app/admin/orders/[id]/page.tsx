'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { adminGet, adminPatch, adminPost } from '@/lib/adminApi';

const ALL_STATUSES = [
  'pending', 'payment_processing', 'paid', 'in_production', 'dispatched', 'delivered', 'cancelled', 'refunded',
];

const STATUS_LABEL: Record<string, string> = {
  pending:            '⏳ New Order',
  payment_processing: '💳 Paying',
  paid:               '✅ Paid',
  in_production:      '🔨 Being Made',
  dispatched:         '🚚 Shipped',
  delivered:          '🎉 Delivered',
  cancelled:          '❌ Cancelled',
  refunded:           '💸 Refunded',
};

const STATUS_COLOR: Record<string, string> = {
  pending:            'bg-yellow-100 text-yellow-800',
  payment_processing: 'bg-blue-100 text-blue-800',
  paid:               'bg-green-100 text-green-800',
  in_production:      'bg-purple-100 text-purple-800',
  dispatched:         'bg-indigo-100 text-indigo-800',
  delivered:          'bg-emerald-100 text-emerald-800',
  cancelled:          'bg-red-100 text-red-800',
  refunded:           'bg-gray-100 text-gray-700',
};

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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 font-medium w-32 shrink-0">{label}</span>
      <span className="text-navy font-semibold">{value}</span>
    </div>
  );
}

function QualityBadge({ quality }: { quality: string | null }) {
  if (!quality) return null;
  const color = quality === 'good' ? 'text-green-600 bg-green-50'
    : quality === 'warn' ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-600 bg-red-50';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {quality === 'good' ? '✅ Good quality' : quality === 'warn' ? '⚠️ Low quality' : '❌ Poor quality'}
    </span>
  );
}

// Statuses that warrant the pack-confirmation modal before saving
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

  const [status, setStatus]   = useState('');
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier]  = useState('');
  const [notes, setNotes]      = useState('');

  const load = () =>
    adminGet<OrderDetail>(`/orders/${id}`)
      .then(o => {
        setOrder(o);
        setStatus(o.status);
        setTracking(o.tracking_number ?? '');
        setCarrier(o.tracking_carrier ?? '');
        setNotes(o.notes ?? '');
        // Populate existing print file URLs
        const existing: PrintFileResult[] = o.items
          .filter(i => i.print_file_url)
          .map(i => ({
            itemId:   i.id,
            url:      i.print_file_url!,
            fileName: `print_${i.crop_data?.sizeMm ?? 50}mm_${i.crop_data?.rows ?? 1}x${i.crop_data?.cols ?? 1}.jpg`,
            rows:     i.crop_data?.rows  ?? 1,
            cols:     i.crop_data?.cols  ?? 1,
            sizeMm:   i.crop_data?.sizeMm ?? 50,
          }));
        setPrintFiles(existing);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

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
      setOrder(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Show confirmation modal for pack-critical statuses; otherwise save directly
  const handleSave = () => {
    if (order && PACK_CONFIRM_STATUSES.has(status) && status !== order.status) {
      setShowPackConfirm(true);
    } else {
      doSave();
    }
  };

  const generatePrintFiles = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await adminPost<{ files: PrintFileResult[] }>(
        `/orders/${id}/print-files/generate`,
        {},
      );
      setPrintFiles(result.files);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-4xl animate-pulse">📦</div>;
  if (!order)  return <div className="text-red-600 p-6">{error || 'Order not found'}</div>;

  const fullName = `${order.shipping_first_name} ${order.shipping_last_name}`;
  const address  = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_postcode,
    order.shipping_country,
  ].filter(Boolean).join(', ');

  return (
    <>
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back + actions row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/admin/orders" className="text-gray-400 hover:text-navy font-semibold">
          ← Back to Orders
        </Link>
        <Link
          href={`/admin/orders/${id}/packing-slip`}
          target="_blank"
          rel="noreferrer"
          className="bg-navy text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-navy/90 active:scale-95 transition-all text-sm"
        >
          🖨️ Print Packing Slip &amp; Label
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-heading font-bold text-navy">{order.order_number}</h1>
          <p className="text-gray-500 mt-1">
            Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-base font-bold ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-xl font-heading font-bold text-navy">🧲 Items Ordered</h2>
        </div>

        {order.items.map(item => {
          const cd = item.crop_data;
          const gridLabel = cd ? `${cd.rows ?? 1}×${cd.cols ?? 1}` : '1×1';
          const sizeMm    = cd?.sizeMm ?? 50;
          return (
            <div key={item.id} className="px-6 py-5 border-b border-gray-50 last:border-0">
              {/* Image + details row */}
              <div className="flex gap-5">
                {/* Customer image — large preview */}
                {item.image_url ? (
                  <a href={item.image_url} target="_blank" rel="noreferrer" className="shrink-0 group">
                    <img
                      src={item.image_url}
                      alt={item.product_name ?? 'Magnet'}
                      className="w-40 h-40 rounded-2xl object-cover border border-gray-100 shadow-sm group-hover:opacity-90 transition-opacity"
                    />
                    <div className="text-xs text-center text-gray-400 mt-1">Click to open</div>
                  </a>
                ) : (
                  <div className="w-40 h-40 rounded-2xl bg-gray-100 shrink-0 flex flex-col items-center justify-center text-4xl gap-1">
                    🧲
                    <span className="text-xs text-gray-400">No image</span>
                  </div>
                )}

                {/* Item meta */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-navy text-xl">{item.product_name ?? 'Fridge Magnet'}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <QualityBadge quality={item.image_quality} />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                      {sizeMm}mm · {gridLabel} grid
                    </span>
                  </div>
                  <div className="text-gray-600 text-sm mt-2">
                    Qty: <strong>{item.quantity}</strong> × £{parseFloat(item.unit_price).toFixed(2)}
                  </div>
                  <div className="font-bold text-navy text-lg mt-1">
                    £{parseFloat(item.subtotal).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Totals */}
        <div className="px-6 py-4 bg-gray-50 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>£{parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span><span>£{parseFloat(order.shipping_cost).toFixed(2)}</span>
          </div>
          {parseFloat(order.discount_amount) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span><span>−£{parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-navy font-bold text-lg border-t border-gray-200 pt-2 mt-1">
            <span>Total</span><span>£{parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Print files */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-heading font-bold text-navy">🖨️ Print-Ready Files</h2>
          <button
            onClick={generatePrintFiles}
            disabled={generating}
            className="bg-navy text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-navy/90 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            {generating ? 'Generating…' : printFiles.length ? '🔄 Regenerate' : '📥 Generate Files'}
          </button>
        </div>

        {genError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            ⚠️ {genError}
          </div>
        )}

        {printFiles.length > 0 ? (
          <div className="flex flex-col gap-3">
            {printFiles.map(f => {
              const tileMm  = f.sizeMm;
              const totalW  = Math.round((tileMm / 25.4) * 300) * f.cols;
              const totalH  = Math.round((tileMm / 25.4) * 300) * f.rows;
              return (
                <div key={f.itemId} className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                  <div>
                    <div className="font-bold text-navy">{f.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {f.rows}×{f.cols} grid · {tileMm}mm magnets · {totalW}×{totalH}px @ 300 DPI
                    </div>
                  </div>
                  <a
                    href={f.url}
                    download={f.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-coral text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-coral/90 active:scale-95 transition-all shrink-0"
                  >
                    ⬇️ Download
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-6">
            No print files yet — click Generate Files to create them.
          </div>
        )}
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-heading font-bold text-navy mb-4">👤 Customer</h2>
        <div className="flex flex-col gap-2">
          <InfoRow label="Name"       value={fullName} />
          <InfoRow label="Email"      value={order.email} />
          <InfoRow label="Phone"      value={order.phone} />
          <InfoRow label="Address"    value={address} />
          <InfoRow label="Referred by" value={order.is_registered ? 'Registered customer' : (order.referral_source ?? null)} />
        </div>
      </div>

      {/* Update panel */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-heading font-bold text-navy mb-5">✏️ Update Order</h2>

        <div className="flex flex-col gap-5">
          {/* Status */}
          <div>
            <label className="block font-bold text-navy mb-2">Order Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                    status === s
                      ? 'border-coral bg-coral/10 text-coral'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {STATUS_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-navy mb-2">Carrier</label>
              <input
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="Royal Mail"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
              />
            </div>
            <div>
              <label className="block font-bold text-navy mb-2">Tracking Number</label>
              <input
                value={tracking}
                onChange={e => setTracking(e.target.value)}
                placeholder="AB123456789GB"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-navy mb-2">Internal Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this order..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`py-4 px-6 rounded-2xl font-bold text-xl transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-coral text-white hover:bg-coral/90 active:scale-95'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>

      {/* ── Pack confirmation modal ──────────────────────────────────── */}
      {showPackConfirm && order && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-heading font-bold text-navy">
                {status === 'in_production' ? '🔨 Confirm — Mark as Being Made?' : '🚚 Confirm — Mark as Dispatched?'}
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                Double-check the details below before confirming. This updates the customer&apos;s tracking page.
              </p>
            </div>

            {/* Items preview */}
            <div className="flex flex-col gap-3">
              {order.items.map(item => {
                const cd = item.crop_data;
                const rows = cd?.rows ?? 1;
                const cols = cd?.cols ?? 1;
                const sizeMm = cd?.sizeMm ?? 50;
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name ?? 'Magnet'}
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0 flex items-center justify-center text-2xl">🧲</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy">{item.product_name ?? 'Fridge Magnet'}</div>
                      <div className="text-sm text-gray-500">
                        {sizeMm}mm · {rows === 1 && cols === 1 ? 'Single' : `${rows}×${cols} grid`}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">Qty: <strong>{item.quantity}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Address */}
            <div className="bg-blue-50 rounded-2xl p-4 text-sm">
              <div className="font-bold text-navy mb-1">Shipping to</div>
              <div className="text-gray-700 leading-relaxed">
                {order.shipping_first_name} {order.shipping_last_name}<br />
                {order.shipping_address_line1}
                {order.shipping_address_line2 && <>, {order.shipping_address_line2}</>}<br />
                {order.shipping_city}, {order.shipping_postcode}<br />
                {order.shipping_country}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPackConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doSave}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-coral text-white font-bold hover:bg-coral/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : status === 'in_production' ? '✅ Yes, Being Made' : '✅ Yes, Dispatched'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
