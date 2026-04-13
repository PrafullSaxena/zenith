import { create } from 'zustand'
import parseDiff from 'parse-diff'
import type { PullRequest, DiffFile, DiffChange } from '../types/bitbucket'
import type {
  ReviewComment,
  ReviewSession,
  ReviewHistoryEntry,
  ReviewSeverity,
  ReviewConfidence,
  ReviewKind,
  UserComment,
  UserCommentMap
} from '../types/review'
import {
  SEVERITY_FROM_CODE,
  CONFIDENCE_FROM_CODE,
  KIND_FROM_CODE,
  SEVERITY_CONFIG,
  KIND_CONFIG
} from '../types/review'
import { useTokenStore } from '../stores/token-store'

interface ReviewStoreState {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null

  // PR browsing (paginated)
  pullRequests: PullRequest[]
  isLoadingPRs: boolean
  prError: string | null
  selectedPR: PullRequest | null
  prPage: number
  prTotalPages: number
  prTotalCount: number

  // Diff state
  rawDiff: string
  diffFiles: DiffFile[]
  isLoadingDiff: boolean

  // Active review session (derived from sessions map based on selectedPR)
  currentSession: ReviewSession | null

  // Per-PR session map — survives component unmount & PR switching
  sessions: Record<number, ReviewSession>

  // Review history
  history: ReviewHistoryEntry[]
  isLoadingHistory: boolean

  // PR file counts (prId → number of files changed)
  prFileCounts: Record<number, number>

  // User comments — persisted per PR via settings
  userComments: UserCommentMap   // keyed "{file}:{line}" → UserComment[]

  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  checkConnection: () => Promise<void>
  loadPRs: (workspace: string, repoSlug: string, page?: number) => Promise<void>
  loadFileCounts: (workspace: string, repoSlug: string) => Promise<void>
  selectPR: (pr: PullRequest) => void
  loadDiff: (workspace: string, repoSlug: string, prId: number) => Promise<void>
  startReview: (providerId: string, modelName: string, command?: string, guidelines?: string) => Promise<void>
  cancelReview: () => void
  clearSession: (prId: number) => void
  updateComment: (index: number, newText: string) => void
  toggleCommentPost: (index: number) => void
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
  loadPersistedSessions: (workspace: string, repoSlug: string) => Promise<void>
  restoreSessionFromHistory: (entry: ReviewHistoryEntry) => Promise<void>
  addUserComment: (workspace: string, repoSlug: string, prId: number, comment: Omit<UserComment, 'id' | 'createdAt'>) => Promise<void>
  deleteUserComment: (workspace: string, repoSlug: string, prId: number, commentId: string) => Promise<void>
  updateUserComment: (workspace: string, repoSlug: string, prId: number, commentId: string, newBody: string) => Promise<void>
  loadUserComments: (workspace: string, repoSlug: string, prId: number) => Promise<void>
  getUserCommentsForLine: (file: string, line: number) => UserComment[]
}

/** Settings key for persisted review history. */
const HISTORY_STORAGE_KEY = 'reviewHistory'

/** Maximum number of review history entries to retain. */
const MAX_HISTORY_ENTRIES = 100

/** Maximum comments to post per PR (from guidelines). */
const MAX_COMMENTS_PER_PR = 10

/** Maximum persisted sessions per repository. */
const MAX_PERSISTED_SESSIONS = 10

/** Persisted session data (subset of ReviewSession — excludes large rawText). */
interface PersistedSession {
  sessionId: string
  prId: number
  prTitle: string
  prUrl: string
  comments: ReviewComment[]
  summary: string
  completedAt: string
}

/** Build a settings storage key for persisted sessions per repo. */
function sessionsStorageKey(workspace: string, repoSlug: string): string {
  return `reviewSessions:${workspace}/${repoSlug}`
}

// ---------------------------------------------------------------------------
// TOON Parser — Token-Optimized Output Notation
// Format: SEV|CONF|KIND|FILE:LINE|TITLE|EXPLANATION|FIX
// ---------------------------------------------------------------------------

