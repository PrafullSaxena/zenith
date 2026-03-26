import { useState, useMemo, useRef, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Maximize2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { ScrollArea } from '@renderer/components/ui/scroll-area'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T = Record<string, unknown>> {
  key: string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  sortable?: boolean
  paginated?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  emptyMessage?: string
  virtualScroll?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = false,
  paginated = false,
  pageSize = 10,
  onRowClick,
  emptyMessage = 'No data',
  virtualScroll = false,
  className
}: DataTableProps<T>): React.JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(0)
  const [expandedCell, setExpandedCell] = useState<{ content: string; title: string } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
    setCurrentPage(0)
  }, [])

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return Array.from(data).sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = paginated ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1
  const displayData = paginated
    ? sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : sortedData

  // Virtual scroll setup
  const virtualizer = useVirtualizer({
    count: virtualScroll ? sortedData.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    enabled: virtualScroll
  })

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-muted-foreground text-sm', className)}>
        {emptyMessage}
      </div>
    )
  }

  const renderCell = (row: T, col: Column<T>) => {
    const value = row[col.key]
    if (col.render) return col.render(value, row)
    const str = String(value ?? '')
    const isLong = str.length > 100

    return (
      <div className="flex items-center gap-1 group/cell">
        <span className="truncate">{str}</span>
        {isLong && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpandedCell({ content: str, title: col.label })
            }}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
          >
            <Maximize2 size={12} className="text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    )
  }

  const renderRow = (row: T, index: number, style?: React.CSSProperties) => (
    <tr
      key={index}
      style={style}
      onClick={() => onRowClick?.(row)}
      className={cn(
        'border-b border-border/50 transition-colors',
        onRowClick && 'hover:bg-secondary/50 cursor-pointer'
      )}
    >
      {columns.map((col) => (
        <td
          key={col.key}
          className="px-4 py-3 text-sm"
          style={col.width ? { width: col.width } : undefined}
        >
          {renderCell(row, col)}
        </td>
      ))}
    </tr>
  )

  return (
    <div className={cn('w-full', className)}>
      {virtualScroll ? (
        <div
          ref={scrollContainerRef}
          className="max-h-[600px] overflow-y-auto"
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-medium text-muted-foreground',
                      (sortable || col.sortable) && 'cursor-pointer select-none hover:text-foreground'
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => (sortable || col.sortable) && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {(sortable || col.sortable) && (
                        sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="opacity-40" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const row = sortedData[virtualRow.index]
                      return (
                        <div
                          key={virtualRow.index}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`
                          }}
                        >
                          <table className="w-full text-sm">
                            <tbody>
                              {renderRow(row, virtualRow.index)}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-muted-foreground',
                    (sortable || col.sortable) && 'cursor-pointer select-none hover:text-foreground'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => (sortable || col.sortable) && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {(sortable || col.sortable) && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, index) => renderRow(row, index))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {paginated && !virtualScroll && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cell expansion dialog */}
      <Dialog open={!!expandedCell} onOpenChange={() => setExpandedCell(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{expandedCell?.title ?? 'Cell Content'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="whitespace-pre-wrap text-sm font-mono p-4">
              {expandedCell?.content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
