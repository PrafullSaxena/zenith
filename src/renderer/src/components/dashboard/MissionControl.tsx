/**
 * Zenith Dashboard — the main application overview.
 *
 * Layout:
 *   [TokenChart (lg:col-span-2) | HealthPanel (lg:col-span-1)]
 *   [Plugin Cards — 2×2 grid]
 *   [Recent Activity Feed with "View All"]
 *
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PLUGINS } from '../../plugins/registry'
import { useActivityStore } from '../../stores/activity-store'
import { useTokenStore } from '../../stores/token-store'
import { useHealthStore } from '../../stores/health-store'
import { TokenChart } from './TokenChart'
import { HealthPanel } from './HealthPanel'
import { PluginCard } from './PluginCard'
import { ActivityFeed } from './ActivityFeed'

export default function MissionControl(): React.JSX.Element {
  const entries = useActivityStore((s) => s.entries)
  const isLoadingActivity = useActivityStore((s) => s.isLoading)
  const loadActivityEntries = useActivityStore((s) => s.loadEntries)

  const tokenEntries = useTokenStore((s) => s.entries)
  const loadTokenEntries = useTokenStore((s) => s.loadEntries)

  const healthResources = useHealthStore((s) => s.resources)
  const healthLoading = useHealthStore((s) => s.isLoading)
  const overallStatus = useHealthStore((s) => s.overallStatus())
  const refreshHealth = useHealthStore((s) => s.refreshHealth)

  const navigate = useNavigate()

  // Load all data on mount
  useEffect(() => {
    loadActivityEntries()
    loadTokenEntries()
    refreshHealth()
  }, [loadActivityEntries, loadTokenEntries, refreshHealth])

  // Re-load token entries when the tab/window regains focus
  // (user may have run AI queries on another page and come back)
  useEffect(() => {
    const handleFocus = (): void => {
      loadTokenEntries()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadTokenEntries])

  const handleRefreshHealth = useCallback(async () => {
    await refreshHealth()
  }, [refreshHealth])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-accent/10 p-2">
          <Sparkles size={22} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Zenith</h1>
          <p className="text-xs text-text-secondary">
            Your AI-powered development toolkit — monitor resources, track usage, and access plugins
          </p>
        </div>
      </div>

      {/* Token Chart + Health Panel — responsive 2:1 layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TokenChart entries={tokenEntries} />
        </div>
        <div className="lg:col-span-1">
          <HealthPanel
            resources={healthResources}
            overallStatus={overallStatus}
            isLoading={healthLoading}
            onRefresh={handleRefreshHealth}
          />
        </div>
      </div>

      {/* Plugin Cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Plugins
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLUGINS.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Recent Activity
        </h2>
        {isLoadingActivity ? (
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