/**
 * TOON line regex — 7 pipe-separated fields:
 *   SEV|CONF|KIND|file:line|title|explanation|fix
 *
 * Intentionally lenient: not anchored, handles markdown decoration.
 */
const TOON_RE =
  /([BISN])\|([HML])\|(\w+)\|(.+?):(\d+)\|([^|]+)\|([^|]+?)(?:\|([^|]+))?$/i

/**
 * Fallback: legacy compact format  [MUST]/[NIT]
 *   [MUST] file:line | description
 */
const LEGACY_COMPACT_RE = /\[(MUST|NIT)\]\s+(.+?):(\d+)\s*\|\s*(.+)/i

/**
 * Strip markdown code fences and common wrapper lines from AI output.
 */
function stripMarkdownFences(text: string): string {
  return text.replace(/```[\w]*\n?/g, '').trim()
}

/**
 * Strip common line prefixes that AI models add (bullets, numbers, etc.).
 */
function stripLinePrefix(line: string): string {
  return line
    .replace(/^[-*•]\s+/, '') // bullets: - * •
    .replace(/^\d+\.\s+/, '') // numbered: 1. 2.
    .replace(/^>\s*/, '') // blockquote: >
    .trim()
}

/**
 * Resolve a severity code to the full ReviewSeverity value.
 */
function resolveSeverity(code: string): ReviewSeverity {
  return SEVERITY_FROM_CODE[code.toUpperCase()] ?? 'suggestion'
}

/**
 * Resolve a confidence code to the full ReviewConfidence value.
 */
function resolveConfidence(code: string): ReviewConfidence {
  return CONFIDENCE_FROM_CODE[code.toUpperCase()] ?? 'medium'
}

/**
 * Resolve a kind code to the full ReviewKind value.
 */
function resolveKind(code: string): ReviewKind {
  return KIND_FROM_CODE[code.toLowerCase()] ?? 'correctness'
}

/**
 * Apply posting policy from guidelines:
 *   blocking + high  → post inline
 *   important + high → post inline
 *   suggestion + high → post inline (if genuinely useful)
 *   medium confidence → post with "please verify" note
 *   low confidence → skip
 */
function shouldPostComment(_severity: ReviewSeverity, confidence: ReviewConfidence): boolean {
  if (confidence === 'low') return false
  return true // blocking/important/suggestion with high or medium → post
}

/**
 * Parse streaming AI output into ReviewComment objects.
 *
 * Supports formats with fallback chain:
 * 1. TOON: SEV|CONF|KIND|file:line|title|explanation|fix  (primary, token-efficient)
 * 2. Legacy compact: [MUST] file:line | description
 * 3. JSON fallback
 */
function parseReviewComments(rawText: string): { comments: ReviewComment[]; summary: string } {
  console.log(`[review-parser] Raw text length: ${rawText.length}`)
  console.log(`[review-parser] First 500 chars:\n${rawText.substring(0, 500)}`)

  const comments: ReviewComment[] = []
  const cleaned = stripMarkdownFences(rawText)

  // Split on "---" to separate findings from summary
  const dashIdx = cleaned.indexOf('\n---')
  const findingsText = dashIdx >= 0 ? cleaned.substring(0, dashIdx) : cleaned
  const summaryText = dashIdx >= 0 ? cleaned.substring(dashIdx + 4).trim() : ''

  const lines = findingsText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '---') continue

    const stripped = stripLinePrefix(trimmed)

    // --- Try TOON format ---
    const toonMatch = TOON_RE.exec(stripped) || TOON_RE.exec(trimmed)
    if (toonMatch) {
      const [, sev, conf, kind, file, lineNum, title, explanation, fix] = toonMatch
      const severity = resolveSeverity(sev)
      const confidence = resolveConfidence(conf)
      const resolvedKind = resolveKind(kind)

      comments.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        severity,
        confidence,
        kind: resolvedKind,
        title: title.trim(),
        body: explanation.trim(),
        suggestedFix: fix?.trim() || undefined,
        posted: false,
        shouldPost: shouldPostComment(severity, confidence)
      })
      continue
    }

    // --- Fallback: legacy [MUST]/[NIT] format ---
    const legacyMatch = LEGACY_COMPACT_RE.exec(stripped) || LEGACY_COMPACT_RE.exec(trimmed)
    if (legacyMatch) {
      const [, sev, file, lineNum, description] = legacyMatch
      const severity: ReviewSeverity =
        sev.toUpperCase() === 'MUST' ? 'important' : 'suggestion'

      comments.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        severity,
        confidence: 'high',
        kind: 'correctness',
        title: description.trim().substring(0, 60),
        body: description.trim(),
        posted: false,
        shouldPost: true
      })
      continue
    }

    // --- Fallback: JSON per line ---
    const jsonStr = stripped.startsWith('{') ? stripped : trimmed.startsWith('{') ? trimmed : null
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>
        if (
          typeof parsed.file === 'string' &&
          typeof parsed.line === 'number'
        ) {
          const rawSev = String(parsed.severity || 'suggestion').toLowerCase()
          const severity: ReviewSeverity =
            rawSev === 'critical' || rawSev === 'must' || rawSev === 'blocking'
              ? 'blocking'
              : rawSev === 'warning' || rawSev === 'important'
                ? 'important'
                : 'suggestion'

          comments.push({
            file: parsed.file,
            line: parsed.line,
            severity,
            confidence: 'high',
            kind: 'correctness',
            title: String(parsed.title || parsed.comment || '').substring(0, 60),
            body: String(parsed.comment || parsed.body || parsed.title || ''),
            suggestedFix: parsed.suggestedFix ? String(parsed.suggestedFix) : undefined,
            posted: false,
            shouldPost: true
          })
        }
      } catch {
        // Not valid JSON — skip
      }
    }
  }

  // --- Fallback: try parsing entire text as a JSON array ---
  if (comments.length === 0) {
    try {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        const arr = JSON.parse(arrayMatch[0]) as Record<string, unknown>[]
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (
              typeof item.file === 'string' &&
              typeof item.line === 'number'
            ) {
              comments.push({
                file: item.file,
                line: item.line,
                severity: 'suggestion',
                confidence: 'high',
                kind: 'correctness',
                title: String(item.title || item.comment || '').substring(0, 60),
                body: String(item.comment || item.body || ''),
                suggestedFix: item.suggestedFix ? String(item.suggestedFix) : undefined,
                posted: false,
                shouldPost: true
              })
            }
          }
        }
      }
    } catch {
      // Not a JSON array — fine
    }
  }

  // Apply posting policy: filter low confidence
  const filteredComments = comments.filter((c) => c.shouldPost)

  console.log(`[review-parser] Parsed ${comments.length} total findings (${filteredComments.length} will post)`)
  console.log(`[review-parser] Summary: ${summaryText.length > 0 ? summaryText.substring(0, 100) : '(none)'}`)

  if (comments.length === 0 && rawText.length > 0) {
    console.warn(`[review-parser] WARNING: AI produced output but 0 comments were parsed!`)
    console.warn(`[review-parser] Full cleaned text:\n${cleaned.substring(0, 2000)}`)
  }

  return { comments, summary: summaryText }
}

// ---------------------------------------------------------------------------
// Comment body formatting for Bitbucket (Markdown)
// ---------------------------------------------------------------------------

/**
 * Format a ReviewComment into a structured Bitbucket comment body
 * following the guidelines template:
 *   Issue: {title}
 *   Why it matters: {body}
 *   Suggested fix: {suggestedFix}
 *   Severity / Confidence / Kind
 */
function formatCommentForBitbucket(comment: ReviewComment): string {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const kindConfig = KIND_CONFIG[comment.kind]

  let body = `**Issue:** ${comment.title}\n\n`
  body += `**Why it matters:** ${comment.body}\n`

  if (comment.suggestedFix) {
    body += `\n**Suggested fix:** ${comment.suggestedFix}\n`
  }

  body += `\n---\n`
  body += `*${sevConfig.label}*`
  if (comment.confidence === 'medium') {
    body += ` · *Please verify*`
  } else {
    body += ` · *${comment.confidence} confidence*`
  }
  body += ` · *${kindConfig.label}*`

  return body
}

/**
 * Format a summary comment for Bitbucket (top-level PR comment).
 */
function formatSummaryForBitbucket(
  comments: ReviewComment[],
  summary: string
): string {
  const blocking = comments.filter((c) => c.severity === 'blocking').length
  const important = comments.filter((c) => c.severity === 'important').length
  const suggestions = comments.filter((c) => c.severity === 'suggestion').length

  let body = `## Zenith Review Summary\n\n`

  // Severity counts table
  body += `| Severity | Count |\n|----------|-------|\n`
  if (blocking > 0) body += `| Blocking | ${blocking} |\n`
  if (important > 0) body += `| Important | ${important} |\n`
  if (suggestions > 0) body += `| Suggestions | ${suggestions} |\n`
  body += '\n'

  // Summary text
  if (summary) {
    body += `${summary}\n\n`
  }

  // Key findings list (top 5)
  const topFindings = [...comments]
    .sort((a, b) => {
      const sevOrder: Record<ReviewSeverity, number> = {
        blocking: 0,
        important: 1,
        suggestion: 2,
        info: 3
      }
      return sevOrder[a.severity] - sevOrder[b.severity]
    })
    .slice(0, 5)

  if (topFindings.length > 0) {
    body += `**Key findings:**\n`
    for (const f of topFindings) {
      body += `- \`${f.file}:${f.line}\` — ${f.title} *(${SEVERITY_CONFIG[f.severity].label})*\n`
    }
    body += '\n'
  }

  body += `---\n*Automated review by Zenith*`

  return body
}

// ---------------------------------------------------------------------------
// Diff conversion helper
// ---------------------------------------------------------------------------

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

/** Build the settings key for user comments for a specific PR. */
function userCommentsKey(workspace: string, repoSlug: string, prId: number): string {
  return `userComments:${workspace}/${repoSlug}/${prId}`
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useReviewStore = create<ReviewStoreState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  pullRequests: [],
  isLoadingPRs: false,
  prError: null,
  selectedPR: null,
  prPage: 1,
  prTotalPages: 1,
  prTotalCount: 0,
  rawDiff: '',
  diffFiles: [],
  isLoadingDiff: false,
  currentSession: null,
  sessions: {},
  history: [],
  isLoadingHistory: false,
  prFileCounts: {},
  userComments: {},

  connect: async () => {
    set({ isConnecting: true, connectionError: null })
    try {
      console.log('[review-store] window.api keys:', window.api ? Object.keys(window.api) : 'undefined')
      if (!window.api?.bitbucket) {
        throw new Error(
          'Bitbucket API not available. The preload script may not have loaded correctly. ' +
          'Try restarting the application.'
        )
      }
      await window.api.bitbucket.connect()
      set({ isConnected: true, isConnecting: false, connectionError: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Bitbucket'
      console.error('[review-store] Bitbucket connect failed:', message)
      set({ isConnecting: false, connectionError: message })
    }
  },

  disconnect: async () => {
    if (!window.api?.bitbucket) return
    await window.api.bitbucket.disconnect()
    set({
      isConnected: false,
      pullRequests: [],
      prError: null,
      selectedPR: null,
      prPage: 1,
      prTotalPages: 1,
      prTotalCount: 0,
      rawDiff: '',
      diffFiles: [],
      currentSession: null,
      sessions: {}
    })
  },

  checkConnection: async () => {
    try {
      if (!window.api?.bitbucket) return
      const connected = await window.api.bitbucket.isConnected()
      set({ isConnected: connected })
    } catch (err) {
      console.error('[review-store] checkConnection failed:', err)
    }
  },

  loadPRs: async (workspace: string, repoSlug: string, page: number = 1) => {
    if (!window.api?.bitbucket) {
      console.warn('[review-store] loadPRs: bitbucket API not available')
      return
    }
    console.log(`[review-store] loadPRs: ${workspace}/${repoSlug} page=${page}`)
    set({ isLoadingPRs: true, prError: null })
    try {
      const result = await window.api.bitbucket.listPRs(workspace, repoSlug, page, 10) as {
        prs: PullRequest[]
        page: number
        totalPages: number
        totalCount: number
      }
      console.log(`[review-store] loadPRs result: ${Array.isArray(result?.prs) ? result.prs.length : 0} PRs, page=${result?.page}, total=${result?.totalCount}`)
      set({
        pullRequests: Array.isArray(result?.prs) ? result.prs : [],
        prPage: result?.page ?? 1,
        prTotalPages: result?.totalPages ?? 1,
        prTotalCount: result?.totalCount ?? 0,
        prError: null,
        isLoadingPRs: false
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pull requests'
      console.error('[review-store] loadPRs failed:', message)
      set({ pullRequests: [], prError: message, isLoadingPRs: false })
    }
  },

  loadFileCounts: async (workspace: string, repoSlug: string) => {
    const prs = get().pullRequests
    if (!prs.length || !window.api?.bitbucket?.getDiffstatCount) return

    const counts: Record<number, number> = {}
    await Promise.all(
      prs.map(async (pr) => {
        try {
          counts[pr.id] = await window.api.bitbucket.getDiffstatCount(workspace, repoSlug, pr.id)
        } catch {
          counts[pr.id] = 0
        }
      })
    )

    set({ prFileCounts: { ...get().prFileCounts, ...counts } })
  },

  selectPR: (pr: PullRequest) => {
    const existingSession = pr?.id != null ? (get().sessions[pr.id] ?? null) : null
    set({ selectedPR: pr, rawDiff: '', diffFiles: [], currentSession: existingSession })
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

  startReview: async (providerId: string, modelName: string, command?: string, guidelines?: string) => {
    const { rawDiff } = get()
    if (!rawDiff) {
      throw new Error('No diff loaded. Load a PR diff first.')
    }

    // Inject existing user annotations into the guidelines so the AI treats them as known context
    const existingAnnotations = Object.entries(get().userComments)
      .flatMap(([_key, comments]) => comments)
      .map((uc) => `${uc.file}:${uc.line} — ${uc.body}`)
      .join('\n')

    const effectiveGuidelines = existingAnnotations.length > 0
      ? `${guidelines ?? ''}\n\nPRIOR USER ANNOTATIONS (already noted by the developer — treat as known context, do not repeat as findings):\n${existingAnnotations}`.trim()
      : guidelines

    const prId = get().selectedPR?.id ?? 0
    const sessionId = `review-${Date.now()}`
    const session: ReviewSession = {
      sessionId,
      prId,
      status: 'streaming',
      rawText: '',
      comments: [],
      summary: '',
      startedAt: new Date().toISOString()
    }

    // Store in both currentSession and the per-PR sessions map
    set({
      currentSession: session,
      sessions: { ...get().sessions, [prId]: session }
    })

    // Helper: update session in both the map and (if still selected) currentSession
    const updateSession = (updater: (s: ReviewSession) => ReviewSession): void => {
      const sessions = get().sessions
      const existing = sessions[prId]
      if (!existing || existing.sessionId !== sessionId) return

      const updated = updater(existing)
      const nextSessions = { ...sessions, [prId]: updated }

      const isSelected = get().selectedPR?.id === prId
      set({
        sessions: nextSessions,
        ...(isSelected ? { currentSession: updated } : {})
      })
    }

    // Set up IPC stream listeners — these survive component unmount
    window.api.ai.onStreamChunk((data) => {
      if (data.sessionId !== sessionId) return
      updateSession((s) => ({ ...s, rawText: s.rawText + data.chunk }))
    })

    window.api.ai.onStreamDone((data) => {
      if (data.sessionId !== sessionId) return
      const sessions = get().sessions
      const existing = sessions[prId]
      if (!existing || existing.sessionId !== sessionId) return

      console.log(`[review-store] Stream done for session ${sessionId}, rawText length: ${existing.rawText.length}`)
      const { comments, summary } = parseReviewComments(existing.rawText)

      // Cap at MAX_COMMENTS_PER_PR
      const capped = comments.slice(0, MAX_COMMENTS_PER_PR)

      console.log(`[review-store] Parsed ${comments.length} findings → ${capped.length} after cap`)
      updateSession((s) => ({ ...s, status: 'complete', comments: capped, summary }))

      // Capture token usage (fallback: estimate from rawText when main process doesn't send usage)
      const tokensUsed = data.usage
        ? data.usage.totalTokens
        : Math.max(1, Math.ceil(existing.rawText.length / 4))
      const isEstimated = data.usage ? data.usage.isEstimated : true
      useTokenStore.getState().addEntry({
        sessionId: data.sessionId,
        providerId,
        providerName: modelName,
        tokensUsed,
        isEstimated
      })

      window.api.ai.removeStreamListeners()
    })

    window.api.ai.onStreamError((data) => {
      if (data.sessionId !== sessionId) return
      console.error(`[review-store] Stream error for session ${sessionId}:`, data.error)
      updateSession((s) => ({ ...s, status: 'error', error: data.error }))

      window.api.ai.removeStreamListeners()
    })

    // Start the review in the main process
    await window.api.ai.startReview(providerId, modelName, rawDiff, sessionId, command, effectiveGuidelines)
  },

  cancelReview: () => {
    const session = get().currentSession
    if (!session || session.status !== 'streaming') return

    window.api.ai.cancelReview(session.sessionId)
    window.api.ai.removeStreamListeners()

    const cancelled = { ...session, status: 'cancelled' as const }
    set({
      currentSession: cancelled,
      sessions: { ...get().sessions, [session.prId]: cancelled }
    })
  },

  clearSession: (prId: number) => {
    const sessions = { ...get().sessions }
    const session = sessions[prId]

    if (session?.status === 'streaming') {
      window.api.ai.cancelReview(session.sessionId)
      window.api.ai.removeStreamListeners()
    }

    delete sessions[prId]
    const isSelected = get().selectedPR?.id === prId
    set({
      sessions,
      ...(isSelected ? { currentSession: null } : {})
    })
  },

  updateComment: (index: number, newText: string) => {
    const session = get().currentSession
    if (!session) return

    const updatedComments = session.comments.map((c, i) =>
      i === index ? { ...c, body: newText } : c
    )
    const updated = { ...session, comments: updatedComments }
    set({
      currentSession: updated,
      sessions: { ...get().sessions, [session.prId]: updated }
    })
  },

  toggleCommentPost: (index: number) => {
    const session = get().currentSession
    if (!session) return

    const updatedComments = session.comments.map((c, i) =>
      i === index ? { ...c, shouldPost: !c.shouldPost } : c
    )
    const updated = { ...session, comments: updatedComments }
    set({
      currentSession: updated,
      sessions: { ...get().sessions, [session.prId]: updated }
    })
  },

  postComment: async (
    workspace: string,
    repoSlug: string,
    prId: number,
    comment: ReviewComment
  ) => {
    // Format the comment body using the guidelines template
    const formattedBody = formatCommentForBitbucket(comment)

    await window.api.bitbucket.postComment(
      workspace,
      repoSlug,
      prId,
      comment.file,
      comment.line,
      formattedBody
    )

    // Mark comment as posted in the current session and sessions map
    const session = get().currentSession
    if (!session) return

    const updatedComments = session.comments.map((c) =>
      c.file === comment.file && c.line === comment.line && c.title === comment.title
        ? { ...c, posted: true }
        : c
    )

    const updated = { ...session, comments: updatedComments }
    set({
      currentSession: updated,
      sessions: { ...get().sessions, [session.prId]: updated }
    })
  },

  postAllComments: async (
    workspace: string,
    repoSlug: string,
    prId: number
  ) => {
    const session = get().currentSession
    if (!session) return

    // Only post comments that pass the posting policy
    const toPost = session.comments.filter((c) => c.shouldPost && !c.posted)

    // Post each finding as an individual inline comment
    for (const comment of toPost) {
      try {
        await get().postComment(workspace, repoSlug, prId, comment)
      } catch (err) {
        console.error(`[review-store] Failed to post comment on ${comment.file}:${comment.line}:`, err)
        // Continue posting remaining comments even if one fails
      }
    }

    // Post summary as top-level PR comment (if multiple findings)
    const postedComments = get().currentSession?.comments.filter((c) => c.posted) ?? []
    if (postedComments.length > 1 && session.summary) {
      try {
        const summaryBody = formatSummaryForBitbucket(postedComments, session.summary)
        await window.api.bitbucket.postTopLevelComment(workspace, repoSlug, prId, summaryBody)
        console.log(`[review-store] Posted summary comment for PR #${prId}`)
      } catch (err) {
        console.error(`[review-store] Failed to post summary comment:`, err)
      }
    }

    // Update history entry with actual posted count
    const finalPostedCount = postedComments.length
    if (finalPostedCount > 0) {
      const updatedHistory = get().history.map((h) =>
        h.prId === prId && h.workspace === workspace && h.repoSlug === repoSlug
          ? { ...h, postedCount: finalPostedCount }
          : h
      )
      set({ history: updatedHistory })
      await window.api.settings.set(HISTORY_STORAGE_KEY, updatedHistory)
    }
  },

  loadHistory: async () => {
    set({ isLoadingHistory: true })
    try {
      const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
      const all = Array.isArray(raw) ? (raw as ReviewHistoryEntry[]) : []

      // Prune entries older than 5 days
      const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000
      const history = all.filter((e) => new Date(e.timestamp).getTime() > fiveDaysAgo)

      // Persist pruned list if anything was removed
      if (history.length < all.length) {
        console.log(`[review-store] Pruned ${all.length - history.length} history entries older than 5 days`)
        await window.api.settings.set(HISTORY_STORAGE_KEY, history)
      }

      set({ history, isLoadingHistory: false })
    } catch (err) {
      console.error('[review-store] Failed to load history:', err)
      set({ history: [], isLoadingHistory: false })
    }
  },

  addHistoryEntry: async (
    entry: Omit<ReviewHistoryEntry, 'id' | 'timestamp'>
  ) => {
    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const timestamp = new Date().toISOString()
    const newEntry: ReviewHistoryEntry = { ...entry, id, timestamp }

    const updated = [newEntry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)

    // Persist session data for "Open from history" feature
    if (entry.status !== 'error') {
      const session = get().sessions[entry.prId]
      if (session && session.status === 'complete' && session.comments.length > 0) {
        try {
          const key = sessionsStorageKey(entry.workspace, entry.repoSlug)
          const raw = await window.api.settings.get(key)
          const existing = Array.isArray(raw) ? (raw as PersistedSession[]) : []

          const persisted: PersistedSession = {
            sessionId: session.sessionId,
            prId: entry.prId,
            prTitle: entry.prTitle,
            prUrl: entry.prUrl,
            comments: session.comments,
            summary: session.summary,
            completedAt: timestamp
          }

          const filtered = existing.filter((s) => s.prId !== entry.prId)
          const updatedSessions = [persisted, ...filtered].slice(0, MAX_PERSISTED_SESSIONS)
          await window.api.settings.set(key, updatedSessions)
          console.log(
            `[review-store] Persisted session for PR #${entry.prId} (${updatedSessions.length} total for ${entry.workspace}/${entry.repoSlug})`
          )
        } catch (err) {
          console.error('[review-store] Failed to persist session:', err)
        }
      }
    }
  },

  loadPersistedSessions: async (workspace: string, repoSlug: string) => {
    if (!workspace || !repoSlug) return
    const key = sessionsStorageKey(workspace, repoSlug)
    try {
      const raw = await window.api.settings.get(key)
      const persisted = Array.isArray(raw) ? (raw as PersistedSession[]) : []

      const restored: Record<number, ReviewSession> = {}
      for (const p of persisted) {
        restored[p.prId] = {
          sessionId: p.sessionId,
          prId: p.prId,
          status: 'complete',
          rawText: '',
          comments: p.comments,
          summary: p.summary,
          startedAt: p.completedAt
        }
      }

      // Merge: in-memory active sessions take precedence over restored ones
      const current = get().sessions
      const activeEntries: Record<number, ReviewSession> = {}
      for (const [k, v] of Object.entries(current)) {
        if (v.status === 'streaming') {
          activeEntries[Number(k)] = v
        }
      }

      set({ sessions: { ...restored, ...activeEntries } })
      console.log(
        `[review-store] Loaded ${persisted.length} persisted sessions for ${workspace}/${repoSlug}`
      )
    } catch (err) {
      console.error('[review-store] Failed to load persisted sessions:', err)
    }
  },

  restoreSessionFromHistory: async (entry: ReviewHistoryEntry) => {
    const key = sessionsStorageKey(entry.workspace, entry.repoSlug)
    try {
      const raw = await window.api.settings.get(key)
      const persisted = Array.isArray(raw) ? (raw as PersistedSession[]) : []
      const session = persisted.find((s) => s.prId === entry.prId)

      if (!session) {
        console.warn(`[review-store] No persisted session found for PR #${entry.prId}`)
        return
      }

      const restored: ReviewSession = {
        sessionId: session.sessionId,
        prId: session.prId,
        status: 'complete',
        rawText: '',
        comments: session.comments,
        summary: session.summary,
        startedAt: session.completedAt
      }

      set({
        currentSession: restored,
        sessions: { ...get().sessions, [restored.prId]: restored }
      })
    } catch (err) {
      console.error('[review-store] Failed to restore session from history:', err)
    }
  },

  getUserCommentsForLine: (file: string, line: number) => {
    return get().userComments[`${file}:${line}`] ?? []
  },

  loadUserComments: async (workspace: string, repoSlug: string, prId: number) => {
    try {
      const raw = await window.api.settings.get(userCommentsKey(workspace, repoSlug, prId))
      const loaded = raw as UserCommentMap | null
      set({ userComments: loaded ?? {} })
    } catch (err) {
      console.error('[review-store] Failed to load user comments:', err)
      set({ userComments: {} })
    }
  },

  addUserComment: async (workspace: string, repoSlug: string, prId: number, comment: Omit<UserComment, 'id' | 'createdAt'>) => {
    const id = `uc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newComment: UserComment = {
      ...comment,
      id,
      createdAt: new Date().toISOString()
    }
    const key = `${comment.file}:${comment.line}`
    const current = get().userComments
    const updated: UserCommentMap = {
      ...current,
      [key]: [...(current[key] ?? []), newComment]
    }
    set({ userComments: updated })
    await window.api.settings.set(userCommentsKey(workspace, repoSlug, prId), updated)
  },

  deleteUserComment: async (workspace: string, repoSlug: string, prId: number, commentId: string) => {
    const current = get().userComments
    const updated: UserCommentMap = {}
    for (const [k, comments] of Object.entries(current)) {
      const filtered = comments.filter((c) => c.id !== commentId)
      if (filtered.length > 0) {
        updated[k] = filtered
      }
    }
    set({ userComments: updated })
    await window.api.settings.set(userCommentsKey(workspace, repoSlug, prId), updated)
  },

  updateUserComment: async (workspace: string, repoSlug: string, prId: number, commentId: string, newBody: string) => {
    const current = get().userComments
    const updated: UserCommentMap = {}
    for (const [k, comments] of Object.entries(current)) {
      updated[k] = comments.map((c) => c.id === commentId ? { ...c, body: newBody } : c)
    }
    set({ userComments: updated })
    await window.api.settings.set(userCommentsKey(workspace, repoSlug, prId), updated)
  }
}))
