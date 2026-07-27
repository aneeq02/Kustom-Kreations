'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminGet, adminPatch } from '@/lib/adminApi';

const STATUSES = [
  { value: '',               label: 'All Orders' },
  { value: 'pending',        label: '⏳ New' },
  { value: 'paid',           label: '✅ Paid' },
  { value: 'in_production',  label: '🔨 Making' },
  { value: 'dispatched',     label: '🚚 Shipped' },
  { value: 'delivered',      label: '🎉 Done' },
  { value: 'cancelled',      label: '❌ Cancelled' },
  { value: 'refunded',       label: '💸 Refunded' },
];

const STATUS_LABEL: Record<string, string> = {
  pending:            'New Order',
  payment_processing: 'Paying',
  paid:               'Paid',
  in_production:      'Being Made',
  dispatched:         'Shipped',
  delivered:          'Delivered',
  cancelled:          'Cancelled',
  refunded:           'Refunded',
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

// Next status in the workflow
const NEXT_STATUS: Record<string, string> = {
  pending:    'in_production',
  paid:       'in_production',
  in_production: 'dispatched',
  dispatched: 'delivered',
};
const NEXT_LABEL: Record<string, string> = {
  pending:    '▶ Start Making',
  paid:       '▶ Start Making',
  in_production: '🚚 Mark Shipped',
  dispatched: '✅ Mark Delivered',
};

interface Order {
  id: string; order_number: string; status: string;
  total: string; created_at: string;
  shipping_first_name: string; shipping_last_name: string; email: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminOrdersPage() {
  const [data, setData]           = useState<OrdersResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [updating, setUpdating]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await adminGet<OrdersResponse>(`/orders?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const advanceStatus = async (orderId: string, nextStatus: string) => {
    setUpdating(orderId);
    try {
      await adminPatch(`/orders/${orderId}`, { status: nextStatus });
      load();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-heading font-bold text-navy">📦 All Orders</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="search"
            placeholder="Search by name, email or order #"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
          />
          <button type="submit" className="bg-coral text-white px-5 py-3 rounded-2xl font-bold hover:bg-coral/90">
            🔍
          </button>
        </form>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1); }}
            className={`px-4 py-2 rounded-full font-semibold text-sm border transition-all ${
              status === s.value
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-16 text-4xl animate-pulse">📦</div>
      ) : (
        <>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {!data?.orders.length ? (
              <div className="py-16 text-center text-gray-400 text-xl">
                No orders found 🕐
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.orders.map(order => (
                  <div key={order.id} className="flex items-center gap-3 px-4 sm:px-6 py-4 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-bold text-navy text-lg hover:text-coral"
                        >
                          {order.order_number}
                        </Link>
                        <span className={`text-sm font-semibold px-3 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm mt-0.5">
                        {order.shipping_first_name} {order.shipping_last_name}
                        {order.email ? ` · ${order.email}` : ''}
                        {' · '}
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="font-bold text-navy text-lg">
                        £{parseFloat(order.total).toFixed(2)}
                      </div>
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => advanceStatus(order.id, NEXT_STATUS[order.status])}
                          disabled={updating === order.id}
                          className="bg-coral text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-coral/90 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {updating === order.id ? '…' : NEXT_LABEL[order.status]}
                        </button>
                      )}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-gray-400 text-xl hover:text-navy"
                      >
                        ›
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-5 py-3 rounded-2xl bg-white border border-gray-200 font-bold text-navy disabled:opacity-40 hover:border-navy transition-all"
              >
                ← Prev
              </button>
              <span className="font-semibold text-gray-600">
                Page {page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-5 py-3 rounded-2xl bg-white border border-gray-200 font-bold text-navy disabled:opacity-40 hover:border-navy transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
