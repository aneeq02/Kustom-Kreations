'use client';

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { CartItem, BulkDiscountTier } from '@/types';
import { getApplicableTier } from '@/lib/pricing';
import { v4 as uuidv4 } from 'uuid';

interface CartState {
  items: CartItem[];
  sessionId: string;
}

type CartAction =
  | { type: 'ADD'; item: Omit<CartItem, 'id'> }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; quantity: number; discountPct: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD':
      return { ...state, items: [...state.items, { ...action.item, id: uuidv4() }] };
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'UPDATE_QTY':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, quantity: action.quantity, discountPct: action.discountPct } : i) };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number, tiers: BulkDiscountTier[]) => void;
  clearCart: () => void;
  sessionId: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    sessionId: uuidv4(),
  }, (init) => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('kk_cart');
        if (stored) return JSON.parse(stored) as CartState;
      } catch { /* ignore */ }
    }
    return init;
  });

  useEffect(() => {
    localStorage.setItem('kk_cart', JSON.stringify(state));
  }, [state]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => dispatch({ type: 'ADD', item }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const updateQuantity = useCallback((id: string, quantity: number, tiers: BulkDiscountTier[]) => {
    const safeQty = Math.max(1, quantity);
    const tier = getApplicableTier(safeQty, tiers);
    dispatch({ type: 'UPDATE_QTY', id, quantity: safeQty, discountPct: tier?.discountPct ?? 0 });
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
