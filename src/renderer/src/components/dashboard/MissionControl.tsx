/**
 * Zenith Mission Control — The unified dashboard.
 * Designed with a hyper-dense 12-column CSS Grid specifically engineered to eliminate "dead space"
 * and pack maximum operational telemetry (Health, Activity, Tokens, and Plugin access) onto a single screen.
 */
import React, { useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Database,
  Activity,
  Shield,
  ActivityIcon,
  ChevronRight
} from 'lucide-react'
import { PLUGINS } from '../../plugins/registry'
import zenithLogo from '../../assets/zenith-logo.png'
import { useActivityStore } from '../../stores/activity-store'
import { useTokenStore } from '../../stores/token-store'
import { useHealthStore } from '../../stores/health-store'
import { useDbStore } from '../../stores/db-store'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import { staggerContainer, staggerItem } from '../../lib/motion'
import { TokenChart } from './TokenChart'
import { HealthPanel } from './HealthPanel'
import { PluginCard, ICON_MAP } from './PluginCard'
import { SpotlightCard } from '@renderer/components/ui/spotlight-card'

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
    <SpotlightCard className="col-span-1 md:col-span-3 lg:col-span-3 xl:col-span-3 h-24 !rounded-[20px]">
      <div className="flex h-full items-center gap-4 px-5">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br ring-1 ring-border shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]', accent)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="text-xl font-black leading-tight text-foreground tabular-nums tracking-tight mt-0.5">{value}</p>
        </div>
      </div>
    </SpotlightCard>
  )
}

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

  useEffect(() => {
    loadActivityEntries()
    loadTokenEntries()
    refreshHealth()
  }, [loadActivityEntries, loadTokenEntries, refreshHealth])

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
      className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-background text-foreground"
    >
      {/* ── Background Dotted Tech Mesh ── */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full w-full dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[radial-gradient(#00000015_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_100%_40%_at_50%_0%,#000_100%,transparent_100%)] opacity-80" />

      {/* ── macOS title bar spacer ── */}
      <div className="drag-region relative z-50 h-[30px] w-full shrink-0" />

      {/* ── Top Header Row ── */}
      <div className="relative z-10 mx-auto flex max-w-[1500px] items-end justify-between px-6 pt-2 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-background/60 shadow-[0_0_20px_rgba(130,81,238,0.2)] ring-1 ring-border backdrop-blur-xl">
            <img src={zenithLogo} alt="Zenith" className="h-6 w-6 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-[28px]">
              {getGreeting()}
            </h1>
            <p className="mt-0 text-[13px] font-bold tracking-wide text-muted-foreground/80">
              {getFormattedDate()}
            </p>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="hidden lg:flex items-center">
            <Badge variant="secondary" className="px-3 py-1 font-bold tracking-[0.1em] text-[10px] uppercase shadow-sm border border-border bg-card/60 backdrop-blur-md">
              <Activity size={10} className="mr-1.5" />
              {entries.length} Operational Checkpoints
            </Badge>
          </div>
        )}
      </div>

      {/* ── 12-Column High-Density Grid Wrapper ── */}
      <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-6 md:grid-cols-6 lg:gap-5 lg:p-8 xl:grid-cols-12 xl:gap-5 pb-20">

        {/* ROW 1: Quick Stats (4x 3-col spans) */}
        <QuickStat
          icon={Zap}
          label="Token Usage"
          value={formatTokens(totalTokens)}
          accent="from-blue-500/20 to-blue-600/5 text-blue-500"
        />
        <QuickStat
          icon={Database}
          label="Connections"
          value={`${activeConnections}/${connections.length}`}
          accent="from-emerald-500/20 to-emerald-600/5 text-emerald-500"
        />
        <QuickStat
          icon={Activity}
          label="Today's Ops"
          value={String(todayOps)}
          accent="from-amber-500/20 to-amber-600/5 text-amber-500"
        />
        <QuickStat
          icon={Shield}
          label="Health"
          value={healthResources.length > 0 ? `${healthyCount}/${healthResources.length}` : '—'}
          accent="from-purple-500/20 to-purple-600/5 text-purple-500"
        />

        {/* ROW 2: Heartbeat Row (Span 8 + Span 4) */}
        <motion.div variants={staggerItem} className="col-span-1 md:col-span-6 lg:col-span-4 xl:col-span-8 h-[300px]">
          <SpotlightCard className="h-full !rounded-[20px]">
             <TokenChart entries={tokenEntries} />
          </SpotlightCard>
        </motion.div>

        <motion.div variants={staggerItem} className="col-span-1 md:col-span-6 lg:col-span-2 xl:col-span-4 h-[300px]">
          <SpotlightCard className="h-full !rounded-[20px]">
            <HealthPanel
              resources={healthResources}
              overallStatus={overallStatus}
              isLoading={healthLoading}
              onRefresh={handleRefreshHealth}
            />
          </SpotlightCard>
        </motion.div>

        {/* ROW 3: Hub Row (Span 4 + Span 8) */}
        
        {/* Activity Stream Feed */}
        <motion.div variants={staggerItem} className="col-span-1 md:col-span-6 lg:col-span-2 xl:col-span-4 flex flex-col min-h-[300px]">
          <SpotlightCard className="h-full !rounded-[20px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Activity Stream</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live</p>
            </div>
            
            {entries.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground/50">
                   <Activity size={18} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {entries.slice(0, 6).map((entry) => {
                  const plugin = PLUGINS.find((p) => p.id === entry.pluginId)
                  const Icon = plugin && plugin.icon ? ICON_MAP[plugin.icon] : ActivityIcon

                  return (
                    <div key={entry.id} className="flex items-start gap-4 px-5 py-3 transition-colors hover:bg-foreground/[0.03] border-b border-border/40 last:border-0 relative group">
                      <div className="mt-0.5 shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-foreground/5 ring-1 ring-border text-foreground/50 group-hover:text-primary transition-colors">
                        {Icon ? <Icon size={13} /> : <ActivityIcon size={13} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="truncate text-xs font-bold text-foreground">
                            {plugin ? plugin.name : entry.pluginId}
                          </p>
                          <span className="shrink-0 text-[9px] font-bold tabular-nums text-muted-foreground tracking-widest px-1.5 py-0.5 rounded-sm bg-foreground/5">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="truncate text-[11px] font-medium text-muted-foreground pr-2">
                          {entry.summary || 'Executing background operational bounds'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 py-2.5 bg-foreground/[0.02] border-t border-border mt-auto flex justify-between items-center cursor-pointer hover:bg-foreground/[0.04]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">View Trace Log</span>
              <ChevronRight size={12} className="text-muted-foreground" />
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Integrated Command Center */}
        <motion.div variants={staggerItem} className="col-span-1 md:col-span-6 lg:col-span-4 xl:col-span-8 relative">
          <SpotlightCard className="h-full !rounded-[20px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-foreground/[0.02]">
               <div>
                 <h3 className="text-[14px] font-black tracking-tight text-foreground">Command Center</h3>
                 <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide mt-0.5">Available intelligent plugin modules executing on local resources.</p>
               </div>
               <Badge className="bg-primary/20 text-primary border-0 tracking-wider font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">{PLUGINS.length} PLUGINS</Badge>
            </div>
            {/* The hyper dense horizontal list for Plugins */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 lg:p-6 bg-card/80">
              {PLUGINS.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          </SpotlightCard>
        </motion.div>

      </div>
    </motion.div>
  )
}
