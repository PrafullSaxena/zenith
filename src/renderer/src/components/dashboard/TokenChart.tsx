/**
 * TokenChart — Pure SVG line chart showing token usage by provider over 7 days.
 * No external charting library — renders directly to SVG.
 */
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
  const providerMap: Record<string, string> = {} // providerId → name
  for (const e of entries) {
    providerMap[e.providerId] = e.providerName
    const entryDate = e.timestamp.split('T')[0]
    const bucket = buckets.find((b) => b.date === entryDate)
    if (bucket) {
      bucket.byProvider[e.providerId] = (bucket.byProvider[e.providerId] || 0) + e.tokensUsed
      bucket.total += e.tokensUsed
    }
  }

  const providerIds = Object.keys(providerMap)

  // Calculate total per provider for legend percentages
  const totalTokens = entries.reduce((sum, e) => sum + e.tokensUsed, 0)
  const providerTotals: Record<string, number> = {}
  for (const e of entries) {
    providerTotals[e.providerId] = (providerTotals[e.providerId] || 0) + e.tokensUsed
  }

  // Chart dimensions
  const W = 400
  const H = 160
  const PAD_L = 45
  const PAD_R = 10
  const PAD_T = 10
  const PAD_B = 25
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxVal = Math.max(...buckets.map((b) => b.total), 1)

  const xStep = chartW / Math.max(buckets.length - 1, 1)
  const yScale = (v: number): number => PAD_T + chartH - (v / maxVal) * chartH

  // Build polyline points per provider (stacked)
  const providerLines = providerIds.map((pid, pi) => {
    const points = buckets.map((b, bi) => {
      const x = PAD_L + bi * xStep
      const y = yScale(b.byProvider[pid] || 0)
      return `${x},${y}`
    })
    return { pid, color: PROVIDER_COLORS[pi % PROVIDER_COLORS.length], points: points.join(' ') }
  })

  // Y-axis labels
  const yLabels = [0, maxVal / 2, maxVal].map((v) => ({
    value: v,
    y: yScale(v),
    label: v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v))
  }))

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-surface-elevated p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Token Usage (7 days)</h3>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5 text-accent/50"
              >
                <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 16l4-8 4 4 5-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary/50">No token usage data yet</p>
            <p className="mt-1 text-[11px] text-text-secondary/30">
              Token consumption will appear here after AI queries
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface-elevated p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Token Usage (7 days)</h3>
        <span className="text-[10px] text-text-secondary">
          {totalTokens.toLocaleString()} total tokens
        </span>
      </div>

      {/* SVG Chart */}
      <div className="flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={yl.y}
                x2={W - PAD_R}
                y2={yl.y}
                stroke="currentColor"
                className="text-border"
                strokeDasharray={i === 0 ? undefined : '2,3'}
                strokeWidth={0.5}
              />
              <text
                x={PAD_L - 5}
                y={yl.y + 3}
                textAnchor="end"
                className="fill-text-secondary"
                fontSize={8}
              >
                {yl.label}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {buckets.map((b, bi) => (
            <text
              key={bi}
              x={PAD_L + bi * xStep}
              y={H - 5}
              textAnchor="middle"
              className="fill-text-secondary"
              fontSize={8}
            >
              {b.label}
            </text>
          ))}

          {/* Lines */}
          {providerLines.map((line) => (
            <g key={line.pid}>
              <polyline
                points={line.points}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {buckets.map((b, bi) => {
                const val = b.byProvider[line.pid] || 0
                if (val === 0) return null
                return (
                  <circle
                    key={bi}
                    cx={PAD_L + bi * xStep}
                    cy={yScale(val)}
                    r={2.5}
                    fill={line.color}
                  />
                )
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {providerIds.map((pid, pi) => {
          const pct = totalTokens > 0 ? ((providerTotals[pid] || 0) / totalTokens) * 100 : 0
          return (
            <div key={pid} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PROVIDER_COLORS[pi % PROVIDER_COLORS.length] }}
              />
              <span className="text-[10px] text-text-secondary">
                {providerMap[pid]} ({pct.toFixed(0)}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
