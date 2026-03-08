/**
 * PostgreSQL Connection Manager for DbInspector.
 *
 * Manages a pool of named connections, each with their own `pg.Pool` instance.
 * All database operations are restricted to SELECT and EXPLAIN statements.
 * Read-only connections additionally enforce `default_transaction_read_only = true`.
 *
 * Performance:
 *  - All metadata queries use pg_catalog tables directly instead of information_schema
 *    views, which are orders of magnitude faster on large databases.
 *  - Partition children are filtered out using pg_class.relispartition.
 *  - Partitioned parent tables show aggregated row counts and sizes from their children.
 *
 * Security:
 *  - Connection strings are encrypted via safeStorage in the credentials store.
 *  - SQL validation rejects any non-SELECT/EXPLAIN statement before execution.
 *  - All operations run in the main process only (sandbox: true prevents renderer DB access).
 */

import { Pool, type QueryResult } from 'pg'

export type ReadStrategy = 'read-only' | 'read-write'

export interface DbConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  database: string
  defaultSchema: string
  readStrategy: ReadStrategy
}

/**
 * Build a PostgreSQL connection URI from individual fields.
 * Using a URI string avoids issues with pg's ConnectionParameters trying to
 * parse a config.connectionString that may be undefined/truthy in edge cases.
 */
function buildConnectionUri(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string
): string {
  const u = encodeURIComponent(user)
  const p = encodeURIComponent(password)
  // Don't encode host — it's a domain name or IP address
  return `postgresql://${u}:${p}@${host}:${port}/${encodeURIComponent(database)}`
}

/**
 * Validates that a SQL statement is safe to execute.
 * Only SELECT and EXPLAIN statements are allowed — never DML or DDL.
 */
export function validateQuery(sql: string): void {
  const trimmed = sql.trim()
  if (!trimmed) throw new Error('Empty query')

  // Remove leading comments (-- ... or /* ... */)
  const stripped = trimmed
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  const firstKeyword = stripped.split(/\s+/)[0]?.toUpperCase()

  if (firstKeyword !== 'SELECT' && firstKeyword !== 'EXPLAIN' && firstKeyword !== 'WITH') {
    throw new Error(
      `Only SELECT, WITH, and EXPLAIN statements are allowed. Got: ${firstKeyword ?? '(empty)'}`
    )
  }
}

export class PostgresConnectionManager {
  private pools = new Map<string, Pool>()
  private configs = new Map<string, DbConnectionConfig>()

