/**
 * Toast notification store.
 *
 * Global state for toast notifications. Max 3 visible simultaneously;
 * adding beyond the limit removes the oldest toast automatically.
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration: number
}

interface ToastStoreState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOASTS = 3
const DEFAULT_DURATION = 5000

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const newToast: Toast = {
      id,
      type: toast.type,
      message: toast.message,
      duration: toast.duration ?? DEFAULT_DURATION
    }

    set((state) => {
      const updated = [newToast, ...state.toasts]
      // Keep only the newest MAX_TOASTS
      return { toasts: updated.slice(0, MAX_TOASTS) }
    })
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },

  clearToasts: () => set({ toasts: [] })
}))
