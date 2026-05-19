/**
 * Zustand store for the Task Groomer Dumpyard View plugin.
 *
 * Manages task list, active tab, selected task (for side panel),
 * loading/error state, and IPC actions via window.api.taskgroomer.*.
 *
 * Task type is globally declared in src/renderer/src/types/electron.d.ts —
 * no import needed; it's available via the global Window interface bridge.
 *
 * Follows the same pattern as nebula-store.ts and launchpad-store.ts:
 *  - IPC calls via window.api.taskgroomer.* (wired in Phase 14)
 *  - Optimistic updates for status changes (revert on error)
 *  - Sorted newest-first (by createdAt descending) after fetch
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Stale detection helpers (pure functions, exported for use in components)
// ---------------------------------------------------------------------------

/**
 * Returns true if a dump-status task has been stale for ≥3 days.
 * Uses updatedAt as the staleness anchor (covers the case where the
 * user moved the task back to dump after it was groomed).
 */
export function isTaskStale(task: Task): boolean {
  if (task.status !== 'dump') return false
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  return Date.now() - task.updatedAt >= THREE_DAYS_MS
}

/**
 * Returns the number of days elapsed since updatedAt (for the stale badge label).
 * Does not check stale condition — always returns a number.
 */
export function staleDays(task: Task): number {
  return Math.floor((Date.now() - task.updatedAt) / (24 * 60 * 60 * 1000))
}

// ---------------------------------------------------------------------------
// Store state + actions interface
// ---------------------------------------------------------------------------

interface TaskGroomerState {
  tasks: Task[]
  loading: boolean
  error: string | null
  activeTab: 'dumpyard' | 'groomed'
  selectedTaskId: string | null

  // Actions
  loadTasks: () => Promise<void>
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  setActiveTab: (tab: 'dumpyard' | 'groomed') => void
  setSelectedTaskId: (id: string | null) => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useTaskGroomerStore = create<TaskGroomerState>()((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  activeTab: 'dumpyard',
  selectedTaskId: null,

  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const data = await window.api.taskgroomer.listTasks()
      // Sort newest-first (by createdAt descending)
      set({
        tasks: data.sort((a, b) => b.createdAt - a.createdAt),
        loading: false
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load tasks'
      })
    }
  },

  updateTaskStatus: async (id: string, status: Task['status']) => {
    const prev = get().tasks
    // Optimistic update — apply immediately so UI responds instantly
    set({
      tasks: prev.map((t) =>
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t
      )
    })
    try {
      await window.api.taskgroomer.updateTask({ id, fields: { status } })
    } catch (err) {
      // Revert optimistic update on IPC failure
      set({
        tasks: prev,
        error: err instanceof Error ? err.message : 'Failed to update task status'
      })
    }
  },

  setActiveTab: (tab: 'dumpyard' | 'groomed') => {
    set({ activeTab: tab })
  },

  setSelectedTaskId: (id: string | null) => {
    set({ selectedTaskId: id })
  }
}))
