/**
 * EstimationSummary — Real-time itemized cost breakdown with monthly/yearly toggle.
 *
 * Sticky Card sidebar with span for total cost.
 * Uses Badge for service type labels and Button for actions.
 * Includes Save Estimation, Export PDF, and Clear All actions.
 */
import React, { useState } from 'react'
import { DollarSign, Download, Trash2, Save } from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { EmptyState } from '@renderer/components/ui/EmptyState'

import { useLaunchpadStore } from '../../stores/launchpad-store'
import { getCatalog } from '../../data/cloud-pricing/index'
import { calculateTotalCost } from '../../data/cloud-pricing/calculator'

type DisplayMode = 'monthly' | 'yearly'

// ---- 2D fallback for cost treemap ──────────────────────────────────────────

const FALLBACK_CATEGORY_COLORS: Record<string, string> = {
  compute: '#3b82f6',
  storage: '#10b981',
  network: '#8b5cf6',
  database: '#f59e0b'
}
const FALLBACK_DEFAULT_COLOR = '#94a3b8'

function CostTreemapFallback({
  items
}: {
  items: Array<{ serviceId: string; serviceName: string; monthly: number; categoryId?: string }>
}): React.JSX.Element {
  const maxCost = Math.max(...items.map((i) => i.monthly), 0.01)

  return (
    <div className="flex h-full flex-col justify-center gap-1 py-2">
      {items.slice(0, 10).map((item) => {
        const pct = Math.max((item.monthly / maxCost) * 100, 4)
        const color =
          FALLBACK_CATEGORY_COLORS[item.categoryId?.toLowerCase() ?? ''] ?? FALLBACK_DEFAULT_COLOR

        return (
          <div key={item.serviceId} className="flex items-center gap-2">
            <span className="w-20 truncate text-[9px] text-[hsl(var(--muted-foreground))]">
              {item.serviceName}
            </span>
            <div className="flex-1 h-3 rounded-sm bg-white/[0.03] overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
              />
            </div>
            <span className="text-[9px] text-[hsl(var(--muted-foreground))] w-14 text-right">
              ${item.monthly.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function EstimationSummary(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const saveEstimation = useLaunchpadStore((s) => s.saveEstimation)
  const exportPdf = useLaunchpadStore((s) => s.exportPdf)
  const clearEstimation = useLaunchpadStore((s) => s.clearEstimation)

  const [displayMode, setDisplayMode] = useState<DisplayMode>('monthly')
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Compute total costs reactively
  const result =
    provider && selectedServices.length > 0
      ? calculateTotalCost(selectedServices, getCatalog(provider))
      : null

  const totalMonthly = result?.totalMonthly ?? 0
  const totalYearly = result?.totalYearly ?? 0

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
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-[var(--primary)]" />
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Cost Estimation</span>
        </div>

        {/* Monthly / Yearly toggle — glass segmented control */}
        <div className="flex rounded-xl border border-white/[0.06] overflow-hidden text-xs bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setDisplayMode('monthly')}
            className={`px-2.5 py-1 transition-colors ${
              displayMode === 'monthly'
                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
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
                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto">
        {!result || selectedServices.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No services selected"
            description="Add services from the catalog to see cost estimates"
            className="py-8"
          />
        ) : (
          <div className="p-4">
            <div className="flex flex-col gap-1">
              {result.items.map((item) => {
                const displayValue = displayMode === 'monthly' ? item.monthly : item.yearly

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
                    className="flex items-start justify-between rounded-md px-2 py-2 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
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
                      {formatCurrency(displayValue)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cost Distribution (2D fallback) */}
      {result && selectedServices.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 pt-2 pb-1">
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-1">Cost Distribution</p>
          <div className="h-[200px]">
            <CostTreemapFallback items={result.items} />
          </div>
        </div>
      )}

      {/* Totals — sticky Card */}
      <Card className="sticky bottom-0 rounded-none border-x-0 border-b-0 mx-0 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Grand Total
          </span>
          <div className="text-right">
            <p className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-0.5">
              $
              <span>{Math.round(displayMode === 'monthly' ? totalMonthly : totalYearly)}</span>
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]/70">
              per {displayMode === 'monthly' ? 'month' : 'year'}
            </p>
          </div>
        </div>

        {/* Secondary total */}
        {result && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--muted-foreground))]/60">
              {displayMode === 'monthly' ? 'Yearly estimate' : 'Monthly estimate'}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]/60">
              {formatCurrency(displayMode === 'monthly' ? totalYearly : totalMonthly)}
            </span>
          </div>
        )}
      </Card>

      {/* Save input (inline) */}
      {showSaveInput && (
        <div className="border-t border-white/[0.06] px-4 py-3 bg-white/[0.02]">
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
      <div className="border-t border-white/[0.06] px-4 py-3 flex flex-col gap-2">
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
