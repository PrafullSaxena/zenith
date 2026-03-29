/**
 * ComparisonView — Side-by-side multi-provider cost comparison.
 *
 * Uses Card per provider column, Badge for "Best Value" indicator,
 * and GlassTable for the comparison data.
 * Shows green/red cost highlights for cheapest/most expensive values.
 */
import React from 'react'
import { GitCompare, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@renderer/components/ui/badge'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { CloudProvider, ServiceSelection } from '../../types/launchpad'
import { getCatalog, PROVIDER_INFO } from '../../data/cloud-pricing/index'
import { getEquivalentServiceId } from '../../data/cloud-pricing/equivalences'
import { calculateServiceCost } from '../../data/cloud-pricing/calculator'

const ALL_PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'azure']

function getDefaultConfig(serviceId: string, provider: CloudProvider): Record<string, unknown> {
  try {
    const catalog = getCatalog(provider)
    for (const category of catalog.categories) {
      const service = category.services.find((s) => s.id === serviceId)
      if (service) {
        const config: Record<string, unknown> = {}
        for (const [key, field] of Object.entries(service.configSchema)) {
          if (field.default !== undefined) {
            config[key] = field.default
          } else if (field.type === 'select' && field.options && field.options.length > 0) {
            config[key] = field.options[0]
          }
        }
        return config
      }
    }
  } catch {
    // fall through
  }
  return {}
}

function getServiceName(serviceId: string, provider: CloudProvider): string {
  try {
    const catalog = getCatalog(provider)
    for (const category of catalog.categories) {
      const service = category.services.find((s) => s.id === serviceId)
      if (service) return service.name
    }
  } catch {
    // fall through
  }
  return serviceId
}

function calcCostForProvider(
  selection: ServiceSelection,
  targetProvider: CloudProvider,
  currentProvider: CloudProvider
): number | null {
  try {
    const targetServiceId = getEquivalentServiceId(selection.serviceId, targetProvider)
    if (!targetServiceId) return null

    const catalog = getCatalog(targetProvider)
    const config =
      targetProvider === currentProvider
        ? selection.config
        : getDefaultConfig(targetServiceId, targetProvider)

    const result = calculateServiceCost(targetServiceId, config, catalog)
    return result.monthly
  } catch {
    return null
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const PROVIDER_HEADER_COLORS: Record<CloudProvider, string> = {
  aws: 'text-amber-400',
  gcp: 'text-blue-400',
  azure: 'text-cyan-400'
}

export default function ComparisonView(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)

  // Empty state
  if (!provider || selectedServices.length === 0) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Nothing to compare"
        description="Estimate costs for multiple providers to compare. Select a provider and add services in the Estimator tab."
      />
    )
  }

  // Build comparison data
  type RowData = {
    serviceId: string
    sourceName: string
    costs: Record<CloudProvider, number | null>
    providerNames: Record<CloudProvider, string>
  }

  const rows: RowData[] = selectedServices.map((sel) => {
    const costs: Record<CloudProvider, number | null> = { aws: null, gcp: null, azure: null }
    const providerNames: Record<CloudProvider, string> = { aws: '', gcp: '', azure: '' }

    for (const p of ALL_PROVIDERS) {
      const equivalentId = getEquivalentServiceId(sel.serviceId, p)
      if (equivalentId) {
        costs[p] = calcCostForProvider(sel, p, provider)
        providerNames[p] = getServiceName(equivalentId, p)
      }
    }

    return { serviceId: sel.serviceId, sourceName: getServiceName(sel.serviceId, provider), costs, providerNames }
  })

  // Calculate totals per provider
  const totals: Record<CloudProvider, number | null> = { aws: null, gcp: null, azure: null }
  for (const p of ALL_PROVIDERS) {
    let sum = 0
    let hasAny = false
    for (const row of rows) {
      const cost = row.costs[p]
      if (cost !== null) { sum += cost; hasAny = true }
    }
    totals[p] = hasAny ? sum : null
  }

  function cheapestProvider(costs: Record<CloudProvider, number | null>): CloudProvider | null {
    let cheapest: CloudProvider | null = null
    let cheapestCost = Infinity
    for (const p of ALL_PROVIDERS) {
      const cost = costs[p]
      if (cost !== null && cost < cheapestCost) { cheapest = p; cheapestCost = cost }
    }
    return cheapest
  }

  const cheapestTotal = cheapestProvider(totals)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <GitCompare size={14} className="text-(--primary)" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Multi-Provider Comparison
          </h2>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Based on your {PROVIDER_INFO[provider].displayName} configuration. Other providers use
          default settings.
        </p>
      </div>

      {/* Side-by-side cards layout */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4">
          {ALL_PROVIDERS.map((p) => {
            const total = totals[p]
            const isCheapest = cheapestTotal === p && total !== null
            const isCurrentProvider = p === provider

            return (
              <motion.div
                key={p}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: p === 'aws' ? 0 : p === 'gcp' ? 0.1 : 0.2 }}
                className={`flex-1 min-w-0 rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 ${
                  isCheapest 
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                    : 'border-white/5 bg-black/20'
                }`}
              >
                {/* Provider header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/6">
                  <span className={`text-sm font-semibold ${PROVIDER_HEADER_COLORS[p]}`}>
                    {PROVIDER_INFO[p].shortName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isCurrentProvider && (
                      <Badge variant="default" className="text-[9px]">
                        current
                      </Badge>
                    )}
                    {isCheapest && (
                      <Badge variant="default" className="text-[9px]">
                        Best Value
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Per-service cost rows */}
                <div className="space-y-1.5">
                  {rows.map((row) => {
                    const cost = row.costs[p]
                    const cheapest = cheapestProvider(row.costs)
                    const isCheapestRow = cheapest === p && cost !== null

                    // Find most expensive for red highlight
                    let mostExpensive: CloudProvider | null = null
                    let highestCost = -Infinity
                    for (const cp of ALL_PROVIDERS) {
                      const c = row.costs[cp]
                      if (c !== null && c > highestCost) { mostExpensive = cp; highestCost = c }
                    }
                    const isMostExpensive = mostExpensive === p && cost !== null && !isCheapestRow

                    return (
                      <div
                        key={row.serviceId}
                        className="flex items-center justify-between py-1.5 text-xs"
                      >
                        <span className="text-[hsl(var(--muted-foreground))] truncate pr-2">
                          {row.providerNames[p] || row.sourceName}
                        </span>
                        {cost === null ? (
                          <span className="text-[hsl(var(--muted-foreground))]/40 flex items-center gap-1 shrink-0">
                            <AlertCircle size={10} />
                            N/A
                          </span>
                        ) : (
                          <span
                            className={`flex items-center gap-1 font-medium shrink-0 ${
                              isCheapestRow
                                ? 'text-emerald-400'
                                : isMostExpensive
                                  ? 'text-red-400'
                                  : 'text-[hsl(var(--foreground))]'
                            }`}
                          >
                            {isCheapestRow && <CheckCircle2 size={10} />}
                            {formatCurrency(cost)}/mo
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Total */}
                <div className="mt-3 pt-2 border-t border-white/6 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Total</span>
                  {total === null ? (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]/40">N/A</span>
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        isCheapest ? 'text-emerald-400' : 'text-[hsl(var(--foreground))]'
                      }`}
                    >
                      {formatCurrency(total)}/mo
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]/50 text-center">
          Comparison uses default configurations for non-selected providers. Actual costs may vary
          based on specific configurations, regions, and usage patterns.
        </p>
      </div>
    </div>
  )
}
