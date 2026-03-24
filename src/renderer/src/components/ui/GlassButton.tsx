import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlassButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'
export type GlassButtonSize = 'sm' | 'md' | 'lg'

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassButtonVariant
  size?: GlassButtonSize
}

// ---------------------------------------------------------------------------
// Variant + size maps (translucent tier)
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<GlassButtonVariant, string> = {
  default:
    'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/[0.06]',
  primary:
    'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30',
  danger:
    'bg-[var(--color-error)]/20 border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/30',
  ghost: 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-white/[0.04]'
}

const SIZE_CLASSES: Record<GlassButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-2.5 text-base rounded-xl'
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 border font-medium transition-colors duration-[var(--duration-fast)]'

const FOCUS_CLASSES = 'focus-visible:outline-none focus-visible:shadow-[var(--glass-glow)]'

const DISABLED_CLASSES = 'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'default', size = 'md', disabled, className, children, type = 'button', ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className={cn(
          BASE_CLASSES,
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          FOCUS_CLASSES,
          DISABLED_CLASSES,
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

GlassButton.displayName = 'GlassButton'
