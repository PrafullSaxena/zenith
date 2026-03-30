/**
 * HistoryTrendLine — Multi-line trend chart for estimation history.
 *
 * Renders one Line per cloud provider, plotting totalMonthly over time (savedAt).
 * Lines use PROVIDER_COLORS for brand identity. When 3 providers overlap,
 * distinct stroke widths and dash patterns ensure readability.
 *
 * Shows last 15 entries by default with a "Show all" toggle for full dataset.
 * Renders a subtle placeholder message when fewer than 2 entries exist.
 */
import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PROVIDER_COLORS, TOOLTIP_CLASSES } from './chart-utils'
import type { EstimationEntry } from '../../types/launchpad'

// ── Types ────────────────────────────────────────────────────────────────────

type Provider = 'aws' | 'gcp' | 'azure'
const PROVIDERS: Provider[] = ['aws', 'gcp', 'azure']
const PROVIDER_LABELS: Record<Provider, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' }

/** Line style config for readability when multiple providers overlap. */
const LINE_STYLES: Record<Provider, { strokeWidth: number; strokeDasharray?: string }> = {
  aws: { strokeWidth: 2.5 },
  gcp: { strokeWidth: 2, strokeDasharray: '5 3' },
  azure: { strokeWidth: 1.5, strokeDasharray: '2 2' },
}

/** Per-provider data point keyed by numeric timestamp. */
interface ProviderDataPoint {
  date: number
  name: string
  totalMonthly: number
  services: EstimationEntry['services']
}

interface ChartDataPoint {
  date: number
  aws?: number
  gcp?: number
  azure?: number
  // metadata by provider for tooltip
  _aws?: { name: string; services: EstimationEntry['services'] }
  _gcp?: { name: string; services: EstimationEntry['services'] }
  _azure?: { name: string; services: EstimationEntry['services'] }
}

interface HistoryTrendLineProps {
  entries: EstimationEntry[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function toChartData(entries: EstimationEntry[]): ChartDataPoint[] {
  // Sort ascending by savedAt
  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt)
  )

  // Build a map from timestamp to merged data point
  const pointsMap = new Map<number, ChartDataPoint>()
  for (const entry of sorted) {
    const ts = Date.parse(entry.savedAt)
    if (!pointsMap.has(ts)) {
      pointsMap.set(ts, { date: ts })
    }
    const pt = pointsMap.get(ts)!
    const provider = entry.provider as Provider
    ;(pt as Record<string, unknown>)[provider] = entry.totalMonthly
    ;(pt as Record<string, unknown>)[`_${provider}`] = {
      name: entry.name,
      services: entry.services,
    }
  }

  return Array.from(pointsMap.values()).sort((a, b) => a.date - b.date)
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  dataKey: string
  value?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: number
  data?: ChartDataPoint[]
}

function CustomTooltip({ active, payload, label, data }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload || !label) return null

  const pt = data?.find((d) => d.date === label)

  return (
    <div className={TOOLTIP_CLASSES} style={{ minWidth: 210 }}>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {PROVIDERS.map((p) => {
        const cost = (pt as Record<string, unknown> | undefined)?.[p] as number | undefined
        if (cost === undefined) return null
        const meta = (pt as Record<string, unknown> | undefined)?.[`_${p}`] as
          | { name: string; services: EstimationEntry['services'] }
          | undefined
        const top3 = meta?.services?.slice(0, 3) ?? []

        return (
          <div key={p} className="mb-2 last:mb-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: PROVIDER_COLORS[p] }}
              />
              <span className="text-[11px] font-semibold text-[hsl(var(--foreground))]">
                {PROVIDER_LABELS[p]} — {formatCurrency(cost)}/mo
              </span>
            </div>
            {meta && (
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] ml-3.5 mb-0.5">
                {meta.name}
              </p>
            )}
            {top3.length > 0 && (
              <div className="ml-3.5 space-y-0.5">
                {top3.map((svc, i) => (
                  <p key={i} className="text-[9px] text-[hsl(var(--muted-foreground))]/60">
                    {svc.serviceId}
                  </p>
                ))}
                {(meta?.services?.length ?? 0) > 3 && (
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))]/40">
                    +{(meta?.services?.length ?? 0) - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 15

export default function HistoryTrendLine({ entries }: HistoryTrendLineProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false)

  const allChartData = useMemo(() => toChartData(entries), [entries])

  const visibleData = useMemo(() => {
    if (showAll || allChartData.length <= DEFAULT_LIMIT) return allChartData
    return allChartData.slice(-DEFAULT_LIMIT)
  }, [allChartData, showAll])

  const presentProviders = useMemo(
    () => PROVIDERS.filter((p) => allChartData.some((d) => (d as Record<string, unknown>)[p] !== undefined)),
    [allChartData]
  )

  if (entries.length < 2) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <p className="text-xs text-[hsl(var(--muted-foreground))]/50 text-center">
          Need at least 2 saved estimations to show trends
        </p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={visibleData}
          margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={(ts: number) =>
              new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => '$' + v.toFixed(0)}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            content={<CustomTooltip data={visibleData} />}
            cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
          />
          {presentProviders.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={PROVIDER_COLORS[p]}
              strokeWidth={LINE_STYLES[p].strokeWidth}
              strokeDasharray={LINE_STYLES[p].strokeDasharray}
              dot={{ r: 4, fill: PROVIDER_COLORS[p], stroke: 'hsl(var(--background))', strokeWidth: 1 }}
              activeDot={{ r: 6, stroke: PROVIDER_COLORS[p], strokeWidth: 2, fill: 'hsl(var(--background))' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Provider legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        {presentProviders.map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{
                background: PROVIDER_COLORS[p],
                opacity: 0.85,
              }}
            />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{PROVIDER_LABELS[p]}</span>
          </div>
        ))}
        {allChartData.length > DEFAULT_LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors underline underline-offset-2"
          >
            {showAll ? 'Show last 15' : `Show all (${allChartData.length})`}
          </button>
        )}
      </div>
    </div>
  )
}
