import type { PluginId } from './plugin'

/**
 * Status of an activity log entry.
 * - `success`: The operation completed successfully.
 * - `failure`: The operation failed with an error.
 * - `pending`: The operation is still in progress.
 */
export type ActivityStatus = 'success' | 'failure' | 'pending'

/**
 * Represents a single entry in the centralized activity log.
 * Each entry captures a plugin operation with its outcome and timing.
 */
export interface ActivityEntry {
  /** Unique identifier in format `act-{timestamp}-{random5chars}` */
  id: string
  /** The plugin that generated this activity */
  pluginId: PluginId
  /** Human-readable operation name (e.g., 'PR Review', 'Query Executed') */
  operation: string
  /** Outcome status of the operation */
  status: ActivityStatus
  /** Duration in milliseconds, null if not measured */
  durationMs: number | null
  /** ISO 8601 timestamp string of when the activity occurred */
  timestamp: string
  /** Optional detail or error message */
  detail?: string
}
