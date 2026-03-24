import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlassBadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'accent' | 'neutral'

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: GlassBadgeVariant
  children: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Variant colour map (translucent tier)
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<GlassBadgeVariant, string> = {
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/20',
  error: 'bg-[var(--color-error)]/15 text-[var(--color-error)] border-[var(--color-error)]/20',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/20',
  info: 'bg-[var(--color-info)]/15 text-[var(--color-info)] border-[var(--color-info)]/20',
  accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/20',
  neutral: 'bg-white/[0.06] text-[var(--text-secondary)] border-white/[0.08]'
}

const BASE_CLASSES = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassBadge({ variant = 'neutral', children, className, ...props }: GlassBadgeProps) {
  return (
    <span className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </span>
  )
}
