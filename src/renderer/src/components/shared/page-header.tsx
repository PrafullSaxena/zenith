/**
 * PageHeader -- Shared header component for plugin views.
 * Renders a compact titlebar-style bar with icon, title, tab bar, and optional status indicator.
 * Sticky at top with a subtle blur backdrop so content scrolls beneath it.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: LucideIcon
}

export interface PageHeaderProps {
  icon: LucideIcon
  title: string
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  statusIndicator?: React.ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  tabs,
  activeTab,
  onTabChange,
  statusIndicator,
  className
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-3 px-4 h-10 border-b border-border bg-background/80 backdrop-blur-sm shrink-0',
        className
      )}
    >
      <Icon size={18} className="text-primary shrink-0" />
      <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">{title}</h1>

      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 ml-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {TabIcon && <TabIcon size={13} />}
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {statusIndicator && (
        <div className="ml-auto shrink-0">{statusIndicator}</div>
      )}
    </div>
  )
}
