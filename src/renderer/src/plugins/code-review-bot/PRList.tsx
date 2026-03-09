import type { PullRequest } from '../../types/bitbucket'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Files, GitPullRequest } from 'lucide-react'

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
  fileCounts?: Record<number, number>
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
  onPageChange,
  fileCounts
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
          className="rounded-lg p-1 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-50"
          title="Refresh PR list"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* PR list */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && (pullRequests?.length ?? 0) === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          </div>
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
          <div className="flex flex-col items-center justify-center py-10">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.06]">
              <GitPullRequest size={20} className="text-accent/30" />
            </div>
            <p className="text-sm font-medium text-text-secondary/60">No open pull requests</p>
            <p className="mt-1 text-[11px] text-text-secondary/40">
              Pull requests will appear here once detected
            </p>
          </div>
        )}

        {(pullRequests ?? []).map((pr) => {
          const isSelected = pr.id === selectedPrId
          return (
            <button
              key={pr.id}
              type="button"
              onClick={() => onSelect(pr)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border border-accent/60 bg-surface-elevated'
                  : 'border border-transparent hover:bg-surface-elevated'
              }`}
            >
              {/* Top row: PR title + link icon (left), file count badge (right) */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="min-w-0 truncate font-medium text-text-primary">{pr.title}</p>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api?.app?.openExternal?.(pr.links.html.href)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        window.api?.app?.openExternal?.(pr.links.html.href)
                      }
                    }}
                    className="shrink-0 text-text-secondary/50 transition-colors hover:text-accent"
                    title="Open in Bitbucket"
                  >
                    <ExternalLink size={12} />
                  </span>
                </div>
                {fileCounts && fileCounts[pr.id] != null && (
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text-secondary">
                    <Files size={11} />
                    {fileCounts[pr.id]}
                  </span>
                )}
              </div>

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
