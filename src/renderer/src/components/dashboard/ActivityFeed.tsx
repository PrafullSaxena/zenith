import {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Clock
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
  MessageSquare
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
      <p className="py-8 text-center text-sm text-text-secondary">No recent activity</p>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="space-y-1">
        {entries.map((entry) => {
          const plugin = getPluginById(entry.pluginId)
          const Icon = plugin ? ICON_MAP[plugin.icon] : undefined

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-elevated transition-colors"
            >
              {/* Plugin icon */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center text-text-secondary">
                {Icon ? <Icon size={16} /> : <span className="text-xs">?</span>}
              </div>

              {/* Operation name + detail */}
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text-primary">
                  {entry.operation}
                </span>
                {entry.detail && (
                  <span className="block truncate text-xs text-text-secondary">
                    {entry.detail}
                  </span>
                )}
              </div>

              {/* Status badge */}
              <StatusBadge status={entry.status} />

              {/* Duration */}
              {entry.durationMs != null && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                  <Clock size={12} />
                  {(entry.durationMs / 1000).toFixed(1)}s
                </span>
              )}

              {/* Relative timestamp */}
              <span className="shrink-0 text-xs text-text-secondary">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
          )
        })}
      </div>

      {showViewAll && entries.length > 0 && (
        <button
          onClick={onViewAll}
          className="mt-3 w-full rounded-md py-2 text-center text-xs font-medium text-accent hover:bg-accent/10 transition"
        >
          View All Activity
        </button>
      )}
    </div>
  )
}
