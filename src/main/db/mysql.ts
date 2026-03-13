/**
 * MySQL Connection Manager for DbInspector.
 *
 * Manages a pool of named connections, each with their own mysql2 Pool instance.
 * Implements the same interface as PostgresConnectionManager for unified routing.
 *
 * Security:
 *  - Connection credentials are encrypted via safeStorage in the credentials store.
 *  - SQL validation rejects DML statements unless allowWrite flag is explicitly set.
 *  - All operations run in the main process only (sandbox: true prevents renderer DB access).
 */

import mysql from 'mysql2/promise'
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise'

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
  engine?: 'postgresql' | 'mysql'
}

export class MySqlConnectionManager {
  private pools = new Map<string, Pool>()
  private configs = new Map<string, DbConnectionConfig>()
  /** Track active query thread IDs for cancellation: connectionId -> thread_id */
  private activeQueryThreadIds = new Map<string, number>()

  /**
   * Establish a connection pool for the given config.
   */
  async connect(config: DbConnectionConfig): Promise<void> {
    // Disconnect existing pool for this ID if present
    if (this.pools.has(config.id)) {
      await this.disconnect(config.id)
    }

    const pool = mysql.createPool({
      host: String(config.host || 'localhost'),
      port: Number(config.port) || 3306,
      user: String(config.username || 'root'),
      password: String(config.password ?? ''),
      database: String(config.database || undefined),
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000
    })

    // Verify the connection works
    let connection: PoolConnection | undefined
    try {
      connection = await pool.getConnection()

      if (config.readStrategy === 'read-only') {
        await connection.query('SET SESSION TRANSACTION READ ONLY')
      }

      await connection.query('SELECT 1')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await pool.end().catch(() => {})

      if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        throw new Error(
          `Connection timed out to ${config.host}:${config.port}. ` +
          'Possible causes: database server is unreachable, firewall is blocking the port, ' +
          'VPN is not connected, or the security group does not allow your IP address.'
        )
      }
      if (message.includes('ENOTFOUND')) {
        throw new Error(
          `Cannot resolve hostname "${config.host}". ` +
          'Check that the host address is correct and DNS is working.'
        )
      }
      if (message.includes('ECONNREFUSED')) {
        throw new Error(
          `Connection refused by ${config.host}:${config.port}. ` +
          'The database server may not be running, or the port may be incorrect.'
        )
      }
      throw err
    } finally {
      connection?.release()
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
      this.activeQueryThreadIds.delete(connectionId)
    }
  }

  /**
   * Test a connection without storing anything.
   */
  async testConnection(params: {
    host: string
    port: number
    username: string
    password: string
  }): Promise<{ success: boolean; serverVersion: string; error?: string }> {
    const pool = mysql.createPool({
      host: String(params.host || 'localhost'),
      port: Number(params.port) || 3306,
      user: String(params.username || 'root'),
      password: String(params.password ?? ''),
      connectionLimit: 1,
      connectTimeout: 10000
    })

    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT VERSION() as version')
      const serverVersion = (rows[0]?.version as string) ?? 'unknown'
      return { success: true, serverVersion }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, serverVersion: '', error: message }
    } finally {
      await pool.end()
    }
  }

  /**
   * Execute a SQL query.
   * Returns result mapped to match the PostgreSQL QueryResult shape.
   */
  async query(
    connectionId: string,
    sql: string,
    params?: unknown[]
  ): Promise<{
    rows: Record<string, unknown>[]
    fields: { name: string; dataTypeID: number }[]
    rowCount: number
    command: string
  }> {
    const pool = this.getPool(connectionId)

    // Get a connection to track the thread ID for cancellation
    const connection = await pool.getConnection()
    try {
      // Track the thread ID so we can cancel this query
      const [threadRows] = await connection.query<RowDataPacket[]>('SELECT CONNECTION_ID() as tid')
      const threadId = threadRows[0]?.tid as number
      if (threadId) {
        this.activeQueryThreadIds.set(connectionId, threadId)
      }

      const [result, fields] = await connection.query(sql, params)

      this.activeQueryThreadIds.delete(connectionId)

      // Handle SELECT results (RowDataPacket[])
      if (Array.isArray(result)) {
        const rows = result as Record<string, unknown>[]
        const mappedFields = (fields as FieldPacket[]).map((f) => ({
          name: f.name,
          dataTypeID: 0
        }))
        return {
          rows,
          fields: mappedFields,
          rowCount: rows.length,
          command: 'SELECT'
        }
      }

      // Handle DML results (ResultSetHeader)
      const header = result as ResultSetHeader
      return {
        rows: [],
        fields: [],
        rowCount: header.affectedRows ?? 0,
        command: detectCommand(sql)
      }
    } finally {
      this.activeQueryThreadIds.delete(connectionId)
      connection.release()
    }
  }

  /**
   * Cancel the active query for a connection using KILL QUERY.
   */
  async cancelQuery(connectionId: string): Promise<void> {
    const threadId = this.activeQueryThreadIds.get(connectionId)
    if (!threadId) return

    const pool = this.getPool(connectionId)
    const connection = await pool.getConnection()
    try {
      await connection.query(`KILL QUERY ${threadId}`)
    } finally {
      connection.release()
    }
    this.activeQueryThreadIds.delete(connectionId)
  }

  /**
   * List all non-system databases on the server.
   */
  async getDatabases(connectionId: string): Promise<string[]> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>('SHOW DATABASES')
    const systemDbs = new Set(['information_schema', 'mysql', 'performance_schema', 'sys'])
    return (rows as { Database: string }[])
      .map((r) => r.Database)
      .filter((db) => !systemDbs.has(db))
  }

  /**
   * Switch the active database for a connection.
   */
  async switchDatabase(connectionId: string, database: string): Promise<void> {
    const config = this.configs.get(connectionId)
    if (!config) throw new Error(`No config found for connection ID: ${connectionId}`)

    const updatedConfig = { ...config, database }
    await this.connect(updatedConfig)
  }

  /**
   * Get "schemas" — MySQL uses the database name as schema.
   * Returns the current database name as the single "schema".
   */
  async getSchemas(connectionId: string): Promise<string[]> {
    const config = this.configs.get(connectionId)
    if (!config) throw new Error(`No config found for connection ID: ${connectionId}`)
    return [config.database]
  }

  /**
   * Get tables/views in a schema (database) with estimated row counts.
   */
  async getTables(
    connectionId: string,
    schema: string
  ): Promise<{ name: string; type: string; estimatedRows: number; totalSize: string }[]> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         TABLE_NAME AS name,
         TABLE_TYPE AS type,
         COALESCE(TABLE_ROWS, 0) AS estimatedRows,
         COALESCE(
           CONCAT(
             ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2),
             ' MB'
           ),
           '0 MB'
         ) AS totalSize
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [schema]
    )
    return (rows as { name: string; type: string; estimatedRows: number; totalSize: string }[]).map(
      (r) => ({
        name: r.name,
        type: r.type === 'VIEW' ? 'VIEW' : 'BASE TABLE',
        estimatedRows: Number(r.estimatedRows) || 0,
        totalSize: r.totalSize
      })
    )
  }

  /**
   * Get column details for a table.
   */
  async getColumns(
    connectionId: string,
    schema: string,
    table: string
  ): Promise<{
    name: string
    dataType: string
    isNullable: boolean
    defaultValue: string | null
    ordinalPosition: number
    isPrimaryKey: boolean
    maxLength: number | null
    precision: number | null
  }[]> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COLUMN_NAME AS name,
         DATA_TYPE AS dataType,
         IS_NULLABLE = 'YES' AS isNullable,
         COLUMN_DEFAULT AS defaultValue,
         ORDINAL_POSITION AS ordinalPosition,
         COLUMN_KEY = 'PRI' AS isPrimaryKey,
         CHARACTER_MAXIMUM_LENGTH AS maxLength,
         NUMERIC_PRECISION AS \`precision\`
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [schema, table]
    )
    return (rows as {
      name: string
      dataType: string
      isNullable: number | boolean
      defaultValue: string | null
      ordinalPosition: number
      isPrimaryKey: number | boolean
      maxLength: number | null
      precision: number | null
    }[]).map((r) => ({
      name: r.name,
      dataType: r.dataType,
      isNullable: Boolean(r.isNullable),
      defaultValue: r.defaultValue,
      ordinalPosition: r.ordinalPosition,
      isPrimaryKey: Boolean(r.isPrimaryKey),
      maxLength: r.maxLength,
      precision: r.precision
    }))
  }

  /**
   * Get all foreign key relationships in a schema.
   */
  async getForeignKeys(
    connectionId: string,
    schema: string
  ): Promise<{
    constraintName: string
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
  }[]> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         kcu.CONSTRAINT_NAME AS constraintName,
         kcu.TABLE_NAME AS sourceTable,
         kcu.COLUMN_NAME AS sourceColumn,
         kcu.REFERENCED_TABLE_NAME AS targetTable,
         kcu.REFERENCED_COLUMN_NAME AS targetColumn
       FROM information_schema.KEY_COLUMN_USAGE kcu
       JOIN information_schema.TABLE_CONSTRAINTS tc
         ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
         AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
         AND tc.TABLE_NAME = kcu.TABLE_NAME
       WHERE kcu.TABLE_SCHEMA = ?
         AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME`,
      [schema]
    )
    return rows as {
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
  ): Promise<{
    name: string
    columns: string[]
    isUnique: boolean
    isPrimary: boolean
    indexType: string
  }[]> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         INDEX_NAME AS name,
         COLUMN_NAME AS column_name,
         NON_UNIQUE = 0 AS isUnique,
         INDEX_NAME = 'PRIMARY' AS isPrimary,
         INDEX_TYPE AS indexType
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [schema, table]
    )

    // Group columns by index name
    const indexMap = new Map<string, {
      name: string
      columns: string[]
      isUnique: boolean
      isPrimary: boolean
      indexType: string
    }>()

    for (const row of rows as {
      name: string
      column_name: string
      isUnique: number | boolean
      isPrimary: number | boolean
      indexType: string
    }[]) {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          columns: [],
          isUnique: Boolean(row.isUnique),
          isPrimary: Boolean(row.isPrimary),
          indexType: row.indexType
        })
      }
      indexMap.get(row.name)!.columns.push(row.column_name)
    }

    return Array.from(indexMap.values())
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
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COALESCE(TABLE_ROWS, 0) AS estimatedRows,
         CONCAT(ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2), ' MB') AS totalSize,
         CONCAT(ROUND(INDEX_LENGTH / 1024 / 1024, 2), ' MB') AS indexSize
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [schema, table]
    )
    const row = rows[0] as { estimatedRows: number; totalSize: string; indexSize: string } | undefined
    return {
      estimatedRows: Number(row?.estimatedRows) || 0,
      totalSize: row?.totalSize ?? '0 MB',
      indexSize: row?.indexSize ?? '0 MB',
      lastVacuum: null,   // MySQL does not have explicit VACUUM
      lastAnalyze: null
    }
  }

  /**
   * Run EXPLAIN on a query.
   */
  async explain(connectionId: string, sql: string): Promise<string> {
    const pool = this.getPool(connectionId)
    const [rows] = await pool.query<RowDataPacket[]>(`EXPLAIN ${sql}`)
    return JSON.stringify(rows, null, 2)
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

// ── Helpers ─────────────────────────────────────────────────────────

function detectCommand(sql: string): string {
  const trimmed = sql.trim().replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
  return trimmed.split(/\s+/)[0]?.toUpperCase() ?? 'UNKNOWN'
}
