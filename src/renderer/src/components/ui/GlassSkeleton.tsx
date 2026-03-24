import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlassSkeletonVariant = 'text' | 'card' | 'circle' | 'table'

export interface GlassSkeletonProps {
  variant?: GlassSkeletonVariant
  lines?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Shimmer base class
// ---------------------------------------------------------------------------

const SHIMMER_BASE =
  'bg-white/[0.06] rounded animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassSkeleton({ variant = 'text', lines = 3, className }: GlassSkeletonProps): React.JSX.Element {
  if (variant === 'card') {
    return <div className={cn(SHIMMER_BASE, 'h-32 rounded-2xl', className)} />
  }

  if (variant === 'circle') {
    return <div className={cn(SHIMMER_BASE, 'w-12 h-12 rounded-full', className)} />
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-0', className)}>
        {/* Header row */}
        <div className="flex gap-4 mb-2">
          {[1, 2, 3].map((i) => (
            <div key={`header-${i}`} className={cn(SHIMMER_BASE, 'h-4 flex-1')} />
          ))}
        </div>
        {/* Data rows */}
        {[1, 2, 3].map((row) => (
          <div key={`row-${row}`} className="flex gap-4 mb-2">
            {[1, 2, 3, 4].map((cell) => (
              <div key={`cell-${row}-${cell}`} className={cn(SHIMMER_BASE, 'h-3 flex-1')} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // text variant (default)
  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn(SHIMMER_BASE, 'h-3 mb-2', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
