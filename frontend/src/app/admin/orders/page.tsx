'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminGet, adminPatch } from '@/lib/adminApi';
import { NEXT_STATUS, gbp, shortDate } from '@/lib/adminStatus';
import { Btn, EmptyState, Icon, PageHeader, Pagination, SearchBox, SkeletonRows, StatusBadge } from '@/components/admin/ui';

const FILTERS = [
  { value: '',              label: 'All' },
  { value: 'paid',          label: 'Paid' },
  { value: 'in_production', label: 'Being made' },
  { value: 'dispatched',    label: 'Shipped' },
  { value: 'delivered',     label: 'Delivered' },
  { value: 'cancelled',     label: 'Cancelled' },
  { value: 'refunded',      label: 'Refunded' },
];

interface Order {
  id: string; order_number: string; status: string;
  total: string; created_at: string;
  shipping_first_name: string; shipping_last_name: string; email: string;
  referral_source?: string | null;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminOrdersPage() {
  const [data, setData]         = useState<OrdersResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('');
  const [search, setSearch]     = useState('');
  const [query, setQuery]       = useState('');
  const [page, setPage]         = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (status) params.set('status', status);
      if (query) params.set('search', query);
      setData(await adminGet<OrdersResponse>(`/orders?${params}`));
    } finally {
      setLoading(false);
    }
  }, [page, status, query]);

  useEffect(() => { load(); }, [load]);

  const advanceStatus = async (orderId: string, nextStatus: string) => {
    setUpdating(orderId);
    try {
      await adminPatch(`/orders/${orderId}`, { status: nextStatus });
      await load();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders"
        subtitle={data ? `${data.total} order${data.total !== 1 ? 's' : ''}${status ? ' in this view' : ''}` : undefined}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        onSubmit={() => { setPage(1); setQuery(search.trim()); }}
        placeholder="Search name, email or order #"
      />

      {/* Filter chips — swipe sideways on phones */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max" role="tablist" aria-label="Filter by status">
          {FILTERS.map(s => (
            <button
              key={s.value}
              role="tab"
              aria-selected={status === s.value}
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={`h-9 px-4 rounded-full text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                status === s.value
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-navy/75 border-border hover:border-navy/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : !data?.orders.length ? (
        <div className="bg-white rounded-xl border border-border/80">
          <EmptyState
            icon="orders"
            title="No orders found"
            body={query || status ? 'Try a different search or filter.' : 'Orders will appear here as they come in.'}
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5 sm:gap-0 sm:bg-white sm:rounded-xl sm:border sm:border-border/80 sm:divide-y sm:divide-border/70 sm:overflow-hidden">
          {data.orders.map(order => {
            const next = NEXT_STATUS[order.status];
            return (
              <li
                key={order.id}
                className="bg-white rounded-xl border border-border/80 sm:rounded-none sm:border-0 flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-5 sm:py-3.5"
              >
                <Link href={`/admin/orders/${order.id}`} className="flex-1 min-w-0 flex items-start gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy text-[15px] group-hover:text-brand transition-colors">{order.order_number}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="text-sm text-navy/80 mt-1 truncate">
                      {order.shipping_first_name} {order.shipping_last_name}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 flex flex-wrap gap-x-2">
                      <span>{shortDate(order.created_at, true)}</span>
                      {order.email && <span className="truncate max-w-[60vw] sm:max-w-none">{order.email}</span>}
                      {order.referral_source && <span>via {order.referral_source}</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-navy tabular-nums sm:hidden">{gbp(order.total)}</span>
                </Link>

                <div className="flex items-center gap-3 sm:shrink-0">
                  <span className="hidden sm:block font-semibold text-navy tabular-nums w-20 text-right">{gbp(order.total)}</span>
                  {next ? (
                    <Btn
                      size="sm"
                      onClick={() => advanceStatus(order.id, next.to)}
                      disabled={updating === order.id}
                      className="flex-1 sm:flex-none h-10 sm:h-9 sm:w-36"
                    >
                      {updating === order.id ? 'Updating…' : next.label}
                    </Btn>
                  ) : (
                    <span className="hidden sm:block sm:w-36" />
                  )}
                  <Link
                    href={`/admin/orders/${order.id}`}
                    aria-label={`Open ${order.order_number}`}
                    className="w-10 h-10 shrink-0 rounded-lg border border-border sm:border-0 flex items-center justify-center text-text-secondary hover:text-navy hover:bg-cream"
                  >
                    <Icon name="chevron" className="w-4 h-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data && <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
