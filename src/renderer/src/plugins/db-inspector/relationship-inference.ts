/**
 * Relationship inference utilities for ERD generation.
 *
 * Provides:
 *  - Convention-based relationship detection (column naming patterns)
 *  - AI output parser for structured relationship responses
 *  - Deduplication against real FK constraints
 *
 * Pure utility module — no React, no store dependencies.
 */

import type {
  ColumnInfo,
  ForeignKey,
  InferredRelationship,
  Cardinality
} from '../../types/database'

// ── Singularize / Pluralize ────────────────────────────────────────

const IRREGULAR: Record<string, string> = {
  people: 'person',
  children: 'child',
  men: 'man',
  women: 'woman',
  mice: 'mouse',
  geese: 'goose',
  teeth: 'tooth',
  feet: 'foot',
  data: 'datum',
  indices: 'index',
  matrices: 'matrix',
  vertices: 'vertex'
}

const IRREGULAR_PLURAL: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR).map(([k, v]) => [v, k])
)

/**
 * Minimal English singularizer for table-name matching.
 * Handles common patterns — not an NLP library.
 */
export function singularize(word: string): string {
  const lower = word.toLowerCase()
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  if (lower.endsWith('ies') && lower.length > 3) return lower.slice(0, -3) + 'y'
  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes'))
    return lower.slice(0, -2)
  if (lower.endsWith('shes') || lower.endsWith('ches'))
    return lower.slice(0, -2)
  if (lower.endsWith('ves') && lower.length > 3)
    return lower.slice(0, -3) + 'f'
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y'
  if (lower.endsWith('ss')) return lower // "address" stays "address"
  if (lower.endsWith('us')) return lower // "status" stays "status"
  if (lower.endsWith('s') && !lower.endsWith('ss'))
    return lower.slice(0, -1)
  return lower
}

/** Minimal English pluralizer for table-name matching. */
export function pluralize(word: string): string {
  const lower = word.toLowerCase()
  if (IRREGULAR_PLURAL[lower]) return IRREGULAR_PLURAL[lower]
  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower))
    return lower.slice(0, -1) + 'ies'
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') ||
      lower.endsWith('sh') || lower.endsWith('ch'))
    return lower + 'es'
  if (lower.endsWith('f'))
    return lower.slice(0, -1) + 'ves'
  if (lower.endsWith('fe'))
    return lower.slice(0, -2) + 'ves'
  return lower + 's'
}

// ── Convention-based Relationship Inference ─────────────────────────

/** Columns matching these patterns are typically user references. */
const USER_REF_PATTERN = /^(created|updated|deleted|modified|assigned|owned|approved|reviewed|managed|invited|referred)_(by|to)$/i

/** Integer-like types that commonly serve as FK references. */
const FK_TYPES = new Set([
  'integer', 'int', 'int4', 'int8', 'bigint', 'smallint', 'int2',
  'serial', 'bigserial', 'smallserial',
  'uuid', 'text', 'character varying', 'varchar'
])

/** Common columns that appear in many tables but don't indicate relationships. */
const SKIP_SHARED_COLUMNS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by',
  'inserted_at', 'modified_at', 'is_active', 'is_deleted', 'active', 'status',
  'description', 'name', 'notes', 'comments', 'metadata', 'type', 'version',
  'insert_id', 'insert_date', 'partition_id'
])

/**
 * Infer relationships from column naming conventions.
 *
 * Patterns detected:
 *  1. `<name>_id` columns → table named `name`, `names`, or singular/plural variants
 *  2. `created_by`, `updated_by`, etc. → `users` / `user` table
 *  3. Column name exactly matches a table name (singular → plural table)
 *  4. Shared column names across tables — same column name + same data type in 2+ tables
 */
