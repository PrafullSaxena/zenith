/**
 * CodePanel — Main layout for the Code tab.
 * Horizontal split: FileTree (left sidebar) | CodeTabs + CodeViewer (right).
 * Custom drag-to-resize handle (plain flexbox — no react-resizable-panels).
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { FileCode } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import FileTree from './FileTree'
import CodeTabs from './CodeTabs'
import CodeViewer from './CodeViewer'

const MIN_WIDTH = 160
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 260

export default function CodePanel(): React.JSX.Element {
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = (): void => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Left panel: File Tree */}
      <div
        className="h-full shrink-0 overflow-x-auto border-r border-white/[0.06] bg-white/[0.02]"
        style={{ width: sidebarWidth }}
      >
        <FileTree />
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={onMouseDown}
        className="flex w-2 cursor-col-resize items-center justify-center hover:bg-accent/10 transition-colors"
      >
        <div className="flex flex-col gap-1">
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
          <div className="h-1 w-1 rounded-full bg-text-secondary/30" />
        </div>
      </div>

      {/* Right panel: Code Tabs + Code Viewer */}
      <div className="h-full min-w-0 flex-1">
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
      </div>
    </div>
  )
}
