import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — Kustom Kreations' };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-sm prose-navy">
      <h1 className="text-3xl font-heading font-bold text-navy mb-2">Privacy Policy</h1>
      <p className="text-text-secondary mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="flex flex-col gap-8 text-sm text-navy leading-relaxed">
        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">Who we are</h2>
          <p className="text-text-secondary">Kustom Kreations (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website at kustomkreations.co.uk. We are the data controller for the personal data collected through this website.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">What data we collect</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-1">
            <li>Name and email address when you create an account or checkout as a guest</li>
            <li>Delivery address for order fulfilment</li>
            <li>Payment information (processed securely by our payment provider — we never store card numbers)</li>
            <li>Photos you upload for personalisation (stored securely in encrypted cloud storage)</li>
            <li>Order history and account preferences</li>
            <li>Technical data (IP address, browser type, pages visited) via analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">How we use your data</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-1">
            <li>To process and fulfil your orders</li>
            <li>To send order confirmation and tracking emails</li>
            <li>To provide customer support</li>
            <li>To send marketing emails if you have opted in (you can unsubscribe at any time)</li>
            <li>To improve our website and services</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">Your photos</h2>
          <p className="text-text-secondary">The photos you upload are stored securely and used only to produce your magnets. We do not share, sell, or use your photos for any other purpose. Photos are deleted from our servers after your order is fulfilled and any statutory retention period has passed.</p>
        </section>

        <section id="cookies">
          <h2 className="font-heading font-bold text-xl text-navy mb-3">Cookies</h2>
          <p className="text-text-secondary mb-2">We use the following types of cookies:</p>
          <ul className="list-disc list-inside text-text-secondary space-y-1">
            <li><strong>Essential cookies:</strong> Required for the website to function (cart, session)</li>
            <li><strong>Analytics cookies:</strong> Google Analytics to understand how visitors use our site (you can opt out)</li>
          </ul>
          <p className="text-text-secondary mt-2">You can manage cookie preferences via the banner when you first visit.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">Your rights (GDPR)</h2>
          <p className="text-text-secondary">Under GDPR you have the right to: access, correct, or delete your personal data; restrict or object to processing; and data portability. To exercise any of these rights, please <a href="/contact" className="text-coral hover:underline">contact us</a>.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-xl text-navy mb-3">Contact</h2>
          <p className="text-text-secondary">Questions about your data? Email us at <a href="mailto:privacy@kustomkreations.co.uk" className="text-coral hover:underline">privacy@kustomkreations.co.uk</a></p>
        </section>
      </div>
    </div>
  );
}
