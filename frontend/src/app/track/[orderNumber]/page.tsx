'use client';

import { useState, useEffect, use } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface TrackingStep {
  key: string;
  label: string;
  done: boolean;
  date: string | null;
}

interface TrackingOrder {
  id: string;
  order_number: string;
  status: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  shipping_first_name: string;
  steps: TrackingStep[];
}

const STATUS_LABELS: Record<string, string> = {
  pending:            'Pending',
  payment_processing: 'Processing payment',
  paid:               'Order confirmed',
  in_production:      'Being made',
  dispatched:         'Dispatched',
  delivered:          'Delivered',
  cancelled:          'Cancelled',
  refunded:           'Refunded',
};

const STATUS_COLORS: Record<string, 'coral' | 'sky' | 'yellow' | 'green' | 'navy'> = {
  paid:          'coral',
  in_production: 'yellow',
  dispatched:    'sky',
  delivered:     'green',
  cancelled:     'navy',
};

export default function TrackingPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const [order, setOrder]   = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/tracking/${orderNumber}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setOrder(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-4xl animate-pulse">
        📦
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-heading font-bold text-navy mb-2">Order not found</h1>
        <p className="text-text-secondary mb-6">Check your confirmation email for the correct order number.</p>
        <Link href="/contact" className="text-coral hover:underline">Contact support</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold text-navy mb-2">Track your order</h1>
      <p className="text-text-secondary mb-8">
        Order <span className="font-semibold text-navy">{order.order_number}</span>
      </p>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold text-navy">Status</span>
          <Badge color={STATUS_COLORS[order.status] ?? 'navy'}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </div>

        {/* Progress steps */}
        <div className="flex flex-col gap-0">
          {order.steps.map((step, i) => (
            <div key={step.key} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  step.done ? 'bg-green-500 text-white' : 'bg-coral-light text-coral',
                ].join(' ')}>
                  {step.done ? '✓' : i + 1}
                </div>
                {i < order.steps.length - 1 && (
                  <div className={`w-0.5 h-8 mt-1 ${step.done ? 'bg-green-300' : 'bg-coral-light'}`} />
                )}
              </div>
              <div className="pt-1 pb-6">
                <p className={`font-semibold text-sm ${step.done ? 'text-navy' : 'text-text-secondary'}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(step.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.tracking_number && (
          <div className="mt-4 bg-sky-light rounded-xl px-4 py-3">
            <p className="text-xs text-text-secondary">Tracking number</p>
            <p className="font-bold text-navy">{order.tracking_number}</p>
            {order.tracking_carrier && (
              <p className="text-xs text-text-secondary">via {order.tracking_carrier}</p>
            )}
          </div>
        )}
      </Card>

      <div className="text-center">
        <p className="text-sm text-text-secondary">
          Need help?{' '}
          <Link href="/contact" className="text-coral hover:underline">Contact us</Link>
        </p>
      </div>
    </div>
  );
}
