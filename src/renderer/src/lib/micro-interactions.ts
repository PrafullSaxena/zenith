/**
 * micro-interactions.ts -- Shared CSS class constants and Framer Motion variants
 * for consistent micro-interactions across the Zenith UI.
 *
 * Usage:
 *  - Tailwind class strings: merge into component classNames via `cn()`
 *  - Framer Motion variants: pass to `<motion.div variants={dialogVariants}>` etc.
 */

// ---------------------------------------------------------------------------
// Tailwind class constants
// ---------------------------------------------------------------------------

/** Card hover: lift 1px, brighten border, add shadow. 200ms ease-out. */
export const interactiveCardClasses =
  'transition-all duration-200 ease-out hover:-translate-y-px hover:border-muted-foreground/30 hover:shadow-lg cursor-pointer'

/** Button/interactive press: scale down to 0.97. 150ms ease-out. */
export const pressScaleClasses =
  'active:scale-[0.97] transition-transform duration-150 ease-out'

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

/** Dialog open/close: scale + fade */
export const dialogVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } }
}

/** Accordion / collapsible section: height animation */
export const accordionVariants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' as const },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden' as const,
    transition: { duration: 0.25, ease: 'easeOut' }
  }
}
