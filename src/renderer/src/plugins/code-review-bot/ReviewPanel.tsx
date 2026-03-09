import { useEffect, useRef, useState } from 'react'
import { Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import type { ReviewSession, ReviewComment } from '../../types/review'
import { SEVERITY_CONFIG, CONFIDENCE_CONFIG, KIND_CONFIG } from '../../types/review'

interface ReviewPanelProps {
  session: ReviewSession | null
  onStart: () => void
  onCancel: () => void
  onPostAll: () => void
  onNewReview: () => void
  onUpdateComment: (index: number, newText: string) => void
  isConnected: boolean
  hasAgent: boolean
}

/**
 * AI review streaming display with start/cancel controls,
 * rich comment cards (severity/confidence/kind), editable comments,
 * and post-to-Bitbucket buttons.
 */
export function ReviewPanel({
  session,
  onStart,
  onCancel,
  onPostAll,
  onNewReview,
  onUpdateComment,
  isConnected,
  hasAgent
}: ReviewPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  // Auto-scroll streaming output to bottom
  useEffect(() => {
    if (session?.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // Initialize all postable comments as selected & expand all when review completes
  const comments = session?.comments ?? []
  useEffect(() => {
    if (session?.status === 'complete' && comments.length > 0) {
      const postable = comments
        .map((c, i) => (c.shouldPost ? i : -1))
        .filter((i) => i >= 0)
      setSelectedComments(new Set(postable))
      setExpandedCards(new Set(comments.map((_, i) => i)))
    }
  }, [session?.status, comments.length])

  const toggleComment = (index: number): void => {
    setSelectedComments((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleCard = (index: number): void => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const startEditing = (index: number, currentText: string): void => {
    setEditingIndex(index)
    setEditText(currentText)
  }

  const saveEdit = (): void => {
    if (editingIndex !== null && editText.trim()) {
      onUpdateComment(editingIndex, editText.trim())
    }
    setEditingIndex(null)
    setEditText('')
  }

  const cancelEdit = (): void => {
    setEditingIndex(null)
    setEditText('')
  }

  // --- No active review ---
  if (!session) {
    const canStart = isConnected && hasAgent
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
            canStart
              ? 'bg-accent text-background hover:bg-accent/90'
              : 'cursor-not-allowed bg-surface-elevated text-text-secondary'
          }`}
        >
          Start Review
        </button>
        {!isConnected && (
          <p className="mt-3 text-xs text-text-secondary">
            Connect to Bitbucket first
          </p>
        )}
        {isConnected && !hasAgent && (
          <p className="mt-3 text-xs text-text-secondary">
            Configure AI agent in settings
          </p>
        )}
      </div>
    )
  }

  // --- Streaming ---
  if (session.status === 'streaming') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          <span className="text-sm font-medium text-text-primary">
            AI Review in progress...
          </span>
        </div>

        <div
          ref={scrollRef}
          className="mx-3 mb-3 flex-1 overflow-y-auto rounded-md bg-surface p-3 font-mono text-sm text-text-primary"
        >
          <pre className="whitespace-pre-wrap">{session.rawText || 'Waiting for response...'}</pre>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            Cancel Review
          </button>
        </div>
      </div>
    )
  }

  // --- Complete ---
  if (session.status === 'complete') {
    const safeComments = session.comments ?? []
    const blockingCount = safeComments.filter((c) => c.severity === 'blocking').length
    const importantCount = safeComments.filter((c) => c.severity === 'important').length
    const suggestionCount = safeComments.filter((c) => c.severity === 'suggestion').length
    const postedCount = safeComments.filter((c) => c.posted).length
    const allPosted = postedCount === safeComments.length && safeComments.length > 0

    const reviewAge = Date.now() - new Date(session.startedAt).getTime()
    const reviewAgeLabel =
      reviewAge < 60_000
        ? 'just now'
        : reviewAge < 3_600_000
          ? `${Math.floor(reviewAge / 60_000)}m ago`
          : `${Math.floor(reviewAge / 3_600_000)}h ago`

    // If AI produced output but parser found 0 comments, show the raw output
    if (safeComments.length === 0 && session.rawText.trim().length > 0) {
      return (
        <div className="flex h-full flex-col overflow-y-auto p-3">
          <div className="mb-3 rounded-md bg-yellow-500/10 px-3 py-2">
            <p className="text-sm font-medium text-yellow-400">
              AI review completed but no comments were parsed
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              The AI output did not match the expected format. Raw output is shown below.
            </p>
          </div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={onNewReview}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent/90"
            >
              Retry Review
            </button>
          </div>
          <pre className="flex-1 overflow-auto rounded-md bg-surface p-3 text-xs text-text-secondary font-mono whitespace-pre-wrap">
            {session.rawText}
          </pre>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Summary header */}
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-text-primary">
                {safeComments.length} findings
              </p>
              {blockingCount > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CONFIG.blocking.badge}`}>
                  {SEVERITY_CONFIG.blocking.emoji} {blockingCount} Blocking
                </span>
              )}
              {importantCount > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CONFIG.important.badge}`}>
                  {SEVERITY_CONFIG.important.emoji} {importantCount} Important
                </span>
              )}
              {suggestionCount > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CONFIG.suggestion.badge}`}>
                  {SEVERITY_CONFIG.suggestion.emoji} {suggestionCount} Suggestion
                </span>
              )}
            </div>
            <span className="text-xs text-text-secondary">Reviewed {reviewAgeLabel}</span>
          </div>

          {/* Summary text */}
          {session.summary && (
            <p className="mt-2 text-xs text-text-secondary leading-relaxed">
              {session.summary}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {!allPosted && (
              <button
                type="button"
                onClick={onPostAll}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent/90"
              >
                {postedCount > 0
                  ? `Post Remaining (${safeComments.filter((c) => c.shouldPost && !c.posted).length})`
                  : 'Post All Inline Comments'}
              </button>
            )}
            {allPosted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400">
                All comments posted
              </span>
            )}
            <button
              type="button"
              onClick={onNewReview}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              New Review
            </button>
          </div>
        </div>

        {/* Finding cards — rich format with collapsible details */}
        <div className="flex-1 space-y-2 p-3">
          {safeComments.map((comment, idx) => (
            <FindingCard
              key={idx}
              comment={comment}
              index={idx}
              isSelected={selectedComments.has(idx)}
              isExpanded={expandedCards.has(idx)}
              isEditing={editingIndex === idx}
              editText={editText}
              onToggleSelect={() => toggleComment(idx)}
              onToggleExpand={() => toggleCard(idx)}
              onStartEdit={() => startEditing(idx, comment.body)}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onEditTextChange={setEditText}
            />
          ))}
        </div>
      </div>
    )
  }

  // --- Error ---
  if (session.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-md bg-red-500/10 px-4 py-3 text-center">
          <p className="text-sm text-red-400">{session.error || 'An error occurred during the review.'}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => { onNewReview(); onStart() }}
            className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent/90"
          >
            Retry Review
          </button>
          <button
            type="button"
            onClick={onNewReview}
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // --- Cancelled ---
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-sm text-text-secondary">Review was cancelled</p>
      {session.rawText && (
        <p className="mt-1 text-xs text-text-secondary/60">
          {session.rawText.length} characters of output received before cancellation
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => { onNewReview(); onStart() }}
          className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent/90"
        >
          Start New Review
        </button>
        <button
          type="button"
          onClick={onNewReview}
          className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingCard — individual review finding with rich formatting
// ---------------------------------------------------------------------------

interface FindingCardProps {
  comment: ReviewComment
  index: number
  isSelected: boolean
  isExpanded: boolean
  isEditing: boolean
  editText: string
  onToggleSelect: () => void
  onToggleExpand: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
}

function FindingCard({
  comment,
  isSelected,
  isExpanded,
  isEditing,
  editText,
  onToggleSelect,
  onToggleExpand,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange
}: FindingCardProps): React.JSX.Element {
  const sevConfig = SEVERITY_CONFIG[comment.severity]
  const confConfig = CONFIDENCE_CONFIG[comment.confidence]
  const kindConfig = KIND_CONFIG[comment.kind]

  return (
    <div
      className={`overflow-hidden rounded-lg border-l-4 bg-surface transition-colors ${sevConfig.border} ${
        !comment.shouldPost ? 'opacity-50' : ''
      }`}
    >
      {/* Card header — always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-elevated/50 transition-colors"
        onClick={onToggleExpand}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          onClick={(e) => e.stopPropagation()}
          className="accent-accent cursor-pointer shrink-0"
        />

        {/* Severity badge */}
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sevConfig.badge}`}
        >
          {sevConfig.emoji} {sevConfig.label}
        </span>

        {/* Kind tag */}
        <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-elevated text-text-secondary">
          {kindConfig.icon} {kindConfig.label}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
          {comment.title}
        </span>

        {/* Confidence badge */}
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${confConfig.badge}`}
        >
          {confConfig.label}
        </span>

        {/* Posted indicator */}
        {comment.posted && (
          <span className="shrink-0 text-[10px] font-medium text-green-400">
            Posted
          </span>
        )}

        {/* Expand/collapse chevron */}
        {isExpanded ? (
          <ChevronDown size={14} className="shrink-0 text-text-secondary" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-text-secondary" />
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 py-2.5 pl-9">
          {/* File and line */}
          <p className="mb-2 font-mono text-xs text-text-secondary">
            {comment.file}:{comment.line}
          </p>

          {/* Explanation / body */}
          {isEditing ? (
            <div className="flex items-start gap-1">
              <textarea
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                rows={3}
                autoFocus
              />
              <button
                type="button"
                onClick={onSaveEdit}
                className="rounded p-1 text-green-400 hover:bg-green-500/10"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded p-1 text-text-secondary hover:bg-surface-elevated"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="group flex items-start gap-1">
              <p className="flex-1 text-sm text-text-primary leading-relaxed">
                {comment.body}
              </p>
              {!comment.posted && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="shrink-0 rounded p-0.5 text-text-secondary/0 transition group-hover:text-text-secondary hover:!text-text-primary"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}

          {/* Suggested fix */}
          {comment.suggestedFix && (
            <div className="mt-2 rounded-md bg-green-500/5 border border-green-500/10 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wide mb-0.5">
                Suggested Fix
              </p>
              <p className="text-sm text-text-primary leading-relaxed">
                {comment.suggestedFix}
              </p>
            </div>
          )}

          {/* Medium confidence warning */}
          {comment.confidence === 'medium' && (
            <p className="mt-2 text-[11px] text-yellow-400 italic">
              ⚠ Medium confidence — please verify this finding
            </p>
          )}
        </div>
      )}
    </div>
  )
}
