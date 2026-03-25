/**
 * StatsCards — Four summary metric cards for the Zenith dashboard.
 * Displays: Total Queries, Total Reviews, Total Optimizations, Total Tokens.
 * Uses GlassCard with AnimatedCounter for animated numeric values.
 */
import { motion } from 'framer-motion'
import { BarChart3, GitPullRequest, Zap, Coins } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityEntry } from '../../types/activity'
import { GlassCard, AnimatedCounter } from '../ui'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'

interface StatCardDef {
  label: string
  value: number
  icon: LucideIcon
  color: string
  bgColor: string
}

interface StatsCardsProps {
  entries: ActivityEntry[]
  totalTokens: number
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
      value: totalQueries,
      icon: BarChart3,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Total Reviews',
      value: totalReviews,
      icon: GitPullRequest,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Optimizations',
      value: totalOptimizations,
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    {
      label: 'Total Tokens',
      value: totalTokens,
      icon: Coins,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ]

  return (
    <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <motion.div key={stat.label} variants={staggerItem}>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg ${stat.bgColor} p-2`}>
                  <Icon size={18} className={stat.color} />
                </div>
                <div>
                  <AnimatedCounter value={stat.value} className="text-xl font-bold text-text-primary" />
                  <p className="text-[11px] text-text-secondary">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
