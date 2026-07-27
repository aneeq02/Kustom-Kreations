import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-7xl mb-6">🎉</div>
      <h1 className="text-3xl font-heading font-extrabold text-navy mb-2">Order confirmed!</h1>
      <p className="text-text-secondary mb-6 leading-relaxed">
        Your personalised magnets are being made with love. You&apos;ll receive a confirmation email shortly.
      </p>

      {order && (
        <div className="bg-coral-light rounded-2xl px-6 py-4 mb-8 inline-block">
          <p className="text-sm text-text-secondary">Order number</p>
          <p className="text-2xl font-heading font-bold text-coral">{order}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {order && (
          <Link href={`/track/${order}`}>
            <Button size="lg" fullWidth>Track your order</Button>
          </Link>
        )}
        <Link href="/configure">
          <Button size="lg" variant="outline" fullWidth>Create more magnets</Button>
        </Link>
        <Link href="/">
          <Button size="lg" variant="ghost" fullWidth>Back to home</Button>
        </Link>
      </div>

      <p className="text-xs text-text-secondary mt-8">
        Questions? <Link href="/contact" className="text-coral hover:underline">Contact us</Link>
      </p>
    </div>
  );
}
