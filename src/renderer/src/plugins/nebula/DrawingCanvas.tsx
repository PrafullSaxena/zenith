/**
 * DrawingCanvas -- Excalidraw wrapper component for Nebula note drawings.
 *
 * Mounts the Excalidraw editor in dark mode, auto-saves on changes
 * via a debounced callback. Only renders when visible to save resources.
 */

import { useCallback, useRef, useState } from 'react'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, ExcalidrawElement } from '@excalidraw/excalidraw/types'

interface DrawingCanvasProps {
  snapshot: object | null
  onSave: (snapshot: object) => void
  visible: boolean
}

export default function DrawingCanvas({
  snapshot,
  onSave,
  visible
}: DrawingCanvasProps): React.JSX.Element | null {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounced save on every change
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const state = excalidrawAPI?.getAppState()
        onSave({
          elements: JSON.parse(JSON.stringify(elements)),
          appState: state
            ? { viewBackgroundColor: state.viewBackgroundColor }
            : {}
        })
      }, 1000)
    },
    [excalidrawAPI, onSave]
  )

  if (!visible) return null

  // Parse initial data from snapshot
  const initialData =
    snapshot && typeof snapshot === 'object' && 'elements' in snapshot
      ? (snapshot as { elements: ExcalidrawElement[] })
      : undefined

  return (
    <div className="excalidraw-container relative" style={{ height: '50vh', minHeight: 300 }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={
          initialData
            ? {
                elements: initialData.elements,
                appState: {
                  viewBackgroundColor: 'transparent',
                  theme: 'dark'
                }
              }
            : {
                appState: {
                  viewBackgroundColor: 'transparent',
                  theme: 'dark'
                }
              }
        }
        onChange={handleChange}
        theme="dark"
      >
        <MainMenu>
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ClearCanvas />
        </MainMenu>
      </Excalidraw>
    </div>
  )
}
