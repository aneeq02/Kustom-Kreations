'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';

// The bag is now a slide-in drawer (Mixtiles-style). Old /cart links land in
// the studio with the bag open, so there's one bag rather than two.
export default function CartPage() {
  const router = useRouter();
  const { openBag } = useCart();

  useEffect(() => {
    openBag();
    router.replace('/configure');
  }, [openBag, router]);

  return null;
}
