/**
 * TextCraftView -- Main view for the TextCraft AI text refinement plugin.
 *
 * Layout:
 *  - Header: plugin title with PenLine icon + tab bar (Refine / History)
 *  - Refine tab: Three-panel content: InputPanel (left), ControlsPanel (middle), OutputPanel (right)
 *  - History tab: Full-width HistoryPanel showing saved refinements
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useState } from 'react'
import { PenLine, Clock } from 'lucide-react'
import { useEffect } from 'react'
import { useTextCraftStore } from '../../stores/textcraft-store'
import InputPanel from './InputPanel'
import ControlsPanel from './ControlsPanel'
import OutputPanel from './OutputPanel'
import HistoryPanel from './HistoryPanel'

type TextCraftTab = 'refine' | 'history'

export default function TextCraftView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TextCraftTab>('refine')
  const historyCount = useTextCraftStore((s) => s.history.length)

  // Load history on mount
  useEffect(() => {
    useTextCraftStore.getState().loadHistory()
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header + tab bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">TextCraft</h1>
          <span className="text-xs text-text-secondary">AI Text Refinement</span>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 ml-6">
          <button
            type="button"
            onClick={() => setActiveTab('refine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'refine'
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60'
            }`}
          >
            <PenLine size={12} />
            Refine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60'
            }`}
          >
            <Clock size={12} />
            History
            {historyCount > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full leading-none ${
                activeTab === 'history' ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-text-secondary/60'
              }`}>
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'refine' ? (
          <>
            {/* Left: Input */}
            <div className="flex-1 overflow-hidden border-r border-border">
              <InputPanel />
            </div>

            {/* Middle: Controls */}
            <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
              <ControlsPanel />
            </div>

            {/* Right: Output */}
            <div className="flex-1 overflow-hidden">
              <OutputPanel />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            <HistoryPanel />
          </div>
        )}
      </div>
    </div>
  )
}
