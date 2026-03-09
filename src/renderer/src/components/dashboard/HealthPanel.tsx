/**
 * HealthPanel — Shows the health status of all monitored resources.
 * Groups by category (AI Agents, Databases, MCP Servers).
 * Extensible: renders whatever the health store provides.
 */
import { RefreshCw, ShieldCheck } from 'lucide-react'
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

const STATUS_BADGE_STYLE: Record<HealthStatus, string> = {
  healthy: 'bg-green-500/10 text-green-400',
  degraded: 'bg-yellow-500/10 text-yellow-400',
  unhealthy: 'bg-red-500/10 text-red-400',
  unknown: 'bg-surface text-text-secondary'
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
    <div className="flex h-full flex-col rounded-xl border border-border/60 bg-surface-elevated/70 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">System Health</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE_STYLE[overallStatus]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[overallStatus]}`} />
              {STATUS_LABEL[overallStatus]}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Resource groups */}
      {grouped.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.08]">
              <ShieldCheck size={20} className="text-accent/40" />
            </div>
            <p className="text-sm font-medium text-text-secondary/60">No resources configured</p>
            <p className="mt-1 text-[11px] text-text-secondary/40">
              Connect AI agents or databases to monitor
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface/50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[res.status]}`} />
                    <span className="flex-1 truncate text-xs font-medium text-text-primary">{res.name}</span>
                    {res.detail && (
                      <span className="max-w-[120px] truncate text-[10px] text-text-secondary/50">
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
