/**
 * DbHistory — Unified history for all DbInspector features.
 * Shows last 10 results (Q&A, Optimizer, ER Diagram) with "Open" to restore.
 *
 * Migrated to Obsidian Glass design system with Card, Badge,
 * Skeleton, div, and stagger entrance animation.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Eye, MessageSquare, Zap, GitFork, Clock } from 'lucide-react'
import type { DbHistoryEntry } from '../../types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { staggerContainer, staggerItem } from '../../lib/motion'

interface DbHistoryProps {
  history: DbHistoryEntry[]
  isLoading: boolean
  onOpen: (entry: DbHistoryEntry) => void
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof MessageSquare; variant: 'info' | 'warning' | 'success' }
> = {
  qa: { label: 'Q&A', icon: MessageSquare, variant: 'info' },
  optimize: { label: 'Optimizer', icon: Zap, variant: 'warning' },
  'er-diagram': { label: 'ER Diagram', icon: GitFork, variant: 'success' }
}

export default function DbHistory({
  history,
  isLoading,
  onOpen
}: DbHistoryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          icon={Clock}
          title="No query history"
          description="Executed queries will appear here"
        />
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        Recent Results ({history.length})
      </p>
      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {history.map((entry) => {
          const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.qa
          const Icon = config.icon

          return (
            <motion.div key={entry.id} variants={staggerItem}>
              <Card variant="interactive" className="flex items-start gap-3 p-3">
                {/* Type badge */}
                <Badge variant={config.variant}>
                  <Icon size={10} />
                  {config.label}
                </Badge>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[hsl(var(--foreground))]">
                    {entry.type === 'qa' && entry.question}
                    {entry.type === 'optimize' &&
                      (entry.originalQuery
                        ? entry.originalQuery.substring(0, 80) +
                          (entry.originalQuery.length > 80 ? '...' : '')
                        : 'SQL query')}
                    {entry.type === 'er-diagram' &&
                      (entry.selectedTables?.join(', ') ?? 'Tables')}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {entry.connectionName} / {entry.schema} · {formatRelativeTime(entry.timestamp)}
                  </p>
                </div>

                {/* Open button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onOpen(entry) }}
                >
                  <Eye size={13} />
                  Open
                </Button>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
