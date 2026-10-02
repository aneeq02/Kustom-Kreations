'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CheckoutPanel from '@/components/checkout/CheckoutPanel';

// Direct-link fallback for the checkout that normally slides in from the bag.
export default function CheckoutPage() {
  const router = useRouter();
  const { items, hydrated } = useCart();

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace('/configure');
  }, [hydrated, items.length, router]);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <CheckoutPanel onBack={() => router.push('/cart')} />
    </div>
  );
}
