import type { PullRequest } from './bitbucket'

/** A single AI-generated review comment mapped to a file and line. */
export interface ReviewComment {
  file: string
  line: number
  severity: 'critical' | 'warning' | 'suggestion'
  comment: string
  posted: boolean // Whether successfully posted to Bitbucket
}

/** Active review session state. */
export interface ReviewSession {
  sessionId: string
  prId: number
  status: 'streaming' | 'complete' | 'error' | 'cancelled'
  rawText: string // Accumulated streamed text
  comments: ReviewComment[] // Parsed from rawText after streaming completes
  error?: string
  startedAt: string
}

/** Persisted review history entry. */
export interface ReviewHistoryEntry {
  id: string
  prId: number
  prTitle: string
  prUrl: string
  workspace: string
  repoSlug: string
  commentCount: number
  postedCount: number
  timestamp: string
  status: 'success' | 'partial' | 'error'
}

// Re-export PullRequest for convenience
export type { PullRequest }
