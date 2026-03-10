/**
 * EstimationSummary — Real-time itemized cost breakdown with monthly/yearly toggle.
 *
 * Reads selected services and provider from the store.
 * Computes costs via calculateTotalCost and displays an itemized breakdown.
 * Includes Save Estimation, Export PDF, and Clear All actions.
 */
import { useState } from 'react'
import { DollarSign, Download, Trash2, Save } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { getCatalog } from '../../data/cloud-pricing/index'
import { calculateTotalCost } from '../../data/cloud-pricing/calculator'

type DisplayMode = 'monthly' | 'yearly'

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
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-accent" />
          <span className="text-sm font-semibold text-text-primary">Cost Estimation</span>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setDisplayMode('monthly')}
            className={`px-2.5 py-1 transition-colors ${
              displayMode === 'monthly'
                ? 'bg-accent text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('yearly')}
            className={`px-2.5 py-1 transition-colors ${
              displayMode === 'yearly'
                ? 'bg-accent text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto">
        {!result || selectedServices.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-text-secondary/60 italic">No services selected</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex flex-col gap-1">
              {result.items.map((item) => {
                const displayValue =
                  displayMode === 'monthly' ? item.monthly : item.yearly

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
                    className="flex items-start justify-between rounded-md px-2 py-2 hover:bg-surface/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {item.serviceName}
                      </p>
                      {configSummary && (
                        <p className="text-xs text-text-secondary/70 truncate mt-0.5">
                          {configSummary}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-text-primary shrink-0">
                      {formatCurrency(displayValue)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Grand Total
          </span>
          <div className="text-right">
            <p className="text-lg font-bold text-text-primary">
              {formatCurrency(displayMode === 'monthly' ? totalMonthly : totalYearly)}
            </p>
            <p className="text-xs text-text-secondary/70">
              per {displayMode === 'monthly' ? 'month' : 'year'}
            </p>
          </div>
        </div>

        {/* Secondary total */}
        {result && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-text-secondary/60">
              {displayMode === 'monthly' ? 'Yearly estimate' : 'Monthly estimate'}
            </span>
            <span className="text-xs text-text-secondary/60">
              {formatCurrency(displayMode === 'monthly' ? totalYearly : totalMonthly)}
            </span>
          </div>
        )}
      </div>

      {/* Save input (inline) */}
      {showSaveInput && (
        <div className="border-t border-border px-4 py-3 bg-surface">
          <p className="text-xs text-text-secondary mb-2">Name this estimation:</p>
          <div className="flex gap-2">
            <input
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
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !saveName.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowSaveInput((prev) => !prev)}
          disabled={selectedServices.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Save size={13} />
          Save Estimation
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting || selectedServices.length === 0 || !provider}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-accent/40 hover:bg-surface/80 disabled:opacity-40"
          >
            <Download size={13} />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>

          <button
            type="button"
            onClick={clearEstimation}
            className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-red-400/40 hover:text-red-400 disabled:opacity-40"
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
