/**
 * Shared chart utilities for Launchpad cost visualizations.
 *
 * Colors reference CSS custom properties (--chart-1 through --chart-5) so they
 * automatically adapt to theme changes. The ONLY hardcoded hex values are
 * PROVIDER_COLORS, which are brand-identity colors (not chart theming).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChartDataItem {
  name: string
  value: number
  categoryId: string
  serviceId: string
  fill: string
}

// ── Category color mapping ───────────────────────────────────────────────────

/**
 * Maps category IDs to CSS variable indices (1-based, cycles with opacity for overflow).
 * First 5 categories use --chart-1 through --chart-5.
 * Additional categories reuse the same variables at reduced opacity.
 */
const CATEGORY_COLOR_INDEX: Record<string, number> = {
  compute: 1,
  containers: 2,
  storage: 3,
  database: 4,
  networking: 5,
  serverless: 1,
  'ml-ai': 2,
  mlai: 2,
  analytics: 3,
  messaging: 4,
  security: 5,
}

const CATEGORY_OPACITY: Record<string, number> = {
  serverless: 0.7,
  'ml-ai': 0.7,
  mlai: 0.7,
  analytics: 0.5,
  messaging: 0.5,
  security: 0.5,
}

/**
 * Returns an HSL color string referencing a CSS custom property for the given
 * category. Falls back to cycling through chart-1..5 using the provided index.
 */
export function getCategoryColor(categoryId: string, index: number = 0): string {
  const id = categoryId?.toLowerCase() ?? ''
  const chartIndex = CATEGORY_COLOR_INDEX[id] ?? ((index % 5) + 1)
  const opacity = CATEGORY_OPACITY[id] ?? 1

  if (opacity === 1) {
    return `hsl(var(--chart-${chartIndex}))`
  }
  return `hsl(var(--chart-${chartIndex}) / ${opacity})`
}

/**
 * Returns an HSLA string at the given opacity for dimming during cross-highlight.
 */
export function getDimmedColor(categoryId: string, index: number = 0): string {
  const id = categoryId?.toLowerCase() ?? ''
  const chartIndex = CATEGORY_COLOR_INDEX[id] ?? ((index % 5) + 1)
  return `hsl(var(--chart-${chartIndex}) / 0.15)`
}

// ── Provider brand colors (the ONLY hardcoded hex values) ───────────────────

export const PROVIDER_COLORS: Record<string, string> = {
  aws: '#FF9900',
  gcp: '#4285F4',
  azure: '#0078D4',
}

// ── Category display names ───────────────────────────────────────────────────

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  compute: 'Compute',
  containers: 'Containers',
  storage: 'Storage',
  database: 'Database',
  networking: 'Networking',
  serverless: 'Serverless',
  'ml-ai': 'ML / AI',
  mlai: 'ML / AI',
  analytics: 'Analytics',
  messaging: 'Messaging',
  security: 'Security',
}

export function getCategoryDisplayName(categoryId: string): string {
  return CATEGORY_DISPLAY_NAMES[categoryId?.toLowerCase() ?? ''] ?? categoryId
}

// ── Tooltip class string ─────────────────────────────────────────────────────

/**
 * Shared Tailwind class string for custom chart tooltips.
 * Components apply this to their tooltip wrapper div.
 */
export const TOOLTIP_CLASSES =
  'bg-black/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs'
