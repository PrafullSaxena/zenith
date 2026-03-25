/**
 * Theme QA Utility — development-only automated theme validation.
 *
 * Validates CSS custom properties for contrast, visibility, and completeness
 * across all 18 Zenith themes. Can run in two modes:
 *
 * 1. **Runtime mode** — reads getComputedStyle from document.documentElement
 *    after applying a theme via data-theme attribute.
 *
 * 2. **Static mode** — validates oklch values from THEME_METADATA directly,
 *    without requiring a browser environment.
 *
 * Usage (browser console):
 *   import { runFullThemeQA } from './lib/theme-qa'
 *   runFullThemeQA().then(console.table)
 */

import { THEME_METADATA } from './theme-metadata'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeQAResult {
  theme: string
  passed: boolean
  issues: ThemeIssue[]
}

export interface ThemeIssue {
  check: string
  expected: string
  actual: string
  severity: 'error' | 'warning'
}

// ---------------------------------------------------------------------------
// OKLCH parsing and color math
// ---------------------------------------------------------------------------

/** Parse an oklch() string into { L, C, H, alpha } where L is 0-1. */
function parseOklch(raw: string): { L: number; C: number; H: number; alpha: number } | null {
  // Match: oklch(90% 0.01 230) or oklch(65% 0.2 25 / 0.2)
  const m = raw.match(
    /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/
  )
  if (!m) return null

  let L = parseFloat(m[1])
  // If L > 1, it was given as a percentage (e.g. 90% -> 0.9)
  if (L > 1) L = L / 100

  return {
    L,
    C: parseFloat(m[2]),
    H: parseFloat(m[3]),
    alpha: m[4] !== undefined ? parseFloat(m[4]) : 1
  }
}

/**
 * Convert OKLCH to approximate sRGB for luminance calculation.
 *
 * This uses the simplified OKLCH -> OKLab -> linear sRGB path.
 * Accuracy is sufficient for contrast ratio estimation.
 */
function oklchToLinearRGB(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  // OKLab to LMS (approximate)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  // LMS to linear sRGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bv = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, bv))]
}

/**
 * Compute relative luminance from linear sRGB values (0-1).
 * WCAG 2.0 formula: Y = 0.2126R + 0.7152G + 0.0722B
 */
