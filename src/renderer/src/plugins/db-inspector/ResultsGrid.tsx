import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Download, Copy, Check, AlertCircle, Table2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import CellModal from './CellModal'

// -- Types
interface ResultsGridProps {
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  hasMore: boolean
  isLoading: boolean
  error?: string
  errorLine?: number
  onLoadMore?: () => void
}

type SortDirection = 'asc' | 'desc' | null

// -- CSV serialization (RFC 4180)
function serializeCsv(
  rows: Record<string, unknown>[],
  fields: { name: string }[]
): string {
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const header = fields.map((f) => escape(f.name)).join(',')
  const dataRows = rows.map((row) => fields.map((f) => escape(row[f.name])).join(','))
  return [header, ...dataRows].join('\r\n')
}

function serializeTsv(rows: Record<string, unknown>[], fields: { name: string }[]): string {
  const header = fields.map((f) => f.name).join('\t')
  const dataRows = rows.map((row) =>
    fields.map((f) => (row[f.name] === null || row[f.name] === undefined ? '' : String(row[f.name]))).join('\t')
  )
  return [header, ...dataRows].join('\n')
}

// -- Context menu
interface ContextMenu {
  x: number
  y: number
  row: Record<string, unknown>
}

// -- Clipboard fallback for Electron
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

// -- Cell renderer
function CellValue({
  value,
  onClick,
  onLongClick
}: {
  value: unknown
  onClick: () => void
  onLongClick: () => void
}) {
  const [flashCopy, setFlashCopy] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = useCallback(async () => {
    const str = value === null || value === undefined ? '' : String(value)
    await copyToClipboard(str)
    setFlashCopy(true)
    setTimeout(() => setFlashCopy(false), 400)
    onClick()
  }, [value, onClick])

  if (value === null || value === undefined) {
    return (
      <span
        className="italic text-[hsl(var(--muted-foreground))]/50 text-xs cursor-pointer"
        onClick={handleClick}
      >
        NULL
      </span>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`text-xs cursor-pointer font-mono ${value ? 'text-green-400' : 'text-red-400'}`}
        onClick={handleClick}
      >
        {String(value)}
      </span>
    )
  }

  const str = String(value)
  const isLong = str.length > 50
  const isObject = typeof value === 'object'

  if (isLong || isObject) {
    const displayStr = str.length > 50 ? str.slice(0, 50) + '...' : str
    const tooltipStr = str.slice(0, 200)

    return (
      <span className="relative group inline-block max-w-full">
        <span
          className={`text-xs cursor-pointer hover:bg-[var(--primary)]/10 rounded px-0.5 truncate inline-block max-w-full ${
            flashCopy ? 'bg-green-400/20' : ''
          }`}
          onClick={handleClick}
          onDoubleClick={onLongClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {displayStr}
        </span>
        {showTooltip && (
          <div className="absolute z-10 bottom-full left-0 mb-1 max-w-xs bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-2 text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap break-words pointer-events-none backdrop-blur-md">
            {tooltipStr}
            {str.length > 200 && <span className="text-[hsl(var(--muted-foreground))]">...</span>}
          </div>
        )}
      </span>
    )
  }

  const isNumber = typeof value === 'number'

  return (
    <span
      className={`text-xs cursor-pointer hover:bg-[var(--primary)]/10 rounded px-0.5 inline-block max-w-full truncate ${
        flashCopy ? 'bg-green-400/20' : ''
      } ${isNumber ? 'font-mono' : ''}`}
      onClick={handleClick}
    >
      {str}
    </span>
  )
}

