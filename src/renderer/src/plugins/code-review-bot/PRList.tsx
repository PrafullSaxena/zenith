import type { PullRequest } from '../../types/bitbucket'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

interface PRListProps {
  pullRequests: PullRequest[]
  isLoading: boolean
  error: string | null
  onSelect: (pr: PullRequest) => void
  onRefresh: () => void
  selectedPrId?: number
  page: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

/**
 * Scrollable list of open pull requests with pagination and refresh.
 * Each PR is rendered as a clickable card showing title, author,
 * branch flow, and relative timestamp.
 */
export function PRList({
  pullRequests,
  isLoading,
  error,
  onSelect,
  onRefresh,
  selectedPrId,
  page,
  totalPages,
  totalCount,
  onPageChange
}: PRListProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      {/* Header with count and refresh */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {totalCount > 0 ? `${totalCount} open PRs` : 'Pull Requests'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded p-1 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-50"
          title="Refresh PR list"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* PR list */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && (pullRequests?.length ?? 0) === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">
            Loading pull requests...
          </p>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="mx-2 my-4 rounded-md bg-red-500/10 px-3 py-3 text-center">
            <AlertTriangle size={16} className="mx-auto mb-1.5 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 rounded bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (pullRequests?.length ?? 0) === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">
            No open pull requests found
          </p>
        )}

        {(pullRequests ?? []).map((pr) => {
          const isSelected = pr.id === selectedPrId
          return (
            <button
              key={pr.id}
              type="button"
              onClick={() => onSelect(pr)}
              className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border border-accent bg-surface-elevated'
                  : 'border border-transparent hover:bg-surface-elevated'
              }`}
            >
              {/* PR title */}
              <p className="truncate font-medium text-text-primary">{pr.title}</p>

              {/* Author */}
              <p className="mt-0.5 text-sm text-text-secondary">
                {pr.author.display_name}
              </p>

              {/* Branch flow and timestamp */}
              <div className="mt-1 flex items-center justify-between">
                <span className="truncate text-xs text-text-secondary">
                  {pr.source.branch.name}
                  <span className="mx-1 text-text-secondary/60">&rarr;</span>
                  {pr.destination.branch.name}
                </span>
                <span className="shrink-0 text-xs text-text-secondary">
                  {formatRelativeTime(pr.created_on)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="rounded p-1 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="rounded p-1 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
