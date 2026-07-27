'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminGet } from '@/lib/adminApi';

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

interface DashboardData {
  totalOrders:     number;
  revenue:         number;
  totalCustomers:  number;
  todayOrders:     number;
  todayRevenue:    number;
  recentOrders:    Array<{
    id: string; order_number: string; status: string; total: string;
    shipping_first_name: string; shipping_last_name: string;
    email: string; created_at: string;
  }>;
  statusBreakdown: Array<{ status: string; count: string }>;
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-3xl p-6 flex flex-col gap-2 shadow-sm ${color}`}>
      <div className="text-4xl">{icon}</div>
      <div className="text-3xl font-heading font-bold">{value}</div>
      <div className="font-semibold text-base opacity-80">{label}</div>
      {sub && <div className="text-sm opacity-60">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    adminGet<DashboardData>('/dashboard')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-4xl animate-pulse">
      📊
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-lg">
      ⚠️ {error}
    </div>
  );

  if (!data) return null;

  const pendingCount = data.statusBreakdown.find(s => s.status === 'pending')?.count ?? '0';
  const productionCount = data.statusBreakdown.find(s => s.status === 'in_production')?.count ?? '0';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-heading font-bold text-navy">👋 Hello!</h1>
        <p className="text-gray-500 text-lg mt-1">Here's what's happening in your shop today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📦"
          label="Total Orders"
          value={data.totalOrders.toString()}
          sub={`${data.todayOrders} new today`}
          color="bg-blue-50 text-blue-900"
        />
        <StatCard
          icon="💰"
          label="Total Sales"
          value={`£${data.revenue.toFixed(2)}`}
          sub={`£${data.todayRevenue.toFixed(2)} today`}
          color="bg-green-50 text-green-900"
        />
        <StatCard
          icon="⏳"
          label="Need Making"
          value={pendingCount}
          sub="orders waiting"
          color="bg-yellow-50 text-yellow-900"
        />
        <StatCard
          icon="👥"
          label="Customers"
          value={data.totalCustomers.toString()}
          color="bg-purple-50 text-purple-900"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/admin/orders',    icon: '📦', label: 'View All Orders',   color: 'bg-coral text-white' },
            { href: '/admin/products',  icon: '🧲', label: 'Manage Products',   color: 'bg-navy text-white' },
            { href: '/admin/discounts', icon: '🎟️', label: 'Add Discount Code', color: 'bg-green-600 text-white' },
            { href: '/admin/shipping',  icon: '🚚', label: 'Shipping Settings', color: 'bg-indigo-600 text-white' },
          ].map(a => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center gap-3 p-5 rounded-3xl font-bold text-center text-lg shadow-sm hover:opacity-90 active:scale-95 transition-all ${a.color}`}
            >
              <span className="text-4xl">{a.icon}</span>
              <span className="leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-bold text-navy">Recent Orders</h2>
          <Link href="/admin/orders" className="text-coral font-semibold text-base hover:underline">
            See all →
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          {data.recentOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xl">
              No orders yet! 🕐
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentOrders.map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-coral-light/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-navy text-lg">{order.order_number}</span>
                      <span className={`text-sm font-semibold px-3 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="text-gray-500 text-sm mt-0.5">
                      {order.shipping_first_name} {order.shipping_last_name}
                      {order.email && ` · ${order.email}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-navy text-lg">£{parseFloat(order.total).toFixed(2)}</div>
                    <div className="text-gray-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order status breakdown */}
      {data.statusBreakdown.length > 0 && (
        <div>
          <h2 className="text-2xl font-heading font-bold text-navy mb-4">Order Status Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.statusBreakdown.map(s => (
              <div key={s.status} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                <div className="text-2xl font-bold text-navy">{s.count}</div>
                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[s.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
