/**
 * ComparisonBarChart — Horizontal grouped bar chart for multi-provider cost comparison.
 *
 * Renders one row per service, with three bars per row (AWS / GCP / Azure).
 * The cheapest provider bar in each group is highlighted green.
 * All theming uses CSS custom properties except PROVIDER_COLORS (brand identity).
 */
import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { PROVIDER_COLORS, TOOLTIP_CLASSES } from './chart-utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComparisonBarChartDataItem {
  serviceName: string
  aws: number | null
  gcp: number | null
  azure: number | null
}

interface ComparisonBarChartProps {
  data: ComparisonBarChartDataItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Provider = 'aws' | 'gcp' | 'azure'
const PROVIDERS: Provider[] = ['aws', 'gcp', 'azure']
const PROVIDER_LABELS: Record<Provider, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' }

/** Returns the cheapest non-null provider key for a data row, or null if all are null. */
function getCheapestProvider(item: ComparisonBarChartDataItem): Provider | null {
  let cheapest: Provider | null = null
  let cheapestCost = Infinity
  for (const p of PROVIDERS) {
    const cost = item[p]
    if (cost !== null && cost < cheapestCost) {
      cheapest = p
      cheapestCost = cost
    }
  }
  return cheapest
}

/** Desaturated brand colors for non-cheapest bars (slightly muted for dark theme). */
const PROVIDER_COLORS_MUTED: Record<Provider, string> = {
  aws: '#B8721A',
  gcp: '#3A6DB5',
  azure: '#1A6BA0',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  dataKey: string
  value: number | null
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload || !label) return null

  // Rebuild the item from payload to get cheapest highlight
  const costs: Record<string, number | null> = {}
  for (const entry of payload) {
    costs[entry.dataKey] = entry.value ?? null
  }

  let cheapestKey: string | null = null
  let cheapestCost = Infinity
  for (const [key, val] of Object.entries(costs)) {
    if (val !== null && val < cheapestCost) {
      cheapestKey = key
      cheapestCost = val
    }
  }

  return (
    <div className={TOOLTIP_CLASSES} style={{ minWidth: 180 }}>
      <p className="font-semibold text-[hsl(var(--foreground))] mb-2 text-[11px]">{label}</p>
      {PROVIDERS.map((p) => {
        const cost = costs[p]
        const isCheapest = p === cheapestKey && cost !== null
        return (
          <div key={p} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: PROVIDER_COLORS[p] }}
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {PROVIDER_LABELS[p]}
              </span>
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: isCheapest ? 'hsl(var(--success, 142 76% 36%))' : 'hsl(var(--foreground))' }}
            >
              {cost === null ? 'N/A' : `${formatCurrency(cost)}/mo`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ComparisonBarChart({ data }: ComparisonBarChartProps): React.JSX.Element {
  const cheapestByService = useMemo(
    () => new Map(data.map((item) => [item.serviceName, getCheapestProvider(item)])),
    [data]
  )

  const chartHeight = Math.max(300, data.length * 60)

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          barGap={2}
          barCategoryGap="20%"
          margin={{ top: 4, right: 20, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
            horizontal={false}
          />
          <YAxis
            dataKey="serviceName"
            type="category"
            width={140}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <XAxis
            type="number"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(v: number) => '$' + v.toFixed(0)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted-foreground) / 0.05)' }}
          />

          {PROVIDERS.map((provider) => (
            <Bar key={provider} dataKey={provider} isAnimationActive={false} radius={[0, 3, 3, 0]}>
              {data.map((item) => {
                const cheapest = cheapestByService.get(item.serviceName)
                const isCheapest = cheapest === provider && item[provider] !== null
                return (
                  <Cell
                    key={`${item.serviceName}-${provider}`}
                    fill={
                      isCheapest
                        ? 'hsl(142 76% 36%)'
                        : item[provider] !== null
                          ? PROVIDER_COLORS_MUTED[provider]
                          : 'transparent'
                    }
                    style={
                      isCheapest
                        ? { filter: 'drop-shadow(0 0 4px hsl(142 76% 36% / 0.3))' }
                        : undefined
                    }
                  />
                )
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
