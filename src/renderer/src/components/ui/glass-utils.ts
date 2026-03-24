/**
 * Glass design system utilities.
 *
 * cn()        — lightweight class-name merger (no external deps)
 * GLASS_BASE  — tier constants for translucent and blur glass styles
 */

// ---------------------------------------------------------------------------
// Class-name merger
// ---------------------------------------------------------------------------

/** Filters falsy values and joins remaining class names with a space. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Glass tier constants
// ---------------------------------------------------------------------------

/**
 * Two-tier glass background system:
 *
 * - **blur** — backdrop-blur + translucent bg (GlassCard, GlassModal, GlassToast)
 * - **translucent** — translucent bg only, no blur (GlassSurface, GlassButton, etc.)
 *
 * All values reference CSS custom properties defined in main.css.
 */
export const GLASS_BASE = {
  blur: 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]',
  translucent: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
} as const
