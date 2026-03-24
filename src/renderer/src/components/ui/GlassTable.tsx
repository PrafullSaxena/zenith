import { ChevronUp, ChevronDown } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
}

export interface GlassTableProps {
  columns: GlassTableColumn[]
  data: Array<Record<string, unknown>>
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  className?: string
  emptyMessage?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassTable({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  className,
  emptyMessage = 'No data'
}: GlassTableProps) {
  const handleSort = (col: GlassTableColumn) => {
    if (!col.sortable || !onSort) return
    const nextDir = sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(col.key, nextDir)
  }

  return (
    <GlassCard className={cn('p-0 overflow-hidden', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]'
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => handleSort(col)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDirection === 'asc'
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-[var(--text-secondary)] text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  'hover:bg-white/[0.04] transition-colors border-b border-white/[0.04]',
                  rowIdx % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[var(--text-primary)]">
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </GlassCard>
  )
}
