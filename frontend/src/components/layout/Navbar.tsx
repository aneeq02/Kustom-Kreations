'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-coral-light/40 shadow-sm">
      <div className="mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-1 flex items-center gap-2.5">
          <Image src="/logo-teal.png" alt="Kustom Kreations" width={44} height={44} className="w-11 h-11" priority />
          <span className="hidden sm:block font-heading font-bold text-navy text-lg leading-tight">
            kustom <span className="text-teal">kreations</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="flex-1 hidden md:flex items-center justify-center gap-6 text-sm font-semibold text-text-secondary">
          <Link href="/start" className="hover:text-coral transition-colors">Make Magnets</Link>
          <Link href="/faq" className="hover:text-coral transition-colors">FAQ</Link>
          <Link href="/shipping" className="hover:text-coral transition-colors">Shipping</Link>
        </nav>

        {/* Right actions */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {mounted && (customer ? (
            <Link href="/account" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-coral transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {customer.firstName}
            </Link>
          ) : (
            <Link href="/auth/login" className="hidden md:block text-sm font-semibold text-navy hover:text-coral transition-colors">
              Sign in
            </Link>
          ))}

          {/* Cart */}
          <Link href="/cart" className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-coral-light hover:bg-coral/20 transition-colors">
            <svg className="w-5 h-5 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-navy hover:bg-coral-light transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path d="M18 6L6 18M6 6l12 12"/>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-coral-light/40 bg-white px-4 py-4 flex flex-col gap-3 text-sm font-semibold">
          <Link href="/start" onClick={() => setMenuOpen(false)} className="py-2 text-navy hover:text-coral">Make Magnets</Link>
          <Link href="/faq" onClick={() => setMenuOpen(false)} className="py-2 text-navy hover:text-coral">FAQ</Link>
          <Link href="/shipping" onClick={() => setMenuOpen(false)} className="py-2 text-navy hover:text-coral">Shipping</Link>
          {mounted && (customer
            ? <Link href="/account" onClick={() => setMenuOpen(false)} className="py-2 text-navy hover:text-coral">My Account</Link>
            : <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="py-2 text-navy hover:text-coral">Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}
