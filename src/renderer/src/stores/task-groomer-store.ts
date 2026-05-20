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

  // Grooming state
  groomingActive: boolean          // true while a run is in progress
  groomingTaskIds: Set<string>     // task IDs currently being processed (shimmer state)
  groomCount: number               // count of dump tasks at start of run (for button label)
  lastGroomSummary: { succeeded: number; failed: number; total: number } | null

  // Actions
  loadTasks: () => Promise<void>
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  setActiveTab: (tab: 'dumpyard' | 'groomed') => void
  setSelectedTaskId: (id: string | null) => void
  startGroom: () => Promise<void>
  handleGroomProgress: (data: {
    taskId: string
    status: 'grooming' | 'done' | 'failed'
    result?: Record<string, unknown>
  }) => void
  initGroomListeners: () => void
  cleanupGroomListeners: () => void
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

  // Grooming state initial values
  groomingActive: false,
  groomingTaskIds: new Set<string>(),
  groomCount: 0,
  lastGroomSummary: null,

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
      tasks: prev.map((t) => (t.id === id ? { ...t, status, updatedAt: Date.now() } : t))
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
  },

  startGroom: async () => {
    const dumpTasks = get().tasks.filter(t => t.status === 'dump')
    if (dumpTasks.length === 0) return
    set({ groomingActive: true, groomCount: dumpTasks.length, groomingTaskIds: new Set() })
    try {
      await window.api.taskgroomer.groom()
    } catch (err) {
      // If IPC call fails outright (e.g. already running), reset state
      set({ groomingActive: false, groomingTaskIds: new Set() })
    }
  },

  handleGroomProgress: (data) => {
    const { taskId, status, result } = data

    // Sentinel event: run is complete
    if (taskId === '__run_complete__') {
      const summary = result as { succeeded: number; failed: number; total: number } | undefined
      set({ groomingActive: false, groomingTaskIds: new Set() })
      if (summary) {
        set({
          lastGroomSummary: {
            succeeded: summary.succeeded,
            failed: summary.failed,
            total: summary.total
          }
        })
      }
      return
    }

    if (status === 'grooming') {
      // Add task to shimmering set
      set(state => ({
        groomingTaskIds: new Set([...state.groomingTaskIds, taskId])
      }))
      return
    }

    if (status === 'done' && result) {
      // Remove from shimmering set + update task in tasks array
      const taskResult = result as {
        priority: Task['priority']
        suggestedAction: Task['suggestedAction']
        evidenceSummary: string | null
        jiraTicketKey: string | null
        jiraTicketUrl: string | null
        researchSummary: string | null
        researchLinks: string | null
        groomedAt: number
      }
      set(state => {
        const newShimmerIds = new Set(state.groomingTaskIds)
        newShimmerIds.delete(taskId)
        return {
          groomingTaskIds: newShimmerIds,
          tasks: state.tasks.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'groomed' as const,
                  priority: taskResult.priority,
                  suggestedAction: taskResult.suggestedAction,
                  evidenceSummary: taskResult.evidenceSummary,
                  jiraTicketKey: taskResult.jiraTicketKey,
                  jiraTicketUrl: taskResult.jiraTicketUrl,
                  researchSummary: taskResult.researchSummary,
                  researchLinks: taskResult.researchLinks,
                  groomedAt: taskResult.groomedAt,
                  updatedAt: Date.now()
                }
              : t
          )
        }
      })
      return
    }

    if (status === 'failed') {
      // Remove from shimmering set, leave task in dump status (no change to tasks array)
      set(state => {
        const newShimmerIds = new Set(state.groomingTaskIds)
        newShimmerIds.delete(taskId)
        return { groomingTaskIds: newShimmerIds }
      })
    }
  },

  initGroomListeners: () => {
    // Deduplicate: remove any existing listeners before registering new ones
    window.api.taskgroomer.removeGroomListeners()
    window.api.taskgroomer.onGroomProgress((data) => {
      get().handleGroomProgress(data)
    })
    window.api.taskgroomer.onGroomStart(({ taskCount }) => {
      // Schedule-triggered start — renderer wasn't the initiator
      set({ groomingActive: true, groomCount: taskCount, groomingTaskIds: new Set() })
    })
  },

  cleanupGroomListeners: () => {
    window.api.taskgroomer.removeGroomListeners()
  }
}))
