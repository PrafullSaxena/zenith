import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'

interface PluginShellProps {
  title: string
  description?: string
  icon?: LucideIcon
  tabs?: { value: string; label: string; content: React.ReactNode }[]
  defaultTab?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PluginShell({
  title,
  icon: Icon,
  tabs,
  defaultTab,
  actions,
  children,
  className
}: PluginShellProps): React.JSX.Element {
  const defaultValue = defaultTab ?? tabs?.[0]?.value

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Compact titlebar header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-10 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-primary shrink-0" />}
          <h2 className="text-sm font-semibold text-foreground whitespace-nowrap">{title}</h2>
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {tabs && tabs.length > 0 ? (
        <Tabs defaultValue={defaultValue} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 shrink-0">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="flex-1 overflow-y-auto px-4 pb-4 mt-0"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">{children}</div>
      )}
    </div>
  )
}
