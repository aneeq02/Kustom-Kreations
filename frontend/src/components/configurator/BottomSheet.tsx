'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name for the dialog */
  label?: string;
  /** Wider card on desktop (e.g. for an image-card picker) */
  wide?: boolean;
}

// Slide-up sheet on phones, centred card on larger screens — the same pattern
// Mixtiles uses for "What do you want to add?" / "Upload photos".
export default function BottomSheet({ open, onClose, children, label, wide }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy/45 z-60"
          />
          <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-61 flex sm:items-center justify-center pointer-events-none sm:p-6">
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={label}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className={`no-scrollbar pointer-events-auto w-full ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto`}
            >
              <div className="sm:hidden sticky top-0 bg-white flex justify-center pt-3 pb-1 z-10">
                <div className="w-10 h-1.5 rounded-full bg-border" />
              </div>
              <div className="px-6 pt-3 pb-7 sm:p-7">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
