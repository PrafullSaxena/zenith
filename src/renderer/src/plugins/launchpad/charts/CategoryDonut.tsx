/**
 * CategoryDonut — Recharts PieChart donut showing per-category spending.
 *
 * Aggregates service items by categoryId and renders as a donut.
 * Cross-highlight: cells not matching highlightCategory render at 30% opacity.
 * Center label shows total cost.
 */
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getCategoryColor, getCategoryDisplayName, TOOLTIP_CLASSES } from './chart-utils'

// ── Props ────────────────────────────────────────────────────────────────────

interface CategoryDonutProps {
  items: Array<{
    serviceId: string
    serviceName: string
    monthly: number
    categoryId?: string
  }>
  highlightCategory: string | null
  onCategoryHover: (categoryId: string | null) => void
}

// ── Category aggregation ─────────────────────────────────────────────────────

interface CategoryTotal {
  categoryId: string
  name: string
  value: number
  fill: string
}

function aggregateByCategory(
  items: CategoryDonutProps['items']
): CategoryTotal[] {
  const map = new Map<string, number>()
  for (const item of items) {
    if (item.monthly <= 0) continue
    const id = item.categoryId ?? 'compute'
    map.set(id, (map.get(id) ?? 0) + item.monthly)
  }

  return Array.from(map.entries()).map(([categoryId, value], index) => ({
    categoryId,
    name: getCategoryDisplayName(categoryId),
    value,
    fill: getCategoryColor(categoryId, index),
  }))
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string
  value: number
  payload?: CategoryTotal & { totalMonthly?: number }
}

function CustomTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const value = entry.value ?? 0
  const total = (entry.payload as CategoryTotal & { totalMonthly?: number })?.totalMonthly ?? 0
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'

  return (
    <div className={TOOLTIP_CLASSES}>
      <p className="font-semibold text-white mb-1">{entry.name}</p>
      <p className="text-[hsl(var(--chart-1))]">
        ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span className="text-white/50 ml-1">/ mo</span>
      </p>
      <p className="text-white/50 mt-0.5">{pct}% of total</p>
    </div>
  )
}

// ── Center label ─────────────────────────────────────────────────────────────

interface CenterLabelProps {
  cx?: number
  cy?: number
  totalMonthly: number
}

function CenterLabel({ cx = 0, cy = 0, totalMonthly }: CenterLabelProps) {
  const formatted =
    totalMonthly >= 1000
      ? `$${Math.round(totalMonthly / 1000)}k`
      : `$${Math.round(totalMonthly)}`

  return (
    <g>
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 700 }}
      >
        {formatted}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
      >
        / month
      </text>
    </g>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CategoryDonut({
  items,
  highlightCategory,
  onCategoryHover,
}: CategoryDonutProps) {
  const categories = aggregateByCategory(items)
  const totalMonthly = categories.reduce((sum, c) => sum + c.value, 0)

  // Attach totalMonthly to each entry for tooltip percentage calculation
  const enrichedCategories = categories.map((c) => ({ ...c, totalMonthly }))

  if (categories.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={enrichedCategories}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          dataKey="value"
          isAnimationActive={false}
          onMouseLeave={() => onCategoryHover(null)}
        >
          {enrichedCategories.map((entry, index) => {
            const isHighlighted =
              highlightCategory === null || entry.categoryId === highlightCategory
            return (
              <Cell
                key={`cell-${entry.categoryId}-${index}`}
                fill={entry.fill}
                opacity={isHighlighted ? 1 : 0.15}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1}
                onMouseEnter={() => onCategoryHover(entry.categoryId)}
                onMouseLeave={() => onCategoryHover(null)}
                style={{ cursor: 'default', outline: 'none' }}
              />
            )
          })}
        </Pie>
        <Tooltip content={<CustomTooltipContent />} />
        <CenterLabel cx={undefined} cy={undefined} totalMonthly={totalMonthly} />
      </PieChart>
    </ResponsiveContainer>
  )
}
