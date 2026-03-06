/**
 * Format an ISO 8601 timestamp as a human-readable relative time string.
 * Uses the built-in Intl.RelativeTimeFormat API -- zero external dependencies.
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now()
  const then = new Date(isoTimestamp).getTime()
  const diffSeconds = Math.round((then - now) / 1000)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [Infinity, 'week']
  ]

  for (const [threshold, unit] of thresholds) {
    if (Math.abs(diffSeconds) < threshold) {
      const divisor =
        unit === 'second'
          ? 1
          : unit === 'minute'
            ? 60
            : unit === 'hour'
              ? 3600
              : unit === 'day'
                ? 86400
                : 604800
      return rtf.format(Math.round(diffSeconds / divisor), unit)
    }
  }

  return rtf.format(Math.round(diffSeconds / 604800), 'week')
}
