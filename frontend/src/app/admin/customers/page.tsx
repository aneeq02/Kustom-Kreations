'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet } from '@/lib/adminApi';
import { gbp, shortDate } from '@/lib/adminStatus';
import { EmptyState, PageHeader, Pagination, SearchBox, SkeletonRows } from '@/components/admin/ui';

interface Customer {
  id: string; first_name: string; last_name: string;
  email: string; phone: string | null;
  created_at: string; order_count: string; total_spent: string;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminCustomersPage() {
  const [data, setData]       = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');
  const [page, setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '25' });
      if (query) params.set('search', query);
      setData(await adminGet<CustomersResponse>(`/customers?${params}`));
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        subtitle={data ? `${data.total} registered customer${data.total !== 1 ? 's' : ''}` : 'Registered accounts'}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        onSubmit={() => { setPage(1); setQuery(search.trim()); }}
        placeholder="Search name or email"
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : !data?.customers.length ? (
        <div className="bg-white rounded-xl border border-border/80">
          <EmptyState icon="customers" title="No customers found" body={query ? 'Try a different search.' : 'Customers who create an account will appear here.'} />
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-border/80 divide-y divide-border/70 overflow-hidden">
          {data.customers.map(c => {
            const orders = Number(c.order_count);
            return (
              <li key={c.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5">
                <span className="w-11 h-11 rounded-full bg-brand-light text-brand flex items-center justify-center font-semibold uppercase shrink-0">
                  {c.first_name?.[0] ?? '?'}{c.last_name?.[0] ?? ''}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy truncate">{c.first_name} {c.last_name}</p>
                  <a href={`mailto:${c.email}`} className="block text-sm text-navy/70 truncate hover:text-brand">{c.email}</a>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Joined {shortDate(c.created_at, true)}
                    {c.phone && <> · <a href={`tel:${c.phone}`} className="hover:text-navy">{c.phone}</a></>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-navy tabular-nums">{gbp(c.total_spent)}</p>
                  <p className="text-xs text-text-secondary">{orders} order{orders !== 1 ? 's' : ''}</p>
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
