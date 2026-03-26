import { motion } from 'framer-motion'
import { ExternalLink, Eye, History } from 'lucide-react'
import type { ReviewHistoryEntry } from '../../types/review'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { staggerContainer, staggerItem } from '../../lib/motion'

interface ReviewHistoryProps {
  history: ReviewHistoryEntry[]
  isLoading: boolean
  onOpen?: (entry: ReviewHistoryEntry) => void
}

/**
 * Past reviews displayed as staggered Cards showing PR links,
 * timestamps, comment counts, and status badges. Sorted newest first.
 */
export function ReviewHistory({
  history,
  isLoading,
  onOpen
}: ReviewHistoryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No review history"
        description="Reviews will appear here after completion"
      />
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-1.5 overflow-y-auto"
    >
      {history.map((entry) => (
        <motion.div key={entry.id} variants={staggerItem}>
          <Card className="flex items-center gap-3">
            {/* PR title with external link */}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => window.api?.app?.openExternal?.(entry.prUrl)}
                className="group flex items-center gap-1 text-left"
              >
                <span className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {entry.prTitle}
                </span>
                <ExternalLink
                  size={12}
                  className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.workspace}/{entry.repoSlug}
              </p>
            </div>

            {/* Comment counts */}
            <span className="shrink-0 text-xs text-muted-foreground">
              {entry.commentCount} comments, {entry.postedCount} posted
            </span>

            {/* Status badge */}
            <Badge
              variant={
                entry.status === 'success'
                  ? 'success'
                  : entry.status === 'partial'
                    ? 'warning'
                    : 'destructive'
              }
            >
              {entry.status}
            </Badge>

            {/* Relative timestamp */}
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(entry.timestamp)}
            </span>

            {/* Open review button */}
            {onOpen && entry.commentCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(entry)
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                title="Open review comments"
              >
                <Eye size={13} className="inline mr-1" />
                Open
              </button>
            )}
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
