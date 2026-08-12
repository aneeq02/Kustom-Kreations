'use client';

import { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react';
import { CartItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CartState {
  items: CartItem[];
  sessionId: string;
}

type CartAction =
  | { type: 'ADD'; item: Omit<CartItem, 'id'> }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD':
      return { ...state, items: [...state.items, { ...action.item, id: uuidv4() }] };
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'UPDATE_QTY':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, quantity: action.quantity } : i) };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'HYDRATE':
      return action.state;
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  sessionId: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    sessionId: '',
  });
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart only after mount, so the first client render matches
  // the server-rendered (always-empty) HTML and avoids a hydration mismatch.
  useEffect(() => {
    let loaded: CartState | null = null;
    try {
      const stored = localStorage.getItem('kk_cart');
      if (stored) loaded = JSON.parse(stored) as CartState;
    } catch { /* ignore */ }
    dispatch({ type: 'HYDRATE', state: loaded ?? { items: [], sessionId: uuidv4() } });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('kk_cart', JSON.stringify(state));
  }, [state, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => dispatch({ type: 'ADD', item }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', id, quantity: Math.max(1, quantity) });
  }, []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return (
    <CartContext.Provider value={{
      items: state.items,
      totalItems: state.items.reduce((s, i) => s + i.quantity, 0),
      addItem, removeItem, updateQuantity, clearCart,
      sessionId: state.sessionId,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
