/**
 * Unified Database Manager for DbInspector.
 *
 * Routes all operations to the appropriate engine-specific manager
 * (PostgresConnectionManager or MySqlConnectionManager) based on the
 * engine field stored when the connection was first established.
 *
 * Backward compatibility: connections without an explicit engine field
 * default to 'postgresql' so that safeStorage-encrypted connections
 * created before MySQL support was added continue to work.
 */

import { PostgresConnectionManager } from './postgres'
import { MySqlConnectionManager } from './mysql'
import type { DbConnectionConfig as PgDbConnectionConfig } from './postgres'
import type { DbConnectionConfig as MySqlDbConnectionConfig } from './mysql'

// Unified config type that includes the engine discriminator
export interface DbConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  database: string
  defaultSchema: string
  readStrategy: 'read-only' | 'read-write'
  engine?: 'postgresql' | 'mysql'
}

export class UnifiedDbManager {
  private pgManager = new PostgresConnectionManager()
  private mysqlManager = new MySqlConnectionManager()

  /** Maps connectionId -> engine type for routing */
  private engineMap = new Map<string, 'postgresql' | 'mysql'>()

  /**
   * Establish a connection, routing to the appropriate engine.
   * Defaults to 'postgresql' when engine is undefined (backward compat).
   */
  async connect(config: DbConnectionConfig): Promise<void> {
    const engine = config.engine ?? 'postgresql'
    this.engineMap.set(config.id, engine)

    if (engine === 'mysql') {
      await this.mysqlManager.connect(config as MySqlDbConnectionConfig)
    } else {
      await this.pgManager.connect(config as PgDbConnectionConfig)
    }
  }

  /**
   * Disconnect a connection by ID.
   */
  async disconnect(connectionId: string): Promise<void> {
    const engine = this.engineMap.get(connectionId) ?? 'postgresql'
    if (engine === 'mysql') {
      await this.mysqlManager.disconnect(connectionId)
    } else {
      await this.pgManager.disconnect(connectionId)
    }
    this.engineMap.delete(connectionId)
  }

  /**
   * Test a connection without storing it.
   * Accepts an optional engine parameter (defaults to 'postgresql').
   */
  async testConnection(
    params: { host: string; port: number; username: string; password: string },
    engine?: 'postgresql' | 'mysql'
  ): Promise<{ success: boolean; serverVersion: string; error?: string }> {
    const resolvedEngine = engine ?? 'postgresql'
    if (resolvedEngine === 'mysql') {
      return this.mysqlManager.testConnection(params)
    }
    return this.pgManager.testConnection(params)
  }

  /**
   * Execute a SQL query on the connection.
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
    const engine = this.engineMap.get(connectionId) ?? 'postgresql'
    if (engine === 'mysql') {
      return this.mysqlManager.query(connectionId, sql, params)
    }
    const result = await this.pgManager.query(connectionId, sql, params)
    return {
      rows: result.rows as Record<string, unknown>[],
      fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      rowCount: result.rowCount ?? 0,
      command: result.command
    }
  }

  /**
   * Cancel an active query for a connection.
   * For PostgreSQL: uses pg_cancel_backend via a separate connection.
   * For MySQL: uses KILL QUERY via the manager.
   */
  async cancelQuery(connectionId: string): Promise<void> {
    const engine = this.engineMap.get(connectionId) ?? 'postgresql'
    if (engine === 'mysql') {
      await this.mysqlManager.cancelQuery(connectionId)
      return
    }
    // PostgreSQL: pg_cancel_backend needs the PID of the backend process.
    // We run it via a new query on the same pool connection.
    await this.pgManager.query(connectionId, 'SELECT pg_cancel_backend(pg_backend_pid())')
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    return this.getManager(connectionId).getDatabases(connectionId)
  }

  async switchDatabase(connectionId: string, database: string): Promise<void> {
    return this.getManager(connectionId).switchDatabase(connectionId, database)
  }

  async getSchemas(connectionId: string): Promise<string[]> {
    return this.getManager(connectionId).getSchemas(connectionId)
  }

  async getTables(
    connectionId: string,
    schema: string
  ): Promise<{ name: string; type: string; estimatedRows: number; totalSize: string }[]> {
    return this.getManager(connectionId).getTables(connectionId, schema)
  }

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
    return this.getManager(connectionId).getColumns(connectionId, schema, table)
  }

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
    return this.getManager(connectionId).getForeignKeys(connectionId, schema)
  }

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
    return this.getManager(connectionId).getIndexes(connectionId, schema, table)
  }

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
    return this.getManager(connectionId).getTableStats(connectionId, schema, table)
  }

  async explain(connectionId: string, sql: string): Promise<string> {
    return this.getManager(connectionId).explain(connectionId, sql)
  }

  getActiveConnections(): Omit<DbConnectionConfig, 'password'>[] {
    const pgConns = this.pgManager.getActiveConnections()
    const mysqlConns = this.mysqlManager.getActiveConnections()
    return [...pgConns, ...mysqlConns]
  }

  isConnected(connectionId: string): boolean {
    const engine = this.engineMap.get(connectionId) ?? 'postgresql'
    if (engine === 'mysql') {
      return this.mysqlManager.isConnected(connectionId)
    }
    return this.pgManager.isConnected(connectionId)
  }

  async disconnectAll(): Promise<void> {
    await Promise.all([this.pgManager.disconnectAll(), this.mysqlManager.disconnectAll()])
    this.engineMap.clear()
  }

  // ── Private helpers ─────────────────────────────────────────────

  private getManager(
    connectionId: string
  ): PostgresConnectionManager | MySqlConnectionManager {
    const engine = this.engineMap.get(connectionId) ?? 'postgresql'
    return engine === 'mysql' ? this.mysqlManager : this.pgManager
  }
}
