import { useState, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import { ScrollArea } from '@renderer/components/ui/scroll-area'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string
  title: string
  subtitle?: string
  timestamp: string | Date
  type?: string
  badge?: { label: string; variant?: string }
  preview?: string
}

export interface HistoryFilter {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface HistoryListProps {
  entries: HistoryEntry[]
  onRestore: (entry: HistoryEntry) => void
  onDelete?: (entry: HistoryEntry) => void
  renderEntry?: (entry: HistoryEntry) => React.ReactNode
  emptyMessage?: string
  filters?: HistoryFilter[]
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistoryList({
  entries,
  onRestore,
  onDelete,
  renderEntry,
  emptyMessage = 'No history entries',
  filters,
  className
}: HistoryListProps): React.JSX.Element {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const filteredEntries = useMemo(() => {
    if (!filters || Object.keys(filterValues).length === 0) return entries
    return entries.filter((entry) => {
      return Object.entries(filterValues).every(([key, value]) => {
        if (!value || value === '__all__') return true
        return String((entry as Record<string, unknown>)[key]) === value
      })
    })
  }, [entries, filterValues, filters])

  return (
    <div className={cn('flex flex-col gap-3 border-4 border-amber-300', className)}>
      {/* Filters */}
      {filters && filters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filterValues[filter.key] ?? '__all__'}
              onValueChange={(value) =>
                setFilterValues((prev) => ({ ...prev, [filter.key]: value }))
              }
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All {filter.label}</SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {/* Entry list */}
      {filteredEntries.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm border-4 border-amber-300">
          {emptyMessage}
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-200px)]">
          <div className="flex flex-col gap-2">
            {filteredEntries.map((entry) => {
              if (renderEntry) {
                return <div key={entry.id}>{renderEntry(entry)}</div>
              }

              return (
                <Card key={entry.id} className="rounded-xl ">
                  <CardContent className="p-4">
                    {/* Top row: title + badge + timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{entry.title}</span>
                        {entry.type && <Badge variant="secondary">{entry.type}</Badge>}
                        {entry.badge && (
                          <Badge variant={(entry.badge.variant as 'default' | 'secondary' | 'destructive') ?? 'default'}>
                            {entry.badge.label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>

                    {/* Middle: subtitle or preview */}
                    {(entry.subtitle || entry.preview) && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                        {entry.subtitle || entry.preview}
                      </p>
                    )}

                    {/* Bottom: actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => onRestore(entry)}>
                        Restore
                      </Button>
                      {onDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete history entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &quot;{entry.title}&quot;. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(entry)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
