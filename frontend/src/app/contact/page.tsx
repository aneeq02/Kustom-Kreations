'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', orderNumber: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // In production, send to a backend /api/contact endpoint or Formspree/similar
      await new Promise(r => setTimeout(r, 800)); // simulated
      setSent(true);
    } catch {
      setError('Something went wrong. Please try emailing us directly.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold text-navy mb-2">Contact us</h1>
      <p className="text-text-secondary mb-8">We typically reply within one working day.</p>

      {sent ? (
        <Card className="text-center py-10">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="font-heading font-bold text-navy mb-2">Message sent!</h2>
          <p className="text-text-secondary text-sm">Thanks for getting in touch. We&apos;ll get back to you as soon as possible.</p>
        </Card>
      ) : (
        <Card>
          {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Your name" required value={form.name} onChange={set('name')} />
            <Input label="Email address" type="email" required value={form.email} onChange={set('email')} />
            <Input label="Order number (if relevant)" value={form.orderNumber} onChange={set('orderNumber')} placeholder="e.g. KK-2024-0001" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-navy">Message <span className="text-coral">*</span></label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={set('message')}
                className="w-full px-4 py-3 rounded-xl border-2 border-coral-light focus:border-coral focus:outline-none bg-white text-navy resize-none"
                placeholder="How can we help?"
              />
            </div>
            <Button type="submit" size="lg" fullWidth loading={loading}>Send message</Button>
          </form>
          <p className="text-center text-xs text-text-secondary mt-4">
            Or email us directly at{' '}
            <a href="mailto:hello@kustomkreations.co.uk" className="text-coral hover:underline">hello@kustomkreations.co.uk</a>
          </p>
        </Card>
      )}
    </div>
  );
}
