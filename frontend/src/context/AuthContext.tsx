'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<any>('/auth/me');
      setCustomer({ id: data.id, email: data.email, firstName: data.first_name, lastName: data.last_name });
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await api.post<any>('/auth/login', { email, password });
    setCustomer({ id: data.customer.id, email: data.customer.email, firstName: data.customer.firstName, lastName: data.customer.lastName });
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
