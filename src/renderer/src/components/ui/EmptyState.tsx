import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '@renderer/components/ui/button'
import { usePrefersReducedMotion } from '@renderer/lib/useReducedMotion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className
}: EmptyStateProps): React.JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (reducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8 // +/-4px
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8
    setOffset({ x, y })
  }

  const handleMouseLeave = (): void => {
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={reducedMotion ? { x: 0, y: 0 } : { x: offset.x, y: offset.y }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        className="mb-6"
      >
        <Icon size={64} className="text-muted-foreground/30" />
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>

      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="ghost" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
