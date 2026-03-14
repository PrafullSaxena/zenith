/**
 * CodePanel — Main layout for the Code tab.
 * Horizontal split: FileTree (left sidebar) | CodeTabs + CodeViewer (right).
 * Uses react-resizable-panels for resize handle.
 */
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { FileCode } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import FileTree from './FileTree'
import CodeTabs from './CodeTabs'
import CodeViewer from './CodeViewer'

export default function CodePanel(): React.JSX.Element {
  const activeFilePath = useCortexStore((s) => s.activeFilePath)

  return (
    <div className="h-full">
      <PanelGroup direction="horizontal">
        {/* Left panel: File Tree */}
        <Panel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full overflow-x-auto border-r border-border bg-surface">
            <FileTree />
          </div>
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle className="group w-2 cursor-col-resize flex items-center justify-center">
          <div className="h-full w-px bg-border/40 transition-colors group-hover:w-0.5 group-hover:bg-accent/40" />
        </PanelResizeHandle>

        {/* Right panel: Code Tabs + Code Viewer */}
        <Panel defaultSize={80}>
          {activeFilePath ? (
            <div className="flex h-full flex-col">
              <CodeTabs />
              <div className="flex-1 overflow-hidden">
                <CodeViewer />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
              <FileCode size={32} className="opacity-30" />
              <p className="text-sm">Select a file from the tree to view its contents</p>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  )
}
