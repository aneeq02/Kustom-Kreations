'use client';

interface BulkDiscountPopupProps {
  remaining: number;
  pct: number;
  onClose: () => void;
}

export default function BulkDiscountPopup({ remaining, pct, onClose }: BulkDiscountPopupProps) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-navy/45 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bulk discount"
        onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-navy hover:bg-cream cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-brand-light text-brand flex items-center justify-center font-heading text-2xl">
          {pct}%
        </div>
        <h3 className="font-heading text-navy text-2xl mb-2">You&apos;re halfway to a discount</h3>
        <p className="text-text-secondary text-sm mb-6">
          Add {remaining} more to this order to save {pct}% on them.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg font-semibold text-white bg-brand hover:bg-brand-dark transition-colors cursor-pointer"
        >
          Keep adding photos
        </button>
      </div>
    </div>
  );
}
