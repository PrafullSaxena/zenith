/**
 * TextCraftView -- Main view for the TextCraft AI text refinement plugin.
 *
 * Layout:
 *  - Header: plugin title with PenLine icon
 *  - Three-panel content: InputPanel (left), ControlsPanel (middle), OutputPanel (right)
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { PenLine } from 'lucide-react'
import { useEffect } from 'react'
import { useTextCraftStore } from '../../stores/textcraft-store'
import InputPanel from './InputPanel'
import ControlsPanel from './ControlsPanel'
import OutputPanel from './OutputPanel'

export default function TextCraftView(): React.JSX.Element {
  // Load history on mount
  useEffect(() => {
    useTextCraftStore.getState().loadHistory()
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">TextCraft</h1>
          <span className="text-xs text-text-secondary">AI Text Refinement</span>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
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
      </div>
    </div>
  )
}
