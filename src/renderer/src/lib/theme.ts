/**
 * Zenith theme constants and metadata.
 *
 * HSL values here MUST match the CSS custom properties in main.css :root block.
 * Used for programmatic color access (charts, canvas, dynamic styles).
 */

export interface ThemeDefinition {
  id: string
  label: string
  mode: 'dark'
  /** Primary accent color as HSL string (for swatches / previews) */
  primaryHsl: string
}

/** All available themes. First entry is the default. */
export const THEMES: ThemeDefinition[] = [
  { id: 'zenith', label: 'Zenith Violet', mode: 'dark', primaryHsl: '263 75% 60%' },
  { id: 'obsidian-indigo', label: 'Obsidian Indigo', mode: 'dark', primaryHsl: '234 89% 67%' },
  { id: 'carbon-emerald', label: 'Carbon Emerald', mode: 'dark', primaryHsl: '160 84% 50%' },
  { id: 'midnight-amber', label: 'Midnight Amber', mode: 'dark', primaryHsl: '38 92% 55%' },
]

export const THEME = THEMES[0]

/** Raw HSL strings matching CSS vars for the default theme (without hsl() wrapper) */
export const themeColors = {
  background: "240 12% 6%",
  foreground: "220 15% 95%",
  card: "240 8% 11%",
  primary: "263 75% 60%",
  secondary: "240 6% 16%",
  muted: "240 6% 16%",
  mutedForeground: "240 8% 62%",
  accent: "263 75% 60%",
  destructive: "0 72% 55%",
  success: "152 70% 48%",
  warning: "38 95% 52%",
  info: "217 92% 62%",
  border: "240 6% 20%",
  ring: "263 75% 60%",
} as const

/** Convert an HSL string to a CSS hsl() value */
export function hsl(value: string, opacity?: number): string {
  return opacity !== undefined
    ? `hsl(${value} / ${opacity})`
    : `hsl(${value})`
}

/** Status color map for badges, icons, dots */
export const statusColors = {
  success: themeColors.success,
  error: themeColors.destructive,
  warning: themeColors.warning,
  info: themeColors.info,
  primary: themeColors.primary,
} as const

export type StatusColor = keyof typeof statusColors
