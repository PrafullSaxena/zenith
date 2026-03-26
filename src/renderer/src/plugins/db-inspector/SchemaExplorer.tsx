/**
 * SchemaExplorer — Tree-view browser for databases, schemas, tables, columns, indexes, and FK relationships.
 */
import React, { useState, useMemo } from 'react'
import {
  Table2,
  Eye,
  ChevronDown,
  ChevronRight,
  Key,
  Link2,
  Database,
  Search
} from 'lucide-react'
import type { TableInfo, ColumnInfo, ForeignKey, IndexInfo, TableStats } from '../../types/database'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { SimpleSelect } from '@renderer/components/ui/select'
import { EmptyState } from '@renderer/components/ui/EmptyState'

interface SchemaExplorerProps {
  databases: string[]
  activeDatabase: string | null
  onDatabaseChange: (db: string) => void
  isLoadingDatabases: boolean
  schemas: string[]
  activeSchema: string | null
  onSchemaChange: (schema: string) => void
  tables: TableInfo[]
  isLoadingTables: boolean
  selectedTable: string | null
  onSelectTable: (table: string) => void
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKey[]
  tableStats: TableStats | null
  isLoadingDetails: boolean
  /** Optional callback for double-click-to-insert table/column name into the active editor. */
  onInsertAtCursor?: (text: string) => void
}

/** Fuzzy match: every character in query appears in order in target. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export default function SchemaExplorer({
  databases,
  activeDatabase,
  onDatabaseChange,
  isLoadingDatabases,
  schemas,
  activeSchema,
  onSchemaChange,
  tables,
  isLoadingTables,
  selectedTable,
  onSelectTable,
  columns,
  indexes,
  foreignKeys,
  tableStats,
  isLoadingDetails,
  onInsertAtCursor
}: SchemaExplorerProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables
    return tables.filter((t) => fuzzyMatch(searchQuery.trim(), t.name))
  }, [tables, searchQuery])

  // Build options for Select
  const dbOptions = [
    { value: '', label: 'Select database...' },
    ...databases.map((db) => ({ value: db, label: db }))
  ]
  const schemaOptions = [
    { value: '', label: 'Select schema...' },
    ...schemas.map((s) => ({ value: s, label: s }))
  ]

  return (
    <div className="space-y-3">
      {/* Database selector */}
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          <Database size={11} />
          Database
        </label>
        {isLoadingDatabases ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <SimpleSelect
            value={activeDatabase ?? ''}
            onChange={(val) => val && onDatabaseChange(val)}
            options={dbOptions}
          />
        )}
      </div>

      {/* Schema selector */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Schema
        </label>
        <SimpleSelect
          value={activeSchema ?? ''}
          onChange={(val) => val && onSchemaChange(val)}
          options={schemaOptions}
          disabled={!activeDatabase}
        />
      </div>

      {/* Table search */}
      {tables.length > 0 && (
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${tables.length} tables...`}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-white/[0.03] pl-7 pr-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
      )}

      {/* Tables list */}
      {isLoadingTables ? (
        <Skeleton className="h-4 w-full" />
      ) : !activeSchema ? (
        <EmptyState
          icon={Database}
          title="Connect a database"
          description="Select a connection to explore schema"
        />
      ) : tables.length === 0 && activeSchema ? (
        <p className="py-4 text-center text-xs text-[hsl(var(--muted-foreground))]/70">No tables in this schema</p>
      ) : filteredTables.length === 0 && searchQuery ? (
        <p className="py-4 text-center text-xs text-[hsl(var(--muted-foreground))]/70">
          No tables matching &ldquo;{searchQuery}&rdquo;
        </p>
      ) : (
        <div className="space-y-0.5">
          {filteredTables.map((table) => {
            const isSelected = selectedTable === table.name
            return (
              <div key={table.name}>
                <button
                  type="button"
                  onClick={() => onSelectTable(table.name)}
                  onDoubleClick={() => onInsertAtCursor?.(table.name)}
                  className={`flex w-full items-center gap-2 hover:bg-white/[0.04] transition-colors rounded-lg px-2 py-1.5 text-xs ${
                    isSelected
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[hsl(var(--foreground))]'
                  } ${onInsertAtCursor ? 'cursor-pointer' : ''}`}
                  title={onInsertAtCursor ? `Click to expand · Double-click to insert "${table.name}"` : undefined}
                >
                  {isSelected ? (
                    <ChevronDown size={12} className="shrink-0" />
                  ) : (
                    <ChevronRight size={12} className="shrink-0" />
                  )}
                  {table.type === 'VIEW' ? (
                    <Eye size={12} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <Table2 size={12} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
                  )}
                  <span className="truncate">{table.name}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {table.totalSize && (
                      <span>{table.totalSize}</span>
                    )}
                    {table.estimatedRows != null && (
                      <span>~{formatCount(table.estimatedRows)}</span>
                    )}
                  </span>
                </button>

                {/* Expanded details */}
                {isSelected && (
                  <div className="ml-6 mt-1 space-y-2 border-l border-white/[0.06] pl-3 transition-all duration-200">
                    {isLoadingDetails ? (
                      <Skeleton className="h-4 w-full" />
                    ) : (
                      <>
                        {/* Stats */}
                        {tableStats && (
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {tableStats.totalSize} · {tableStats.indexSize} indexes
                          </div>
                        )}

                        {/* Columns */}
                        <div className="space-y-0.5">
                          {columns.map((col) => (
                            <div
                              key={col.name}
                              onDoubleClick={() => onInsertAtCursor?.(col.name)}
                              className={`flex items-center gap-1.5 text-[11px] text-[hsl(var(--foreground))] hover:bg-white/[0.04] transition-colors rounded-lg px-1 py-0.5 -mx-1 ${
                                onInsertAtCursor
                                  ? 'cursor-pointer'
                                  : ''
                              }`}
                              title={onInsertAtCursor ? `Double-click to insert "${col.name}"` : undefined}
                            >
                              {col.isPrimaryKey && (
                                <Key size={9} className="shrink-0 text-amber-400" />
                              )}
                              {!col.isPrimaryKey &&
                                foreignKeys.some((fk) => fk.sourceColumn === col.name) && (
                                  <Link2 size={9} className="shrink-0 text-blue-400" />
                                )}
                              {!col.isPrimaryKey &&
                                !foreignKeys.some((fk) => fk.sourceColumn === col.name) && (
                                  <span className="w-[9px] shrink-0" />
                                )}
                              <span className="font-mono">{col.name}</span>
                              <span className="text-[hsl(var(--muted-foreground))]">{col.dataType}</span>
                              {!col.isNullable && (
                                <span className="text-[9px] text-orange-400">NOT NULL</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Indexes */}
                        {indexes.length > 0 && (
                          <div className="mt-1">
                            <p className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                              Indexes
                            </p>
                            {indexes.map((idx) => (
                              <div
                                key={idx.name}
                                className="text-[10px] text-[hsl(var(--muted-foreground))]"
                              >
                                {idx.name}: ({Array.isArray(idx.columns) ? idx.columns.join(', ') : String(idx.columns)}){' '}
                                {idx.isUnique ? 'UNIQUE' : ''} {idx.indexType}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
