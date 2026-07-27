'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet } from '@/lib/adminApi';

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
  const [page, setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '25' });
      if (search) params.set('search', search);
      const res = await adminGet<CustomersResponse>(`/customers?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-heading font-bold text-navy">👥 Customers</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-coral"
        />
        <button type="submit" className="bg-coral text-white px-5 py-3 rounded-2xl font-bold hover:bg-coral/90">
          🔍
        </button>
      </form>

      {data && (
        <p className="text-gray-500 font-medium">
          {data.total} customer{data.total !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="text-center py-16 text-4xl animate-pulse">👥</div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {!data?.customers.length ? (
              <div className="py-16 text-center text-gray-400 text-xl">
                No customers found 🕐
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.customers.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center text-xl font-bold text-navy shrink-0 uppercase">
                      {c.first_name?.[0] ?? '?'}{c.last_name?.[0] ?? ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy text-lg">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {c.email}
                        {c.phone && ` · ${c.phone}`}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        Joined {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-navy text-lg">
                        £{parseFloat(c.total_spent).toFixed(2)}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {c.order_count} order{Number(c.order_count) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
