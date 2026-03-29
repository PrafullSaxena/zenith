import React from 'react'
import { motion, HTMLMotionProps, useMotionValue, useMotionTemplate } from 'framer-motion'
import { cn } from '@renderer/lib/utils'

interface SpotlightCardProps extends HTMLMotionProps<'div'> {
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(130, 81, 238, 0.15)',
  ...props
}: SpotlightCardProps): React.JSX.Element {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent): void {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <motion.div
      className={cn(
        'group relative flex overflow-hidden rounded-[24px] border border-border bg-card/40 backdrop-blur-3xl transition-all duration-500 hover:border-foreground/20 hover:bg-card/60',
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px z-0 rounded-[24px] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `
        }}
      />
      <div className="relative z-10 flex h-full w-full flex-col">{children}</div>
    </motion.div>
  )
}
