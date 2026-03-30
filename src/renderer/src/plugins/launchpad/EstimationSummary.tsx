/**
 * EstimationSummary — Real-time itemized cost breakdown with monthly/yearly toggle.
 *
 * Sticky Card sidebar with span for total cost.
 * Uses Badge for service type labels and Button for actions.
 * Includes Save Estimation, Export PDF, and Clear All actions.
 * Region Select dropdown in header for instant cost recalculation.
 */
import React, { useState } from 'react'
import { DollarSign, Download, Trash2, Save } from 'lucide-react'
import CostTreemap from './charts/CostTreemap'
import CategoryDonut from './charts/CategoryDonut'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

import { useLaunchpadStore } from '../../stores/launchpad-store'
import { calculateTotalCost } from '../../data/cloud-pricing/calculator'

type DisplayMode = 'monthly' | 'yearly'

// ── Region options per provider ──────────────────────────────────────

const REGION_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  aws: [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'sa-east-1', label: 'South America (São Paulo)' },
    { value: 'ca-central-1', label: 'Canada (Central)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  ],
  gcp: [
    { value: 'us-central1', label: 'US Central (Iowa)' },
    { value: 'us-east1', label: 'US East (South Carolina)' },
    { value: 'us-west1', label: 'US West (Oregon)' },
    { value: 'europe-west1', label: 'Europe West (Belgium)' },
    { value: 'europe-west4', label: 'Europe West (Netherlands)' },
    { value: 'asia-east1', label: 'Asia East (Taiwan)' },
    { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' },
    { value: 'asia-northeast1', label: 'Asia Northeast (Tokyo)' },
    { value: 'southamerica-east1', label: 'South America East (São Paulo)' },
    { value: 'australia-southeast1', label: 'Australia Southeast (Sydney)' },
    { value: 'northamerica-northeast1', label: 'North America Northeast (Montreal)' },
    { value: 'asia-south1', label: 'Asia South (Mumbai)' },
  ],
  azure: [
    { value: 'eastus', label: 'East US (Virginia)' },
    { value: 'eastus2', label: 'East US 2 (Virginia)' },
    { value: 'westus', label: 'West US (California)' },
    { value: 'westus2', label: 'West US 2 (Washington)' },
    { value: 'westeurope', label: 'West Europe (Netherlands)' },
    { value: 'northeurope', label: 'North Europe (Ireland)' },
    { value: 'southeastasia', label: 'Southeast Asia (Singapore)' },
    { value: 'eastasia', label: 'East Asia (Hong Kong)' },
    { value: 'japaneast', label: 'Japan East (Tokyo)' },
    { value: 'brazilsouth', label: 'Brazil South (São Paulo)' },
    { value: 'canadacentral', label: 'Canada Central (Toronto)' },
    { value: 'australiaeast', label: 'Australia East (Sydney)' },
  ],
}


export default function EstimationSummary(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const saveEstimation = useLaunchpadStore((s) => s.saveEstimation)
  const exportPdf = useLaunchpadStore((s) => s.exportPdf)
  const clearEstimation = useLaunchpadStore((s) => s.clearEstimation)
  const pricingCache = useLaunchpadStore((s) => s.pricingCache)
  const setRegion = useLaunchpadStore((s) => s.setRegion)

  const [displayMode, setDisplayMode] = useState<DisplayMode>('monthly')
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null)

  // Compute full result for line items (pure function, using pricingCache)
  const fullResult = (provider && selectedServices.length > 0 && pricingCache.rates)
    ? calculateTotalCost(selectedServices, pricingCache.rates, pricingCache.region)
    : null

  const totalMonthly = fullResult?.totalMonthly ?? 0
  const totalYearly = fullResult?.totalYearly ?? 0

  // Enrich items with categoryId from selectedServices for chart color-coding
  const enrichedItems = fullResult
    ? fullResult.items.map((item) => ({
        ...item,
        categoryId: selectedServices.find((s) => s.serviceId === item.serviceId)?.categoryId,
      }))
    : []

  // Region options for the current provider
  const regions = provider ? (REGION_OPTIONS[provider] ?? []) : []
  const currentRegion = pricingCache.region

  const handleSave = async () => {
    if (!saveName.trim()) return
    setIsSaving(true)
    try {
      await saveEstimation(saveName.trim())
      setSaveName('')
      setShowSaveInput(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPdf()
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-(--primary)" />
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Cost Estimation</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Region Select dropdown */}
          {provider && regions.length > 0 && (
            <Select value={currentRegion} onValueChange={(val) => setRegion(val)}>
              <SelectTrigger className="h-7 w-44 text-xs border-white/10 bg-white/3 text-[hsl(var(--muted-foreground))]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Monthly / Yearly toggle — glass segmented control */}
          <div className="flex rounded-xl border border-white/6 overflow-hidden text-xs bg-white/2">
            <button
              type="button"
              onClick={() => setDisplayMode('monthly')}
              className={`px-2.5 py-1 transition-colors ${
                displayMode === 'monthly'
                  ? 'bg-(--primary)/20 text-(--primary)'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('yearly')}
              className={`px-2.5 py-1 transition-colors ${
                displayMode === 'yearly'
                  ? 'bg-(--primary)/20 text-(--primary)'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto">
        {!provider || selectedServices.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No services selected"
            description="Add services from the catalog to see cost estimates"
            className="py-8"
          />
        ) : (
          <div className="p-4">
            <div className="flex flex-col gap-1">
              {/* Show items from fullResult when rates available, else show services with pricing unavailable */}
              {fullResult ? (
                fullResult.items.map((item) => {
                  const displayValue = displayMode === 'monthly' ? item.monthly : item.yearly
                  const hasRates = pricingCache.rates && pricingCache.rates[item.serviceId] !== undefined

                  // Find config summary for this service
                  const sel = selectedServices.find((s) => s.serviceId === item.serviceId)
                  const configSummary = sel
                    ? Object.entries(sel.config)
                        .filter(([, v]) => v !== undefined && v !== null && v !== '')
                        .map(([, v]) => {
                          if (typeof v === 'object' && v !== null && 'value' in v) {
                            return (v as { value: string }).value
                          }
                          return String(v)
                        })
                        .slice(0, 3)
                        .join(', ')
                    : ''

                  return (
                    <div
                      key={item.serviceId}
                      className="flex items-start justify-between rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group cursor-default border border-transparent hover:border-white/5"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.serviceName}
                        </p>
                        {configSummary && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="default" className="text-[10px]">
                              {configSummary}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[hsl(var(--foreground))] shrink-0">
                        {hasRates ? formatCurrency(displayValue) : (
                          <span className="text-[hsl(var(--muted-foreground))] text-[10px]">Pricing unavailable</span>
                        )}
                      </span>
                    </div>
                  )
                })
              ) : (
                // Rates not yet loaded — show services with "Pricing unavailable"
                selectedServices.map((sel) => (
                  <div
                    key={sel.serviceId}
                    className="flex items-start justify-between rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group cursor-default border border-transparent hover:border-white/5"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {sel.serviceId}
                      </p>
                    </div>
                    <span className="text-[hsl(var(--muted-foreground))] text-[10px] shrink-0">
                      Pricing unavailable
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Charts — treemap ~60% width, donut ~40% per user decision */}
      {fullResult && selectedServices.length > 0 && (
        <div className="border-t border-white/6 px-4 pt-3 pb-2">
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">Cost Distribution</p>
          <div className="flex gap-4">
            <div className="w-[60%]">
              <CostTreemap
                items={enrichedItems}
                highlightCategory={highlightCategory}
                onCategoryHover={setHighlightCategory}
              />
            </div>
            <div className="w-[40%]">
              <CategoryDonut
                items={enrichedItems}
                highlightCategory={highlightCategory}
                onCategoryHover={setHighlightCategory}
              />
            </div>
          </div>
        </div>
      )}

      {/* Totals — sticky glass pill */}
      <div className="sticky bottom-0 mx-4 mb-4 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Grand Total
          </span>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight text-white flex items-center gap-0.5 justify-end">
              <span className="text-primary mr-0.5">$</span>
              <span>{Math.round(displayMode === 'monthly' ? totalMonthly : totalYearly)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/80 lowercase mt-0.5">
              per {displayMode === 'monthly' ? 'month' : 'year'}
            </p>
          </div>
        </div>

        {/* Secondary total */}
        {fullResult && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--muted-foreground))]/60">
              {displayMode === 'monthly' ? 'Yearly estimate' : 'Monthly estimate'}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]/60">
              {formatCurrency(displayMode === 'monthly' ? totalYearly : totalMonthly)}
            </span>
          </div>
        )}
      </div>

      {/* Save input (inline) */}
      {showSaveInput && (
        <div className="border-t border-white/6 px-4 py-3 bg-white/2">
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">Name this estimation:</p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave()
                if (e.key === 'Escape') {
                  setShowSaveInput(false)
                  setSaveName('')
                }
              }}
              placeholder="e.g. Production Setup"
              autoFocus
              className="flex-1"
            />
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !saveName.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="border-t border-white/6 px-4 py-3 flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSaveInput((prev) => !prev)}
          disabled={selectedServices.length === 0}
          className="w-full"
        >
          <Save size={13} />
          Save Estimation
        </Button>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => void handleExport()}
            disabled={isExporting || selectedServices.length === 0 || !provider}
            className="flex-1"
          >
            <Download size={13} />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={clearEstimation}
          >
            <Trash2 size={13} />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
