import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn, GLASS_BASE } from './glass-utils'
import { hoverLift } from '@renderer/lib/motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlassCardVariant = 'default' | 'interactive' | 'selected'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassCardVariant
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const baseClasses = cn(
      GLASS_BASE.blur,
      'rounded-2xl p-4 transition-all duration-[var(--duration-fast)]'
    )

    if (variant === 'interactive') {
      return (
        <motion.div
          ref={ref}
          {...hoverLift}
          className={cn(
            baseClasses,
            'cursor-pointer hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20',
            className
          )}
          {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
        >
          {children}
        </motion.div>
      )
    }

    if (variant === 'selected') {
      return (
        <div
          ref={ref}
          className={cn(
            baseClasses,
            'border-l-[3px] border-l-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.04]',
            className
          )}
          {...props}
        >
          {children}
        </div>
      )
    }

    // default variant
    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'
