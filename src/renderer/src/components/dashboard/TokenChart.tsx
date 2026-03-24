/**
 * TokenChart — Compact SVG line chart showing token usage by provider over 7 days.
 * No external charting library — renders directly to SVG.
 *
 * Features:
 * - Smooth monotone cubic-spline curves (no jagged line segments)
 * - Entry animations: line draw-in, area fade-in, dot pop-in
 *
 * Layout: chart on the left, agent legend column on the right.
 */
import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import type { TokenUsageEntry } from '../../stores/token-store'
import { GlassCard } from '../ui'

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

interface Point {
  x: number
  y: number
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ────────────────────────────────────────────────────────────────
// Monotone cubic Hermite spline — produces smooth curves that
// never overshoot data points (same algorithm as d3.curveMonotoneX).
// Returns an SVG <path> "d" string.
// ────────────────────────────────────────────────────────────────

function monotoneCurvePath(pts: Point[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`

  const n = pts.length

  // 1. Compute slopes between consecutive points
  const deltas: number[] = []
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    deltas.push(dx)
    slopes.push(dx === 0 ? 0 : dy / dx)
  }

  // 2. Compute tangent at each point (Fritsch–Carlson method)
  const tangents: number[] = new Array(n)
  tangents[0] = slopes[0]
  tangents[n - 1] = slopes[n - 2]

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      // Sign change → flat tangent (prevent overshoot)
      tangents[i] = 0
    } else {
      // Harmonic mean of neighboring slopes
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2
    }
  }

  // 3. Monotonicity fixup (Fritsch–Carlson conditions)
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-10) {
      tangents[i] = 0
      tangents[i + 1] = 0
    } else {
      const alpha = tangents[i] / slopes[i]
      const beta = tangents[i + 1] / slopes[i]
      // Restrict to a circle of radius 3 for monotonicity
      const mag = alpha * alpha + beta * beta
      if (mag > 9) {
        const s = 3 / Math.sqrt(mag)
        tangents[i] = s * alpha * slopes[i]
        tangents[i + 1] = s * beta * slopes[i]
      }
    }
  }

  // 4. Build SVG path with cubic bezier segments
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const dx = deltas[i] / 3
    const cp1x = pts[i].x + dx
    const cp1y = pts[i].y + tangents[i] * dx
    const cp2x = pts[i + 1].x - dx
    const cp2y = pts[i + 1].y - tangents[i + 1] * dx
    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

/** Build closed area path: baseline → curve along points → back to baseline */
function monotoneAreaPath(pts: Point[], baseline: number): string {
  if (pts.length < 2) return ''
  const curvePart = monotoneCurvePath(pts)
  // curvePart starts with M<first point>, draw curve to last point
  // Close by going straight down to baseline, then back to start
  return (
    `M${pts[0].x},${baseline}` +
    `L${pts[0].x},${pts[0].y}` +
    curvePart.slice(curvePart.indexOf('C')) + // append just the C segments
    `L${pts[pts.length - 1].x},${baseline}Z`
  )
}

/** Approximate path length for stroke-dasharray animation */
function approxPathLength(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  // Curves are slightly longer than straight-line distance
  return Math.ceil(len * 1.15)
}

// ────────────────────────────────────────────────────────────────

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

  // Chart SVG dimensions — viewBox sized close to rendered px so font sizes stay proportional
  const W = 640
  const H = 220
  const PAD_L = 48
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 28
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxVal = Math.max(...buckets.map((b) => b.total), 1)
  const xStep = chartW / Math.max(buckets.length - 1, 1)
  const yScale = (v: number): number => PAD_T + chartH - (v / maxVal) * chartH
  const baseline = PAD_T + chartH

  // Build smooth curve paths per provider
  const providerLines = useMemo(() => {
    return providerIds.map((pid) => {
      const pi = providerColorIndex[pid]
      const points = buckets.map((b, bi) => ({
        x: PAD_L + bi * xStep,
        y: yScale(b.byProvider[pid] || 0)
      }))
      const linePath = monotoneCurvePath(points)
      const areaPath = monotoneAreaPath(points, baseline)
      const pathLength = approxPathLength(points)
      return {
        pid,
        color: PROVIDER_COLORS[pi % PROVIDER_COLORS.length],
        linePath,
        areaPath,
        pathLength,
        points
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, providerIds.length])

  // Y-axis labels (3 steps)
  const ySteps = [0, maxVal / 2, maxVal]
  const yLabels = ySteps.map((v) => ({
    y: yScale(v),
    label: v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(Math.round(v))
  }))

  // Unique ID suffix for this chart instance (avoids gradient ID collisions)
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])

  // ── Empty state ──
  if (entries.length === 0) {
    return (
      <GlassCard className="flex h-full flex-col p-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Token Usage</h3>
          <p className="text-[11px] text-text-secondary/60">7-day consumption by AI agent</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.08]">
              <BarChart3 size={20} className="text-accent/40" />
            </div>
            <p className="text-sm font-medium text-text-secondary/70">No usage data yet</p>
            <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-text-secondary/60">
              Token consumption will appear here after you run AI-powered queries
            </p>
          </div>
        </div>
      </GlassCard>
    )
  }

  // ── Data state ──
  return (
    <GlassCard className="flex h-full flex-col p-5">
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
            {/* Animation keyframes */}
            <defs>
              {providerLines.map((line) => (
                <linearGradient key={`g-${line.pid}`} id={`area-${uid}-${line.pid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>

            {/* Inline CSS for SVG animations */}
            <style>{`
              /* Grid lines fade in */
              .tc-grid-${uid} {
                opacity: 0;
                animation: tcFadeIn-${uid} 0.5s ease-out forwards;
              }
              /* X-axis labels fade in */
              .tc-xlabel-${uid} {
                opacity: 0;
                animation: tcFadeIn-${uid} 0.4s ease-out forwards;
              }
              ${providerLines.map((line, i) => `
              /* Line draw animation — provider ${i} */
              .tc-line-${uid}-${i} {
                stroke-dasharray: ${line.pathLength};
                stroke-dashoffset: ${line.pathLength};
                animation: tcDraw-${uid}-${i} 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 * i}s forwards;
              }
              @keyframes tcDraw-${uid}-${i} {
                to { stroke-dashoffset: 0; }
              }
              /* Area fade-in — provider ${i} */
              .tc-area-${uid}-${i} {
                opacity: 0;
                animation: tcFadeIn-${uid} 0.8s ease-out ${0.3 + 0.15 * i}s forwards;
              }
              /* Dot pop-in — provider ${i} */
              .tc-dot-${uid}-${i} {
                transform-origin: center;
                transform: scale(0);
                opacity: 0;
                animation: tcDotPop-${uid} 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              }
              `).join('')}
              @keyframes tcFadeIn-${uid} {
                to { opacity: 1; }
              }
              @keyframes tcDotPop-${uid} {
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>

            {/* Grid lines */}
            {yLabels.map((yl, i) => (
              <g key={i} className={`tc-grid-${uid}`} style={{ animationDelay: `${i * 0.08}s` }}>
                <line
                  x1={PAD_L} y1={yl.y} x2={W - PAD_R} y2={yl.y}
                  stroke="currentColor" className="text-border/40"
                  strokeDasharray={i === 0 ? undefined : '3,5'} strokeWidth={0.6}
                />
                <text x={PAD_L - 6} y={yl.y + 4} textAnchor="end" className="fill-text-secondary/50" fontSize={10}>
                  {yl.label}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {buckets.map((b, bi) => (
              <text
                key={bi} x={PAD_L + bi * xStep} y={H - 5}
                textAnchor="middle" className={`fill-text-secondary/50 tc-xlabel-${uid}`}
                style={{ animationDelay: `${0.05 * bi}s` }}
                fontSize={10}
              >
                {b.label}
              </text>
            ))}

            {/* Area fills (smooth) */}
            {providerLines.map((line, lineIdx) => (
              <path
                key={`a-${line.pid}`}
                d={line.areaPath}
                fill={`url(#area-${uid}-${line.pid})`}
                className={`tc-area-${uid}-${lineIdx}`}
              />
            ))}

            {/* Smooth curve lines + animated dots */}
            {providerLines.map((line, lineIdx) => (
              <g key={line.pid}>
                {/* Smooth curve line */}
                <path
                  d={line.linePath}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`tc-line-${uid}-${lineIdx}`}
                />
                {/* Data point dots — staggered pop-in */}
                {line.points.map((p, bi) => {
                  const val = buckets[bi].byProvider[line.pid] || 0
                  if (val === 0) return null
                  return (
                    <circle
                      key={bi}
                      cx={p.x}
                      cy={p.y}
                      r={2.5}
                      fill={line.color}
                      className={`tc-dot-${uid}-${lineIdx}`}
                      style={{ animationDelay: `${0.6 + 0.15 * lineIdx + 0.06 * bi}s` }}
                    />
                  )
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
    </GlassCard>
  )
}
