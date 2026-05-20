import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Clock,
  Rocket,
  Bell
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityEntry, ActivityStatus } from '../../types/activity'
import { getPluginById } from '../../plugins/registry'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { staggerContainer, staggerItem } from '../../lib/motion'
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

/** Map activity status to Badge variant */
const STATUS_TO_BADGE: Record<ActivityStatus, 'default' | 'secondary' | 'destructive'> = {
  success: 'default',
  failure: 'destructive',
  pending: 'secondary'
}

/** Per-plugin accent colors for the left bar */
const PLUGIN_ACCENT_COLORS: Record<string, string> = {
  'code-review-bot': '#3b82f6',
  'db-inspector': '#10b981',
  'launchpad': '#f43f5e',
  'nebula': '#06b6d4',
  'textcraft': '#a855f7',
  'cortex': '#f59e0b'
}

interface ActivityFeedProps {
  entries: ActivityEntry[]
  showViewAll?: boolean
  onViewAll?: () => void
  /** When true, removes the max-height cap so the feed fills its parent. */
  fullHeight?: boolean
}

export function ActivityFeed({
  entries,
  showViewAll,
  onViewAll,
  fullHeight
}: ActivityFeedProps): React.JSX.Element {
  const isMounted = useRef(false)

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-black/10 py-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/6">
          <Bell size={20} className="text-primary/30" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Operations from plugins will appear here
        </p>
      </div>
    )
  }

  // Only animate on first render, not on data changes
  const shouldAnimate = !isMounted.current
  if (!isMounted.current) isMounted.current = true

  return (
    <div className="overflow-hidden rounded-xl">
      <ScrollArea className={fullHeight ? '' : 'max-h-[340px]'}>
        <motion.div
          variants={staggerContainer}
          initial={shouldAnimate ? 'hidden' : false}
          animate="visible"
          className="space-y-2"
        >
          {entries.map((entry) => {
            const plugin = getPluginById(entry.pluginId)
            const Icon = plugin ? ICON_MAP[plugin.icon] : undefined
            const pluginColor = PLUGIN_ACCENT_COLORS[entry.pluginId] ?? 'hsl(var(--primary))'

            return (
              <motion.div key={entry.id} variants={staggerItem}>
                <div className="rounded-xl border border-white/5 bg-black/20 backdrop-blur-md">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {/* Left accent bar */}
                    <div
                      className="h-8 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: pluginColor }}
                    />

                    {/* Plugin icon */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      {Icon ? <Icon size={14} /> : <span className="text-[10px]">?</span>}
                    </div>

                    {/* Operation name + detail */}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {entry.operation}
                      </span>
                      {entry.detail && (
                        <span className="block truncate text-[11px] text-muted-foreground/60">
                          {entry.detail}
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    <Badge variant={STATUS_TO_BADGE[entry.status]}>
                      {entry.status}
                    </Badge>

                    {/* Duration */}
                    {entry.durationMs != null && (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Clock size={11} />
                        {(entry.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}

                    {/* Relative timestamp */}
                    <span className="shrink-0 text-[11px] text-muted-foreground/60">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </ScrollArea>

      {showViewAll && entries.length > 0 && (
        <div className="border-t border-white/5 px-4 py-2">
          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={onViewAll}
          >
            View All Activity
          </Button>
        </div>
      )}
    </div>
  )
}
