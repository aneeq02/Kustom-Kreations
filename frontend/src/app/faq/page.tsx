import { Card } from '@/components/ui/Card';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ — Kustom Kreations' };

const FAQ = [
  {
    q: 'What size are the magnets?',
    a: 'Each magnet is exactly 50mm × 50mm — a perfect square. They come with a strong magnetic backing that sticks firmly to fridges, lockers, and any magnetic surface.',
  },
  {
    q: 'What photo quality do I need?',
    a: "We recommend at least 300 DPI at print size for crisp results. Our system checks your photo quality automatically and will warn you if a photo might look blurry. You can still order with a lower-quality photo if you're happy to proceed.",
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery to UK mainland takes 3–5 working days. Express options are also available. Isle of Man and Republic of Ireland may take slightly longer.',
  },
  {
    q: 'Do you ship outside the UK?',
    a: "At launch we ship to the UK (including Isle of Man) and Republic of Ireland only. We're working on expanding to more countries — join our mailing list to be notified.",
  },
  {
    q: 'Can I order just one magnet?',
    a: "Yes! There's no minimum order. Bulk discounts apply automatically when you order 5 or more magnets.",
  },
  {
    q: 'Can I use a promo code and a gift voucher together?',
    a: 'Yes! You can apply both a promo code and a gift voucher to the same order.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards. Payment options will be shown at checkout.',
  },
  {
    q: 'Can I return my magnets?',
    a: "As personalised products, we're unable to accept returns unless the items are faulty or damaged. If there's a problem with your order, please contact us and we'll make it right.",
  },
  {
    q: 'Are gift vouchers available?',
    a: "Yes! Gift vouchers are available in various amounts and make a lovely gift. They're valid for 2 years from purchase.",
  },
  {
    q: 'How do I track my order?',
    a: "You'll receive a confirmation email with a tracking link. You can also track your order via your account page or the Track Order page.",
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold text-navy mb-2">Frequently asked questions</h1>
      <p className="text-text-secondary mb-10">Everything you need to know about Kustom Kreations</p>

      <div className="flex flex-col gap-4">
        {FAQ.map(({ q, a }) => (
          <Card key={q} padding="md">
            <h2 className="font-heading font-bold text-navy mb-2">{q}</h2>
            <p className="text-text-secondary text-sm leading-relaxed">{a}</p>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center bg-coral-light/40 rounded-2xl p-8">
        <p className="font-heading font-bold text-navy mb-2">Still have questions?</p>
        <p className="text-text-secondary text-sm mb-4">Our team is happy to help!</p>
        <a href="/contact" className="text-coral font-semibold hover:underline">Contact us</a>
      </div>
    </div>
  );
}
