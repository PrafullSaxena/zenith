import { create } from 'zustand'
import parseDiff from 'parse-diff'
import type { PullRequest, DiffFile, DiffChange } from '../types/bitbucket'
import type { ReviewComment, ReviewSession, ReviewHistoryEntry } from '../types/review'

interface ReviewStoreState {
  // Connection state
  isConnected: boolean
  isConnecting: boolean

  // PR browsing
  pullRequests: PullRequest[]
  isLoadingPRs: boolean
  selectedPR: PullRequest | null

  // Diff state
  rawDiff: string
  diffFiles: DiffFile[]
  isLoadingDiff: boolean

  // Active review session
  currentSession: ReviewSession | null

  // Review history
  history: ReviewHistoryEntry[]
  isLoadingHistory: boolean

  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  checkConnection: () => Promise<void>
  loadPRs: (workspace: string, repoSlug: string) => Promise<void>
  selectPR: (pr: PullRequest) => void
  loadDiff: (workspace: string, repoSlug: string, prId: number) => Promise<void>
  startReview: (providerId: string, modelName: string) => Promise<void>
  cancelReview: () => void
  postComment: (
    workspace: string,
    repoSlug: string,
    prId: number,
    comment: ReviewComment
  ) => Promise<void>
  postAllComments: (
    workspace: string,
    repoSlug: string,
    prId: number
  ) => Promise<void>
  loadHistory: () => Promise<void>
  addHistoryEntry: (
    entry: Omit<ReviewHistoryEntry, 'id' | 'timestamp'>
  ) => Promise<void>
}

/** Settings key for persisted review history. */
const HISTORY_STORAGE_KEY = 'reviewHistory'

/** Maximum number of review history entries to retain. */
const MAX_HISTORY_ENTRIES = 100

/**
 * Parse streaming AI output into ReviewComment objects.
 * Each line matching a JSON object with { file, line, severity, comment }
 * is treated as a comment. Non-JSON lines are summary text.
 */
function parseReviewComments(rawText: string): ReviewComment[] {
  const comments: ReviewComment[] = []
  const lines = rawText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      if (
        typeof parsed.file === 'string' &&
        typeof parsed.line === 'number' &&
        typeof parsed.severity === 'string' &&
        typeof parsed.comment === 'string'
      ) {
        comments.push({
          file: parsed.file,
          line: parsed.line,
          severity: parsed.severity as ReviewComment['severity'],
          comment: parsed.comment,
          posted: false
        })
      }
    } catch {
      // Not valid JSON -- skip (summary text line)
    }
  }

  return comments
}

/**
 * Convert parse-diff output to our DiffFile[] type.
 * parse-diff returns an array of file objects with slightly different shape.
 */
function toDiffFiles(parsed: ReturnType<typeof parseDiff>): DiffFile[] {
  return parsed.map((file) => ({
    from: file.from ?? '',
    to: file.to ?? '',
    additions: file.additions,
    deletions: file.deletions,
    chunks: file.chunks.map((chunk) => ({
      content: chunk.content,
      changes: chunk.changes.map((change) => ({
        type: change.type === 'add' ? 'add' : change.type === 'del' ? 'del' : 'normal',
        ...(change.type === 'normal'
          ? { ln1: change.ln1, ln2: change.ln2 }
          : { ln: change.ln }),
        content: change.content
      })) as DiffChange[]
    }))
  }))
}