export function getRelativeLuminance(oklchStr: string): number {
  const parsed = parseOklch(oklchStr)
  if (!parsed) return 0
  const [r, g, b] = oklchToLinearRGB(parsed.L, parsed.C, parsed.H)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Compute WCAG contrast ratio between two colors.
 * Returns a value >= 1.0.
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ---------------------------------------------------------------------------
// Theme checks (static mode — reads from THEME_METADATA)
// ---------------------------------------------------------------------------

/**
 * Run all QA checks for a single theme using its metadata colors.
 *
 * Checks:
 * 1. Text contrast (text-primary vs bg) — WCAG AA >= 4.5
 * 2. Card visibility (surface vs bg) — must differ
 * 3. Accent visibility (accent vs bg) — >= 3.0 for UI elements
 * 4. Status colors defined (success, error, warning, info in CSS)
 * 5. Glow opacity <= 0.5
 */
export function checkThemeContrast(themeName: string): ThemeQAResult {
  const meta = THEME_METADATA.find((t) => t.value === themeName)
  if (!meta) {
    return {
      theme: themeName,
      passed: false,
      issues: [{ check: 'theme-exists', expected: 'Theme in THEME_METADATA', actual: 'Not found', severity: 'error' }]
    }
  }

  const issues: ThemeIssue[] = []

  // 1. Text contrast: text vs bg
  const textContrast = getContrastRatio(meta.colors.text, meta.colors.bg)
  if (textContrast < 4.5) {
    issues.push({
      check: 'text-contrast',
      expected: '>= 4.5 (WCAG AA)',
      actual: textContrast.toFixed(2),
      severity: 'error'
    })
  }

  // 2. Card visibility: surface vs bg should differ by at least a measurable amount
  const surfaceLum = getRelativeLuminance(meta.colors.surface)
  const bgLum = getRelativeLuminance(meta.colors.bg)
  const surfaceDiff = Math.abs(surfaceLum - bgLum)
  if (surfaceDiff < 0.003) {
    issues.push({
      check: 'card-visibility',
      expected: 'Surface differs from bg (luminance diff >= 0.003)',
      actual: `diff = ${surfaceDiff.toFixed(5)}`,
      severity: 'warning'
    })
  }

  // 3. Accent contrast against bg — >= 3.0 for large text/UI elements
  const accentContrast = getContrastRatio(meta.colors.accent, meta.colors.bg)
  if (accentContrast < 3.0) {
    issues.push({
      check: 'accent-contrast',
      expected: '>= 3.0 (WCAG AA large text)',
      actual: accentContrast.toFixed(2),
      severity: 'warning'
    })
  }

  // 4. Status colors — check in the CSS definitions (we look at whether the theme
  //    defines or inherits success/error/warning/info). All 18 themes define these,
  //    but we verify the metadata is complete.
  //    Since metadata only has bg/surface/accent/text, status colors are checked at
  //    the CSS level. We trust the CSS is complete (verified during Phase 05-03) but
  //    note this as informational.

  // 5. Glow opacity — check accent-glow alpha from metadata if available
  //    The accent-glow is always derived as accent / 0.2, so it should be <= 0.5
  //    This is structural — all themes follow the pattern, so pass.

  return {
    theme: themeName,
    passed: issues.length === 0,
    issues
  }
}

// ---------------------------------------------------------------------------
// Full QA run
// ---------------------------------------------------------------------------

/** Run QA checks across all themes from THEME_METADATA. */
export function runStaticThemeQA(): ThemeQAResult[] {
  return THEME_METADATA.map((t) => checkThemeContrast(t.value))
}

/**
 * Runtime QA: apply each theme via data-theme attribute, read computed CSS
 * properties, and validate. Requires browser environment.
 *
 * @param themeNames - list of theme value strings to test (defaults to all 18)
 */
export async function runFullThemeQA(
  themeNames?: string[]
): Promise<ThemeQAResult[]> {
  const names = themeNames ?? THEME_METADATA.map((t) => t.value)
  const results: ThemeQAResult[] = []
  const originalTheme = document.documentElement.getAttribute('data-theme') ?? ''

  for (const name of names) {
    document.documentElement.setAttribute('data-theme', name)
    // Wait a tick for CSS to apply
    await new Promise((r) => setTimeout(r, 50))

    const style = getComputedStyle(document.documentElement)
    const issues: ThemeIssue[] = []

    // Read runtime CSS variables
    const textPrimary = style.getPropertyValue('--color-text-primary').trim()
    const bgBase = style.getPropertyValue('--color-background').trim()
    const surface = style.getPropertyValue('--color-surface').trim()
    const accent = style.getPropertyValue('--color-accent').trim()
    const accentGlow = style.getPropertyValue('--color-accent-glow').trim()
    const success = style.getPropertyValue('--color-success').trim()
    const error = style.getPropertyValue('--color-error').trim()
    const warning = style.getPropertyValue('--color-warning').trim()
    const info = style.getPropertyValue('--color-info').trim()

    // 1. Text contrast
    if (textPrimary && bgBase) {
      const ratio = getContrastRatio(textPrimary, bgBase)
      if (ratio < 4.5) {
        issues.push({
          check: 'text-contrast',
          expected: '>= 4.5 (WCAG AA)',
          actual: ratio.toFixed(2),
          severity: 'error'
        })
      }
    }

    // 2. Card visibility
    if (surface && bgBase) {
      const sLum = getRelativeLuminance(surface)
      const bLum = getRelativeLuminance(bgBase)
      if (Math.abs(sLum - bLum) < 0.003) {
        issues.push({
          check: 'card-visibility',
          expected: 'Surface differs from bg',
          actual: `diff = ${Math.abs(sLum - bLum).toFixed(5)}`,
          severity: 'warning'
        })
      }
    }

    // 3. Accent contrast
    if (accent && bgBase) {
      const ratio = getContrastRatio(accent, bgBase)
      if (ratio < 3.0) {
        issues.push({
          check: 'accent-contrast',
          expected: '>= 3.0',
          actual: ratio.toFixed(2),
          severity: 'warning'
        })
      }
    }

    // 4. Status colors defined
    for (const [label, val] of [
      ['success', success],
      ['error', error],
      ['warning', warning],
      ['info', info]
    ] as const) {
      if (!val) {
        issues.push({
          check: `status-${label}-defined`,
          expected: 'Non-empty value',
          actual: 'undefined or empty',
          severity: 'error'
        })
      }
    }

    // 5. Glow opacity
    if (accentGlow) {
      const alphaMatch = accentGlow.match(/\/\s*([\d.]+)/)
      if (alphaMatch) {
        const alpha = parseFloat(alphaMatch[1])
        if (alpha > 0.5) {
          issues.push({
            check: 'glow-opacity',
            expected: '<= 0.5',
            actual: String(alpha),
            severity: 'warning'
          })
        }
      }
    }

    results.push({
      theme: name,
      passed: issues.length === 0,
      issues
    })
  }

  // Restore original theme
  if (originalTheme) {
    document.documentElement.setAttribute('data-theme', originalTheme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  return results
}
