'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { adminFetch, saveAdminPin, clearAdminPin, ADMIN_PIN_KEY } from '@/lib/adminApi';
import NewOrderAlert from '@/components/admin/NewOrderAlert';
import BottomSheet from '@/components/configurator/BottomSheet';
import { Icon } from '@/components/admin/ui';

const NAV = [
  { href: '/admin',           icon: 'home',      label: 'Dashboard', short: 'Home' },
  { href: '/admin/orders',    icon: 'orders',    label: 'Orders',    short: 'Orders' },
  { href: '/admin/products',  icon: 'products',  label: 'Products',  short: 'Products' },
  { href: '/admin/discounts', icon: 'discounts', label: 'Discounts', short: 'Discounts' },
  { href: '/admin/shipping',  icon: 'shipping',  label: 'Shipping',  short: 'Shipping' },
  { href: '/admin/customers', icon: 'customers', label: 'Customers', short: 'Customers' },
];
// Phones get a bottom tab bar (max 5): the first four, then "More" for the rest
const TAB_NAV = NAV.slice(0, 4);
const MORE_NAV = NAV.slice(4);

function useIsActive() {
  const pathname = usePathname() ?? '';
  return (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
}

// ── PIN Gate ──────────────────────────────────────────────────────────────────

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/verify', {}, pin);
      if (res.ok) {
        saveAdminPin(pin);
        onSuccess();
      } else {
        setError('That PIN isn’t right — please try again.');
        setPin('');
      }
    } catch {
      setError('Could not reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex flex-col px-5">
      <div className="pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 h-11 text-sm font-medium text-navy/70 hover:text-navy">
          <Icon name="back" className="w-4 h-4" /> Back to site
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center pb-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-8">
            <Image src="/logo-teal.png" alt="" width={64} height={64} className="w-16 h-16 mb-4" priority />
            <h1 className="font-heading text-4xl text-navy">Shop admin</h1>
            <p className="text-text-secondary mt-1.5">Enter your PIN to manage Kustom Kreations</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-5 sm:p-6 flex flex-col gap-4 shadow-[0_12px_40px_-16px_rgba(26,26,24,0.2)]">
            <label htmlFor="admin-pin" className="sr-only">PIN</label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]*"
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full h-16 text-center text-3xl tracking-[0.5em] rounded-xl border border-border bg-cream/60 text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              autoFocus
            />
            {error && (
              <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full h-12 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const isActive = useIsActive();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-border flex-col z-30">
      <Link href="/admin" className="flex items-center gap-3 px-6 h-20 border-b border-border">
        <Image src="/logo-teal.png" alt="" width={40} height={40} className="w-10 h-10" />
        <span className="leading-tight">
          <span className="block font-heading text-xl text-brand">kustom kreations</span>
          <span className="block text-[11px] uppercase tracking-[0.18em] text-text-secondary">Admin</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-0.5" aria-label="Admin">
        {NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-3 h-11 px-3.5 rounded-lg text-[15px] font-medium transition-colors ${
                active ? 'bg-brand-light text-brand' : 'text-navy/75 hover:bg-cream hover:text-navy'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand" />}
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-3 h-11 px-3.5 rounded-lg text-[15px] font-medium text-navy border border-border hover:border-navy/30 transition-colors"
        >
          <Icon name="store" /> Back to site
        </Link>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 h-11 px-3.5 rounded-lg text-[15px] font-medium text-navy/60 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Icon name="logout" /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Mobile chrome: top bar + bottom tabs + "More" sheet ──────────────────────

function MobileTopBar() {
  const pathname = usePathname() ?? '';
  const current = [...NAV].reverse().find(n => (n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)));
  return (
    <header className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-border flex items-center gap-2 px-3">
      <Link href="/admin" className="flex items-center gap-2 min-w-0 flex-1">
        <Image src="/logo-teal.png" alt="" width={32} height={32} className="w-8 h-8 shrink-0" />
        <span className="font-heading text-lg text-brand truncate">{current?.label ?? 'Admin'}</span>
      </Link>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm font-medium text-navy hover:border-navy/30 shrink-0"
      >
        <Icon name="store" className="w-4 h-4" /> Back to site
      </Link>
    </header>
  );
}

function MobileTabBar({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  const isActive = useIsActive();
  const tab = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-medium transition-colors ${
      active ? 'text-brand' : 'text-navy/55 hover:text-navy'
    }`;
  return (
    <nav
      aria-label="Admin"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="h-16 flex items-stretch">
        {TAB_NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={tab(active)}>
              <Icon name={item.icon} className="w-[22px] h-[22px]" />
              {item.short}
            </Link>
          );
        })}
        <button onClick={onMore} className={`${tab(moreActive)} cursor-pointer`}>
          <Icon name="more" className="w-[22px] h-[22px]" />
          More
        </button>
      </div>
    </nav>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const isActive = useIsActive();
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // On mount: check if a PIN is already stored for this browser session
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_PIN_KEY);
    if (!stored) { setChecked(true); return; }
    adminFetch('/verify', {}, stored)
      .then(r => {
        if (r.ok) setAuthed(true);
        else sessionStorage.removeItem(ADMIN_PIN_KEY);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const handleSignOut = useCallback(() => {
    clearAdminPin();
    setAuthed(false);
    setMoreOpen(false);
    router.push('/admin');
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-brand/25 border-t-brand animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!authed) return <PinGate onSuccess={() => setAuthed(true)} />;

  // The packing slip is a print document — render it bare, without admin chrome
  if (pathname.endsWith('/packing-slip')) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-cream">
      <NewOrderAlert />
      <Sidebar onSignOut={handleSignOut} />
      <MobileTopBar />

      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12">
          {children}
        </div>
      </main>

      <MobileTabBar onMore={() => setMoreOpen(true)} moreActive={MORE_NAV.some(n => isActive(n.href))} />

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} label="More">
        <nav className="flex flex-col gap-1 pt-1">
          {MORE_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-3 h-12 px-3 rounded-lg font-medium ${isActive(item.href) ? 'bg-brand-light text-brand' : 'text-navy hover:bg-cream'}`}
            >
              <Icon name={item.icon} /> {item.label}
              <Icon name="chevron" className="w-4 h-4 ml-auto text-text-secondary" />
            </Link>
          ))}
          <div className="h-px bg-border my-2" />
          <Link href="/" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 h-12 px-3 rounded-lg font-medium text-navy hover:bg-cream">
            <Icon name="store" /> Back to site
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-3 h-12 px-3 rounded-lg font-medium text-red-700 hover:bg-red-50 cursor-pointer">
            <Icon name="logout" /> Sign out
          </button>
        </nav>
      </BottomSheet>
    </div>
  );
}
