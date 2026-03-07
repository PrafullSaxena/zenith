import type { PullRequest } from './bitbucket'

// --- Rich review finding types (aligned with PR-Review_guidelines.txt) ---

export type ReviewSeverity = 'blocking' | 'important' | 'suggestion' | 'info'
export type ReviewConfidence = 'high' | 'medium' | 'low'
export type ReviewKind =
  | 'bug'
  | 'security'
  | 'performance'
  | 'correctness'
  | 'maintainability'
  | 'test-gap'
  | 'style'

/** A single AI-generated review finding mapped to a file and line. */
export interface ReviewComment {
  file: string
  line: number
  severity: ReviewSeverity
  confidence: ReviewConfidence
  kind: ReviewKind
  title: string
  body: string
  suggestedFix?: string
  posted: boolean
  /** Determined by posting policy: severity + confidence → should post inline? */
  shouldPost: boolean
}

/** Active review session state. */
export interface ReviewSession {
  sessionId: string
  prId: number
  status: 'streaming' | 'complete' | 'error' | 'cancelled'
  rawText: string // Accumulated streamed text
  comments: ReviewComment[] // Parsed from rawText after streaming completes
  summary: string // Extracted overall summary from AI output
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

// --- Severity / Confidence display helpers ---

/** Map short AI output codes to full severity. */
export const SEVERITY_FROM_CODE: Record<string, ReviewSeverity> = {
  B: 'blocking',
  I: 'important',
  S: 'suggestion',
  N: 'info'
}

/** Map short AI output codes to full confidence. */
export const CONFIDENCE_FROM_CODE: Record<string, ReviewConfidence> = {
  H: 'high',
  M: 'medium',
  L: 'low'
}

/** Map short AI output codes to full kind. */
export const KIND_FROM_CODE: Record<string, ReviewKind> = {
  bug: 'bug',
  sec: 'security',
  perf: 'performance',
  cor: 'correctness',
  mnt: 'maintainability',
  test: 'test-gap',
  sty: 'style'
}

/** Severity display config: label, emoji, colors. */
export const SEVERITY_CONFIG: Record<
  ReviewSeverity,
  { label: string; emoji: string; badge: string; border: string }
> = {
  blocking: {
    label: 'Blocking',
    emoji: '🔴',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/25',
    border: 'border-l-red-500'
  },
  important: {
    label: 'Important',
    emoji: '🟠',
    badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    border: 'border-l-orange-500'
  },
  suggestion: {
    label: 'Suggestion',
    emoji: '🔵',
    badge: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
    border: 'border-l-cyan-500'
  },
  info: {
    label: 'Info',
    emoji: 'ℹ️',
    badge: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
    border: 'border-l-slate-400'
  }
}

/** Confidence display config. */
export const CONFIDENCE_CONFIG: Record<
  ReviewConfidence,
  { label: string; badge: string }
> = {
  high: {
    label: 'High',
    badge: 'bg-green-500/10 text-green-400'
  },
  medium: {
    label: 'Medium',
    badge: 'bg-yellow-500/10 text-yellow-400'
  },
  low: {
    label: 'Low',
    badge: 'bg-slate-500/10 text-slate-400'
  }
}

/** Kind display config. */
export const KIND_CONFIG: Record<ReviewKind, { label: string; icon: string }> = {
  bug: { label: 'Bug', icon: '🐛' },
  security: { label: 'Security', icon: '🔒' },
  performance: { label: 'Performance', icon: '⚡' },
  correctness: { label: 'Correctness', icon: '✓' },
  maintainability: { label: 'Maintainability', icon: '🔧' },
  'test-gap': { label: 'Test Gap', icon: '🧪' },
  style: { label: 'Style', icon: '✨' }
}
