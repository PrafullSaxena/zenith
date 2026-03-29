import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef
} from '@tanstack/react-table'
import { Download, Copy, Check, AlertCircle, Table2, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { Loader2 } from 'lucide-react'
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

interface ContextMenu {
  x: number
  y: number
  row: Record<string, unknown>
}

// -- CSV serialization (RFC 4180)
function serializeCsv(rows: Record<string, unknown>[], fields: { name: string }[]): string {
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
  onLongClick
}: {
  value: unknown
  onLongClick: () => void
}) {
  const [flashCopy, setFlashCopy] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = useCallback(async () => {
    const str = value === null || value === undefined ? '' : String(value)
    await copyToClipboard(str)
    setFlashCopy(true)
    setTimeout(() => setFlashCopy(false), 400)
  }, [value])

  if (value === null || value === undefined) {
    return (
      <span
        className="italic text-muted-foreground/50 text-xs cursor-pointer px-1 block w-full h-full my-auto py-1"
        onClick={handleClick}
      >
        NULL
      </span>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`text-xs cursor-pointer font-mono px-1 block w-full py-1 ${value ? 'text-green-400' : 'text-red-400'}`}
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
      <span className="relative group inline-block max-w-full w-full py-1 h-full">
        <span
          className={`text-xs cursor-pointer hover:bg-primary/10 rounded px-1 truncate inline-block w-full max-w-full text-foreground transition-colors ${
            flashCopy ? 'bg-emerald-400/20 text-emerald-100' : ''
          }`}
          onClick={handleClick}
          onDoubleClick={onLongClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {displayStr}
        </span>
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-0 mb-1 w-64 bg-card border border-border/80 rounded shadow-lg p-2 text-xs text-foreground whitespace-pre-wrap wrap-break-word pointer-events-none backdrop-blur-md">
            {tooltipStr}
            {str.length > 200 && <span className="text-muted-foreground ml-1">...</span>}
          </div>
        )}
      </span>
    )
  }

  const isNumber = typeof value === 'number'

  return (
    <span
      className={`text-xs cursor-pointer hover:bg-primary/10 rounded px-1 inline-block max-w-full w-full truncate py-1 text-foreground transition-colors ${
        flashCopy ? 'bg-emerald-400/20 text-emerald-100' : ''
      } ${isNumber ? 'font-mono text-cyan-200/80 text-right pr-2' : ''}`}
      onClick={handleClick}
    >
      {str}
    </span>
  )
}

const ROW_NUM_WIDTH = 50

