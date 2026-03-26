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
import { Wand2, Clock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@renderer/lib/motion'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useTextCraftStore } from '../../stores/textcraft-store'
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header + tab bar */}
      <Card
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

            <div onResize={handleLeftResize} />

            {/* Middle: Controls */}
            <div className="flex-1 overflow-hidden">
              <ControlsPanel />
            </div>

            <div onResize={handleRightResize} />

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
            <HistoryPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
