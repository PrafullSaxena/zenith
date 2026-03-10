/**
 * ComparisonView — Side-by-side multi-provider cost comparison.
 *
 * Takes the current provider's selected services and maps each to equivalent
 * services in the other two providers using SERVICE_EQUIVALENCES.
 * Shows a table with per-service and total costs across AWS, GCP, and Azure.
 *
 * The current provider uses user's actual config. Other providers use
 * default configs from their respective catalogs.
 */
import React from 'react'
import { BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { CloudProvider, ServiceSelection } from '../../types/launchpad'
import { getCatalog, PROVIDER_INFO } from '../../data/cloud-pricing/index'
import { getEquivalentServiceId } from '../../data/cloud-pricing/equivalences'
import { calculateServiceCost } from '../../data/cloud-pricing/calculator'

const ALL_PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'azure']

/**
 * Get default config for a service from a provider catalog.
 * Pulls defaults from each field's `default` property in configSchema.
 */
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
            // For select fields with no explicit default, use the first option
            // (full SelectOption object preserves pricePerHour for calculator)
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

/**
 * Find the display name for a service in a catalog.
 */
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

/**
 * Calculate cost for a service in a given provider.
 * Uses user config for the current provider, defaults for others.
 */
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

const PROVIDER_COL_COLORS: Record<CloudProvider, string> = {
  aws: 'bg-amber-500/5',
  gcp: 'bg-blue-500/5',
  azure: 'bg-cyan-500/5'
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-xs">
          <BarChart3 size={32} className="mx-auto mb-3 text-text-secondary/30" />
          <p className="text-sm text-text-secondary">No services to compare</p>
          <p className="mt-1 text-xs text-text-secondary/60">
            Select a provider and add services in the Estimator tab to compare costs across AWS,
            GCP, and Azure
          </p>
        </div>
      </div>
    )
  }

  // Build comparison data: for each selected service, get costs per provider
  type RowData = {
    serviceId: string
    sourceName: string
    costs: Record<CloudProvider, number | null>
    providerNames: Record<CloudProvider, string>
  }

  const rows: RowData[] = selectedServices.map((sel) => {
    const costs: Record<CloudProvider, number | null> = {
      aws: null,
      gcp: null,
      azure: null
    }
    const providerNames: Record<CloudProvider, string> = {
      aws: '',
      gcp: '',
      azure: ''
    }

    for (const p of ALL_PROVIDERS) {
      const equivalentId = getEquivalentServiceId(sel.serviceId, p)
      if (equivalentId) {
        costs[p] = calcCostForProvider(sel, p, provider)
        providerNames[p] = getServiceName(equivalentId, p)
      }
    }

    return {
      serviceId: sel.serviceId,
      sourceName: getServiceName(sel.serviceId, provider),
      costs,
      providerNames
    }
  })

  // Calculate totals per provider
  const totals: Record<CloudProvider, number | null> = {
    aws: null,
    gcp: null,
    azure: null
  }
  for (const p of ALL_PROVIDERS) {
    let sum = 0
    let hasAny = false
    for (const row of rows) {
      const cost = row.costs[p]
      if (cost !== null) {
        sum += cost
        hasAny = true
      }
    }
    totals[p] = hasAny ? sum : null
  }

  // Find cheapest provider per row (excluding nulls)
  function cheapestProvider(costs: Record<CloudProvider, number | null>): CloudProvider | null {
    let cheapest: CloudProvider | null = null
    let cheapestCost = Infinity
    for (const p of ALL_PROVIDERS) {
      const cost = costs[p]
      if (cost !== null && cost < cheapestCost) {
        cheapest = p
        cheapestCost = cost
      }
    }
    return cheapest
  }

  const cheapestTotal = cheapestProvider(totals)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Multi-Provider Comparison</h2>
        </div>
        <p className="text-xs text-text-secondary">
          Based on your {PROVIDER_INFO[provider].displayName} configuration. Other providers use
          default settings.
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Service</th>
                {ALL_PROVIDERS.map((p) => (
                  <th
                    key={p}
                    className={`px-4 py-3 text-right font-medium ${PROVIDER_HEADER_COLORS[p]} ${
                      p === provider ? PROVIDER_COL_COLORS[p] : ''
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {PROVIDER_INFO[p].shortName}
                      {p === provider && (
                        <span className="rounded-sm bg-accent/20 px-1 py-0.5 text-[9px] font-normal text-accent">
                          current
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const cheapest = cheapestProvider(row.costs)
                return (
                  <tr
                    key={row.serviceId}
                    className={`border-b border-border/50 transition-colors hover:bg-surface-elevated/30 ${
                      idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/30'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {row.sourceName}
                    </td>
                    {ALL_PROVIDERS.map((p) => {
                      const cost = row.costs[p]
                      const isCheapest = cheapest === p && cost !== null
                      const equivalentId = getEquivalentServiceId(row.serviceId, p)
                      const isCurrentProvider = p === provider
                      return (
                        <td
                          key={p}
                          className={`px-4 py-2.5 text-right ${
                            isCurrentProvider ? PROVIDER_COL_COLORS[p] : ''
                          }`}
                        >
                          {cost === null ? (
                            <span className="text-text-secondary/40 flex items-center justify-end gap-1">
                              {!equivalentId && <AlertCircle size={10} />}
                              N/A
                            </span>
                          ) : (
                            <span
                              className={`flex items-center justify-end gap-1 ${
                                isCheapest ? 'text-green-400 font-medium' : 'text-text-primary'
                              }`}
                            >
                              {isCheapest && <CheckCircle2 size={10} />}
                              {formatCurrency(cost)}/mo
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Total row */}
              <tr className="bg-surface-elevated border-t border-border">
                <td className="px-4 py-3 font-semibold text-text-primary">Total</td>
                {ALL_PROVIDERS.map((p) => {
                  const total = totals[p]
                  const isCheapest = cheapestTotal === p && total !== null
                  return (
                    <td
                      key={p}
                      className={`px-4 py-3 text-right ${
                        p === provider ? PROVIDER_COL_COLORS[p] : ''
                      }`}
                    >
                      {total === null ? (
                        <span className="text-text-secondary/40">N/A</span>
                      ) : (
                        <span
                          className={`flex items-center justify-end gap-1 font-semibold ${
                            isCheapest ? 'text-green-400' : 'text-text-primary'
                          }`}
                        >
                          {isCheapest && <CheckCircle2 size={11} />}
                          {formatCurrency(total)}/mo
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-[10px] text-text-secondary/50 text-center">
          Comparison uses default configurations for non-selected providers. Actual costs may vary
          based on specific configurations, regions, and usage patterns.
        </p>
      </div>
    </div>
  )
}
