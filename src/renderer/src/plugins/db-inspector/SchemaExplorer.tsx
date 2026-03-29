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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup } from '@renderer/components/ui/command'

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

  // Build options for Select (empty-string values are filtered by SimpleSelect)
  const dbOptions = databases.map((db) => ({ value: db, label: db }))
  const schemaOptions = schemas.map((s) => ({ value: s, label: s }))

  return (
    <div className="space-y-3 ">
      {/* Database selector */}
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Database size={10} />
          Database
        </label>
        {isLoadingDatabases ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <SimpleSelect
            value={activeDatabase ?? undefined}
            onChange={(val) => val && onDatabaseChange(val)}
            options={dbOptions}
            placeholder="Select database..."
          />
        )}
      </div>

      {/* Schema selector */}
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Schema
        </label>
        <SimpleSelect
          value={activeSchema ?? undefined}
          onChange={(val) => val && onSchemaChange(val)}
          options={schemaOptions}
          placeholder="Select schema..."
          disabled={!activeDatabase}
        />
      </div>

      {/* Table search and lists using Command */}
      {tables.length > 0 && (
        <Command className="bg-transparent border-none">
          <CommandInput
            placeholder={`Search ${tables.length} tables...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-8 text-xs mb-2"
          />
          <CommandList className="max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden pr-1">
            <CommandEmpty>No tables matching &ldquo;{searchQuery}&rdquo;</CommandEmpty>

            {isLoadingTables ? (
              <div className="space-y-2 p-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
            ) : !activeSchema ? (
              <EmptyState icon={Database} title="Connect a database" description="Select a connection to explore schema" />
            ) : tables.length === 0 && activeSchema ? (
              <p className="py-4 text-center text-xs text-muted-foreground/70">No tables in this schema</p>
            ) : (
              <Accordion 
                type="single" 
                collapsible 
                value={selectedTable ?? undefined} 
                onValueChange={(val) => onSelectTable(val || '')}
                className="w-full space-y-0.5"
              >
                {filteredTables.map((table) => {
                  return (
                    <AccordionItem key={table.name} value={table.name} className="border-b-0">
                      <AccordionTrigger 
                        onDoubleClick={() => onInsertAtCursor?.(table.name)}
                        className={`flex w-full items-center gap-2 hover:bg-foreground/[0.02] transition-colors rounded-lg px-2 py-1.5 text-xs hover:no-underline ${
                          selectedTable === table.name
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                          {table.type === 'VIEW' ? (
                            <Eye size={12} className="shrink-0 text-muted-foreground" />
                          ) : (
                            <Table2 size={12} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate flex-1">{table.name}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground font-normal">
                            {table.estimatedRows != null && <span>~{formatCount(table.estimatedRows)}</span>}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="ml-5 border-l border-border pl-3 pb-2 pt-1 mr-2 space-y-2">
                        {isLoadingDetails ? (
                          <Skeleton className="h-4 w-full" />
                        ) : (
                          <>
                            {tableStats && (
                              <div className="text-[10px] text-muted-foreground mb-2">
                                {tableStats.totalSize} • {tableStats.indexSize} indexes
                              </div>
                            )}
                            <div className="space-y-0.5">
                              {columns.map((col) => (
                                <div
                                  key={col.name}
                                  onDoubleClick={() => onInsertAtCursor?.(col.name)}
                                  className="flex items-center gap-1.5 text-[11px] text-foreground hover:bg-foreground/[0.02] transition-colors rounded-md py-0.5 px-1 -mx-1 cursor-pointer"
                                >
                                  {col.isPrimaryKey ? (
                                    <Key size={9} className="shrink-0 text-amber-400" />
                                  ) : foreignKeys.some((fk) => fk.sourceColumn === col.name) ? (
                                    <Link2 size={9} className="shrink-0 text-blue-400" />
                                  ) : (
                                    <span className="w-[9px] shrink-0" />
                                  )}
                                  <span className="font-mono truncate">{col.name}</span>
                                  <span className="text-muted-foreground ml-auto">{col.dataType}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
