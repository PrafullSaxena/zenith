/**
 * Zenith Dashboard — the main application overview.
 *
 * Layout:
 *   [Hero Header — greeting, date, quick stats]
 *   [TokenChart (lg:col-span-2) | HealthPanel (lg:col-span-1)]
 *   [Plugin Cards — responsive grid]
 *
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
import React, { useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Database,
  Activity,
  Shield
} from 'lucide-react'
import { PLUGINS } from '../../plugins/registry'
import zenithLogo from '../../assets/zenith-logo.png'
import { useActivityStore } from '../../stores/activity-store'
import { useTokenStore } from '../../stores/token-store'
import { useHealthStore } from '../../stores/health-store'
import { useDbStore } from '../../stores/db-store'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import { staggerContainer, staggerItem } from '../../lib/motion'
import { TokenChart } from './TokenChart'
import { HealthPanel } from './HealthPanel'
import { PluginCard } from './PluginCard'

// ── Greeting based on time of day ──────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ── Quick stat card ────────────────────────────────────────────────────────

function QuickStat({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  accent: string
}): React.JSX.Element {
  return (
    <Card className="rounded-[22px]">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent)}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main dashboard component ───────────────────────────────────────────────

export default function MissionControl(): React.JSX.Element {
  const entries = useActivityStore((s) => s.entries)
  const loadActivityEntries = useActivityStore((s) => s.loadEntries)

  const tokenEntries = useTokenStore((s) => s.entries)
  const loadTokenEntries = useTokenStore((s) => s.loadEntries)

  const healthResources = useHealthStore((s) => s.resources)
  const healthLoading = useHealthStore((s) => s.isLoading)
  const overallStatus = useHealthStore((s) => s.overallStatus())
  const refreshHealth = useHealthStore((s) => s.refreshHealth)

  const connections = useDbStore((s) => s.connections)
  const connectionStatuses = useDbStore((s) => s.connectionStatuses)

  // Load all data on mount
  useEffect(() => {
    loadActivityEntries()
    loadTokenEntries()
    refreshHealth()
  }, [loadActivityEntries, loadTokenEntries, refreshHealth])

  // Re-load token entries when the tab/window regains focus
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

  // ── Derived quick stats ──
  const totalTokens = useMemo(
    () => tokenEntries.reduce((sum, e) => sum + e.tokensUsed, 0),
    [tokenEntries]
  )

  const activeConnections = useMemo(
    () => connections.filter((c) => connectionStatuses[c.id]?.connected).length,
    [connections, connectionStatuses]
  )

  const todayOps = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return entries.filter((e) => new Date(e.timestamp) >= todayStart).length
  }, [entries])

  const healthyCount = useMemo(
    () => healthResources.filter((r) => r.status === 'healthy').length,
    [healthResources]
  )

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4 p-4 pt-0"
    >
      {/* Drag region for macOS title bar dragging */}
      <div className="drag-region h-3 w-full" />
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="relative overflow-hidden rounded-[28px] backdrop-blur-sm bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]">
          <CardContent className="px-5 py-4">
            {/* Subtle glow effect */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/[0.04] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/[0.03] blur-2xl" />

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={zenithLogo}
                  alt="Zenith"
                  className="h-12 w-12 drop-shadow-lg"
                />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {getGreeting()}
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {getFormattedDate()}
                  </p>
                </div>
              </div>

              {/* Recent operations summary */}
              {entries.length > 0 && (
                <div className="hidden lg:flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {entries.length} recent operations
                  </Badge>
                </div>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="relative mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <QuickStat
                icon={Zap}
                label="Token Usage"
                value={formatTokens(totalTokens)}
                accent="bg-blue-500/15 text-blue-400"
              />
              <QuickStat
                icon={Database}
                label="Connections"
                value={`${activeConnections}/${connections.length}`}
                accent="bg-emerald-500/15 text-emerald-400"
              />
              <QuickStat
                icon={Activity}
                label="Today's Ops"
                value={String(todayOps)}
                accent="bg-amber-500/15 text-amber-400"
              />
              <QuickStat
                icon={Shield}
                label="Health"
                value={healthResources.length > 0
                  ? `${healthyCount}/${healthResources.length}`
                  : '—'
                }
                accent="bg-purple-500/15 text-purple-400"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Token Chart + Health Panel — responsive 2:1 layout ───── */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
      </motion.div>

      {/* ── Plugin Cards ─────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Plugins
          </h2>
          <span className="text-[11px] text-muted-foreground/70">{PLUGINS.length} available</span>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {PLUGINS.map((plugin) => (
            <motion.div key={plugin.id} variants={staggerItem}>
              <PluginCard plugin={plugin} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
