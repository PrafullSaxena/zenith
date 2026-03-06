import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PLUGINS } from '../../plugins/registry'
import { useActivityStore } from '../../stores/activity-store'
import { PluginCard } from './PluginCard'
import { ActivityFeed } from './ActivityFeed'

/**
 * Mission Control -- the main dashboard view.
 * Shows plugin summary cards in a responsive CSS Grid and a recent activity feed.
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
export default function MissionControl(): React.JSX.Element {
  const entries = useActivityStore((s) => s.entries)
  const isLoading = useActivityStore((s) => s.isLoading)
  const loadEntries = useActivityStore((s) => s.loadEntries)
  const navigate = useNavigate()

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-xl font-semibold text-text-primary">Mission Control</h1>

      {/* Plugin summary cards -- responsive CSS grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLUGINS.map((plugin) => (
          <PluginCard key={plugin.id} plugin={plugin} />
        ))}
      </div>

      {/* Recent Activity section */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Recent Activity
        </h2>
        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading activity...</p>
        ) : (
          <ActivityFeed
            entries={entries.slice(0, 20)}
            showViewAll={entries.length > 0}
            onViewAll={() => navigate('/activity')}
          />
        )}
      </div>
    </div>
  )
}
