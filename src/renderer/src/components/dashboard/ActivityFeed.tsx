import {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Clock,
  Rocket,
  Inbox
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityEntry } from '../../types/activity'
import { getPluginById } from '../../plugins/registry'
import { StatusBadge } from './StatusBadge'
import { formatRelativeTime } from './utils'

/**
 * Static map of icon name strings to lucide-react components.
 * Used to resolve plugin icons from the plugin registry.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Rocket
}

interface ActivityFeedProps {
  entries: ActivityEntry[]
  showViewAll?: boolean
  onViewAll?: () => void
}

export function ActivityFeed({
  entries,
  showViewAll,
  onViewAll
}: ActivityFeedProps): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-surface-elevated/40 py-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.06]">
          <Inbox size={20} className="text-accent/30" />
        </div>
        <p className="text-sm font-medium text-text-secondary/50">No recent activity</p>
        <p className="mt-1 text-[11px] text-text-secondary/30">
          Operations from plugins will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-surface-elevated/40">
      <div className="max-h-[340px] overflow-y-auto">
        <div className="divide-y divide-border/30">
          {entries.map((entry) => {
            const plugin = getPluginById(entry.pluginId)
            const Icon = plugin ? ICON_MAP[plugin.icon] : undefined

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-2.5 transition-all duration-150 hover:bg-surface/30"
              >
                {/* Plugin icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary/70">
                  {Icon ? <Icon size={14} /> : <span className="text-[10px]">?</span>}
                </div>

                {/* Operation name + detail */}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {entry.operation}
                  </span>
                  {entry.detail && (
                    <span className="block truncate text-[11px] text-text-secondary/60">
                      {entry.detail}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <StatusBadge status={entry.status} />

                {/* Duration */}
                {entry.durationMs != null && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-secondary/60">
                    <Clock size={11} />
                    {(entry.durationMs / 1000).toFixed(1)}s
                  </span>
                )}

                {/* Relative timestamp */}
                <span className="shrink-0 text-[11px] text-text-secondary/50">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {showViewAll && entries.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2">
          <button
            onClick={onViewAll}
            className="w-full rounded-md py-1.5 text-center text-xs font-medium text-accent transition hover:bg-accent/10"
          >
            View All Activity
          </button>
        </div>
      )}
    </div>
  )
}
