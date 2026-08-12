'use client';

interface BulkDiscountPopupProps {
  remaining: number;
  pct: number;
  onClose: () => void;
}

export default function BulkDiscountPopup({ remaining, pct, onClose }: BulkDiscountPopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-secondary hover:text-navy text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-heading font-bold text-navy text-xl mb-2">You&apos;re halfway to a discount!</h3>
        <p className="text-text-secondary text-sm mb-5">
          Add {remaining} more magnet{remaining === 1 ? '' : 's'} to this order to save {pct}%.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-white bg-coral hover:bg-coral/90 transition-colors"
        >
          Keep adding photos
        </button>
      </div>
    </div>
  );
}
