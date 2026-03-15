/**
 * DonutChart — Animated SVG donut/ring chart for language breakdown.
 */
import { useMemo } from 'react'

interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  strokeWidth?: number
  className?: string
}

export default function DonutChart({ segments, size = 120, strokeWidth = 14, className = '' }: Props): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const arcs = useMemo(() => {
    let offset = 0
    return segments
      .filter((s) => total > 0 && (s.value / total) * 100 >= 0.5)
      .map((s) => {
        const pct = s.value / total
        const dashLength = pct * circumference
        const arc = { ...s, pct, dashLength, offset }
        offset += dashLength
        return arc
      })
  }, [segments, total, circumference])

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              animation: 'donut-fill 0.8s ease-out forwards',
              ['--circumference' as string]: circumference,
              ['--target-offset' as string]: -arc.offset
            }}
          >
            <title>{`${arc.label}: ${(arc.pct * 100).toFixed(1)}%`}</title>
          </circle>
        ))}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-text-primary">{segments.length}</span>
        <span className="text-[8px] uppercase tracking-wide text-text-secondary">langs</span>
      </div>
    </div>
  )
}
