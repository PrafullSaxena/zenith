/**
 * EstimationHistory — List of saved cloud cost estimations.
 *
 * Shows saved entries ordered by most recent first.
 * Each entry has Load (restores to estimator) and Delete (with confirm) actions.
 */
import React from 'react'
import { Clock, Trash2, RotateCcw, FileText } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { EstimationEntry } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'

const PROVIDER_COLORS: Record<string, string> = {
  aws: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  gcp: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  azure: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
}

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

interface HistoryEntryCardProps {
  entry: EstimationEntry
  onLoad: (entry: EstimationEntry) => void
  onDelete: (id: string) => void
}

function HistoryEntryCard({ entry, onLoad, onDelete }: HistoryEntryCardProps): React.JSX.Element {
  const providerInfo = PROVIDER_INFO[entry.provider]
  const providerColorClass = PROVIDER_COLORS[entry.provider] ?? 'bg-surface text-text-secondary border-border'

  const handleDelete = (): void => {
    if (window.confirm(`Delete estimation "${entry.name}"? This cannot be undone.`)) {
      onDelete(entry.id)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border/80 hover:bg-surface/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-text-primary truncate">
              {entry.name}
            </span>
            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${providerColorClass}`}
            >
              {providerInfo.shortName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>{entry.services.length} service{entry.services.length !== 1 ? 's' : ''}</span>
            <span className="text-text-secondary/30">•</span>
            <span className="font-medium text-text-primary">
              {formatCurrency(entry.totalMonthly)}/mo
            </span>
            <span className="text-text-secondary/30">•</span>
            <div className="flex items-center gap-1">
              <Clock size={10} />
              <span>{formatDate(entry.savedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onLoad(entry)}
            className="flex items-center gap-1 rounded-md border border-border/60 bg-surface-elevated px-2 py-1 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent hover:bg-accent/5"
            title="Load estimation"
          >
            <RotateCcw size={11} />
            Load
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 rounded-md border border-border/60 bg-surface-elevated px-2 py-1 text-xs text-text-secondary transition-colors hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5"
            title="Delete estimation"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstimationHistory(): React.JSX.Element {
  const history = useLaunchpadStore((s) => s.history)
  const loadEstimation = useLaunchpadStore((s) => s.loadEstimation)
  const deleteHistoryEntry = useLaunchpadStore((s) => s.deleteHistoryEntry)
  const setActiveTab = useLaunchpadStore((s) => s.setActiveTab)

  const handleLoad = (entry: EstimationEntry): void => {
    loadEstimation(entry)
    setActiveTab('estimator')
  }

  const handleDelete = (id: string): void => {
    void deleteHistoryEntry(id)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">
            Estimation History
            {history.length > 0 && (
              <span className="ml-2 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-normal text-text-secondary">
                {history.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-3 text-text-secondary/30" />
              <p className="text-sm text-text-secondary">No saved estimations yet</p>
              <p className="mt-1 text-xs text-text-secondary/60">
                Save an estimation from the Estimator tab to see it here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onLoad={handleLoad}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
