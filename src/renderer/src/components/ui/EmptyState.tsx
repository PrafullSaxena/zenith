import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from './glass-utils'
import { GlassButton } from './GlassButton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
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
  className
}: EmptyStateProps): React.JSX.Element {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent): void => {
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
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        className="mb-6"
      >
        <Icon size={64} className="text-[var(--text-secondary)]/30" />
      </motion.div>

      <h3 className="text-h3 text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-body text-[var(--text-secondary)] mb-6 max-w-sm">{description}</p>

      {actionLabel && onAction && (
        <GlassButton variant="primary" onClick={onAction}>
          {actionLabel}
        </GlassButton>
      )}
    </div>
  )
}
