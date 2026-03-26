/**
 * PageHeader -- Shared header component for plugin views.
 * Renders an icon, title, tab bar, and optional status indicator.
 * Replaces the legacy GlassPageHeader / GlassCard header pattern.
 */
import type { LucideIcon } from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
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
    <Card className={cn('flex items-center gap-4 px-5 py-3 shrink-0', className)}>
      <Icon size={22} className="text-primary shrink-0" />
      <h1 className="text-base font-semibold text-foreground whitespace-nowrap">{title}</h1>

      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 ml-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {TabIcon && <TabIcon size={14} />}
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {statusIndicator && (
        <div className="ml-auto shrink-0">{statusIndicator}</div>
      )}
    </Card>
  )
}
