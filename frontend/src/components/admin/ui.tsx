'use client';

import type { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/adminStatus';

// ── Shared admin building blocks — same palette/type as the storefront ──────

// text-base (16px) on inputs stops iOS zooming the page on focus
export const inputCls =
  'w-full h-11 px-3.5 rounded-lg border border-border bg-white text-navy text-base placeholder:text-text-secondary/70 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-colors disabled:bg-cream';

const BTN = {
  primary:   'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-white text-navy border border-border hover:border-navy/40',
  dark:      'bg-navy text-white hover:bg-navy/90',
  danger:    'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  ghost:     'text-navy hover:bg-cream',
};

export function Btn({
  variant = 'primary', size = 'md', className = '', children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = size === 'sm' ? 'h-9 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-4 text-sm';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap ${sz} ${BTN[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Icons (stroke, 24px grid) ───────────────────────────────────────────────
const PATHS: Record<string, ReactNode> = {
  home:      <><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  orders:    <><path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>,
  products:  <><rect x="3" y="3" width="7.5" height="7.5" rx="1" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" /></>,
  shipping:  <><path d="M2.5 6.5h11v10h-11zM13.5 10h4.5l3 3.5v3h-7.5" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  discounts: <><path d="M3 12V4.5A1.5 1.5 0 014.5 3H12l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6" /></>,
  more:      <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  store:     <><path d="M4 9h16l-1 11H5z" /><path d="M8.5 9a3.5 3.5 0 017 0" /></>,
  back:      <path d="M15 18l-6-6 6-6" />,
  logout:    <><path d="M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
  search:    <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  chevron:   <path d="M9 6l6 6-6 6" />,
  plus:      <path d="M12 5v14M5 12h14" />,
  trash:     <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  print:     <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="1.5" /><path d="M7 14h10v7H7z" /></>,
  download:  <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4 19h16" />,
  refresh:   <><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  check:     <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close:     <path d="M18 6L6 18M6 6l12 12" />,
  pound:     <path d="M16.5 6.5A3.5 3.5 0 0010 8v9.5M7 12h7M7 19h10" />,
  bell:      <><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 004 0" /></>,
  user:      <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  gift:      <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8S10.5 3 8 3.8 7.5 8 12 8zM12 8s1.5-5 4-4.2S16.5 8 12 8z" /></>,
  clock:     <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  image:     <><rect x="3" y="4" width="18" height="16" rx="1.5" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-9 9" /></>,
};

export function Icon({ name, className = 'w-5 h-5' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// ── Layout pieces ──────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h1 className="font-heading text-[2rem] sm:text-[2.6rem] leading-[1.05] text-navy">{title}</h1>
        {subtitle && <p className="text-text-secondary text-sm sm:text-base mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title, action, children, className = '', flush,
}: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`bg-white rounded-xl border border-border/80 shadow-[0_1px_2px_rgba(26,26,24,0.04)] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          {title && <h2 className="font-body text-[15px] font-semibold text-navy">{title}</h2>}
          {action}
        </div>
      )}
      <div className={flush ? '' : 'px-4 sm:px-5 pb-4 sm:pb-5'}>{children}</div>
    </section>
  );
}

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const t = STATUS_TONE[status] ?? STATUS_TONE.refunded;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${t.bg} ${t.text} ${
      size === 'md' ? 'text-sm px-3 py-1' : 'text-[11px] px-2 py-0.5'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Toggle({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  // 44px hit area around a 24px-tall switch
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className="relative shrink-0 w-14 h-11 -my-2 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-wait"
    >
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-[#D6D3CC]'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-navy">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

// Input with a fixed prefix/suffix (e.g. £ or %)
export function AffixInput({
  prefix, suffix, className = '', ...props
}: InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none">{prefix}</span>}
      <input {...props} className={`${inputCls} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-9' : ''} ${className}`} />
      {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none">{suffix}</span>}
    </div>
  );
}

export function SearchBox({
  value, onChange, onSubmit, placeholder,
}: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string }) {
  return (
    <form
      role="search"
      onSubmit={e => { e.preventDefault(); onSubmit(); }}
      className="relative"
    >
      <Icon name="search" className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
      <input
        type="search"
        enterKeyHint="search"
        aria-label={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-10 h-12`}
      />
    </form>
  );
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3.5 py-2.5 text-sm border ${
      tone === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-brand-light border-brand/15 text-brand'
    }`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <span className="w-12 h-12 rounded-full bg-cream text-text-secondary flex items-center justify-center mb-3">
        <Icon name={icon} />
      </span>
      <p className="font-medium text-navy">{title}</p>
      {body && <p className="text-sm text-text-secondary mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[72px] rounded-xl bg-white border border-border/70 animate-pulse" />
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <Btn variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="back" className="w-4 h-4" /> Prev
      </Btn>
      <span className="text-sm text-text-secondary tabular-nums">Page {page} of {totalPages}</span>
      <Btn variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next <Icon name="chevron" className="w-4 h-4" />
      </Btn>
    </nav>
  );
}
