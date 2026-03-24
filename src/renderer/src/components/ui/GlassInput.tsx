import { forwardRef } from 'react'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorMessage?: string
  label?: string
}

// ---------------------------------------------------------------------------
// Style constants (translucent tier)
// ---------------------------------------------------------------------------

const BASE_CLASSES =
  'bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 w-full transition-colors duration-[var(--duration-fast)]'

const FOCUS_CLASSES = 'focus:outline-none focus:shadow-[var(--glass-glow)]'

const ERROR_CLASSES = 'border-[var(--color-error)]/60 focus:shadow-[0_0_0_2px_var(--color-error)/40]'

const DISABLED_CLASSES = 'disabled:opacity-40 disabled:cursor-not-allowed'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ error = false, errorMessage, label, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const input = (
      <input
        ref={ref}
        id={inputId}
        className={cn(
          BASE_CLASSES,
          error ? ERROR_CLASSES : FOCUS_CLASSES,
          DISABLED_CLASSES,
          className
        )}
        aria-invalid={error || undefined}
        {...props}
      />
    )

    // Plain input — no label or error message
    if (!label && !(error && errorMessage)) {
      return input
    }

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="text-sm text-[var(--text-secondary)] mb-1.5 block">
            {label}
          </label>
        )}
        {input}
        {error && errorMessage && (
          <p className="text-xs text-[var(--color-error)] mt-1">{errorMessage}</p>
        )}
      </div>
    )
  }
)

GlassInput.displayName = 'GlassInput'
