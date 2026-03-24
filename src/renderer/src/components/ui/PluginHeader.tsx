import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { GlassSurface } from './GlassSurface'
import { GlassTab } from './GlassTab'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginHeaderTab {
  id: string
  label: string
  icon?: LucideIcon
}

export interface PluginHeaderProps {
  icon: LucideIcon
  title: string
  tabs: PluginHeaderTab[]
  activeTab: string
  onTabChange: (id: string) => void
  statusIndicator?: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PluginHeader({
  icon: Icon,
  title,
  tabs,
  activeTab,
  onTabChange,
  statusIndicator,
  className
}: PluginHeaderProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header bar */}
      <GlassSurface className="flex items-center justify-between px-6 py-3 rounded-none border-x-0 border-t-0">
        <div className="flex gap-2 items-center">
          <Icon size={18} className="text-[var(--color-accent)]" />
          <h1 className="bg-gradient-to-r from-[var(--text-primary)] to-[var(--color-accent)] bg-clip-text text-lg font-semibold text-transparent">
            {title}
          </h1>
        </div>
        {statusIndicator && <div>{statusIndicator}</div>}
      </GlassSurface>

      {/* Tab bar */}
      <GlassTab
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        className="rounded-none border-x-0"
      />
    </div>
  )
}
