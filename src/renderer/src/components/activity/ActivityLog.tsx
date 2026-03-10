import { useEffect, useState, useMemo } from 'react'
import { Activity } from 'lucide-react'
import { useActivityStore } from '../../stores/activity-store'
import { ActivityFeed } from '../dashboard/ActivityFeed'
import { PLUGINS } from '../../plugins/registry'
import type { ActivityStatus } from '../../types/activity'

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
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all')

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
    <div className="stagger-children space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-text-primary">Activity Log</h1>
          <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            {filteredEntries.length}
          </span>
        </div>
        <button
          onClick={() => clearEntries()}
          className="text-xs text-text-secondary hover:text-red-400 transition"
        >
          Clear All
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={pluginFilter}
          onChange={(e) => setPluginFilter(e.target.value)}
          className="rounded-lg border border-border/50 bg-surface-elevated px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="all">All Plugins</option>
          {PLUGINS.map((plugin) => (
            <option key={plugin.id} value={plugin.id}>
              {plugin.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ActivityStatus | 'all')}
          className="rounded-lg border border-border/50 bg-surface-elevated px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.06]">
            <Activity size={20} className="text-accent/30" />
          </div>
          <p className="text-sm font-medium text-text-secondary/70">No activity entries match your filters</p>
          <p className="mt-1 text-[11px] text-text-secondary/60">Try adjusting the plugin or status filter</p>
        </div>
      ) : (
        <ActivityFeed entries={filteredEntries} />
      )}
    </div>
  )
}
