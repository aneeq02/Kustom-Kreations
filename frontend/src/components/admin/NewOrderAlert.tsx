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
          className="fixed top-4 right-4 z-[60] max-w-sm"
        >
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-coral p-5 flex items-start gap-3">
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="font-heading font-bold text-navy text-base">
                {newCount} new order{newCount > 1 ? 's' : ''}!
              </p>
              <p className="text-sm text-gray-500 mt-0.5 mb-3">
                Check {newCount > 1 ? 'them' : 'it'} out before they pile up.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={viewOrders}
                  className="bg-coral text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-coral/90 active:scale-95 transition-all"
                >
                  Check it out →
                </button>
                <button
                  onClick={dismiss}
                  className="text-sm font-semibold text-gray-500 px-3 py-2 hover:text-navy transition-colors"
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
