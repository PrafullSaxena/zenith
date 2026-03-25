import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassTabItem {
  id: string
  label: string
  icon?: LucideIcon
}

export interface GlassTabProps {
  tabs: GlassTabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  orientation?: 'horizontal' | 'vertical'
  className?: string
  /** Unique layoutId for the active underline animation. Scope this when multiple GlassTab instances coexist on the same page. */
  layoutId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassTab({ tabs, activeTab, onTabChange, orientation = 'horizontal', className, layoutId: layoutIdProp }: GlassTabProps): React.JSX.Element {
  const isVertical = orientation === 'vertical'

  return (
    <div
      role="tablist"
      className={cn(
        'p-1 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]',
        isVertical ? 'flex flex-col gap-1' : 'flex gap-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-[var(--duration-fast)]',
              isVertical && 'w-full text-left',
              isActive
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
            )}
          >
            {Icon && <Icon size={16} className="mr-1.5" />}
            {tab.label}

            {isActive && (
              <motion.div
                layoutId={layoutIdProp ?? 'activeTab'}
                className={cn(
                  'absolute bg-[var(--color-accent)]',
                  isVertical
                    ? 'left-0 top-0 bottom-0 w-0.5 rounded-r'
                    : 'bottom-0 left-0 right-0 h-0.5 rounded-full'
                )}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
