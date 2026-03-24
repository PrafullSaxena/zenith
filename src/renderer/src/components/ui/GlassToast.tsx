/**
 * GlassToast — Blur-tier toast notification container.
 *
 * Renders all active toasts from the toast store in bottom-right corner.
 * Features: slide-in animation, auto-dismiss with progress bar, pause on hover,
 * type-colored icons, max 3 visible.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '@renderer/stores/toast-store'
import { cn, GLASS_BASE } from './glass-utils'

// ---------------------------------------------------------------------------
// Type color map
// ---------------------------------------------------------------------------

const typeColorMap: Record<Toast['type'], { text: string; progress: string }> = {
  success: { text: 'text-[var(--color-success)]', progress: 'bg-[var(--color-success)]' },
  error: { text: 'text-[var(--color-error)]', progress: 'bg-[var(--color-error)]' },
  warning: { text: 'text-[var(--color-warning)]', progress: 'bg-[var(--color-warning)]' },
  info: { text: 'text-[var(--color-info)]', progress: 'bg-[var(--color-info)]' }
}

const typeIconMap: Record<Toast['type'], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

// ---------------------------------------------------------------------------
// ToastItem — individual toast with auto-dismiss and hover pause
// ---------------------------------------------------------------------------

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(toast.duration)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    startRef.current = Date.now()
    timerRef.current = setTimeout(() => {
      removeToast(toast.id)
    }, remainingRef.current)
  }, [removeToast, toast.id])

  // Start timer on mount
  useEffect(() => {
    startTimer()
    return clearTimer
  }, [startTimer, clearTimer])

  const handleMouseEnter = useCallback(() => {
    clearTimer()
    const elapsed = Date.now() - startRef.current
    remainingRef.current = Math.max(remainingRef.current - elapsed, 0)
    setPaused(true)
  }, [clearTimer])

  const handleMouseLeave = useCallback(() => {
    setPaused(false)
    startTimer()
  }, [startTimer])

  const Icon = typeIconMap[toast.type]
  const colors = typeColorMap[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        GLASS_BASE.blur,
        'rounded-xl p-4 shadow-lg shadow-black/30 min-w-[320px] max-w-[420px] relative overflow-hidden'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Content row */}
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', colors.text)} />

        {/* Message */}
        <p className="text-sm text-[var(--text-primary)] flex-1">{toast.message}</p>

        {/* Close button */}
        <button
          onClick={() => removeToast(toast.id)}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar — uses CSS animation so animationPlayState works */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5">
        <div
          className={cn('h-full rounded-full', colors.progress)}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running'
          }}
        />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// GlassToast container
// ---------------------------------------------------------------------------

export function GlassToast() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