// -- Main component
export default function ResultsGrid({
  rows,
  fields,
  hasMore,
  isLoading,
  error,
  onLoadMore
}: ResultsGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {}
    return widths
  })

  // Cell modal
  const [cellModal, setCellModal] = useState<{ value: unknown; fieldName: string } | null>(null)

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  // Copy TSV feedback
  const [copiedTsv, setCopiedTsv] = useState(false)

  // Load-more guard
  const isLoadingMoreRef = useRef(false)

  // Drag-resize state
  const resizingRef = useRef<{
    col: string
    startX: number
    startWidth: number
  } | null>(null)

  // Default column width
  const getColWidth = useCallback(
    (col: string) => {
      if (columnWidths[col] !== undefined) return columnWidths[col]
      return Math.max(100, col.length * 8 + 32)
    },
    [columnWidths]
  )

  // Total width for table-layout: fixed
  const ROW_NUM_WIDTH = 40
  const totalWidth = useMemo(() => {
    return ROW_NUM_WIDTH + fields.reduce((sum, f) => sum + getColWidth(f.name), 0)
  }, [fields, getColWidth])

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortColumn || sortDirection === null) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortColumn]
      const bv = b[sortColumn]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1

      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv))
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [rows, sortColumn, sortDirection])

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 32,
    overscan: 15
  })

  // Column sort toggle
  const handleSortColumn = useCallback(
    (col: string) => {
      if (sortColumn !== col) {
        setSortColumn(col)
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    },
    [sortColumn, sortDirection]
  )

  // Column resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, col: string) => {
      e.preventDefault()
      e.stopPropagation()
      resizingRef.current = {
        col,
        startX: e.clientX,
        startWidth: getColWidth(col)
      }
    },
    [getColWidth]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return
      const { col, startX, startWidth } = resizingRef.current
      const delta = e.clientX - startX
      const newWidth = Math.max(60, startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [col]: newWidth }))
    }

    const handleMouseUp = () => {
      resizingRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Scroll-to-end detection
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (isLoadingMoreRef.current || !hasMore || isLoading) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      isLoadingMoreRef.current = true
      onLoadMore?.()
    }
  }, [hasMore, isLoading, onLoadMore])

  // Reset loading guard when rows change
  useEffect(() => {
    isLoadingMoreRef.current = false
  }, [rows.length])

  // Dismiss context menu on outside click
  useEffect(() => {
    const dismiss = () => setContextMenu(null)
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [])

  // Export CSV
  const handleExportCsv = useCallback(async () => {
    const csv = serializeCsv(sortedRows, fields)
    await window.api.app.saveTextFile(csv, 'query-results.csv', [
      { name: 'CSV', extensions: ['csv'] }
    ])
  }, [sortedRows, fields])

  // Export JSON
  const handleExportJson = useCallback(async () => {
    const json = JSON.stringify(sortedRows, null, 2)
    await window.api.app.saveTextFile(json, 'query-results.json', [
      { name: 'JSON', extensions: ['json'] }
    ])
  }, [sortedRows])

  // Copy all as TSV
  const handleCopyAllTsv = useCallback(async () => {
    const tsv = serializeTsv(sortedRows, fields)
    await copyToClipboard(tsv)
    setCopiedTsv(true)
    setTimeout(() => setCopiedTsv(false), 1500)
  }, [sortedRows, fields])

  // Copy row as JSON
  const handleCopyRowJson = useCallback(
    async (row: Record<string, unknown>) => {
      await copyToClipboard(JSON.stringify(row, null, 2))
      setContextMenu(null)
    },
    []
  )

  // Copy row as TSV
  const handleCopyRowTsv = useCallback(
    async (row: Record<string, unknown>) => {
      const tsv = fields.map((f) => (row[f.name] === null ? '' : String(row[f.name]))).join('\t')
      await copyToClipboard(tsv)
      setContextMenu(null)
    },
    [fields]
  )

  // -- Render states

  if (error) {
    return (
      <div className="flex items-start gap-2 p-4 text-red-400">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Query Error</p>
          <p className="text-xs mt-1 text-red-400/80">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="p-4">
        <Skeleton variant="table" />
      </div>
    )
  }

  if (rows.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div
          icon={Table2}
          title="No results"
          description="Run a query to see results"
        />
      </div>
    )
  }

  // -- Main render

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <Card className="flex items-center gap-2 px-3 py-1.5 rounded-none border-x-0 border-t-0 flex-shrink-0">
        <span className="text-xs text-[hsl(var(--muted-foreground))] mr-auto">
          {hasMore
            ? `Showing ${rows.length}+ rows`
            : `Showing ${rows.length} row${rows.length === 1 ? '' : 's'}`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAllTsv}
          className={copiedTsv ? 'text-green-400' : ''}
        >
          <span icon={copiedTsv ? Check : Copy} iconKey={copiedTsv ? 'check' : 'copy'} size={12} className={copiedTsv ? 'text-emerald-400' : undefined} />
          {copiedTsv ? 'Copied!' : 'Copy TSV'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExportCsv}>
          <Download className="w-3 h-3" />
          CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExportJson}>
          <Download className="w-3 h-3" />
          JSON
        </Button>
      </Card>

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto min-h-0 text-xs"
        onScroll={handleScroll}
      >
        <table
          className="border-separate border-spacing-0 w-max min-w-full"
          style={{ tableLayout: 'fixed', width: totalWidth }}
        >
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-white/[0.03]">
            <tr>
              {/* Row number column */}
              <th
                style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, maxWidth: ROW_NUM_WIDTH }}
                className="sticky left-0 z-20 border-b border-r border-[hsl(var(--border))] px-2 py-1.5 text-left font-medium text-[hsl(var(--muted-foreground))] bg-white/[0.03] select-none"
              >
                #
              </th>
              {fields.map((field) => {
                const width = getColWidth(field.name)
                const isSorted = sortColumn === field.name
                return (
                  <th
                    key={field.name}
                    style={{ width, minWidth: width, maxWidth: width }}
                    className="relative border-b border-r border-[hsl(var(--border))] px-2 py-1.5 text-left font-medium text-[hsl(var(--muted-foreground))] select-none"
                  >
                    <button
                      className="flex items-center gap-1 hover:text-[hsl(var(--foreground))] transition-colors truncate max-w-full"
                      onClick={() => handleSortColumn(field.name)}
                    >
                      <span className="truncate">{field.name}</span>
                      {isSorted && (
                        <span className="text-[var(--primary)] flex-shrink-0">
                          {sortDirection === 'asc' ? ' \u2191' : ' \u2193'}
                        </span>
                      )}
                    </button>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)]/50 transition-colors"
                      onMouseDown={(e) => handleResizeStart(e, field.name)}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Body with virtualization */}
          <tbody
            style={{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = sortedRows[virtualRow.index]
              const isEven = virtualRow.index % 2 === 0
              return (
                <tr
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: totalWidth,
                    minWidth: '100%',
                    height: virtualRow.size + 'px',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  className={`hover:bg-white/[0.04] transition-colors ${isEven ? 'bg-white/[0.015]' : ''}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, row })
                  }}
                >
                  {/* Row number cell */}
                  <td
                    style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, maxWidth: ROW_NUM_WIDTH }}
                    className="sticky left-0 z-[5] border-b border-r border-white/[0.04] px-2 py-0 h-8 text-right text-[hsl(var(--muted-foreground))]/50 bg-white/[0.02] font-mono text-[10px]"
                  >
                    {virtualRow.index + 1}
                  </td>
                  {fields.map((field) => {
                    const value = row[field.name]
                    const isNumber = typeof value === 'number'
                    const width = getColWidth(field.name)
                    return (
                      <td
                        key={field.name}
                        style={{ width, minWidth: width, maxWidth: width }}
                        className={`border-b border-r border-white/[0.04] px-2 py-0 h-8 overflow-hidden ${
                          isNumber ? 'text-right' : 'text-left'
                        }`}
                      >
                        <CellValue
                          value={value}
                          onClick={() => {/* copy handled inside CellValue */}}
                          onLongClick={() => setCellModal({ value, fieldName: field.name })}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Load-more spinner at bottom */}
        {isLoading && rows.length > 0 && (
          <div className="flex items-center justify-center py-3">
            <Skeleton variant="text" lines={2} />
          </div>
        )}

        {/* End-of-results hint */}
        {!hasMore && rows.length > 0 && (
          <div className="text-center py-2 text-[hsl(var(--muted-foreground))]/40 text-xs">
            -- End of results --
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 min-w-36 backdrop-blur-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.04] text-[hsl(var(--foreground))] transition-colors"
            onClick={() => handleCopyRowJson(contextMenu.row)}
          >
            Copy Row as JSON
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.04] text-[hsl(var(--foreground))] transition-colors"
            onClick={() => handleCopyRowTsv(contextMenu.row)}
          >
            Copy Row as TSV
          </button>
        </div>
      )}

      {/* Cell modal */}
      {cellModal && (
        <CellModal
          value={cellModal.value}
          fieldName={cellModal.fieldName}
          isOpen={true}
          onClose={() => setCellModal(null)}
        />
      )}
    </div>
  )
}
