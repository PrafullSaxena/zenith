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
  groomingActive: boolean // true while a run is in progress
  groomingTaskIds: Set<string> // task IDs currently being processed (shimmer state)
  groomCount: number // count of dump tasks at start of run (for button label)
  groomStage: 'analyzing' | 'querying' | 'summarizing' | null // current stage within active grooming run
  lastGroomSummary: { succeeded: number; failed: number; total: number } | null
  failedTaskIds: Set<string> // task IDs that failed grooming in the most recent run

  // Re-groom state
  reGroomTaskId: string | null // ID of task currently being re-groomed; null if idle

  // Digest state (populated after batch groom run completes)
  digestTasks: Task[] // Tasks groomed in the most recent batch run, sorted for display
  showDigest: boolean // true after batch completes; false when user dismisses or next batch starts

  // Actions
  loadTasks: () => Promise<void>
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setActiveTab: (tab: 'dumpyard' | 'groomed') => void
  setSelectedTaskId: (id: string | null) => void
  startGroom: () => Promise<void>
  startReGroom: (taskId: string) => Promise<void>
  dismissDigest: () => void
  handleGroomProgress: (data: {
    taskId: string
    status: 'grooming' | 'done' | 'failed'
    stage?: 'analyzing' | 'querying' | 'summarizing'
    result?: Record<string, unknown>
  }) => void
  initGroomListeners: () => void
  cleanupGroomListeners: () => void

  // Comment actions
  addComment: (taskId: string, text: string) => Promise<void>
  updateComment: (taskId: string, commentId: string, text: string) => Promise<void>
  deleteComment: (taskId: string, commentId: string) => Promise<void>
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
  groomStage: null,
  lastGroomSummary: null,
  failedTaskIds: new Set<string>(),

  // Re-groom state initial values
  reGroomTaskId: null,

  // Digest state initial values
  digestTasks: [],
  showDigest: false,

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

  deleteTask: async (id: string) => {
    const prev = get().tasks
    // Optimistic: remove from local state immediately
    set({
      tasks: prev.filter((t) => t.id !== id),
      selectedTaskId: get().selectedTaskId === id ? null : get().selectedTaskId
    })
    try {
      await window.api.taskgroomer.deleteTask({ id })
    } catch (err) {
      // Revert on IPC failure
      set({ tasks: prev, error: err instanceof Error ? err.message : 'Failed to delete task' })
    }
  },

  setActiveTab: (tab: 'dumpyard' | 'groomed') => {
    set({ activeTab: tab })
  },

  setSelectedTaskId: (id: string | null) => {
    set({ selectedTaskId: id })
  },

  startGroom: async () => {
    const dumpTasks = get().tasks.filter((t) => t.status === 'dump')
    if (dumpTasks.length === 0) return
    set({
      groomingActive: true,
      groomCount: dumpTasks.length,
      groomStage: null,
      groomingTaskIds: new Set(),
      failedTaskIds: new Set(),
      digestTasks: [],
      showDigest: false
    })
    try {
      await window.api.taskgroomer.groom()
    } catch (err) {
      // If IPC call fails outright (e.g. already running), reset state
      set({ groomingActive: false, groomingTaskIds: new Set() })
    }
  },

  startReGroom: async (taskId: string) => {
    const { groomingActive, reGroomTaskId } = get()

    // Shared lock: block if any groom (batch or single) is already running
    if (groomingActive || reGroomTaskId !== null) return

    set({ reGroomTaskId: taskId })

    try {
      const response = await window.api.taskgroomer.reGroom(taskId)

      if (!response.started) {
        // Main process rejected — another run is active
        set({ reGroomTaskId: null })
        return
      }

      if (response.error || !response.result) {
        // Re-groom ran but AI failed
        set({ reGroomTaskId: null })
        const { toast } = await import('sonner')
        toast.error('Re-groom failed — try again.')
        return
      }

      const r = response.result

      // In-place update: replace AI fields, promote status to 'groomed', preserve everything else
      set((state) => ({
        reGroomTaskId: null,
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'groomed' as const,
                priority: r.priority as Task['priority'],
                priorityRationale: r.priorityRationale,
                suggestedAction: r.suggestedAction as Task['suggestedAction'],
                evidenceSummary: r.evidenceSummary,
                jiraTicketKey: r.jiraTicketKey,
                jiraTicketUrl: r.jiraTicketUrl,
                researchSummary: r.researchSummary,
                researchLinks: r.researchLinks,
                groomedAt: r.groomedAt,
                sourcesUsed: r.sourcesUsed ?? null,
                updatedAt: Date.now()
              }
            : t
        )
      }))
    } catch {
      set({ reGroomTaskId: null })
      const { toast } = await import('sonner')
      toast.error('Re-groom failed — try again.')
    }
  },

  dismissDigest: () => {
    set({ showDigest: false })
  },

  handleGroomProgress: (data) => {
    const { taskId, status, stage, result } = data

    // Sentinel event: run is complete
    if (taskId === '__run_complete__') {
      const summary = result as { succeeded: number; failed: number; total: number } | undefined

      // Compute digest: tasks that were successfully groomed in this batch run
      // Identify by groomedAt being within the last 2 minutes (batch just ran)
      const now = Date.now()
      const TWO_MINUTES = 2 * 60 * 1000
      const freshGroomed = get().tasks.filter(
        (t) => t.status === 'groomed' && t.groomedAt !== null && now - t.groomedAt < TWO_MINUTES
      )

      // Sort: P1 → P2 → P3, then Do → Delegate → Defer → Delete within same priority
      const PRIORITY_ORDER: Record<string, number> = { p1: 0, p2: 1, p3: 2 }
      const ACTION_ORDER: Record<string, number> = { do: 0, delegate: 1, defer: 2, delete: 3 }
      const sortedDigest = [...freshGroomed].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority ?? 'p3'] ?? 2
        const pb = PRIORITY_ORDER[b.priority ?? 'p3'] ?? 2
        if (pa !== pb) return pa - pb
        const aa = ACTION_ORDER[a.suggestedAction ?? 'defer'] ?? 2
        const ab = ACTION_ORDER[b.suggestedAction ?? 'defer'] ?? 2
        return aa - ab
      })

      set({
        groomingActive: false,
        groomStage: null,
        groomingTaskIds: new Set(),
        digestTasks: sortedDigest,
        showDigest: sortedDigest.length > 0
      })

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
      // Update shimmer set; if a stage is provided, update groomStage as well
      set((state) => ({
        groomingTaskIds: new Set([...state.groomingTaskIds, taskId]),
        ...(stage ? { groomStage: stage } : {})
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
        sourcesUsed?: ('ai' | 'jira' | 'confluence' | 'google')[]
      }
      set((state) => {
        const newShimmerIds = new Set(state.groomingTaskIds)
        newShimmerIds.delete(taskId)
        return {
          groomingTaskIds: newShimmerIds,
          tasks: state.tasks.map((t) =>
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
                  sourcesUsed: taskResult.sourcesUsed ?? null,
                  updatedAt: Date.now()
                }
              : t
          )
        }
      })
      return
    }

    if (status === 'failed') {
      // Remove from shimmering set, track in failedTaskIds, leave task in dump status
      set((state) => {
        const newShimmerIds = new Set(state.groomingTaskIds)
        newShimmerIds.delete(taskId)
        return {
          groomingTaskIds: newShimmerIds,
          failedTaskIds: new Set([...state.failedTaskIds, taskId])
        }
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
  },

  addComment: async (taskId, text) => {
    const updatedTask = await window.api.taskgroomer.addComment({ taskId, text })
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t))
    }))
  },

  updateComment: async (taskId, commentId, text) => {
    const updatedTask = await window.api.taskgroomer.updateComment({ taskId, commentId, text })
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t))
    }))
  },

  deleteComment: async (taskId, commentId) => {
    // Optimistic: remove the comment from local state immediately
    const prev = get().tasks
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: (t.comments ?? []).filter((c) => c.id !== commentId) }
          : t
      )
    }))
    try {
      const updatedTask = await window.api.taskgroomer.deleteComment({ taskId, commentId })
      // Confirm with server state
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t))
      }))
    } catch {
      // Revert on failure
      set({ tasks: prev })
    }
  }
}))
