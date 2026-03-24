import { useCallback, useRef } from 'react'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassResizeHandleProps {
  onResize: (deltaX: number) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassResizeHandle({ onResize, className }: GlassResizeHandleProps) {
  const dragging = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      document.body.style.userSelect = 'none'

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        onResize(ev.movementX)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [onResize]
  )

  return (
    <div
      className={cn(
        'w-2 cursor-col-resize flex items-center justify-center group',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="w-0.5 h-8 rounded-full bg-white/10 group-hover:bg-[var(--color-accent)]/50 transition-colors" />
    </div>
  )
}
