import { motion } from 'framer-motion'
import { ExternalLink, Eye, Clock, History } from 'lucide-react'
import type { ReviewHistoryEntry } from '../../types/review'
import { formatRelativeTime } from '../../components/dashboard/utils'
import { GlassCard, GlassBadge, GlassSkeleton, EmptyState } from '../../components/ui'
import { staggerContainer, staggerItem } from '../../lib/motion'

interface ReviewHistoryProps {
  history: ReviewHistoryEntry[]
  isLoading: boolean
  onOpen?: (entry: ReviewHistoryEntry) => void
}

/**
 * Past reviews displayed as staggered GlassCards showing PR links,
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
        <GlassSkeleton variant="card" />
        <GlassSkeleton variant="card" />
        <GlassSkeleton variant="card" />
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
          <GlassCard variant="interactive" className="flex items-center gap-3">
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
            <GlassBadge
              variant={
                entry.status === 'success'
                  ? 'success'
                  : entry.status === 'partial'
                    ? 'warning'
                    : 'error'
              }
            >
              {entry.status}
            </GlassBadge>

            {/* Relative timestamp */}
            <span className="shrink-0 text-xs text-text-secondary">
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
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
                title="Open review comments"
              >
                <Eye size={13} className="inline mr-1" />
                Open
              </button>
            )}
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  )
}
