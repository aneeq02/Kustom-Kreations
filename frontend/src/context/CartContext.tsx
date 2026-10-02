'use client';

import { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react';
import { CartItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CartState {
  items: CartItem[];
  sessionId: string;
}

export type NewCartItem = Omit<CartItem, 'id'> & { id?: string };

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'UPDATE'; id: string; patch: Partial<CartItem> }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD':
      return { ...state, items: [...state.items, action.item] };
    case 'UPDATE':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, ...action.patch } : i) };
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
  addItem: (item: NewCartItem) => string;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  sessionId: string;
  hydrated: boolean;
  // Photo uploads still in flight this session. Not persisted — after a
  // reload an item with an empty imageKey is a failed upload, not a pending one.
  uploadingIds: ReadonlySet<string>;
  setUploading: (id: string, uploading: boolean) => void;
  // Mixtiles-style slide-in bag, openable from anywhere (navbar, studio)
  bagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    sessionId: '',
  });
  const [hydrated, setHydrated] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<ReadonlySet<string>>(new Set());
  const [bagOpen, setBagOpen] = useState(false);

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
    try {
      localStorage.setItem('kk_cart', JSON.stringify(state));
    } catch { /* quota exceeded — cart still works for this session */ }
  }, [state, hydrated]);

  const addItem = useCallback((item: NewCartItem) => {
    const id = item.id ?? uuidv4();
    dispatch({ type: 'ADD', item: { ...item, id } });
    return id;
  }, []);
  const updateItem = useCallback((id: string, patch: Partial<CartItem>) => dispatch({ type: 'UPDATE', id, patch }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', id, quantity: Math.max(1, quantity) });
  }, []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const setUploading = useCallback((id: string, uploading: boolean) => {
    setUploadingIds(prev => {
      const next = new Set(prev);
      if (uploading) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const openBag = useCallback(() => setBagOpen(true), []);
  const closeBag = useCallback(() => setBagOpen(false), []);

  return (
    <CartContext.Provider value={{
      items: state.items,
      totalItems: state.items.reduce((s, i) => s + i.quantity, 0),
      addItem, updateItem, removeItem, updateQuantity, clearCart,
      sessionId: state.sessionId,
      hydrated,
      uploadingIds, setUploading,
      bagOpen, openBag, closeBag,
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
