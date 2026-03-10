/**
 * ToastContainer -- Animated toast notification container for Nebula.
 *
 * Features:
 *  - Reads toasts from the Nebula store
 *  - Positioned bottom-right to avoid FAB overlap (above the FAB)
 *  - Framer-motion AnimatePresence for smooth enter/exit transitions
 *  - Clickable toasts navigate to the associated note
 *  - Auto-dismiss handled by the store's addToast setTimeout
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useNebulaStore } from '../../stores/nebula-store'

export default function ToastContainer(): React.JSX.Element {
  const toasts = useNebulaStore((s) => s.toasts)
  const removeToast = useNebulaStore((s) => s.removeToast)
  const selectNote = useNebulaStore((s) => s.selectNote)

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="rounded-lg border border-border bg-surface-elevated px-4 py-3 shadow-xl cursor-pointer text-sm text-text-primary max-w-xs"
            onClick={() => {
              if (toast.noteId) {
                selectNote(toast.noteId)
              }
              removeToast(toast.id)
            }}
            role="alert"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
