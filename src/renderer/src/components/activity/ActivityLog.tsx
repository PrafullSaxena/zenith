import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useActivityStore } from '../../stores/activity-store'
import { ActivityFeed } from '../dashboard/ActivityFeed'
import { PLUGINS } from '../../plugins/registry'
import { GlassSurface, GlassSelect, GlassButton, EmptyState, GlassSkeleton } from '../ui'
import { staggerContainer, staggerItem } from '../../lib/motion'
import type { ActivityStatus } from '../../types/activity'

/** Map plugin list to GlassSelect options format */
const PLUGIN_OPTIONS = [
  { value: 'all', label: 'All Plugins' },
  ...PLUGINS.map((p) => ({ value: p.id, label: p.name }))
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'pending', label: 'Pending' }
]

/**
 * Dedicated activity log view with plugin and status filters.
 * Accessible via /activity route and "View All Activity" from dashboard.
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
export default function ActivityLog(): React.JSX.Element {
  const entries = useActivityStore((s) => s.entries)
  const isLoading = useActivityStore((s) => s.isLoading)
  const loadEntries = useActivityStore((s) => s.loadEntries)
  const clearEntries = useActivityStore((s) => s.clearEntries)

  const [pluginFilter, setPluginFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Track initial mount for stagger animation
  const isMounted = useRef(false)
  const shouldAnimate = !isMounted.current
  if (!isMounted.current) isMounted.current = true

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (pluginFilter !== 'all' && entry.pluginId !== pluginFilter) return false
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false
      return true
    })
  }, [entries, pluginFilter, statusFilter])

  return (
    <motion.div
      variants={staggerContainer}
      initial={shouldAnimate ? 'hidden' : false}
      animate="visible"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-text-primary">Activity Log</h1>
          <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {filteredEntries.length}
          </span>
        </div>
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => clearEntries()}
        >
          Clear All
        </GlassButton>
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={staggerItem}>
        <GlassSurface className="flex items-center gap-3">
          <GlassSelect
            options={PLUGIN_OPTIONS}
            value={pluginFilter}
            onChange={setPluginFilter}
            placeholder="All Plugins"
            className="w-48"
          />
          <GlassSelect
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as ActivityStatus | 'all')}
            placeholder="All Statuses"
            className="w-40"
          />
        </GlassSurface>
      </motion.div>

      {/* Activity list */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <div className="space-y-3 py-4">
            <GlassSkeleton variant="card" className="h-14" />
            <GlassSkeleton variant="card" className="h-14" />
            <GlassSkeleton variant="card" className="h-14" />
            <GlassSkeleton variant="card" className="h-14" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activities found"
            description="Try adjusting your filters to see more results"
          />
        ) : (
          <ActivityFeed entries={filteredEntries} />
        )}
      </motion.div>
    </motion.div>
  )
}
