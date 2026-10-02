'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet } from '@/lib/adminApi';

const SEEN_KEY = 'kk_admin_last_seen_order_at';
const POLL_MS = 60_000;

interface OrderSummary {
  id: string;
  order_number: string;
  created_at: string;
}

interface OrdersResponse {
  orders: OrderSummary[];
}

export default function NewOrderAlert() {
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);
  const latestSeenRef = useRef<string | null>(null);

  const check = useCallback(async () => {
    try {
      const data = await adminGet<OrdersResponse>('/orders?limit=10');
      const orders = data.orders ?? [];
      if (!orders.length) return;

      const lastSeen = localStorage.getItem(SEEN_KEY);
      const newest = orders[0].created_at;

      if (!lastSeen) {
        // First ever visit — establish a baseline instead of flagging all history as "new"
        localStorage.setItem(SEEN_KEY, newest);
        return;
      }

      const unseen = orders.filter(o => new Date(o.created_at) > new Date(lastSeen));
      if (unseen.length > 0) {
        latestSeenRef.current = newest;
        setNewCount(unseen.length);
      }
    } catch {
      // Silent — a notification check failing shouldn't block the admin panel
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  const dismiss = () => {
    if (latestSeenRef.current) localStorage.setItem(SEEN_KEY, latestSeenRef.current);
    setNewCount(0);
  };

  const viewOrders = () => {
    dismiss();
    router.push('/admin/orders');
  };

  return (
    <AnimatePresence>
      {newCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          role="status"
          className="fixed z-60 top-[4.25rem] inset-x-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[22rem]"
        >
          <div className="bg-white rounded-xl shadow-[0_16px_40px_-12px_rgba(26,26,24,0.3)] border border-brand/25 p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 004 0" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy">
                {newCount} new order{newCount > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-text-secondary mt-0.5 mb-3">
                Take a look before {newCount > 1 ? 'they pile' : 'it piles'} up.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={viewOrders}
                  className="h-10 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors cursor-pointer"
                >
                  View orders
                </button>
                <button
                  onClick={dismiss}
                  className="h-10 px-3 rounded-lg text-sm font-medium text-text-secondary hover:text-navy hover:bg-cream transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
