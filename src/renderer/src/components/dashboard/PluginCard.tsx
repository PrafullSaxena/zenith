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
  ArrowRight,
  Brain
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PluginDefinition } from '../../types/plugin'
import { useActivityStore } from '../../stores/activity-store'
import { Card, CardContent } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

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
  PenLine,
  Brain
}

/** Per-plugin accent palette for icon backgrounds */
const PLUGIN_ACCENTS: Record<string, string> = {
  'code-review-bot': 'from-blue-500/20 to-blue-600/10 text-blue-400',
  'db-inspector': 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
  'launchpad': 'from-rose-500/20 to-rose-600/10 text-rose-400',
  'nebula': 'from-cyan-500/20 to-cyan-600/10 text-cyan-400',
  'textcraft': 'from-purple-500/20 to-purple-600/10 text-purple-400',
  'cortex': 'from-amber-500/20 to-amber-600/10 text-amber-400'
}

export function PluginCard({ plugin }: { plugin: PluginDefinition }): React.JSX.Element {
  const navigate = useNavigate()
  const allEntries = useActivityStore((s) => s.entries)
  const recentCount = useMemo(() => {
    const now = Date.now()
    return allEntries.filter(
      (e) => e.pluginId === plugin.id && now - new Date(e.timestamp).getTime() < 86400000
    ).length
  }, [allEntries, plugin.id])
  const Icon = ICON_MAP[plugin.icon]
  const accentClasses = PLUGIN_ACCENTS[plugin.id] ?? 'from-primary/20 to-primary/10 text-primary'

  return (
    <Card
      className={cn(
        'group flex h-full cursor-pointer flex-col rounded-[22px] p-0 text-left',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/30'
      )}
      onClick={() => navigate(plugin.route)}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Icon with per-plugin accent */}
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br', accentClasses)}>
              {Icon && <Icon size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{plugin.name}</h3>
              {recentCount > 0 && (
                <span className="text-[10px] font-medium text-primary/70">
                  {recentCount} {recentCount === 1 ? 'op' : 'ops'} today
                </span>
              )}
            </div>
          </div>

          {/* Arrow indicator */}
          <ArrowRight
            size={14}
            className="mt-1 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {plugin.description}
        </p>
      </CardContent>
    </Card>
  )
}
