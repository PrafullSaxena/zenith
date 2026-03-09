/**
 * TokenChart — Compact SVG line chart showing token usage by provider over 7 days.
 * No external charting library — renders directly to SVG.
 *
 * Layout: chart on the left, agent legend column on the right.
 */
import { BarChart3 } from 'lucide-react'
import type { TokenUsageEntry } from '../../stores/token-store'

interface TokenChartProps {
  entries: TokenUsageEntry[]
}

/** Provider color palette */
const PROVIDER_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899'  // pink
]

interface DayBucket {
  label: string
  date: string
  byProvider: Record<string, number>
  total: number
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function TokenChart({ entries }: TokenChartProps): React.JSX.Element {
  // Build 7-day buckets
  const now = new Date()
  const buckets: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    buckets.push({ label, date, byProvider: {}, total: 0 })
  }

  // Collect unique providers
  const providerMap: Record<string, string> = {}
  for (const e of entries) {
    providerMap[e.providerId] = e.providerName || e.providerId
    const entryDate = e.timestamp.split('T')[0]
    const bucket = buckets.find((b) => b.date === entryDate)
    if (bucket) {
      bucket.byProvider[e.providerId] = (bucket.byProvider[e.providerId] || 0) + e.tokensUsed
      bucket.total += e.tokensUsed
    }
  }

  const providerIds = Object.keys(providerMap)

  // Calculate total per provider
  const totalTokens = entries.reduce((sum, e) => sum + e.tokensUsed, 0)
  const providerTotals: Record<string, number> = {}
  for (const e of entries) {
    providerTotals[e.providerId] = (providerTotals[e.providerId] || 0) + e.tokensUsed
  }

  // Sort providers by total tokens (highest first)
  const sortedProviderIds = [...providerIds].sort(
    (a, b) => (providerTotals[b] || 0) - (providerTotals[a] || 0)
  )

  // Stable color index per provider
  const providerColorIndex: Record<string, number> = {}
  providerIds.forEach((pid, i) => { providerColorIndex[pid] = i })

  // Chart SVG dimensions
  const W = 320
  const H = 150
  const PAD_L = 36
  const PAD_R = 8
  const PAD_T = 8
  const PAD_B = 22
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxVal = Math.max(...buckets.map((b) => b.total), 1)
  const xStep = chartW / Math.max(buckets.length - 1, 1)
  const yScale = (v: number): number => PAD_T + chartH - (v / maxVal) * chartH

  // Build polyline points per provider
  const providerLines = providerIds.map((pid) => {
    const pi = providerColorIndex[pid]
    const points = buckets.map((b, bi) => ({
      x: PAD_L + bi * xStep,
      y: yScale(b.byProvider[pid] || 0)
    }))
    const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
    const baseline = PAD_T + chartH
    const areaPath = `M${points[0].x},${baseline} ` +
      points.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${points[points.length - 1].x},${baseline} Z`
    return { pid, color: PROVIDER_COLORS[pi % PROVIDER_COLORS.length], linePoints, areaPath, points }
  })

  // Y-axis labels (3 steps)
  const ySteps = [0, maxVal / 2, maxVal]
  const yLabels = ySteps.map((v) => ({
    y: yScale(v),
    label: v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(Math.round(v))
  }))

  // ── Empty state ──
  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border/60 bg-surface-elevated/70 p-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Token Usage</h3>
          <p className="text-[11px] text-text-secondary/60">7-day consumption by AI agent</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.08]">
              <BarChart3 size={20} className="text-accent/40" />
            </div>
            <p className="text-sm font-medium text-text-secondary/60">No usage data yet</p>
            <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-text-secondary/40">
              Token consumption will appear here after you run AI-powered queries
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Data state ──
  return (
    <div className="flex h-full flex-col rounded-xl border border-border/60 bg-surface-elevated/70 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Token Usage</h3>
          <p className="text-[11px] text-text-secondary/60">7-day consumption by AI agent</p>
        </div>
        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
          {totalTokens.toLocaleString()} total
        </span>
      </div>

      {/* Chart + Legend side-by-side */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* SVG Chart */}
        <div className="min-w-0 flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              {providerLines.map((line) => (
                <linearGradient key={`g-${line.pid}`} id={`area-${line.pid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {yLabels.map((yl, i) => (
              <g key={i}>
                <line
                  x1={PAD_L} y1={yl.y} x2={W - PAD_R} y2={yl.y}
                  stroke="currentColor" className="text-border/40"
                  strokeDasharray={i === 0 ? undefined : '2,4'} strokeWidth={0.5}
                />
                <text x={PAD_L - 4} y={yl.y + 3} textAnchor="end" className="fill-text-secondary/50" fontSize={8}>
                  {yl.label}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {buckets.map((b, bi) => (
              <text
                key={bi} x={PAD_L + bi * xStep} y={H - 5}
                textAnchor="middle" className="fill-text-secondary/50" fontSize={8}
              >
                {b.label}
              </text>
            ))}

            {/* Area fills */}
            {providerLines.map((line) => (
              <path key={`a-${line.pid}`} d={line.areaPath} fill={`url(#area-${line.pid})`} />
            ))}

            {/* Lines + dots */}
            {providerLines.map((line) => (
              <g key={line.pid}>
                <polyline
                  points={line.linePoints} fill="none" stroke={line.color}
                  strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                />
                {line.points.map((p, bi) => {
                  const val = buckets[bi].byProvider[line.pid] || 0
                  if (val === 0) return null
                  return <circle key={bi} cx={p.x} cy={p.y} r={2} fill={line.color} />
                })}
              </g>
            ))}
          </svg>
        </div>

        {/* Agent Legend — right column */}
        <div className="flex w-[140px] shrink-0 flex-col justify-center space-y-2">
          {sortedProviderIds.map((pid) => {
            const pi = providerColorIndex[pid]
            const total = providerTotals[pid] || 0
            const pct = totalTokens > 0 ? (total / totalTokens) * 100 : 0
            const color = PROVIDER_COLORS[pi % PROVIDER_COLORS.length]
            return (
              <div key={pid} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-text-primary">
                    {providerMap[pid]}
                  </p>
                  <p className="text-[10px] leading-tight text-text-secondary/60">
                    {fmtTokens(total)} · {pct.toFixed(0)}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
