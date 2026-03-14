/**
 * AnimatedCounter -- Animates a numeric value from 0 to the target using framer-motion.
 */
import { useEffect } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

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
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1] // easeOutExpo
    })
    return controls.stop
  }, [value, duration, motionValue])

  return <motion.span className={className}>{rounded}</motion.span>
}
