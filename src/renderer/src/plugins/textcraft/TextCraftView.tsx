/**
 * TextCraftView -- Main view for the TextCraft AI text refinement plugin.
 *
 * Layout:
 *  - Header: Card with Wand2 icon, gradient title, and GlassTab bar (Refine / History)
 *  - Refine tab: Three-panel resizable layout: InputPanel (left), ControlsPanel (middle), OutputPanel (right)
 *  - History tab: Full-width HistoryPanel showing saved refinements
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useState, useEffect } from 'react'
import { Wand2, Clock, PenLine } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
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

export default function TextCraftView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('refine')

  const history = useTextCraftStore((s) => s.history)

  // Load history on mount
  useEffect(() => {
    useTextCraftStore.getState().loadHistory()
  }, [])

  return (
    <div className="flex h-full flex-col">
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
          >
            <PanelGroup orientation="horizontal" className="w-full h-full">
              {/* Left: Input */}
              <Panel defaultSize="33%" minSize="20%" className="h-full p-4 overflow-hidden flex flex-col">
                <InputPanel />
              </Panel>

              <PanelResizeHandle className="w-1 shrink-0 bg-transparent transition-colors hover:bg-primary/20 active:bg-primary/40 cursor-col-resize -mx-0.5 z-10" />

              {/* Middle: Controls */}
              <Panel defaultSize="33%" minSize="20%" className="h-full p-4 overflow-hidden flex flex-col">
                <ControlsPanel />
              </Panel>

              <PanelResizeHandle className="w-1 shrink-0 bg-transparent transition-colors hover:bg-primary/20 active:bg-primary/40 cursor-col-resize -mx-0.5 z-10" />

              {/* Right: Output */}
              <Panel defaultSize="34%" minSize="20%" className="h-full p-4 overflow-hidden flex flex-col">
                <OutputPanel />
              </Panel>
            </PanelGroup>
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
