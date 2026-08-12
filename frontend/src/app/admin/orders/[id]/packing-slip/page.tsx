'use client';

import { useState, useEffect, use } from 'react';
import QRCode from 'react-qr-code';
import { adminGet } from '@/lib/adminApi';

interface OrderItem {
  id: string;
  product_name: string | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
  image_url: string | null;
  crop_data: { rows?: number; cols?: number; sizeMm?: number } | null;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total: string;
  subtotal: string;
  shipping_cost: string;
  created_at: string;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_postcode: string;
  shipping_country: string;
  email: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  items: OrderItem[];
}

const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  IM: 'Isle of Man',
};

export default function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    adminGet<OrderDetail>(`/orders/${id}`)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl animate-pulse print:hidden">
        Loading…
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-red-600">Order not found.</div>;
  }

  const adminOrderUrl = `${origin}/admin/orders/${id}`;
  const fullName = `${order.shipping_first_name} ${order.shipping_last_name}`;
  const addressLines = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_postcode,
    COUNTRY_NAMES[order.shipping_country] ?? order.shipping_country,
  ].filter(Boolean);

  const datePlaced = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {/* Print button — hidden when actually printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <a
          href={`/admin/orders/${id}`}
          className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl hover:bg-gray-200 text-sm"
        >
          ← Back
        </a>
        <button
          onClick={() => window.print()}
          className="bg-navy text-white font-bold px-6 py-2 rounded-xl hover:bg-navy/90 text-sm"
        >
          🖨️ Print
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { margin: 0; }
          .page-break { page-break-before: always; break-before: page; }
        }
      `}</style>

      <div className="min-h-screen bg-white p-6 print:p-0 font-sans">

        {/* ══════════════════════ PACKING SLIP ══════════════════════ */}
        <div className="max-w-[210mm] mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center gap-3">
              <img src="/logo-black.png" alt="Kustom Kreations" className="w-14 h-14" />
              <div>
                <div className="text-2xl font-bold tracking-tight">KUSTOM KREATIONS</div>
                <div className="text-gray-500 text-sm mt-0.5">kustomkreations.co.uk</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-widest">Packing Slip</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">{order.order_number}</div>
              <div className="text-sm text-gray-500">{datePlaced}</div>
            </div>
          </div>

          {/* Two-column: items + QR */}
          <div className="flex gap-6 mb-6">

            {/* Items */}
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Items</div>
              <div className="flex flex-col gap-4">
                {order.items.map((item, idx) => {
                  const cd = item.crop_data;
                  const rows = cd?.rows ?? 1;
                  const cols = cd?.cols ?? 1;
                  const sizeMm = cd?.sizeMm ?? 50;
                  const gridLabel = rows === 1 && cols === 1 ? 'Single' : `${rows}×${cols} grid`;
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={`Item ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 shrink-0 flex items-center justify-center text-2xl">
                          🧲
                        </div>
                      )}
                      {/* Details */}
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{item.product_name ?? 'Fridge Magnet'}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{sizeMm}mm · {gridLabel}</div>
                        <div className="text-sm text-gray-700 mt-1">
                          Qty: <strong>{item.quantity}</strong>
                          <span className="ml-3 text-gray-500">£{parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order totals */}
              <div className="mt-4 pt-3 border-t border-gray-200 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>£{parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span><span>£{parseFloat(order.shipping_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 mt-1 pt-1 border-t border-gray-300">
                  <span>Total</span><span>£{parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* QR code + ship-to */}
            <div className="w-48 shrink-0 flex flex-col gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Scan to view order</div>
                <div className="border border-gray-200 rounded p-2 inline-block">
                  <QRCode value={adminOrderUrl} size={128} />
                </div>
                <div className="text-[10px] text-gray-400 mt-1 break-all">{order.order_number}</div>
              </div>

              {order.tracking_number && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Tracking</div>
                  <div className="text-sm font-mono text-gray-700">{order.tracking_number}</div>
                  {order.tracking_carrier && (
                    <div className="text-xs text-gray-500">{order.tracking_carrier}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ship-to on packing slip */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Deliver to</div>
            <div className="font-bold text-gray-900 text-lg">{fullName}</div>
            {addressLines.map((line, i) => (
              <div key={i} className="text-gray-700 text-sm">{line}</div>
            ))}
            <div className="text-sm text-gray-500 mt-1">{order.email}</div>
          </div>

          {/* Packing checklist */}
          <div className="mt-4 p-3 border border-dashed border-gray-300 rounded">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Packing checklist</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {order.items.map((item, idx) => {
                const cd = item.crop_data;
                const rows = cd?.rows ?? 1;
                const cols = cd?.cols ?? 1;
                const count = rows * cols;
                return (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-4 h-4 border border-gray-400 rounded-sm inline-block shrink-0 print:border-gray-600" />
                    {count > 1 ? `${count}× magnets (${rows}×${cols})` : `1× magnet`} — item {idx + 1}
                  </label>
                );
              })}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-4 h-4 border border-gray-400 rounded-sm inline-block shrink-0 print:border-gray-600" />
                Images match customer photos
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-4 h-4 border border-gray-400 rounded-sm inline-block shrink-0 print:border-gray-600" />
                Address verified
              </label>
            </div>
          </div>

          {/* Cut line */}
          <div className="my-6 flex items-center gap-3 text-gray-300">
            <div className="flex-1 border-t-2 border-dashed border-gray-300" />
            <span className="text-xs uppercase tracking-widest text-gray-400">Cut here — Shipping Label below</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          </div>

          {/* ══════════════════════ SHIPPING LABEL ══════════════════════ */}
          <div className="border-2 border-gray-800 rounded-lg p-5">
            <div className="flex gap-5">

              {/* Addresses */}
              <div className="flex-1">
                {/* From */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">From</div>
                  <div className="text-sm font-semibold text-gray-700">Kustom Kreations</div>
                  <div className="text-xs text-gray-500">kustomkreations.co.uk</div>
                </div>

                {/* To */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">To</div>
                  <div className="text-xl font-bold text-gray-900 leading-tight">{fullName}</div>
                  {addressLines.map((line, i) => (
                    <div key={i} className={`text-gray-900 ${i === 0 ? 'text-base font-semibold mt-1' : 'text-sm'}`}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column: QR + order number */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="border border-gray-300 rounded p-1.5">
                  <QRCode value={adminOrderUrl} size={96} />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest">Order</div>
                  <div className="font-bold text-gray-900 text-sm">{order.order_number}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-3 print:hidden">
            Use the print button above to print this page. The shipping label is below the cut line.
          </div>
        </div>
      </div>
    </>
  );
}
