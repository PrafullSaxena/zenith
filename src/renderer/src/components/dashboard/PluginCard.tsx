import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  LayoutDashboard,
  Activity
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PluginDefinition } from '../../types/plugin'
import { useActivityStore } from '../../stores/activity-store'

/**
 * Static map of icon name strings to lucide-react components.
 * Local copy matching Sidebar.tsx pattern, extended with dashboard icons.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  LayoutDashboard,
  Activity
}

export function PluginCard({ plugin }: { plugin: PluginDefinition }): React.JSX.Element {
  const navigate = useNavigate()
  // Select the stable entries array — NOT getEntriesByPlugin which returns a
  // new array via .filter() on every call, causing Zustand's Object.is check
  // to always see a "changed" value → infinite re-render loop.
  const allEntries = useActivityStore((s) => s.entries)
  const recentCount = useMemo(() => {
    const now = Date.now()
    return allEntries.filter(
      (e) => e.pluginId === plugin.id && now - new Date(e.timestamp).getTime() < 86400000
    ).length
  }, [allEntries, plugin.id])
  const Icon = ICON_MAP[plugin.icon]

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4 hover:border-accent/30 transition-colors">
      <div className="mb-3 flex items-center gap-3">
        {Icon && <Icon size={20} className="text-accent" />}
        <h3 className="text-sm font-semibold text-text-primary">{plugin.name}</h3>
      </div>
      <p className="mb-4 text-xs text-text-secondary">{plugin.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{recentCount} ops today</span>
        <button
          onClick={() => navigate(plugin.route)}
          className="rounded bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition"
        >
          Open
        </button>
      </div>
    </div>
  )
}
