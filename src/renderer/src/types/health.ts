/**
 * Extensible health monitoring types.
 * Any new resource type (MCP server, external API, etc.) can be represented
 * as a ResourceHealth entry without modifying the health panel or store.
 */

/** Health status for any monitored resource */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/** Category of resource being monitored */
export type ResourceCategory = 'agent' | 'database' | 'mcp' | 'plugin'

/** Generic health resource — extensible for any future resource type */
export interface ResourceHealth {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Resource category for grouping in the health panel */
  category: ResourceCategory
  /** Current health status */
  status: HealthStatus
  /** Optional detail text (e.g., "Connected via CLI", "PostgreSQL 15.4") */
  detail?: string
  /** ISO 8601 timestamp of last health check */
  lastChecked: string
}
