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
import { GlassCard, GlassSurface, AnimatedCounter, Scene3DWrapper } from '../ui'
import { staggerContainer, staggerItem } from '../../lib/motion'
import { TokenChart } from './TokenChart'
import { HealthPanel } from './HealthPanel'
import { PluginCard } from './PluginCard'

// ── Lazy-load 3D activity mesh ───────────────────────────────────────────
const ActivityMesh3D = React.lazy(() => import('./ActivityMesh3D'))

// ── 2D fallback for activity mesh ────────────────────────────────────────
function ActivityMeshFallback(): React.JSX.Element {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.08)_0%,transparent_70%)]">
      <span className="text-[10px] text-text-secondary/50">Activity Mesh</span>
    </div>
  )
}

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
  numericValue,
  accent
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  numericValue?: number
  accent: string
}): React.JSX.Element {
  return (
    <GlassCard className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/70">{label}</p>
        {numericValue != null ? (
          <AnimatedCounter value={numericValue} className="text-lg font-semibold leading-tight text-text-primary" />
        ) : (
          <p className="text-lg font-semibold leading-tight text-text-primary">{value}</p>
        )}
      </div>
    </GlassCard>
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
      className="space-y-6 pb-4"
    >
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <GlassSurface className="relative overflow-hidden p-6">
          {/* Subtle glow effect */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/[0.04] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent/[0.03] blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img
                src={zenithLogo}
                alt="Zenith"
                className="h-12 w-12 drop-shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                  {getGreeting()}
                </h1>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {getFormattedDate()}
                </p>
              </div>
            </div>

            {/* 3D Activity Mesh — right side of hero */}
            {entries.length > 0 && (
              <div className="hidden h-[250px] w-[250px] flex-shrink-0 lg:block">
                <Scene3DWrapper
                  fallback={<ActivityMeshFallback />}
                  loadingMessage="Loading activity mesh..."
                >
                  <ActivityMesh3D />
                </Scene3DWrapper>
              </div>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QuickStat
              icon={Zap}
              label="Token Usage"
              value={formatTokens(totalTokens)}
              numericValue={totalTokens}
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
              numericValue={todayOps}
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
        </GlassSurface>
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Plugins
          </h2>
          <span className="text-[11px] text-text-secondary/70">{PLUGINS.length} available</span>
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
