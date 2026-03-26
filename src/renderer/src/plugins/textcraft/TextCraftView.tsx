/**
 * TextCraftView -- Main view for the TextCraft AI text refinement plugin.
 *
 * Layout:
 *  - Header: Card with Wand2 icon, gradient title, and GlassTab bar (Refine / History)
 *  - Refine tab: Three-panel resizable layout: InputPanel (left), ControlsPanel (middle), OutputPanel (right)
 *  - History tab: Full-width HistoryPanel showing saved refinements
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Wand2, Clock, PenLine } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@renderer/lib/motion'
import { Card } from '@renderer/components/ui/card'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { PageHeader } from '../../components/shared/page-header'
import type { LucideIcon } from 'lucide-react'
import { useTextCraftStore } from '../../stores/textcraft-store'

interface CardTab {
  id: string
  label: string
  icon: LucideIcon
}
import InputPanel from './InputPanel'
import ControlsPanel from './ControlsPanel'
import OutputPanel from './OutputPanel'
import HistoryPanel from './HistoryPanel'

const tabs: CardTab[] = [
  { id: 'refine', label: 'Refine', icon: Wand2 },
  { id: 'history', label: 'History', icon: Clock }
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function TextCraftView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('refine')
  const [leftWidth, setLeftWidth] = useState(33)
  const [rightWidth, setRightWidth] = useState(33)
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidthRef = useRef(800)

  const history = useTextCraftStore((s) => s.history)

  // Load history on mount
  useEffect(() => {
    useTextCraftStore.getState().loadHistory()
  }, [])

  // Track container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidthRef.current = entry.contentRect.width
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleLeftResize = useCallback((dx: number) => {
    setLeftWidth((prev) => clamp(prev + (dx * 100) / containerWidthRef.current, 20, 50))
  }, [])

  const handleRightResize = useCallback((dx: number) => {
    setRightWidth((prev) => clamp(prev - (dx * 100) / containerWidthRef.current, 20, 50))
  }, [])

  /** Creates onMouseDown for a resize handle that fires `onDrag(dx)` per mouse-move. */
  const makeResizeHandler = useCallback(
    (onDrag: (dx: number) => void) => (e: React.MouseEvent) => {
      e.preventDefault()
      let lastX = e.clientX
      const onMouseMove = (ev: MouseEvent): void => {
        const dx = ev.clientX - lastX
        lastX = ev.clientX
        onDrag(dx)
      }
      const onMouseUp = (): void => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    []
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header + tab bar */}
      <PageHeader
        icon={Wand2}
        title="TextCraft"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab content with AnimatePresence page transitions */}
      <AnimatePresence mode="wait">
        {activeTab === 'refine' ? (
          <motion.div
            key="refine"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 overflow-hidden"
            ref={containerRef}
          >
            {/* Left: Input */}
            <div style={{ width: leftWidth + '%' }} className="shrink-0 overflow-hidden">
              <InputPanel />
            </div>

            <div
              onMouseDown={makeResizeHandler(handleLeftResize)}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary/70 transition-colors"
            />

            {/* Middle: Controls */}
            <div className="flex-1 overflow-hidden">
              <ControlsPanel />
            </div>

            <div
              onMouseDown={makeResizeHandler(handleRightResize)}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary/70 transition-colors"
            />

            {/* Right: Output */}
            <div style={{ width: rightWidth + '%' }} className="shrink-0 overflow-hidden">
              <OutputPanel />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 overflow-hidden"
          >
            {history.length === 0 ? (
              <EmptyState
                icon={PenLine}
                title="No refinements yet"
                description="Write or paste text in the input panel and refine it with AI to see your history here."
                className="flex-1"
              />
            ) : (
              <HistoryPanel />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
