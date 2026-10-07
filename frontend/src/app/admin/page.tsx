'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminGet } from '@/lib/adminApi';
import { STATUS_LABEL, STATUS_TONE, gbp, shortDate } from '@/lib/adminStatus';
import { Alert, EmptyState, Icon, PageHeader, Panel, StatusBadge } from '@/components/admin/ui';

interface AnalyticsData {
  days: number;
  avgOrderValue: number;
  avgMagnetsPerOrder: number;
  popularQuantity: number | null;
  popularQuantityOrders: number;
  totalOrders: number;
  upsellOrders: number;
  upsellTakeRatePct: number;
  upsellRevenue: number;
  topOffer: { name: string; takeRatePct: number; revenue: number } | null;
}

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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Stat({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 flex flex-col gap-3 ${accent ? 'bg-brand border-brand text-white' : 'bg-white border-border/80 text-navy'}`}>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-cream text-brand'}`}>
        <Icon name={icon} className="w-4.5 h-4.5" />
      </span>
      <div>
        <div className="font-heading text-[1.9rem] sm:text-4xl leading-none tabular-nums">{value}</div>
        <div className={`text-[13px] font-medium mt-1.5 ${accent ? 'text-white/85' : 'text-navy/70'}`}>{label}</div>
        {sub && <div className={`text-xs mt-0.5 ${accent ? 'text-white/65' : 'text-text-secondary'}`}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Loads independently of the main dashboard stats above — a slower
  // analytics query shouldn't hold up the page people check most often.
  const [analytics, setAnalytics]               = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading]  = useState(true);
  const [analyticsError, setAnalyticsError]      = useState('');

  useEffect(() => {
    adminGet<DashboardData>('/dashboard')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminGet<AnalyticsData>('/analytics?days=30')
      .then(setAnalytics)
      .catch(e => setAnalyticsError(e.message))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="h-12 w-56 rounded-lg bg-white animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-white border border-border/70 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-xl bg-white border border-border/70 animate-pulse" />
      </div>
    );
  }

  if (error) return <Alert>{error}</Alert>;
  if (!data) return null;

  const count = (s: string) => Number(data.statusBreakdown.find(x => x.status === s)?.count ?? 0);
  const toMake = count('paid');
  const making = count('in_production');
  const breakdownTotal = data.statusBreakdown.reduce((s, x) => s + Number(x.count), 0);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader title={greeting()} subtitle="Here’s what’s happening in your shop today." />

      {/* Needs attention */}
      {toMake > 0 && (
        <Link
          href="/admin/orders"
          className="flex items-center gap-3 rounded-xl bg-white border border-brand/25 px-4 py-3.5 hover:border-brand/50 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0">
            <Icon name="bell" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-navy">
              {toMake} paid order{toMake > 1 ? 's' : ''} ready to make
            </span>
            <span className="block text-sm text-text-secondary">
              {making > 0 ? `${making} already in production` : 'Tap to start working through them'}
            </span>
          </span>
          <Icon name="chevron" className="w-5 h-5 text-text-secondary shrink-0" />
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon="pound" label="Total sales" value={gbp(data.revenue)} sub={`${gbp(data.todayRevenue)} today`} accent />
        <Stat icon="orders" label="Orders" value={data.totalOrders.toString()} sub={`${data.todayOrders} today`} />
        <Stat icon="clock" label="To make" value={toMake.toString()} sub={`${making} in production`} />
        <Stat icon="customers" label="Customers" value={data.totalCustomers.toString()} sub="registered accounts" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 sm:gap-6 items-start">
        {/* Recent orders */}
        <Panel
          title="Recent orders"
          flush
          action={<Link href="/admin/orders" className="text-sm font-medium text-brand hover:underline py-2">See all</Link>}
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState icon="orders" title="No orders yet" body="New orders will appear here as soon as they come in." />
          ) : (
            <ul className="divide-y divide-border/70 border-t border-border/70">
              {data.recentOrders.map(order => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-cream/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-navy text-[15px]">{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-sm text-text-secondary truncate mt-0.5">
                        {order.shipping_first_name} {order.shipping_last_name}
                        <span className="hidden sm:inline">{order.email && ` · ${order.email}`}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-navy tabular-nums">{gbp(order.total)}</div>
                      <div className="text-xs text-text-secondary">{shortDate(order.created_at)}</div>
                    </div>
                    <Icon name="chevron" className="w-4 h-4 text-text-secondary/70 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Status overview */}
          {breakdownTotal > 0 && (
            <Panel title="Orders by status">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-cream mb-4" role="img" aria-label="Orders by status">
                {data.statusBreakdown.map(s => (
                  <span
                    key={s.status}
                    className={(STATUS_TONE[s.status] ?? STATUS_TONE.refunded).dot}
                    style={{ width: `${(Number(s.count) / breakdownTotal) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {data.statusBreakdown.map(s => (
                  <li key={s.status} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${(STATUS_TONE[s.status] ?? STATUS_TONE.refunded).dot}`} />
                    <span className="text-navy/80 truncate">{STATUS_LABEL[s.status] ?? s.status}</span>
                    <span className="ml-auto font-semibold text-navy tabular-nums">{s.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Quick actions */}
          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/admin/orders',    icon: 'orders',    label: 'Orders' },
                { href: '/admin/products',  icon: 'products',  label: 'Prices' },
                { href: '/admin/discounts', icon: 'discounts', label: 'New code' },
                { href: '/admin/shipping',  icon: 'shipping',  label: 'Delivery' },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border p-3.5 hover:border-brand/40 hover:bg-brand-light/40 transition-colors"
                >
                  <Icon name={a.icon} className="w-5 h-5 text-brand" />
                  <span className="text-sm font-medium text-navy">{a.label}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Selling analytics */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Analytics</h2>
          {analytics && <span className="text-xs text-text-secondary">Last {analytics.days} days</span>}
        </div>

        {analyticsError ? (
          <Alert>{analyticsError}</Alert>
        ) : analyticsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-36 rounded-xl bg-white border border-border/70 animate-pulse" />)}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Stat
              icon="pound"
              label="Average order value"
              value={gbp(analytics.avgOrderValue)}
            />
            <Stat
              icon="products"
              label="Avg magnets per order"
              value={analytics.avgMagnetsPerOrder.toFixed(1)}
            />
            <Stat
              icon="gift"
              label="Taking the second set"
              value={`${Math.round(analytics.upsellTakeRatePct)}%`}
              sub={analytics.totalOrders > 0 ? `${analytics.upsellOrders} of ${analytics.totalOrders} orders` : 'No orders yet'}
            />
            <Stat
              icon="pound"
              label="Revenue from upsells"
              value={gbp(analytics.upsellRevenue)}
              accent
            />
            <Stat
              icon="products"
              label="Most popular quantity"
              value={analytics.popularQuantity !== null ? `${analytics.popularQuantity}` : '—'}
              sub={
                analytics.popularQuantity !== null
                  ? `${analytics.popularQuantityOrders} order${analytics.popularQuantityOrders === 1 ? '' : 's'} · magnets`
                  : 'Not enough data yet'
              }
            />

            {/* Most successful offer — only one offer exists today (the checkout
                "double your order" upsell), so this highlights its performance
                rather than ranking it against alternatives that don't exist yet. */}
            <div className="rounded-xl border border-brand/25 bg-brand-light/40 p-4 sm:p-5 flex flex-col gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-white text-brand shrink-0">
                <Icon name="gift" className="w-4.5 h-4.5" />
              </span>
              {analytics.topOffer ? (
                <div className="min-w-0">
                  <div className="font-heading text-2xl text-navy leading-tight truncate">{analytics.topOffer.name}</div>
                  <div className="text-[13px] font-medium text-navy/70 mt-1.5">
                    {Math.round(analytics.topOffer.takeRatePct)}% take rate · {gbp(analytics.topOffer.revenue)}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">Most successful offer</div>
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="font-heading text-xl text-navy leading-tight">No offers taken yet</div>
                  <div className="text-xs text-text-secondary mt-1">
                    Once customers accept the checkout upsell, its performance appears here.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
