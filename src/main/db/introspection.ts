/**
 * Schema introspection module for DbInspector.
 *
 * Builds text-based context from database metadata for AI prompt injection.
 * Uses information_schema and pg_catalog for maximum PostgreSQL compatibility.
 */

/**
 * Minimal interface required by introspection functions.
 * Satisfied by both PostgresConnectionManager and UnifiedDbManager.
 */
interface DbManagerLike {
  getColumns(connectionId: string, schema: string, table: string): Promise<{
    name: string
    dataType: string
    isNullable: boolean
    defaultValue: string | null
    ordinalPosition: number
    isPrimaryKey: boolean
    maxLength: number | null
    precision: number | null
  }[]>
  getIndexes(connectionId: string, schema: string, table: string): Promise<{
    name: string
    columns: string[]
    isUnique: boolean
    isPrimary: boolean
    indexType: string
  }[]>
  getForeignKeys(connectionId: string, schema: string): Promise<{
    constraintName: string
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
  }[]>
  getTableStats(connectionId: string, schema: string, table: string): Promise<{
    estimatedRows: number
    totalSize: string
    indexSize: string
    lastVacuum: string | null
    lastAnalyze: string | null
  }>
  getTables(connectionId: string, schema: string): Promise<{
    name: string
    type: string
    estimatedRows: number
    totalSize: string
  }[]>
  explain(connectionId: string, sql: string): Promise<string>
}

/**
 * Build a CREATE TABLE DDL string for a single table.
 */
export async function buildTableDDL(
  manager: DbManagerLike,
  connectionId: string,
  schema: string,
  table: string
): Promise<string> {
  const columns = await manager.getColumns(connectionId, schema, table)
  const indexes = await manager.getIndexes(connectionId, schema, table)
  const fks = await manager.getForeignKeys(connectionId, schema)
  const tableFks = fks.filter((fk) => fk.sourceTable === table)

  let ddl = `CREATE TABLE ${schema}.${table} (\n`

  // Columns
  const colLines = columns.map((col) => {
    let line = `  ${col.name} ${col.dataType}`
    if (col.maxLength) line += `(${col.maxLength})`
    if (col.isPrimaryKey) line += ' PRIMARY KEY'
    if (!col.isNullable && !col.isPrimaryKey) line += ' NOT NULL'
    if (col.defaultValue) line += ` DEFAULT ${col.defaultValue}`
    return line
  })

  // FK constraints
  const fkLines = tableFks.map(
    (fk) =>
      `  CONSTRAINT ${fk.constraintName} FOREIGN KEY (${fk.sourceColumn}) REFERENCES ${schema}.${fk.targetTable}(${fk.targetColumn})`
  )

  ddl += [...colLines, ...fkLines].join(',\n')
  ddl += '\n);\n'

  // Indexes (non-primary)
  for (const idx of indexes) {
    if (idx.isPrimary) continue
    const unique = idx.isUnique ? 'UNIQUE ' : ''
    const colStr = Array.isArray(idx.columns) ? idx.columns.join(', ') : String(idx.columns)
    ddl += `CREATE ${unique}INDEX ${idx.name} ON ${schema}.${table} USING ${idx.indexType} (${colStr});\n`
  }

  return ddl
}

/**
 * Build a compact table summary (table name + column names + types).
 * Used when full DDL would exceed token limits.
 */
export async function buildTableSummary(
  manager: DbManagerLike,
  connectionId: string,
  schema: string,
  table: string
): Promise<string> {
  const columns = await manager.getColumns(connectionId, schema, table)
  const colList = columns.map((c) => `${c.name} ${c.dataType}${c.isPrimaryKey ? ' PK' : ''}`).join(', ')
  return `${schema}.${table}: ${colList}`
}

/**
 * Build full schema context for AI prompt injection.
 *
 * Strategy:
 *  - If ≤ 20 tables: include full DDL for each
 *  - If > 20 tables: include compact summaries (name + columns)
 *  - Targets max ~8000 tokens of context
 *
 * @param tables - Specific tables to include. If undefined, uses all tables in the schema.
 */
