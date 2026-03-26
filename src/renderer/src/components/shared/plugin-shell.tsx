import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
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
  description,
  icon: Icon,
  tabs,
  defaultTab,
  actions,
  children,
  className
}: PluginShellProps): React.JSX.Element {
  const defaultValue = defaultTab ?? tabs?.[0]?.value

  return (
    <Card className={cn('flex flex-col h-full overflow-hidden', className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="size-5 text-primary" />}
            <div>
              <h2 className="text-lg font-semibold leading-none">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>

      {tabs && tabs.length > 0 ? (
        <Tabs defaultValue={defaultValue} className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6 pb-3">
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
              className="flex-1 overflow-y-auto px-6 pb-6 mt-0"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <CardContent className="flex-1 overflow-y-auto">{children}</CardContent>
      )}
    </Card>
  )
}
