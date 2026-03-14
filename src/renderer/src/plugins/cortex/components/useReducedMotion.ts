/**
 * useReducedMotion -- Returns true when the user has requested reduced motion
 * via the OS / browser `prefers-reduced-motion: reduce` media query.
 * Updates reactively when the system preference changes.
 */
import { useState, useEffect } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
