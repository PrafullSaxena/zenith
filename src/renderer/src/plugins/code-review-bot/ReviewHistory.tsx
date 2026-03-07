import { ExternalLink, Eye } from 'lucide-react'
import type { ReviewHistoryEntry } from '../../types/review'
import { formatRelativeTime } from '../../components/dashboard/utils'

interface ReviewHistoryProps {
  history: ReviewHistoryEntry[]
  isLoading: boolean
  onOpen?: (entry: ReviewHistoryEntry) => void
}

/** Map history status to badge styling. */
const STATUS_STYLES: Record<ReviewHistoryEntry['status'], string> = {
  success: 'bg-green-500/10 text-green-400',
  partial: 'bg-yellow-500/10 text-yellow-400',
  error: 'bg-red-500/10 text-red-400'
}

/**
 * Past reviews table showing PR links, timestamps, comment counts,
 * and status badges. Sorted newest first.
 */
export function ReviewHistory({
  history,
  isLoading,
  onOpen
}: ReviewHistoryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        Loading history...
      </p>
    )
  }

  if (!history || history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No review history yet
      </p>
    )
  }

  return (
    <div className="space-y-1 overflow-y-auto">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-surface-elevated"
        >
          {/* PR title with external link */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => window.api?.app?.openExternal?.(entry.prUrl)}
              className="group flex items-center gap-1 text-left"
            >
              <span className="truncate text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                {entry.prTitle}
              </span>
              <ExternalLink
                size={12}
                className="shrink-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
            <p className="mt-0.5 text-xs text-text-secondary">
              {entry.workspace}/{entry.repoSlug}
            </p>
          </div>

          {/* Comment counts */}
          <span className="shrink-0 text-xs text-text-secondary">
            {entry.commentCount} comments, {entry.postedCount} posted
          </span>

          {/* Status badge */}
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[entry.status]}`}
          >
            {entry.status}
          </span>

          {/* Relative timestamp */}
          <span className="shrink-0 text-xs text-text-secondary">
            {formatRelativeTime(entry.timestamp)}
          </span>

          {/* Open review button */}
          {onOpen && entry.commentCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen(entry)}
              className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
              title="Open review comments"
            >
              <Eye size={13} className="inline mr-1" />
              Open
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
