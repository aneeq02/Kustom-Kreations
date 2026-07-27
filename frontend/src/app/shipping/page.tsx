import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = { title: 'Shipping & Returns — Kustom Kreations' };

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold text-navy mb-2">Shipping & Returns</h1>
      <p className="text-text-secondary mb-10">Everything you need to know about getting your magnets to you</p>

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="font-heading font-bold text-navy text-xl mb-4">Delivery</h2>
          <div className="flex flex-col gap-4 text-sm">
            {[
              { region: 'UK Mainland', methods: ['Standard (3–5 days)', 'Express (1–2 days)'], note: 'Free standard shipping on orders over £35' },
              { region: 'Isle of Man', methods: ['Standard (4–7 days)'], note: '' },
              { region: 'Republic of Ireland', methods: ['Standard (5–7 days)'], note: 'Prices displayed in EUR' },
            ].map(({ region, methods, note }) => (
              <div key={region} className="border-b border-coral-light/40 pb-4 last:border-0">
                <div className="font-semibold text-navy mb-1">{region}</div>
                <ul className="list-disc list-inside text-text-secondary space-y-1">
                  {methods.map(m => <li key={m}>{m}</li>)}
                </ul>
                {note && <p className="text-xs text-coral mt-1 font-medium">{note}</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-4">
            Exact shipping costs and real-time estimates are shown at checkout. Shipping rates are set by our team and update regularly.
          </p>
        </Card>

        <Card>
          <h2 className="font-heading font-bold text-navy text-xl mb-4">Production time</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Most orders are produced and dispatched within 1–2 working days. During busy periods (e.g. Christmas, Valentine's Day) this may take slightly longer — we'll always keep you updated by email.
          </p>
        </Card>

        <Card>
          <h2 className="font-heading font-bold text-navy text-xl mb-4">Returns & refunds</h2>
          <div className="flex gap-2 items-start mb-3">
            <Badge color="coral">Personalised items</Badge>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Because each magnet is printed specifically for you, we&apos;re unable to accept returns for change of mind on personalised items.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-navy">Damaged or faulty items:</span> If your magnets arrive damaged or there&apos;s a printing error on our part, please contact us within 14 days of delivery with a photo and we&apos;ll reprint or refund at no cost to you.
          </p>
        </Card>

        <Card>
          <h2 className="font-heading font-bold text-navy text-xl mb-4">Tracking</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            You&apos;ll receive a dispatch email with tracking information when your order is on its way. You can also track your order at any time from your{' '}
            <a href="/account" className="text-coral hover:underline">account page</a>.
          </p>
        </Card>
      </div>
    </div>
  );
}