export default function ResultsGrid({
  rows,
  fields,
  hasMore,
  isLoading,
  error,
  onLoadMore
}: ResultsGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // -- State
  const [sorting, setSorting] = useState<SortingState>([])
  const [cellModal, setCellModal] = useState<{ value: unknown; fieldName: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [copiedTsv, setCopiedTsv] = useState(false)
  const [columnSizing, setColumnSizing] = useState({})
  const isLoadingMoreRef = useRef(false)

  // -- TanStack Table definition
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return [
      {
        id: 'rowIndex',
        header: '#',
        size: ROW_NUM_WIDTH,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => (
          <span className="text-[10px] text-muted-foreground/50 font-mono text-center w-full block">
            {info.row.index + 1}
          </span>
        )
      },
      ...fields.map((field) => ({
        accessorKey: field.name,
        header: field.name,
        size: Math.max(120, field.name.length * 8 + 40),
        minSize: 60,
        cell: (info: any) => (
          <CellValue
            value={info.getValue()}
            onLongClick={() => setCellModal({ value: info.getValue(), fieldName: field.name })}
          />
        )
      }))
    ]
  }, [fields])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange'
  })

  const { rows: tableRows } = table.getRowModel()

  // -- Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 32,
    overscan: 20
  })

  // -- Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (isLoadingMoreRef.current || !hasMore || isLoading) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      isLoadingMoreRef.current = true
      onLoadMore?.()
    }
  }, [hasMore, isLoading, onLoadMore])

  useEffect(() => {
    isLoadingMoreRef.current = false
  }, [rows.length])

  useEffect(() => {
    const dismiss = () => setContextMenu(null)
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [])

  // -- Export Actions
  const handleExportCsv = useCallback(async () => {
    const csv = serializeCsv(tableRows.map(r => r.original), fields)
    await window.api.app.saveTextFile(csv, 'query-results.csv', [
      { name: 'CSV', extensions: ['csv'] }
    ])
  }, [tableRows, fields])

  const handleExportJson = useCallback(async () => {
    const json = JSON.stringify(tableRows.map(r => r.original), null, 2)
    await window.api.app.saveTextFile(json, 'query-results.json', [
      { name: 'JSON', extensions: ['json'] }
    ])
  }, [tableRows])

  const handleCopyAllTsv = useCallback(async () => {
    const tsv = serializeTsv(tableRows.map(r => r.original), fields)
    await copyToClipboard(tsv)
    setCopiedTsv(true)
    setTimeout(() => setCopiedTsv(false), 1500)
  }, [tableRows, fields])

  const handleCopyRowJson = useCallback(async (row: Record<string, unknown>) => {
    await copyToClipboard(JSON.stringify(row, null, 2))
    setContextMenu(null)
  }, [])

  const handleCopyRowTsv = useCallback(async (row: Record<string, unknown>) => {
    const tsv = fields.map((f) => (row[f.name] === null ? '' : String(row[f.name]))).join('\t')
    await copyToClipboard(tsv)
    setContextMenu(null)
  }, [fields])

  // -- Render states
  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-400/10 border-b border-red-400/20">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-500">Query Error</p>
          <p className="text-xs mt-1 text-red-400/90 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-[95%]" />
        <Skeleton className="h-8 w-[90%]" />
      </div>
    )
  }

  if (rows.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[160px]">
        <EmptyState
          icon={Table2}
          title="No results"
          description="Run a query to see results"
        />
      </div>
    )
  }

  const tableWidth = table.getTotalSize()

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shadow-sm bg-card/60 backdrop-blur-md shrink-0 z-20 sticky top-0">
        <span className="text-[11px] font-medium text-muted-foreground mr-auto">
          {hasMore
            ? `Showing ${rows.length}+ rows`
            : `Showing ${rows.length} row${rows.length === 1 ? '' : 's'}`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAllTsv}
          className={`h-7 px-2.5 text-[11px] font-medium transition-colors ${copiedTsv ? 'bg-emerald-400/10 text-emerald-400 hover:text-emerald-400' : 'text-muted-foreground'}`}
        >
          {copiedTsv ? <Check size={12} className="mr-1.5" /> : <Copy size={12} className="mr-1.5" />}
          {copiedTsv ? 'Copied!' : 'Copy TSV'}
        </Button>
        <div className="w-px h-3 bg-border" />
        <Button variant="ghost" size="sm" onClick={handleExportCsv} className="h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted">
          <Download size={12} className="mr-1.5" />
          CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExportJson} className="h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted">
          <Download size={12} className="mr-1.5" />
          JSON
        </Button>
      </div>

      {/* Table Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-transparent custom-scrollbar"
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{ width: tableWidth, minWidth: '100%' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex border-b border-border/50 bg-background/40 backdrop-blur-md shadow-sm">
            {table.getFlatHeaders().map((header) => (
              <div
                key={header.id}
                className={`relative flex items-center px-2 py-1.5 border-r border-border/50 bg-transparent text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none ${header.id === 'rowIndex' ? 'sticky left-0 z-20 bg-background/40 backdrop-blur-md shadow-[1px_0_0_0_hsl(var(--border))] justify-center' : ''}`}
                style={{ width: header.getSize(), flex: `0 0 ${header.getSize()}px` }}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={`flex items-center gap-1.5 w-full truncate ${header.column.getCanSort() ? 'cursor-pointer hover:text-foreground' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="truncate flex-1" title={header.column.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getIsSorted() && (
                      <span className="shrink-0 text-primary bg-primary/10 rounded p-0.5">
                        {header.column.getIsSorted() === 'asc' ? <ArrowUpZA size={11} /> : <ArrowDownAZ size={11} />}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Resize Handle */}
                {header.column.getCanResize() && (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/50 transition-colors z-20 ${
                      header.column.getIsResizing() ? 'bg-primary w-1' : ''
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Virtualized Body */}
          <div
            style={{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = tableRows[virtualRow.index]
              const isEven = virtualRow.index % 2 === 0
              
              return (
                <div
                  key={row.id}
                  className={`absolute top-0 left-0 flex w-full border-b border-border/30 hover:bg-muted/40 transition-colors ${
                    isEven ? 'bg-foreground/[0.01]' : 'bg-transparent'
                  }`}
                  style={{
                    height: virtualRow.size + 'px',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, row: row.original })
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className={`relative flex items-center px-1 py-0 h-full border-r border-border/30 overflow-hidden ${
                         cell.column.id === 'rowIndex' ? 'sticky left-0 z-5 bg-background/40 shadow-[1px_0_0_0_hsl(var(--border))] backdrop-blur-sm' : ''
                      }`}
                      style={{ width: cell.column.getSize(), flex: `0 0 ${cell.column.getSize()}px` }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* End of results hint / Spinner */}
          {isLoading && rows.length > 0 && (
            <div className="flex items-center justify-center py-4 border-t border-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {!hasMore && rows.length > 0 && !isLoading && (
            <div className="text-center py-6 text-muted-foreground/40 text-xs font-medium uppercase tracking-widest border-t border-border/50">
              — End of Results —
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card/40 border border-border/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 min-w-40 backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 hover:text-primary outline-none"
            onClick={() => handleCopyRowJson(contextMenu.row)}
          >
            <BracesIcon size={13} /> Copy Row as JSON
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 hover:text-primary outline-none"
            onClick={() => handleCopyRowTsv(contextMenu.row)}
          >
            <FileSpreadsheetIcon size={13} /> Copy Row as TSV
          </button>
        </div>
      )}

      {/* Cell Modal */}
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

function BracesIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>
  )
}

function FileSpreadsheetIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
  )
}
