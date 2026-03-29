/**
 * HealthPanel — Shows the health status of all monitored resources.
 * Groups by category (AI Agents, Databases, MCP Servers).
 * Extensible: renders whatever the health store provides.
 */
import { RefreshCw, ShieldCheck } from 'lucide-react'
import type { ResourceHealth, ResourceCategory, HealthStatus } from '../../types/health'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

interface HealthPanelProps {
  resources: ResourceHealth[]
  overallStatus: HealthStatus
  isLoading: boolean
  onRefresh: () => void
}

const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]',
  degraded: 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]',
  unhealthy: 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
  unknown: 'bg-gray-400'
}

const STATUS_BADGE_VARIANT: Record<HealthStatus, 'default' | 'secondary' | 'destructive'> = {
  healthy: 'default',
  degraded: 'secondary',
  unhealthy: 'destructive',
  unknown: 'secondary'
}

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: 'All Healthy',
  degraded: 'Degraded',
  unhealthy: 'Issues Detected',
  unknown: 'Unknown'
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  agent: 'AI Agents',
  database: 'Databases',
  mcp: 'MCP Servers',
  plugin: 'Plugins'
}

const CATEGORY_ORDER: ResourceCategory[] = ['agent', 'database', 'mcp', 'plugin']

export function HealthPanel({
  resources,
  overallStatus,
  isLoading,
  onRefresh
}: HealthPanelProps): React.JSX.Element {
  // Group resources by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: resources.filter((r) => r.category === cat)
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col p-1">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">System Health</h3>
          <div className="mt-1">
            <Badge variant={STATUS_BADGE_VARIANT[overallStatus]}>
              <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', STATUS_DOT[overallStatus])} />
              {STATUS_LABEL[overallStatus]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="flex-1 px-5 py-3">
        {/* Resource groups */}
        {grouped.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8">
                <ShieldCheck size={20} className="text-primary/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No resources configured</p>
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                Connect AI agents or databases to monitor
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => (
              <div key={group.category}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/5"
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[res.status])} />
                      <span className="flex-1 truncate text-xs font-medium text-foreground">{res.name}</span>
                      {res.detail && (
                        <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
                          {res.detail}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
