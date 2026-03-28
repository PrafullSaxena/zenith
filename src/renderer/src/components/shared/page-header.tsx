/**
 * PageHeader -- Shared header component for plugin views.
 * Renders inside the top drag-region area with a rounded card background
 * similar to the dashboard greeting component.
 * Includes icon, title, tab bar, and optional status indicator.
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
    <div className="flex flex-col shrink-0">
      {/* Drag region — occupies top area for macOS title bar dragging */}
      <div className="drag-region h-3 w-full" />

      {/* Rounded card header */}
      <div
        className={cn(
          'mx-3 flex items-center gap-3 px-4 h-11 shrink-0',
          'rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]',
          className
        )}
      >
        <Icon size={18} className="text-primary shrink-0" />
        <h1 className="text-[13px] font-medium text-foreground whitespace-nowrap tracking-tight">{title}</h1>

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
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
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
    </div>
  )
}
