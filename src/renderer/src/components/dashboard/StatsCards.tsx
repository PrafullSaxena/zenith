/**
 * StatsCards — Four summary metric cards for the Zenith dashboard.
 * Displays: Total Queries, Total Reviews, Total Optimizations, Total Tokens.
 */
import { BarChart3, GitPullRequest, Zap, Coins } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityEntry } from '../../types/activity'

interface StatCardDef {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  bgColor: string
}

interface StatsCardsProps {
  entries: ActivityEntry[]
  totalTokens: number
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function StatsCards({ entries, totalTokens }: StatsCardsProps): React.JSX.Element {
  const totalQueries = entries.filter(
    (e) => e.pluginId === 'db-inspector' && e.operation.startsWith('DB Q&A')
  ).length
  const totalReviews = entries.filter((e) => e.pluginId === 'code-review-bot').length
  const totalOptimizations = entries.filter(
    (e) => e.pluginId === 'db-inspector' && e.operation.startsWith('Query Optimization')
  ).length

  const stats: StatCardDef[] = [
    {
      label: 'Total Queries',
      value: formatNumber(totalQueries),
      icon: BarChart3,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Total Reviews',
      value: formatNumber(totalReviews),
      icon: GitPullRequest,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Optimizations',
      value: formatNumber(totalOptimizations),
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    {
      label: 'Total Tokens',
      value: formatNumber(totalTokens),
      icon: Coins,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface-elevated p-4 transition-colors hover:border-accent/20"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.bgColor} p-2`}>
                <Icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-[11px] text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
