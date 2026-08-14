'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function TrackLandingPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setError('Please enter your order number');
      return;
    }
    setError('');
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-3xl font-heading font-bold text-navy mb-2">Track your order</h1>
        <p className="text-text-secondary">
          Enter your order number to see how your magnets are getting on.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-semibold text-navy mb-2">
              Order number
            </label>
            <input
              id="orderNumber"
              type="text"
              placeholder="e.g. KK-20240001"
              value={orderNumber}
              onChange={e => { setOrderNumber(e.target.value); setError(''); }}
              className="w-full px-4 py-3 rounded-xl border-2 bg-white text-navy placeholder:text-border focus:outline-none transition-colors"
              style={{ borderColor: error ? '#DC2626' : '#D8D3C8' }}
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
            <p className="text-xs text-text-secondary mt-2">
              You'll find this in your order confirmation email.
            </p>
          </div>

          <Button type="submit" size="lg" fullWidth>
            Track order →
          </Button>
        </form>
      </Card>
    </div>
  );
}
