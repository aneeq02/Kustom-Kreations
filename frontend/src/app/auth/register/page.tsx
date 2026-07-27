'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', marketing: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        marketingOptIn: form.marketing,
      });
      await refresh();
      router.push('/account');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: key === 'marketing' ? e.target.checked : e.target.value }));

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-navy mb-1">Create an account</h1>
        <p className="text-text-secondary">Track orders, save addresses, and more</p>
      </div>

      <Card>
        {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" required value={form.firstName} onChange={set('firstName')} />
            <Input label="Last name" value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          <Input label="Password" type="password" required value={form.password} onChange={set('password')} hint="At least 8 characters" autoComplete="new-password" />
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={form.marketing} onChange={set('marketing')} className="accent-coral rounded" />
            Send me special offers and magnet inspiration
          </label>
          <Button type="submit" size="lg" fullWidth loading={loading}>Create account</Button>
        </form>
        <p className="text-center text-sm text-text-secondary mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-coral font-semibold hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
