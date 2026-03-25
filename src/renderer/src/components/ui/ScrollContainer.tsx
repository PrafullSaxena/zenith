/**
 * ScrollContainer -- Reusable wrapper providing:
 *  - 2px accent-colored scroll progress bar at top
 *  - 20px gradient fade shadows at top/bottom when content overflows
 *
 * Uses refs (no React state) for scroll position to avoid 60fps re-renders.
 */

import { useRef, useEffect, useCallback, type ReactNode } from 'react'

interface ScrollContainerProps {
  children: ReactNode
  className?: string
  showProgress?: boolean
  showShadows?: boolean
}

export function ScrollContainer({
  children,
  className,
  showProgress = true,
  showShadows = true
}: ScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const topShadowRef = useRef<HTMLDivElement>(null)
  const bottomShadowRef = useRef<HTMLDivElement>(null)

  const updateIndicators = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight - clientHeight

    // Progress bar
    if (progressRef.current) {
      const percentage = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0
      progressRef.current.style.width = `${percentage}%`
    }

    // Top shadow
    if (topShadowRef.current) {
      topShadowRef.current.style.opacity = scrollTop > 0 ? '1' : '0'
    }

    // Bottom shadow
    if (bottomShadowRef.current) {
      bottomShadowRef.current.style.opacity =
        scrollTop < scrollable - 1 ? '1' : '0'
    }
  }, [])

  // Observe content size changes to update initial shadow visibility
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    updateIndicators()

    const observer = new ResizeObserver(() => {
      updateIndicators()
    })
    observer.observe(el)
    // Also observe the first child (content size changes)
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild)
    }

    return () => observer.disconnect()
  }, [updateIndicators])

  return (
    <div className="relative" style={{ position: 'relative' }}>
      {/* Progress bar */}
      {showProgress && (
        <div
          ref={progressRef}
          className="absolute top-0 left-0 z-10 h-0.5 bg-[var(--color-accent)]"
          style={{ width: '0%', transition: 'width 50ms linear' }}
        />
      )}

      {/* Top shadow */}
      {showShadows && (
        <div
          ref={topShadowRef}
          className="pointer-events-none absolute left-0 right-0 z-10 transition-opacity duration-150"
          style={{
            top: showProgress ? 2 : 0,
            height: 20,
            opacity: 0,
            background: 'linear-gradient(to bottom, var(--color-bg-base), transparent)'
          }}
        />
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={updateIndicators}
        className={`overflow-y-auto ${className ?? ''}`}
      >
        {children}
      </div>

      {/* Bottom shadow */}
      {showShadows && (
        <div
          ref={bottomShadowRef}
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-150"
          style={{
            height: 20,
            opacity: 0,
            background: 'linear-gradient(to top, var(--color-bg-base), transparent)'
          }}
        />
      )}
    </div>
  )
}
