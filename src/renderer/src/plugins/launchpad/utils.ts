/**
 * Shared utilities for the Launchpad plugin.
 */

/** Format a unix timestamp as a human-readable relative time string. */
export function formatRelativeTime(timestamp: number | null): string {
  if (timestamp === null) return 'Never'
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (hours < 48) return 'Yesterday'
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}
