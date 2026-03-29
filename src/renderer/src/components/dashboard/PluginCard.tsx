import { useMemo } from 'react'
import { motion } from 'framer-motion'
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
import { cn } from '@renderer/lib/utils'

/**
 * Static map of icon name strings to lucide-react components.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
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
  'code-review-bot': 'from-blue-500/20 to-blue-600/10 text-blue-500',
  'db-inspector': 'from-emerald-500/20 to-emerald-600/10 text-emerald-500',
  'launchpad': 'from-rose-500/20 to-rose-600/10 text-rose-500',
  'nebula': 'from-cyan-500/20 to-cyan-600/10 text-cyan-500',
  'textcraft': 'from-purple-500/20 to-purple-600/10 text-purple-500',
  'cortex': 'from-amber-500/20 to-amber-600/10 text-amber-500'
}

export function PluginCard({ plugin }: { plugin: PluginDefinition }): React.JSX.Element {
  const navigate = useNavigate()
  const allEntries = useActivityStore((s) => s.entries)
  
  const recentCount = useMemo(() => {
    const now = Date.now()
    return allEntries.filter(
      (e) => e.pluginId === plugin.id && now - new Date(e.timestamp).getTime() < 86400000
    ).length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries.length, plugin.id]) 
  
  const Icon = ICON_MAP[plugin.icon]
  const accentClasses = PLUGIN_ACCENTS[plugin.id] ?? 'from-primary/20 to-primary/10 text-primary'

  return (
    <motion.button
      className="group flex w-full items-center gap-4 rounded-[16px] border border-border bg-foreground/[0.03] p-4 text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors hover:bg-foreground/[0.08] hover:border-foreground/20"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => navigate(plugin.route)}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ring-1 ring-border', accentClasses)}>
        {Icon && <Icon size={20} />}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-bold text-foreground truncate">{plugin.name}</h3>
          {recentCount > 0 && (
             <span className="shrink-0 text-[10px] font-bold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-sm ml-2">
               {recentCount} {recentCount === 1 ? 'op' : 'ops'}
             </span>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground truncate">{plugin.description}</p>
      </div>
      
      <div className="flex shrink-0 items-center justify-center h-8 w-8 rounded-full bg-foreground/[0.04] transition-colors group-hover:bg-primary/20">
         <ArrowRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </motion.button>
  )
}
