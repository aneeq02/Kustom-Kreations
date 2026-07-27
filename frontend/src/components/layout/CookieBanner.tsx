'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('kk_cookie_consent')) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('kk_cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 bg-white rounded-2xl shadow-xl border border-coral-light/40 p-5">
      <p className="text-sm text-navy mb-3 leading-relaxed">
        We use cookies to improve your experience and keep your cart saved.{' '}
        <Link href="/privacy#cookies" className="text-coral hover:underline">Learn more</Link>
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={accept} className="flex-1">Accept</Button>
        <Button size="sm" variant="outline" onClick={() => setVisible(false)} className="flex-1">Decline</Button>
      </div>
    </div>
  );
}
