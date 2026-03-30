/**
 * CostTreemap — Recharts-based treemap showing per-service cost distribution.
 *
 * Cells are color-coded by category using CSS custom properties.
 * Supports cross-highlight: cells not matching highlightCategory render dimmed.
 * No animation on initial render to avoid layout jank.
 */
import React from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryColor, getDimmedColor, TOOLTIP_CLASSES } from './chart-utils'

// ── Props ────────────────────────────────────────────────────────────────────

interface CostTreemapProps {
  items: Array<{
    serviceId: string
    serviceName: string
    monthly: number
    categoryId?: string
  }>
  highlightCategory: string | null
  onCategoryHover: (categoryId: string | null) => void
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string
  value: number
  payload?: {
    name: string
    value: number
    categoryId?: string
    serviceId?: string
    totalMonthly?: number
  }
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

// ── Custom cell content renderer ─────────────────────────────────────────────

interface TreemapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  categoryId?: string
  depth?: number
  highlightCategory: string | null
  onCategoryHover: (categoryId: string | null) => void
  index?: number
}

function TreemapCellContent({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  value = 0,
  categoryId = '',
  depth = 0,
  highlightCategory,
  onCategoryHover,
  index = 0,
}: TreemapContentProps) {
  // Only render leaf nodes (depth > 0 in recharts treemap)
  if (depth < 1) return null

  const isHighlighted = highlightCategory === null || categoryId === highlightCategory
  const fill = isHighlighted
    ? getCategoryColor(categoryId, index)
    : getDimmedColor(categoryId, index)

  const showText = width > 50 && height > 30
  const showCost = width > 70 && height > 45

  return (
    <g
      onMouseEnter={() => onCategoryHover(categoryId)}
      onMouseLeave={() => onCategoryHover(null)}
      style={{ cursor: 'default' }}
    >
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        style={{ fill, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1 }}
        rx={3}
        ry={3}
      />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showCost ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'rgba(255,255,255,0.9)',
            fontSize: Math.min(12, width / 8),
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {name.length > 14 ? name.slice(0, 12) + '…' : name}
        </text>
      )}
      {showCost && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'rgba(255,255,255,0.6)',
            fontSize: Math.min(10, width / 10),
            pointerEvents: 'none',
          }}
        >
          ${value.toFixed(0)}
        </text>
      )}
    </g>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CostTreemap({
  items,
  highlightCategory,
  onCategoryHover,
}: CostTreemapProps) {
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly, 0)

  const data = items
    .filter((item) => item.monthly > 0)
    .map((item, index) => ({
      name: item.serviceName,
      value: item.monthly,
      categoryId: item.categoryId ?? 'compute',
      serviceId: item.serviceId,
      fill: getCategoryColor(item.categoryId ?? 'compute', index),
      totalMonthly,
    }))

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={350}>
      <Treemap
        data={data}
        dataKey="value"
        aspectRatio={4 / 3}
        isAnimationActive={false}
        content={({ x, y, width, height, name, value, depth, index, root, ...rest }) => {
          // Extract categoryId from the payload data
          const dataItem = data[index ?? 0]
          const categoryId = (rest as Record<string, unknown>)['categoryId'] as string ?? dataItem?.categoryId ?? 'compute'
          return (
            <TreemapCellContent
              x={x as number}
              y={y as number}
              width={width as number}
              height={height as number}
              name={name as string}
              value={value as number}
              categoryId={categoryId}
              depth={depth as number}
              highlightCategory={highlightCategory}
              onCategoryHover={onCategoryHover}
              index={index as number}
            />
          )
        }}
      >
        <Tooltip content={<CustomTooltipContent />} />
      </Treemap>
    </ResponsiveContainer>
  )
}
