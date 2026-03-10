import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitPullRequest,
  Database,
  LayoutDashboard,
  Activity,
  Rocket,
  BookOpen,
  PenLine,
  ArrowRight
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
  LayoutDashboard,
  Activity,
  Rocket,
  BookOpen,
  PenLine
}

/** Per-plugin accent palette for icon backgrounds */
const PLUGIN_ACCENTS: Record<string, string> = {
  'code-review-bot': 'from-blue-500/20 to-blue-600/10 text-blue-400',
  'db-inspector': 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
  'launchpad': 'from-rose-500/20 to-rose-600/10 text-rose-400',
  'nebula': 'from-cyan-500/20 to-cyan-600/10 text-cyan-400',
  'textcraft': 'from-purple-500/20 to-purple-600/10 text-purple-400'
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
  const accentClasses = PLUGIN_ACCENTS[plugin.id] ?? 'from-accent/20 to-accent/10 text-accent'

  return (
    <button
      type="button"
      onClick={() => navigate(plugin.route)}
      className="hover-lift group relative flex flex-col rounded-xl border border-border/60 bg-surface-elevated/70 p-4 text-left transition-all duration-200 hover:border-accent/30 hover:bg-surface-elevated hover:shadow-lg hover:shadow-accent/[0.03]"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon with per-plugin accent */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accentClasses}`}>
            {Icon && <Icon size={18} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">{plugin.name}</h3>
            {recentCount > 0 && (
              <span className="text-[10px] font-medium text-accent/70">
                {recentCount} {recentCount === 1 ? 'op' : 'ops'} today
              </span>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <ArrowRight
          size={14}
          className="mt-1 shrink-0 text-text-secondary/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>

      <p className="relative mt-3 text-xs leading-relaxed text-text-secondary">
        {plugin.description}
      </p>
    </button>
  )
}
