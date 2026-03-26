import { motion } from 'framer-motion'
import type { PullRequest } from '../../types/bitbucket'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Files, GitPullRequest } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { staggerContainer, staggerItem } from '../../lib/motion'

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
 * Each PR is rendered as a clickable Card showing title, author,
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
        <span className="text-xs text-muted-foreground">
          {totalCount > 0 ? `${totalCount} open PRs` : 'Pull Requests'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
          title="Refresh PR list"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* PR list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {/* Loading state with skeleton cards */}
        {isLoading && (pullRequests?.length ?? 0) === 0 && (
          <div className="space-y-2">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
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

        {/* Empty state */}
        {!isLoading && !error && (pullRequests?.length ?? 0) === 0 && (
          <div
            icon={GitPullRequest}
            title="No open pull requests"
            description="Pull requests will appear here once detected"
          />
        )}

        {/* PR cards with stagger animation */}
        {(pullRequests ?? []).length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-1.5"
          >
            {(pullRequests ?? []).map((pr) => {
              const isSelected = pr.id === selectedPrId
              return (
                <motion.div key={pr.id} variants={staggerItem}>
                  <Card
                    variant="interactive"
                    className={`cursor-pointer ${isSelected ? 'border-l-2 border-l-accent' : ''}`}
                    onClick={() => onSelect(pr)}
                  >
                    {/* Top row: PR title + link icon (left), file count badge (right) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 truncate font-medium text-foreground">{pr.title}</p>
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
                          className="shrink-0 text-muted-foreground/60 transition-colors hover:text-primary"
                          title="Open in Bitbucket"
                        >
                          <ExternalLink size={12} />
                        </span>
                      </div>
                      {fileCounts && fileCounts[pr.id] != null && (
                        <Badge variant="default">
                          <Files size={11} className="inline mr-0.5" />
                          {fileCounts[pr.id]}
                        </Badge>
                      )}
                    </div>

                    {/* Author */}
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {pr.author.display_name}
                    </p>

                    {/* Branch flow and timestamp */}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="truncate text-xs text-muted-foreground">
                        {pr.source.branch.name}
                        <span className="mx-1 text-muted-foreground/60">&rarr;</span>
                        {pr.destination.branch.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(pr.created_on)}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
