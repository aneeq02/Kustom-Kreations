'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS: [string, string][] = [
  ['/configure', 'Make Magnets'],
  ['/faq', 'FAQ'],
  ['/shipping', 'Shipping'],
  ['/track', 'Track your order'],
];

export default function Navbar() {
  const { items, openBag } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="mx-auto px-4 sm:px-6 h-[72px] flex items-center gap-4">
        {/* Logo — the brand green, large enough to read at a glance */}
        <Link href="/" className="flex-1 flex items-center gap-3" aria-label="Kustom Kreations home">
          <Image src="/logo-teal.png" alt="" width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14" priority />
          <span className="font-heading text-[1.3rem] sm:text-[1.75rem] text-brand leading-none tracking-[-0.01em] whitespace-nowrap">
            kustom kreations
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="flex-1 hidden lg:flex items-center justify-center gap-7 text-sm font-medium text-navy/70">
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-navy transition-colors whitespace-nowrap">{label}</Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          {mounted && (
            <Link
              href={customer ? '/account' : '/auth/login'}
              aria-label={customer ? 'My account' : 'Sign in'}
              title={customer ? 'My account' : 'Sign in'}
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-full text-navy hover:bg-cream transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}

          <Link
            href="/configure"
            className="hidden sm:inline-flex items-center h-10 px-5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap"
          >
            Shop Now
          </Link>

          {/* Bag */}
          <button
            onClick={openBag}
            aria-label={`Basket${mounted && items.length ? `, ${items.length} item${items.length > 1 ? 's' : ''}` : ''}`}
            className="relative flex items-center justify-center w-10 h-10 rounded-full text-navy hover:bg-cream transition-colors cursor-pointer"
          >
            <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 016 0" />
            </svg>
            {mounted && items.length > 0 && (
              <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-navy hover:bg-cream transition-colors cursor-pointer"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-white px-4 py-4 flex flex-col gap-1 text-[15px] font-medium">
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="py-2.5 text-navy">{label}</Link>
          ))}
          {mounted && (customer
            ? <Link href="/account" onClick={() => setMenuOpen(false)} className="py-2.5 text-navy">My Account</Link>
            : <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="py-2.5 text-navy">Sign in</Link>
          )}
          <Link
            href="/configure"
            onClick={() => setMenuOpen(false)}
            className="sm:hidden mt-2 h-12 flex items-center justify-center rounded-lg bg-brand text-white font-semibold"
          >
            Shop Now
          </Link>
        </div>
      )}
    </header>
  );
}
