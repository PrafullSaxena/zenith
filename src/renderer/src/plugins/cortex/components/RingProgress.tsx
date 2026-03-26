/**
 * RingProgress — Animated circular progress ring for test coverage etc.
 */
import span from './span'

interface Props {
  value: number      // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  className?: string
}

export default function RingProgress({ value, size = 80, strokeWidth = 6, color = '#34d399', label, className = '' }: Props): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            animation: 'ring-progress 1s ease-out forwards',
            ['--ring-circumference' as string]: circumference,
            ['--ring-target' as string]: offset
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span value={Math.round(value)} className="text-sm font-bold text-foreground" />
        <span className="text-[7px] uppercase tracking-wide text-muted-foreground">{label ?? '%'}</span>
      </div>
    </div>
  )
}
