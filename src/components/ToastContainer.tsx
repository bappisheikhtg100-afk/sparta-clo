import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-8 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)]"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] px-4 py-3.5 shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Check className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{toast.title}</p>
                {toast.subtitle && (
                  <p className="text-[11px] opacity-75 truncate">{toast.subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