export async function buildSchemaContext(
  manager: DbManagerLike,
  connectionId: string,
  schema: string,
  tables?: string[]
): Promise<string> {
  // Get table list
  const allTables = await manager.getTables(connectionId, schema)
  const tableNames = tables ?? allTables.map((t) => t.name)

  const parts: string[] = [
    `-- Database Schema: ${schema}`,
    `-- Tables: ${tableNames.length}`,
    ''
  ]

  if (tableNames.length <= 20) {
    // Full DDL mode
    for (const tableName of tableNames) {
      const ddl = await buildTableDDL(manager, connectionId, schema, tableName)
      const stats = await manager.getTableStats(connectionId, schema, tableName)
      parts.push(`-- ${tableName}: ~${stats.estimatedRows} rows, ${stats.totalSize}`)
      parts.push(ddl)
      parts.push('')
    }
  } else {
    // Compact mode — summaries only
    parts.push('-- (Compact mode: schema has > 20 tables, showing summaries)')
    parts.push('')
    for (const tableName of tableNames) {
      const summary = await buildTableSummary(manager, connectionId, schema, tableName)
      parts.push(summary)
    }
  }

  // Add FK relationships overview
  const fks = await manager.getForeignKeys(connectionId, schema)
  if (fks.length > 0) {
    parts.push('')
    parts.push('-- Foreign Key Relationships:')
    for (const fk of fks) {
      if (tableNames.includes(fk.sourceTable) || tableNames.includes(fk.targetTable)) {
        parts.push(`-- ${fk.sourceTable}.${fk.sourceColumn} -> ${fk.targetTable}.${fk.targetColumn}`)
      }
    }
  }

  return parts.join('\n')
}

/**
 * Extract table names referenced in a SQL query.
 * Simple regex-based extraction — handles FROM, JOIN, and common patterns.
 */
export function extractTableNames(sql: string): string[] {
  const tables = new Set<string>()

  // Match FROM and JOIN clauses
  const patterns = [
    /\bFROM\s+(?:ONLY\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)/gi,
    /\bJOIN\s+(?:ONLY\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)/gi,
    /\bINTO\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi,
    /\bUPDATE\s+(?:ONLY\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(sql)) !== null) {
      const tableName = match[1]
      // Strip schema prefix if present (e.g., "public.users" → "users")
      const parts = tableName.split('.')
      const name = parts[parts.length - 1]
      // Skip SQL keywords that might false-match
      if (!isKeyword(name)) {
        tables.add(name)
      }
    }
  }

  return Array.from(tables)
}

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'outer',
  'cross', 'on', 'and', 'or', 'not', 'in', 'exists', 'between', 'like',
  'order', 'by', 'group', 'having', 'limit', 'offset', 'union', 'all',
  'as', 'case', 'when', 'then', 'else', 'end', 'null', 'true', 'false',
  'is', 'distinct', 'lateral', 'with', 'recursive'
])

function isKeyword(word: string): boolean {
  return SQL_KEYWORDS.has(word.toLowerCase())
}

/**
 * Build context for query optimization.
 * Includes EXPLAIN ANALYZE output + DDL + indexes + stats for referenced tables.
 */
export async function buildQueryOptimizationContext(
  manager: DbManagerLike,
  connectionId: string,
  schema: string,
  sql: string
): Promise<string> {
  const parts: string[] = []

  // 1. EXPLAIN ANALYZE
  try {
    const explainOutput = await manager.explain(connectionId, sql)
    parts.push('== EXPLAIN ANALYZE OUTPUT ==')
    parts.push(explainOutput)
    parts.push('')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    parts.push(`== EXPLAIN FAILED: ${message} ==`)
    parts.push('')
  }

  // 2. Original query
  parts.push('== ORIGINAL QUERY ==')
  parts.push(sql)
  parts.push('')

  // 3. DDL + Indexes + Stats for referenced tables
  const tableNames = extractTableNames(sql)
  if (tableNames.length > 0) {
    parts.push('== REFERENCED TABLES ==')
    parts.push('')

    for (const tableName of tableNames) {
      try {
        const ddl = await buildTableDDL(manager, connectionId, schema, tableName)
        const stats = await manager.getTableStats(connectionId, schema, tableName)
        parts.push(`-- ${tableName}: ~${stats.estimatedRows} rows, ${stats.totalSize}, index: ${stats.indexSize}`)
        if (stats.lastAnalyze) {
          parts.push(`-- Last ANALYZE: ${stats.lastAnalyze}`)
        }
        parts.push(ddl)
      } catch {
        parts.push(`-- Could not introspect table: ${tableName}`)
      }
      parts.push('')
    }
  }

  return parts.join('\n')
}
