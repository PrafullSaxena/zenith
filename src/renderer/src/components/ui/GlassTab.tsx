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
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassTab({ tabs, activeTab, onTabChange, className }: GlassTabProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 p-1 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]',
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
              isActive
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
            )}
          >
            {Icon && <Icon size={16} className="mr-1.5" />}
            {tab.label}

            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