export function inferConventionRelationships(
  tables: { name: string; columns: ColumnInfo[] }[],
  selectedTableNames: string[]
): InferredRelationship[] {
  const results: InferredRelationship[] = []
  const tableNameSet = new Set(selectedTableNames.map((n) => n.toLowerCase()))

  /** Try to find a matching table name among selected tables. */
  function findTable(candidate: string): string | null {
    const lower = candidate.toLowerCase()
    // Direct match
    if (tableNameSet.has(lower))
      return selectedTableNames.find((t) => t.toLowerCase() === lower) ?? null
    // Plural form
    const plural = pluralize(lower)
    if (tableNameSet.has(plural))
      return selectedTableNames.find((t) => t.toLowerCase() === plural) ?? null
    // Singular form
    const singular = singularize(lower)
    if (tableNameSet.has(singular))
      return selectedTableNames.find((t) => t.toLowerCase() === singular) ?? null
    return null
  }

  for (const table of tables) {
    for (const col of table.columns) {
      // Skip primary keys — they're not FK references
      if (col.isPrimaryKey) continue
      // Only consider plausible FK data types
      const baseType = col.dataType.toLowerCase().replace(/\(.*\)/, '').trim()
      if (!FK_TYPES.has(baseType)) continue

      // Pattern 1: <name>_id → look for table
      if (col.name.toLowerCase().endsWith('_id') && col.name.length > 3) {
        const prefix = col.name.slice(0, -3) // e.g. "user" from "user_id"
        const targetTable = findTable(prefix)
        if (targetTable && targetTable.toLowerCase() !== table.name.toLowerCase()) {
          results.push({
            source: 'convention',
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable,
            targetColumn: 'id',
            cardinality: 'many-to-one',
            confidence: 0.9,
            label: `${col.name} → ${targetTable}.id`
          })
          continue
        }
        // Self-referential: e.g. employees.manager_id → employees.id
        if (targetTable && targetTable.toLowerCase() === table.name.toLowerCase()) {
          results.push({
            source: 'convention',
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable: table.name,
            targetColumn: 'id',
            cardinality: 'many-to-one',
            confidence: 0.85,
            label: `${col.name} → ${table.name}.id (self-ref)`
          })
          continue
        }
      }

      // Pattern 2: created_by, assigned_to, etc. → users table
      if (USER_REF_PATTERN.test(col.name)) {
        const usersTable = findTable('users') ?? findTable('user')
        if (usersTable) {
          results.push({
            source: 'convention',
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable: usersTable,
            targetColumn: 'id',
            cardinality: 'many-to-one',
            confidence: 0.85,
            label: `${col.name} → ${usersTable}.id`
          })
          continue
        }
      }

      // Pattern 3: column name exactly matches a table name
      // e.g. column "category" (int) → table "categories"
      if (!col.name.includes('_')) {
        const targetTable = findTable(col.name)
        if (targetTable && targetTable.toLowerCase() !== table.name.toLowerCase()) {
          results.push({
            source: 'convention',
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable,
            targetColumn: 'id',
            cardinality: 'many-to-one',
            confidence: 0.7,
            label: `${col.name} → ${targetTable}.id`
          })
        }
      }
    }
  }

  // ── Pattern 4: Shared column names across tables ──────────────────
  // Build a map of columnName+dataType → list of tables that have it
  const columnMap = new Map<string, { table: string; colName: string; dataType: string }[]>()
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isPrimaryKey) continue
      const colLower = col.name.toLowerCase()
      if (SKIP_SHARED_COLUMNS.has(colLower)) continue
      const baseType = col.dataType.toLowerCase().replace(/\(.*\)/, '').trim()
      const key = `${colLower}|${baseType}`
      if (!columnMap.has(key)) columnMap.set(key, [])
      columnMap.get(key)!.push({ table: table.name, colName: col.name, dataType: baseType })
    }
  }

  // For each shared column, create relationships between tables (pairwise, first table as anchor)
  const sharedAdded = new Set<string>()
  for (const [, entries] of columnMap) {
    if (entries.length < 2) continue
    // Use the first table as the "anchor" to avoid N^2 edges
    const anchor = entries[0]
    for (let i = 1; i < entries.length; i++) {
      const other = entries[i]
      // Avoid duplicate pairs (A→B and B→A)
      const pairKey = [anchor.table, other.table].sort().join('|') + '|' + anchor.colName.toLowerCase()
      if (sharedAdded.has(pairKey)) continue
      sharedAdded.add(pairKey)

      results.push({
        source: 'convention',
        sourceTable: anchor.table,
        sourceColumn: anchor.colName,
        targetTable: other.table,
        targetColumn: other.colName,
        cardinality: 'many-to-many',
        confidence: 0.65,
        label: `shared: ${anchor.colName}`
      })
    }
  }

  return results
}

// ── Deduplication ──────────────────────────────────────────────────

/**
 * Remove inferred relationships where a real FK already covers the same
 * (sourceTable, sourceColumn, targetTable) triple.
 */
export function deduplicateRelationships(
  realFks: ForeignKey[],
  inferred: InferredRelationship[]
): InferredRelationship[] {
  const realSet = new Set(
    realFks.map(
      (fk) => `${fk.sourceTable.toLowerCase()}|${fk.sourceColumn.toLowerCase()}|${fk.targetTable.toLowerCase()}`
    )
  )

  return inferred.filter((rel) => {
    const key = `${rel.sourceTable.toLowerCase()}|${rel.sourceColumn.toLowerCase()}|${rel.targetTable.toLowerCase()}`
    return !realSet.has(key)
  })
}

// ── AI Output Parser ───────────────────────────────────────────────

const VALID_CARDINALITIES = new Set<Cardinality>([
  'one-to-one',
  'one-to-many',
  'many-to-one',
  'many-to-many'
])

/**
 * Parse pipe-delimited AI relationship output into InferredRelationship[].
 *
 * Expected format per line:
 *   SOURCE_TABLE|SOURCE_COLUMN|TARGET_TABLE|TARGET_COLUMN|CARDINALITY|CONFIDENCE
 */
export function parseAIRelationshipOutput(rawText: string): InferredRelationship[] {
  const results: InferredRelationship[] = []

  for (const line of rawText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('='))
      continue

    const parts = trimmed.split('|')
    if (parts.length < 6) continue

    const [srcTable, srcCol, tgtTable, tgtCol, cardStr, confStr] = parts.map((p) => p.trim())

    const confidence = parseFloat(confStr)
    if (isNaN(confidence)) continue

    const cardinality = cardStr.toLowerCase() as Cardinality
    if (!VALID_CARDINALITIES.has(cardinality)) continue

    results.push({
      source: 'ai',
      sourceTable: srcTable,
      sourceColumn: srcCol,
      targetTable: tgtTable,
      targetColumn: tgtCol,
      cardinality,
      confidence: Math.min(confidence, 0.95),
      label: `AI: ${srcCol} → ${tgtTable}.${tgtCol}`
    })
  }

  return results
}
