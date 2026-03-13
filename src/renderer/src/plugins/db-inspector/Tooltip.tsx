import React, { useState, useRef, useCallback } from 'react'

interface TooltipProps {
  content: string
  shortcut?: string
  children: React.ReactNode
  position?: 'top' | 'bottom'
  delay?: number
}

export default function Tooltip({ content, shortcut, children, position = 'bottom', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay)
  }, [delay])

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 rounded text-[10px] font-medium bg-surface-hover text-text-primary border border-border shadow-lg whitespace-nowrap pointer-events-none animate-tooltip-fade-in ${
            position === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
          }`}
        >
          <span>{content}</span>
          {shortcut && (
            <span className="ml-1.5 text-text-secondary/70">{shortcut}</span>
          )}
        </div>
      )}
    </div>
  )
}
