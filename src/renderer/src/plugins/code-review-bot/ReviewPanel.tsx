import { useEffect, useRef, useState } from 'react'
import type { ReviewSession } from '../../types/review'

interface ReviewPanelProps {
  session: ReviewSession | null
  onStart: () => void
  onCancel: () => void
  onPostAll: () => void
  isConnected: boolean
  hasAgent: boolean
}

/** Map severity to badge color classes. */
const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  suggestion: 'bg-cyan-500/10 text-cyan-400'
}

/**
 * AI review streaming display with start/cancel controls,
 * comment summary, and post-to-Bitbucket buttons.
 * Handles all 5 session states: null, streaming, complete, error, cancelled.
 */
export function ReviewPanel({
  session,
  onStart,
  onCancel,
  onPostAll,
  isConnected,
  hasAgent
}: ReviewPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set())

  // Auto-scroll streaming output to bottom
  useEffect(() => {
    if (session?.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.rawText, session?.status])

  // Initialize all comments as selected when review completes
  useEffect(() => {
    if (session?.status === 'complete' && session.comments.length > 0) {
      setSelectedComments(new Set(session.comments.map((_, i) => i)))
    }
  }, [session?.status, session?.comments.length])

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

  // --- No active review ---
  if (!session) {
    const canStart = isConnected && hasAgent
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className={`rounded-md px-6 py-2.5 text-sm font-medium transition-colors ${
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
        {/* Streaming indicator */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          <span className="text-sm font-medium text-text-primary">
            AI Review in progress...
          </span>
        </div>

        {/* Scrollable streaming output */}
        <div
          ref={scrollRef}
          className="mx-3 mb-3 flex-1 overflow-y-auto rounded-md bg-surface p-3 font-mono text-sm text-text-primary"
        >
          <pre className="whitespace-pre-wrap">{session.rawText || 'Waiting for response...'}</pre>
        </div>

        {/* Cancel button */}
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
    const criticals = session.comments.filter((c) => c.severity === 'critical').length
    const warnings = session.comments.filter((c) => c.severity === 'warning').length
    const suggestions = session.comments.filter((c) => c.severity === 'suggestion').length

    return (
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Summary */}
        <div className="border-b border-border px-3 py-3">
          <p className="text-sm font-medium text-text-primary">
            {session.comments.length} comments found
            <span className="ml-1 text-text-secondary">
              ({criticals} critical, {warnings} warnings, {suggestions} suggestions)
            </span>
          </p>
          <button
            type="button"
            onClick={onPostAll}
            className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent/90"
          >
            Post All Comments
          </button>
        </div>

        {/* Comment list with checkboxes */}
        <div className="flex-1 space-y-1 p-3">
          {session.comments.map((comment, idx) => (
            <label
              key={idx}
              className="flex items-start gap-2 rounded-md p-2 hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedComments.has(idx)}
                onChange={() => toggleComment(idx)}
                className="mt-1 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_BADGE[comment.severity]}`}
                  >
                    {comment.severity}
                  </span>
                  <span className="truncate text-xs text-text-secondary">
                    {comment.file}:{comment.line}
                  </span>
                  {comment.posted && (
                    <span className="text-xs text-green-400">Posted</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-text-primary">{comment.comment}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    )
  }

  // --- Error ---
  if (session.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-red-400">{session.error || 'An error occurred during the review.'}</p>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent/90"
        >
          Retry
        </button>
      </div>
    )
  }

  // --- Cancelled ---
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-sm text-text-secondary">Review cancelled</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent/90"
      >
        Start New Review
      </button>
    </div>
  )
}
