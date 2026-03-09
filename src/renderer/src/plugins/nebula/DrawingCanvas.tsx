/**
 * DrawingCanvas -- tldraw wrapper component for Nebula note drawings.
 *
 * Mounts the full tldraw editor in dark mode, auto-saves snapshots on changes
 * via a debounced listener. Only renders when visible to save resources.
 *
 * Uses inferDarkMode to automatically detect and apply dark color scheme.
 */

import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

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
  if (!visible) return null

  // Build tldraw props -- snapshot is typed as TLEditorSnapshot | TLStoreSnapshot
  // but we store it as plain object, so we cast here.
  const tldrawProps: Record<string, unknown> = {
    inferDarkMode: true,
    onMount: (editor: Editor) => {
      // Debounced auto-save on document changes
      let timeout: ReturnType<typeof setTimeout>
      editor.store.listen(
        () => {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            onSave(editor.getSnapshot())
          }, 1000)
        },
        { scope: 'document' }
      )
    }
  }

  if (snapshot) {
    tldrawProps.snapshot = snapshot
  }

  return (
    <div style={{ height: 350 }} className="border-t border-border">
      <Tldraw {...(tldrawProps as Parameters<typeof Tldraw>[0])} />
    </div>
  )
}
