/**
 * HealthPanel — Shows the health status of all monitored resources.
 * Groups by category (AI Agents, Databases, MCP Servers).
 * Extensible: renders whatever the health store provides.
 */
import { RefreshCw } from 'lucide-react'
import type { ResourceHealth, ResourceCategory, HealthStatus } from '../../types/health'

interface HealthPanelProps {
  resources: ResourceHealth[]
  overallStatus: HealthStatus
  isLoading: boolean
  onRefresh: () => void
}

const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: 'bg-green-400',
  degraded: 'bg-yellow-400',
  unhealthy: 'bg-red-400',
  unknown: 'bg-gray-400'
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
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface-elevated p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">System Health</h3>
          <div className="flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[overallStatus]}`} />
            <span className="text-[10px] text-text-secondary">{STATUS_LABEL[overallStatus]}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded p-1 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Resource groups */}
      {grouped.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-text-secondary/50">
          No resources configured yet
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface/50 transition-colors"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[res.status]}`} />
                    <span className="flex-1 truncate text-xs text-text-primary">{res.name}</span>
                    {res.detail && (
                      <span className="truncate text-[10px] text-text-secondary/60 max-w-[120px]">
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
  )
}