export const useReviewStore = create<ReviewStoreState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  pullRequests: [],
  isLoadingPRs: false,
  selectedPR: null,
  rawDiff: '',
  diffFiles: [],
  isLoadingDiff: false,
  currentSession: null,
  history: [],
  isLoadingHistory: false,

  connect: async () => {
    set({ isConnecting: true })
    try {
      await window.api.bitbucket.connect()
      set({ isConnected: true, isConnecting: false })
    } catch (err) {
      set({ isConnecting: false })
      throw err
    }
  },

  disconnect: async () => {
    await window.api.bitbucket.disconnect()
    set({
      isConnected: false,
      pullRequests: [],
      selectedPR: null,
      rawDiff: '',
      diffFiles: [],
      currentSession: null
    })
  },

  checkConnection: async () => {
    const connected = await window.api.bitbucket.isConnected()
    set({ isConnected: connected })
  },

  loadPRs: async (workspace: string, repoSlug: string) => {
    set({ isLoadingPRs: true })
    try {
      const prs = await window.api.bitbucket.listPRs(workspace, repoSlug)
      set({ pullRequests: prs, isLoadingPRs: false })
    } catch (err) {
      set({ isLoadingPRs: false })
      throw err
    }
  },

  selectPR: (pr: PullRequest) => {
    set({ selectedPR: pr, rawDiff: '', diffFiles: [], currentSession: null })
  },

  loadDiff: async (workspace: string, repoSlug: string, prId: number) => {
    set({ isLoadingDiff: true })
    try {
      const raw = await window.api.bitbucket.getPRDiff(workspace, repoSlug, prId)
      const parsed = parseDiff(raw)
      set({
        rawDiff: raw,
        diffFiles: toDiffFiles(parsed),
        isLoadingDiff: false
      })
    } catch (err) {
      set({ isLoadingDiff: false })
      throw err
    }
  },

  startReview: async (providerId: string, modelName: string) => {
    const { rawDiff } = get()
    if (!rawDiff) {
      throw new Error('No diff loaded. Load a PR diff first.')
    }

    const sessionId = `review-${Date.now()}`
    const session: ReviewSession = {
      sessionId,
      prId: get().selectedPR?.id ?? 0,
      status: 'streaming',
      rawText: '',
      comments: [],
      startedAt: new Date().toISOString()
    }

    set({ currentSession: session })

    // Set up IPC stream listeners
    window.api.ai.onStreamChunk((data) => {
      if (data.sessionId !== sessionId) return
      const current = get().currentSession
      if (!current || current.sessionId !== sessionId) return

      set({
        currentSession: {
          ...current,
          rawText: current.rawText + data.chunk
        }
      })
    })

    window.api.ai.onStreamDone((data) => {
      if (data.sessionId !== sessionId) return
      const current = get().currentSession
      if (!current || current.sessionId !== sessionId) return

      const comments = parseReviewComments(current.rawText)
      set({
        currentSession: {
          ...current,
          status: 'complete',
          comments
        }
      })

      window.api.ai.removeStreamListeners()
    })

    window.api.ai.onStreamError((data) => {
      if (data.sessionId !== sessionId) return
      const current = get().currentSession
      if (!current || current.sessionId !== sessionId) return

      set({
        currentSession: {
          ...current,
          status: 'error',
          error: data.error
        }
      })

      window.api.ai.removeStreamListeners()
    })

    // Start the review in the main process
    await window.api.ai.startReview(providerId, modelName, rawDiff, sessionId)
  },

  cancelReview: () => {
    const session = get().currentSession
    if (!session || session.status !== 'streaming') return

    window.api.ai.cancelReview(session.sessionId)
    window.api.ai.removeStreamListeners()

    set({
      currentSession: {
        ...session,
        status: 'cancelled'
      }
    })
  },

  postComment: async (
    workspace: string,
    repoSlug: string,
    prId: number,
    comment: ReviewComment
  ) => {
    await window.api.bitbucket.postComment(
      workspace,
      repoSlug,
      prId,
      comment.file,
      comment.line,
      comment.comment
    )

    // Mark comment as posted in the current session
    const session = get().currentSession
    if (!session) return

    const updatedComments = session.comments.map((c) =>
      c.file === comment.file && c.line === comment.line && c.comment === comment.comment
        ? { ...c, posted: true }
        : c
    )

    set({
      currentSession: {
        ...session,
        comments: updatedComments
      }
    })
  },

  postAllComments: async (
    workspace: string,
    repoSlug: string,
    prId: number
  ) => {
    const session = get().currentSession
    if (!session) return

    for (const comment of session.comments) {
      if (comment.posted) continue
      try {
        await get().postComment(workspace, repoSlug, prId, comment)
      } catch {
        // Continue posting remaining comments even if one fails
      }
    }
  },

  loadHistory: async () => {
    set({ isLoadingHistory: true })
    const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
    const history = Array.isArray(raw) ? (raw as ReviewHistoryEntry[]) : []
    set({ history, isLoadingHistory: false })
  },

  addHistoryEntry: async (
    entry: Omit<ReviewHistoryEntry, 'id' | 'timestamp'>
  ) => {
    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const timestamp = new Date().toISOString()
    const newEntry: ReviewHistoryEntry = { ...entry, id, timestamp }

    // Prepend new entry and cap at MAX_HISTORY_ENTRIES
    const updated = [newEntry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)

    // Optimistic local update
    set({ history: updated })

    // Persist via IPC
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  }
}))
