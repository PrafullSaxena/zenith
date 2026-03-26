/**
 * Zenith theme constants and metadata.
 *
 * HSL values here MUST match the CSS custom properties in main.css :root block.
 * Used for programmatic color access (charts, canvas, dynamic styles).
 */

export const THEME = {
  name: "zenith-violet",
  label: "Zenith Violet",
  mode: "dark" as const,
} as const

/** Raw HSL strings matching CSS vars (without hsl() wrapper) */
export const themeColors = {
  background: "240 10% 4%",
  foreground: "0 0% 95%",
  card: "240 6% 8%",
  primary: "263 70% 58%",
  secondary: "240 4% 16%",
  muted: "240 4% 16%",
  mutedForeground: "240 5% 65%",
  accent: "263 70% 58%",
  destructive: "0 63% 51%",
  success: "142 71% 45%",
  warning: "38 92% 50%",
  info: "217 91% 60%",
  border: "240 4% 16%",
  ring: "263 70% 58%",
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
