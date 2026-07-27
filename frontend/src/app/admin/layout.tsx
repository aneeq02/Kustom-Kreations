'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminFetch, saveAdminPin, clearAdminPin, ADMIN_PIN_KEY } from '@/lib/adminApi';

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV = [
  { href: '/admin',           icon: '📊', label: 'Dashboard'  },
  { href: '/admin/orders',    icon: '📦', label: 'Orders'     },
  { href: '/admin/products',  icon: '🧲', label: 'Products'   },
  { href: '/admin/shipping',  icon: '🚚', label: 'Shipping'   },
  { href: '/admin/discounts', icon: '🎟️', label: 'Discounts'  },
  { href: '/admin/customers', icon: '👥', label: 'Customers'  },
];

// ── PIN Gate ──────────────────────────────────────────────────────────────────

function PinGate({ onSuccess }: { onSuccess: (pin: string) => void }) {
  const [pin, setPin]     = useState('');
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
        onSuccess(pin);
      } else {
        setError('Wrong PIN — please try again!');
        setPin('');
      }
    } catch {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="text-7xl mb-4">🔐</div>
        <h1 className="text-3xl font-heading font-bold text-navy mb-2">
          Admin Area
        </h1>
        <p className="text-text-secondary mb-8 text-lg">
          Enter your PIN to manage the shop
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full text-center text-3xl font-bold tracking-widest border-3 border-coral-light rounded-2xl px-4 py-5 focus:border-coral focus:outline-none text-navy bg-ivory"
            autoFocus
          />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-base font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-4 px-6 bg-coral text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-coral/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : 'Enter →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full w-64 bg-navy text-white flex flex-col z-30 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧲</span>
            <div>
              <div className="font-heading font-bold text-lg leading-tight">Kustom</div>
              <div className="text-xs text-white/60 uppercase tracking-wider">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-lg font-semibold transition-all',
                isActive(item.href)
                  ? 'bg-coral text-white shadow-lg'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <span className="text-2xl w-8 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-lg font-semibold text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <span className="text-2xl w-8 text-center">🚪</span>
            <span>Sign Out</span>
          </button>
          <p className="text-center text-white/30 text-xs mt-3">
            Kustom Kreations Admin
          </p>
        </div>
      </aside>
    </>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const [authed, setAuthed]     = useState(false);
  const [checked, setChecked]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On mount: check if PIN already stored in session
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_PIN_KEY);
    if (stored) {
      // Verify it's still valid
      adminFetch('/verify', {}, stored)
        .then(r => {
          if (r.ok) setAuthed(true);
          else sessionStorage.removeItem(ADMIN_PIN_KEY);
        })
        .catch(() => {})
        .finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    clearAdminPin();
    setAuthed(false);
    router.push('/admin');
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-5xl animate-spin">⚙️</div>
      </div>
    );
  }

  if (!authed) {
    return <PinGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-navy text-white text-xl"
          >
            ☰
          </button>
          <span className="font-heading font-bold text-navy text-lg">Admin Panel</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
