/**
 * Centralized motion variants for the Zenith design system.
 *
 * All animations across the app should import from this module to ensure
 * consistent timing, easing, and reduced-motion behaviour.
 *
 * Values sourced from Phase 1 design-system-foundation context decisions.
 */
import type { Variants } from 'framer-motion'

// ---------------------------------------------------------------------------
// Timing constants (mirror CSS --duration-* tokens)
// ---------------------------------------------------------------------------

export const DURATION = {
  instant: 0.1, // 100ms
  fast: 0.15, // 150ms
  normal: 0.25, // 250ms
  slow: 0.4, // 400ms
  slower: 0.6 // 600ms
} as const

// ---------------------------------------------------------------------------
// Easing constants (mirror CSS --ease-* tokens)
// ---------------------------------------------------------------------------

export const EASE = {
  out: [0.25, 0.46, 0.45, 0.94] as const, // smooth deceleration
  spring: [0.34, 1.56, 0.64, 1] as const, // slight overshoot
  smooth: [0.4, 0, 0.2, 1] as const // material standard
}

// ---------------------------------------------------------------------------
// Stagger delay (60ms per design decision)
// ---------------------------------------------------------------------------

export const STAGGER_DELAY = 0.06

// ---------------------------------------------------------------------------
// Variant objects — typed as Variants from framer-motion
// ---------------------------------------------------------------------------

/** Container that staggers its children on enter. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_DELAY }
  }
}

/** Individual item inside a stagger container. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.out }
  }
}

/** Full-page transition (enter / exit). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.out }
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION.fast }
  }
}

/** Modal backdrop overlay. */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast }
  }
}

/** Modal content panel. */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.spring }
  }
}

/** Slide-in panel (e.g. right drawer). */
export const slidePanel: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.out }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: DURATION.fast }
  }
}

// ---------------------------------------------------------------------------
// Hover / tap interaction props (spread onto motion.* components)
// ---------------------------------------------------------------------------

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: DURATION.fast, ease: EASE.out } },
  whileTap: { scale: 0.97 }
}

// ---------------------------------------------------------------------------
// Reduced-motion safe getter
// ---------------------------------------------------------------------------

/**
 * Returns motion variants with transforms stripped and near-instant durations
 * when the user has requested reduced motion.  Pass the result of
 * `usePrefersReducedMotion()` as the argument.
 */
export function getReducedMotionVariants(reducedMotion: boolean) {
  if (!reducedMotion) {
    return {
      staggerContainer,
      staggerItem,
      pageTransition,
      modalOverlay,
      modalContent,
      slidePanel,
      hoverLift
    }
  }

  const instant = { duration: 0.01 }

  const reducedStaggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0 } }
  }

  const reducedStaggerItem: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: instant }
  }

  const reducedPageTransition: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: instant },
    exit: { opacity: 0, transition: instant }
  }

  const reducedModalOverlay: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: instant }
  }

  const reducedModalContent: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: instant }
  }

  const reducedSlidePanel: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: instant },
    exit: { opacity: 0, transition: instant }
  }

  const reducedHoverLift = {
    whileHover: {},
    whileTap: {}
  }

  return {
    staggerContainer: reducedStaggerContainer,
    staggerItem: reducedStaggerItem,
    pageTransition: reducedPageTransition,
    modalOverlay: reducedModalOverlay,
    modalContent: reducedModalContent,
    slidePanel: reducedSlidePanel,
    hoverLift: reducedHoverLift
  }
}
