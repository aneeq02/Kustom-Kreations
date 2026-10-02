// One source of truth for order-status wording and colour across the admin.

export const STATUS_LABEL: Record<string, string> = {
  pending:            'Unpaid',
  payment_processing: 'Paying',
  paid:               'Paid',
  in_production:      'Being made',
  dispatched:         'Shipped',
  delivered:          'Delivered',
  cancelled:          'Cancelled',
  refunded:           'Refunded',
};

// Muted, editorial tones (bg / text / dot) — readable, never neon
export const STATUS_TONE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:            { bg: 'bg-[#F3EEE4]', text: 'text-[#76664A]', dot: 'bg-[#B9A37A]' },
  payment_processing: { bg: 'bg-[#ECEEF2]', text: 'text-[#4E5869]', dot: 'bg-[#8A95A8]' },
  paid:               { bg: 'bg-brand-light', text: 'text-brand', dot: 'bg-brand' },
  in_production:      { bg: 'bg-[#F5EAE4]', text: 'text-[#8A5442]', dot: 'bg-[#C98C74]' },
  dispatched:         { bg: 'bg-[#E7EDF4]', text: 'text-[#3C5876]', dot: 'bg-[#6E8FB3]' },
  delivered:          { bg: 'bg-[#E5EFE8]', text: 'text-[#2E6A44]', dot: 'bg-[#5A9A6E]' },
  cancelled:          { bg: 'bg-[#F6E4E2]', text: 'text-[#973A31]', dot: 'bg-[#C9675D]' },
  refunded:           { bg: 'bg-ivory', text: 'text-[#6B675F]', dot: 'bg-[#A8A399]' },
};

// Statuses an admin can set by hand (pending/paying are transient pre-payment states)
export const SETTABLE_STATUSES = ['paid', 'in_production', 'dispatched', 'delivered', 'cancelled', 'refunded'];

// The happy-path "next step" for one-tap progress from the orders list
export const NEXT_STATUS: Record<string, { to: string; label: string }> = {
  paid:          { to: 'in_production', label: 'Start making' },
  in_production: { to: 'dispatched',    label: 'Mark shipped' },
  dispatched:    { to: 'delivered',     label: 'Mark delivered' },
};

export function gbp(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return `£${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export function shortDate(iso: string, withYear = false) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });
}
