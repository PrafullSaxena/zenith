/**
 * AnimatedIcon -- Wraps icon swaps with AnimatePresence for smooth
 * spring-scaled transitions (copy -> check, eye -> eyeOff, etc.).
 *
 * Usage:
 *   <AnimatedIcon
 *     icon={copied ? Check : Copy}
 *     iconKey={copied ? 'check' : 'copy'}
 *     size={14}
 *     className={copied ? 'text-emerald-400' : undefined}
 *   />
 */

import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@renderer/lib/useReducedMotion'

interface AnimatedIconProps {
  icon: LucideIcon
  iconKey: string
  size?: number
  className?: string
}

const springTransition = { type: 'spring' as const, stiffness: 500, damping: 30, duration: 0.15 }
const instantTransition = { duration: 0.01 }

export function AnimatedIcon({ icon: Icon, iconKey, size = 14, className }: AnimatedIconProps) {
  const reducedMotion = usePrefersReducedMotion()
  const transition = reducedMotion ? instantTransition : springTransition

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={iconKey}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={transition}
        style={{ display: 'inline-flex' }}
      >
        <Icon size={size} className={className} />
      </motion.span>
    </AnimatePresence>
  )
}
