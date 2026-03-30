/**
 * EstimationHistory — List of saved cloud cost estimations.
 *
 * Shows saved entries as stagger-animated Cards ordered by most recent first.
 * Each entry has Load (restores to estimator) and Delete (with confirm) actions.
 * Uses Badge for provider labels and div for zero-data view.
 */
import React from 'react'
import { Clock, Trash2, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { EstimationEntry } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'
import HistoryTrendLine from './charts/HistoryTrendLine'

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

const PROVIDER_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
  aws: 'warning',
  gcp: 'info',
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
    <motion.div variants={staggerItem} layout>
      <motion.div
        whileHover={{ y: -2 }}
        className="cursor-pointer group rounded-xl border border-white/5 bg-black/20 backdrop-blur-md hover:bg-white/5 transition-all w-full overflow-hidden"
        onClick={() => onLoad(entry)}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold tracking-wide text-foreground truncate group-hover:text-primary transition-colors">
                {entry.name}
              </span>
              <Badge variant={badgeVariant} className="shrink-0 text-[10px] px-2 py-0.5">
                {providerInfo.shortName}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/80 font-medium">
              <span>
                {entry.services.length} service{entry.services.length !== 1 ? 's' : ''}
              </span>
              <span className="opacity-30">&bull;</span>
              <span className="text-foreground/90">
                {formatCurrency(entry.totalMonthly)}/mo
              </span>
              <span className="opacity-30">&bull;</span>
              <div className="flex items-center gap-1.5 opacity-70">
                <Clock size={11} className="shrink-0" />
                <span>{formatDate(entry.savedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
            <Button
              variant="default"
              size="sm"
              onClick={handleLoad}
              aria-label="Load estimation"
              className="bg-primary/20 hover:bg-primary/30 text-primary border-0 shadow-none h-8"
            >
              <RotateCcw size={12} className="mr-1.5" />
              Load
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete estimation"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </motion.div>
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
      <div className="shrink-0 border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-(--primary)" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Estimation History
            {history.length > 0 && (
              <Badge variant="default" className="ml-2">
                {history.length}
              </Badge>
            )}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No estimation history"
            description="Your cost estimates will appear here. Save an estimation from the Estimator tab to get started."
          />
        ) : (
          <>
            {/* Trend line chart — sits above card list */}
            <div className="mb-4 rounded-xl border border-white/5 bg-black/20 backdrop-blur-md p-4">
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3">Cost Trend</p>
              <HistoryTrendLine entries={history} />
            </div>

            {/* History cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <AnimatePresence>
                {history.map((entry) => (
                  <HistoryEntryCard
                    key={entry.id}
                    entry={entry}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
