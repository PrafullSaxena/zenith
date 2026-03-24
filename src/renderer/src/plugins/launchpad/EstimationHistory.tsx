/**
 * EstimationHistory — List of saved cloud cost estimations.
 *
 * Shows saved entries as stagger-animated GlassCards ordered by most recent first.
 * Each entry has Load (restores to estimator) and Delete (with confirm) actions.
 * Uses GlassBadge for provider labels and EmptyState for zero-data view.
 */
import React from 'react'
import { Clock, Trash2, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard, GlassBadge, GlassButton, EmptyState } from '@renderer/components/ui'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { EstimationEntry } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'

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

const PROVIDER_BADGE_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'error'> = {
  aws: 'warning',
  gcp: 'accent',
  azure: 'default'
}

interface HistoryEntryCardProps {
  entry: EstimationEntry
  onLoad: (entry: EstimationEntry) => void
  onDelete: (id: string) => void
}

function HistoryEntryCard({ entry, onLoad, onDelete }: HistoryEntryCardProps): React.JSX.Element {
  const providerInfo = PROVIDER_INFO[entry.provider]
  const badgeVariant = PROVIDER_BADGE_VARIANT[entry.provider] ?? 'default'

  const handleDelete = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (window.confirm(`Delete estimation "${entry.name}"? This cannot be undone.`)) {
      onDelete(entry.id)
    }
  }

  const handleLoad = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onLoad(entry)
  }

  return (
    <motion.div variants={staggerItem}>
      <GlassCard variant="interactive" className="cursor-pointer" onClick={() => onLoad(entry)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {entry.name}
              </span>
              <GlassBadge variant={badgeVariant} className="shrink-0">
                {providerInfo.shortName}
              </GlassBadge>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>
                {entry.services.length} service{entry.services.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[var(--text-secondary)]/30">&bull;</span>
              <span className="font-medium text-[var(--text-primary)]">
                {formatCurrency(entry.totalMonthly)}/mo
              </span>
              <span className="text-[var(--text-secondary)]/30">&bull;</span>
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>{formatDate(entry.savedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <GlassButton
              variant="default"
              size="sm"
              onClick={handleLoad}
              aria-label="Load estimation"
            >
              <RotateCcw size={11} />
              Load
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete estimation"
            >
              <Trash2 size={11} />
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </motion.div>
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
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--color-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Estimation History
            {history.length > 0 && (
              <GlassBadge variant="default" className="ml-2">
                {history.length}
              </GlassBadge>
            )}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No estimation history"
            description="Your cost estimates will appear here. Save an estimation from the Estimator tab to get started."
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {history.map((entry) => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onLoad={handleLoad}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
