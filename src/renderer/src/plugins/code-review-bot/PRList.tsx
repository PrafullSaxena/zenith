import { motion } from 'framer-motion'
import type { PullRequest } from '../../types/bitbucket'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Files, GitPullRequest } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/ui/EmptyState'
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
      <div className="flex-1 space-y-2 overflow-y-auto px-1">
        {/* Loading state with skeleton cards */}
        {isLoading && (pullRequests?.length ?? 0) === 0 && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="mx-2 my-4 rounded-xl bg-red-500/10 px-3 py-3 text-center">
            <AlertTriangle size={16} className="mx-auto mb-1.5 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (pullRequests?.length ?? 0) === 0 && (
          <EmptyState
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
            className="space-y-1.5 mr-2"
          >
            {(pullRequests ?? []).map((pr) => {
              const isSelected = pr.id === selectedPrId
              return (
                <motion.div key={pr.id} variants={staggerItem}>
                  <motion.div
                    whileHover={{ x: 2, backgroundColor: 'hsl(var(--foreground), 0.05)' }}
                    whileTap={{ scale: 0.99 }}
                    className={`group cursor-pointer rounded-[14px] border p-3.5 transition-all shadow-sm ${
                      isSelected 
                        ? 'border-primary/50 bg-primary/10 backdrop-blur-md ring-1 ring-primary/20'
                        : 'border-border bg-foreground/[0.02] hover:border-foreground/20'
                    }`}
                    onClick={() => onSelect(pr)}
                  >
                    {/* Top row: PR title + link icon (left), file count badge (right) */}
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex min-w-0 items-center gap-2 flex-1">
                        <p className={`min-w-0 truncate font-semibold text-[13px] ${isSelected ? 'text-primary' : 'text-foreground'}`}>{pr.title}</p>
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
                          className="shrink-0 text-muted-foreground/40 transition-colors hover:text-primary z-10"
                          title="Open in Bitbucket"
                        >
                          <ExternalLink size={12} />
                        </span>
                      </div>
                      {fileCounts && fileCounts[pr.id] != null && (
                        <Badge variant="secondary" className="px-1.5 py-0 rounded-[6px] shrink-0 font-bold bg-foreground/10 text-[10px] tracking-wider text-muted-foreground">
                          <Files size={10} className="inline mr-1" />
                          {fileCounts[pr.id]}
                        </Badge>
                      )}
                    </div>

                    {/* Author */}
                    <p className="mt-0 text-[11px] font-medium text-muted-foreground mb-2">
                      {pr.author.display_name}
                    </p>

                    {/* Branch flow and timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[4px] bg-foreground/5 text-muted-foreground border border-border">
                          {pr.source.branch.name}
                        </span>
                        <ChevronRight size={10} className="text-muted-foreground/40 shrink-0" />
                        <span className="truncate text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[4px] bg-foreground/5 text-muted-foreground border border-border">
                          {pr.destination.branch.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                        {formatRelativeTime(pr.created_on)}
                      </span>
                    </div>
                  </motion.div>
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
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
