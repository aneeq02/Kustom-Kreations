'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/pricing';
import { Order } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const { customer, logout, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !customer) router.replace('/auth/login?redirect=/account');
  }, [customer, loading, router]);

  useEffect(() => {
    if (!customer) return;
    api.get<Order[]>('/orders')
      .then(setOrders)
      .finally(() => setOrdersLoading(false));
  }, [customer]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !customer) return null;

  const statusColors: Record<string, 'coral' | 'sky' | 'yellow' | 'green' | 'navy'> = {
    paid: 'coral', in_production: 'yellow', dispatched: 'sky', delivered: 'green', cancelled: 'navy',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-navy">
            Hello, {customer.firstName}! 👋
          </h1>
          <p className="text-text-secondary">{customer.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
      </div>

      <h2 className="text-xl font-heading font-bold text-navy mb-4">Your orders</h2>

      {ordersLoading ? (
        <div className="text-text-secondary text-sm">Loading orders…</div>
      ) : orders.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">🧲</div>
          <h3 className="font-heading font-bold text-navy mb-2">No orders yet</h3>
          <p className="text-text-secondary mb-6">Create your first personalised magnets!</p>
          <Link href="/configure"><Button>Make magnets</Button></Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map(order => (
            <Card key={order.id} hover className="flex items-center justify-between gap-4">
              <div>
                <div className="font-heading font-bold text-navy">{order.orderNumber}</div>
                <div className="text-sm text-text-secondary mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                  {' · '}
                  <span className="font-semibold text-navy">{formatPrice(parseFloat(order.total))}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={statusColors[order.status] ?? 'navy'}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
                <Link href={`/track/${order.orderNumber}`}>
                  <Button variant="outline" size="sm">Track</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
