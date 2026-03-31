/**
 * CategoryDonut — Recharts PieChart donut showing per-category spending.
 *
 * Aggregates service items by categoryId and renders as a donut.
 * Cross-highlight: cells not matching highlightCategory render at 30% opacity.
 * Center label shows total cost overlaid via absolute-positioned div.
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
  totalMonthly: number
}

function aggregateByCategory(
  items: CategoryDonutProps['items'],
  totalMonthly: number
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
    totalMonthly,
  }))
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload?: CategoryTotal }>
}) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const value = entry.value ?? 0
  const total = entry.payload?.totalMonthly ?? 0
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

// ── Main component ───────────────────────────────────────────────────────────

export default function CategoryDonut({
  items,
  highlightCategory,
  onCategoryHover,
}: CategoryDonutProps) {
  const totalMonthly = items.reduce((sum, i) => (i.monthly > 0 ? sum + i.monthly : sum), 0)
  const categories = aggregateByCategory(items, totalMonthly)

  if (categories.length === 0) return null

  const formatted =
    totalMonthly >= 1000
      ? `$${Math.round(totalMonthly / 1000)}k`
      : `$${Math.round(totalMonthly)}`

  return (
    <div className="relative" style={{ height: 350 }}>
      {/* Center label — absolutely positioned over the donut hole */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <span className="text-base font-bold text-white leading-none">{formatted}</span>
        <span className="text-[9px] text-white/40 mt-1">/ month</span>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={categories}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="85%"
            dataKey="value"
            isAnimationActive={false}
            labelLine={false}
            onMouseLeave={() => onCategoryHover(null)}
          >
            {categories.map((entry, index) => {
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
