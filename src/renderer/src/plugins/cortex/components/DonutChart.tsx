/**
 * DonutChart — SVG donut chart for language/category breakdowns.
 */

interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
}

export default function DonutChart({ segments, size = 120, strokeWidth = 14 }: DonutChartProps): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const cy = size / 2

  const total = segments.reduce((sum, s) => sum + s.value, 0)

  let offset = 0
  const slices = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0
    const dash = pct * circumference
    const gap = circumference - dash
    const slice = { ...seg, dash, gap, offset }
    offset += dash
    return slice
  })

  // Rotate so first segment starts at top (−90°)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      {slices.map((slice) => (
        <circle
          key={slice.label}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={slice.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${slice.dash} ${slice.gap}`}
          strokeDashoffset={circumference / 4 - slice.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}
