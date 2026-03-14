/**
 * AnimatedCounter -- Animates a numeric value from 0 to the target using framer-motion.
 * When the user prefers reduced motion the value is rendered directly, without animation.
 */
import { useEffect } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'
import { usePrefersReducedMotion } from './useReducedMotion'

interface Props {
  value: number
  duration?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  duration = 0.8,
  className
}: Props): React.JSX.Element {
  const reducedMotion = usePrefersReducedMotion()
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1] // easeOutExpo
    })
    return controls.stop
  }, [value, duration, motionValue, reducedMotion])

  if (reducedMotion) {
    return <span className={className}>{value.toLocaleString()}</span>
  }

  return <motion.span className={className}>{rounded}</motion.span>
}