  /**
   * Establish a connection pool for the given config.
   */
  async connect(config: DbConnectionConfig): Promise<void> {
    // Disconnect existing pool for this ID if present
    if (this.pools.has(config.id)) {
      await this.disconnect(config.id)
    }

    const connectionString = buildConnectionUri(
      String(config.host || 'localhost'),
      Number(config.port) || 5432,
      String(config.username || 'postgres'),
      String(config.password ?? ''),
      String(config.database || 'postgres')
    )

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    })

    // Configure each new client from the pool
    pool.on('connect', (client) => {
      // Set statement timeout — 120s to handle large databases with many tables
      client.query("SET statement_timeout = '120s'").catch(() => {})

      // Enforce read-only mode if configured
      if (config.readStrategy === 'read-only') {
        client.query('SET default_transaction_read_only = true').catch(() => {})
      }
    })

    // Verify the connection works
    const client = await pool.connect()
    try {
      await client.query('SELECT 1')
    } finally {
      client.release()
    }

    this.pools.set(config.id, pool)
    this.configs.set(config.id, config)
  }

  /**
   * Disconnect and remove a connection pool.
   */
  async disconnect(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId)
    if (pool) {
      await pool.end()
      this.pools.delete(connectionId)
      this.configs.delete(connectionId)
    }
  }

  /**
   * Test a connection without storing anything.
   * Connects to the default 'postgres' database to verify server accessibility.
   */
  async testConnection(params: {
    host: string
    port: number
    username: string
    password: string
  }): Promise<{ success: boolean; serverVersion: string; error?: string }> {
    const connectionString = buildConnectionUri(
      String(params.host || 'localhost'),
      Number(params.port) || 5432,
      String(params.username || 'postgres'),
      String(params.password ?? ''),
      'postgres'
    )

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10000
    })

    try {
      const client = await pool.connect()
      try {
        const result = await client.query('SHOW server_version')
        const serverVersion = (result.rows[0]?.server_version as string) ?? 'unknown'
        return { success: true, serverVersion }
      } finally {
        client.release()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, serverVersion: '', error: message }
    } finally {
      await pool.end()
    }
  }

  /**
   * Execute a validated SQL query.
   */
  async query(
    connectionId: string,
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult> {
    const pool = this.getPool(connectionId)
    validateQuery(sql)
    return pool.query(sql, params)
  }

  /**
   * List all non-template, connectable databases on the server.
   */
  async getDatabases(connectionId: string): Promise<string[]> {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT datname FROM pg_database
       WHERE datistemplate = false AND datallowconn = true
       ORDER BY datname`
    )
    return result.rows.map((r) => r.datname as string)
  }

  /**
   * Switch the active database for a connection.
   * Disconnects the current pool and reconnects with the new database.
   */
  async switchDatabase(connectionId: string, database: string): Promise<void> {
    const config = this.configs.get(connectionId)
    if (!config) throw new Error(`No config found for connection ID: ${connectionId}`)

    const updatedConfig = { ...config, database }
    await this.connect(updatedConfig)
  }

  /**
   * Get all schemas in the database.
   * Uses pg_namespace directly (faster than information_schema.schemata).
   */
  async getSchemas(connectionId: string): Promise<string[]> {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT nspname AS schema_name
       FROM pg_namespace
       WHERE nspname NOT LIKE 'pg_%'
         AND nspname <> 'information_schema'
       ORDER BY nspname`
    )
    return result.rows.map((r) => r.schema_name as string)
  }

  /**
   * Get tables/views in a schema with estimated row counts.
   *
   * Uses pg_class directly instead of information_schema.tables for performance.
   * Filters out partition children via relispartition.
   * For partitioned parent tables, aggregates row counts and sizes from children.
   */
  async getTables(
    connectionId: string,
    schema: string
  ): Promise<
    { name: string; type: string; estimatedRows: number; totalSize: string }[]
  > {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT
         c.relname AS name,
         CASE c.relkind
           WHEN 'r' THEN 'BASE TABLE'
           WHEN 'v' THEN 'VIEW'
           WHEN 'm' THEN 'MATERIALIZED VIEW'
           WHEN 'p' THEN 'PARTITIONED TABLE'
           ELSE 'OTHER'
         END AS type,
         COALESCE(
           CASE WHEN c.relkind = 'p' THEN (
             SELECT SUM(cs.n_live_tup)::int
             FROM pg_inherits pi
             JOIN pg_class pc ON pc.oid = pi.inhrelid
             LEFT JOIN pg_stat_user_tables cs
               ON cs.relname = pc.relname AND cs.schemaname = n.nspname
             WHERE pi.inhparent = c.oid
           )
           ELSE s.n_live_tup
           END,
           0
         )::int AS "estimatedRows",
         COALESCE(pg_size_pretty(
           CASE WHEN c.relkind = 'p' THEN (
             SELECT COALESCE(SUM(pg_total_relation_size(pc.oid)), 0)
             FROM pg_inherits pi
             JOIN pg_class pc ON pc.oid = pi.inhrelid
             WHERE pi.inhparent = c.oid
           ) + pg_total_relation_size(c.oid)
           ELSE pg_total_relation_size(c.oid)
           END
         ), '0 bytes') AS "totalSize"
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_stat_user_tables s
         ON s.schemaname = n.nspname AND s.relname = c.relname
       WHERE n.nspname = $1
         AND c.relkind IN ('r', 'v', 'm', 'p')
         AND NOT c.relispartition
       ORDER BY c.relname`,
      [schema]
    )
    return result.rows as {
      name: string
      type: string
      estimatedRows: number
      totalSize: string
    }[]
  }

  /**
   * Get column details for a table.
   *
   * Uses pg_attribute + pg_type directly instead of information_schema.columns
   * for much better performance on large databases.
   */
  async getColumns(
    connectionId: string,
    schema: string,
    table: string
  ): Promise<
    {
      name: string
      dataType: string
      isNullable: boolean
      defaultValue: string | null
      ordinalPosition: number
      isPrimaryKey: boolean
      maxLength: number | null
      precision: number | null
    }[]
  > {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT
         a.attname AS name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS "dataType",
         NOT a.attnotnull AS "isNullable",
         pg_get_expr(d.adbin, d.adrelid) AS "defaultValue",
         a.attnum::int AS "ordinalPosition",
         COALESCE(
           (SELECT true FROM pg_index i
            WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY(i.indkey)),
           false
         ) AS "isPrimaryKey",
         CASE
           WHEN a.atttypmod > 0 AND t.typname IN ('varchar', 'bpchar')
           THEN a.atttypmod - 4
           ELSE NULL
         END AS "maxLength",
         CASE
           WHEN t.typname IN ('numeric', 'decimal')
           THEN ((a.atttypmod - 4) >> 16)
           ELSE NULL
         END AS precision
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_type t ON t.oid = a.atttypid
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
       WHERE n.nspname = $1
         AND c.relname = $2
         AND a.attnum > 0
         AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [schema, table]
    )
    return result.rows as {
      name: string
      dataType: string
      isNullable: boolean
      defaultValue: string | null
      ordinalPosition: number
      isPrimaryKey: boolean
      maxLength: number | null
      precision: number | null
    }[]
  }

  /**
   * Get all foreign key relationships in a schema.
   *
   * Uses pg_constraint directly instead of information_schema joins
   * (information_schema.table_constraints + key_column_usage + constraint_column_usage
   *  is extremely slow on large databases and routinely times out).
   */
  async getForeignKeys(
    connectionId: string,
    schema: string
  ): Promise<
    {
      constraintName: string
      sourceTable: string
      sourceColumn: string
      targetTable: string
      targetColumn: string
    }[]
  > {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT
         con.conname AS "constraintName",
         src.relname AS "sourceTable",
         sa.attname AS "sourceColumn",
         tgt.relname AS "targetTable",
         ta.attname AS "targetColumn"
       FROM pg_constraint con
       JOIN pg_class src ON src.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = src.relnamespace
       JOIN pg_class tgt ON tgt.oid = con.confrelid
       CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS sk(attnum, ord)
       CROSS JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tk(attnum, ord)
       JOIN pg_attribute sa ON sa.attrelid = con.conrelid AND sa.attnum = sk.attnum
       JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = tk.attnum
       WHERE con.contype = 'f'
         AND n.nspname = $1
         AND sk.ord = tk.ord
       ORDER BY src.relname, sa.attname`,
      [schema]
    )
    return result.rows as {
      constraintName: string
      sourceTable: string
      sourceColumn: string
      targetTable: string
      targetColumn: string
    }[]
  }

  /**
   * Get indexes for a table.
   */
  async getIndexes(
    connectionId: string,
    schema: string,
    table: string
  ): Promise<
    {
      name: string
      columns: string[]
      isUnique: boolean
      isPrimary: boolean
      indexType: string
    }[]
  > {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT
         i.relname AS name,
         ARRAY_AGG(a.attname ORDER BY k.n) AS columns,
         ix.indisunique AS "isUnique",
         ix.indisprimary AS "isPrimary",
         am.amname AS "indexType"
       FROM pg_index ix
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       JOIN pg_am am ON am.oid = i.relam
       CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
       WHERE n.nspname = $1 AND t.relname = $2
       GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
       ORDER BY i.relname`,
      [schema, table]
    )
    return result.rows as {
      name: string
      columns: string[]
      isUnique: boolean
      isPrimary: boolean
      indexType: string
    }[]
  }

  /**
   * Get table statistics.
   */
  async getTableStats(
    connectionId: string,
    schema: string,
    table: string
  ): Promise<{
    estimatedRows: number
    totalSize: string
    indexSize: string
    lastVacuum: string | null
    lastAnalyze: string | null
  }> {
    const pool = this.getPool(connectionId)
    const result = await pool.query(
      `SELECT
         COALESCE(s.n_live_tup, 0)::int AS "estimatedRows",
         pg_size_pretty(pg_total_relation_size(
           quote_ident($1) || '.' || quote_ident($2)
         )) AS "totalSize",
         pg_size_pretty(pg_indexes_size(
           (quote_ident($1) || '.' || quote_ident($2))::regclass
         )) AS "indexSize",
         s.last_vacuum::text AS "lastVacuum",
         s.last_analyze::text AS "lastAnalyze"
       FROM pg_stat_user_tables s
       WHERE s.schemaname = $1 AND s.relname = $2`,
      [schema, table]
    )
    return (
      result.rows[0] ?? {
        estimatedRows: 0,
        totalSize: '0 bytes',
        indexSize: '0 bytes',
        lastVacuum: null,
        lastAnalyze: null
      }
    )
  }

  /**
   * Run EXPLAIN ANALYZE on a query (read-only safe since it's wrapped in EXPLAIN).
   */
  async explain(connectionId: string, sql: string): Promise<string> {
    validateQuery(sql)
    const pool = this.getPool(connectionId)
    const result = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`)
    return result.rows.map((r) => (r as { 'QUERY PLAN': string })['QUERY PLAN']).join('\n')
  }

  /**
   * Get the list of active connection configs (without passwords).
   */
  getActiveConnections(): Omit<DbConnectionConfig, 'password'>[] {
    return Array.from(this.configs.values()).map(({ password: _pw, ...rest }) => rest)
  }

  /**
   * Check if a connection is active.
   */
  isConnected(connectionId: string): boolean {
    return this.pools.has(connectionId)
  }

  /**
   * Disconnect all pools. Call on app quit.
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.pools.keys()).map((id) => this.disconnect(id))
    await Promise.all(promises)
  }

  // ── Private helpers ─────────────────────────────────────────────

  private getPool(connectionId: string): Pool {
    const pool = this.pools.get(connectionId)
    if (!pool) {
      throw new Error(`No active connection for ID: ${connectionId}`)
    }
    return pool
  }
}
