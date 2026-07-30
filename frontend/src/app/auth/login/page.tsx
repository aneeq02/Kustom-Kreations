'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-navy mb-1">Welcome back!</h1>
        <p className="text-text-secondary">Sign in to your Kustom Kreations account</p>
      </div>

      <Card>
        {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <Input label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-xs text-coral hover:underline">Forgot password?</Link>
          </div>
          <Button type="submit" size="lg" fullWidth loading={loading}>Sign in</Button>
        </form>
        <p className="text-center text-sm text-text-secondary mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-coral font-semibold hover:underline">Create one</Link>
        </p>
      </Card>

      <div className="text-center mt-6">
        <p className="text-sm text-text-secondary">
          Prefer to checkout as a guest?{' '}
          <Link href="/configure" className="text-coral hover:underline">Continue without signing in</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
