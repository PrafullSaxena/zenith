/**
 * DrawingCanvas -- tldraw wrapper component for Nebula note drawings.
 *
 * Mounts the tldraw editor in dark mode, auto-saves on changes
 * via a debounced callback. Only renders when visible to save resources.
 *
 * Key config:
 *  - Dark theme matching the app palette
 *  - Snapshot persistence via editor.getSnapshot() / loadSnapshot()
 *  - Debounced save (1s) to avoid excessive writes
 */

import { useCallback, useRef, useEffect } from 'react'
import { Tldraw } from 'tldraw'
import type { Editor } from 'tldraw'
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
  const editorRef = useRef<Editor | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounced save: serialize snapshot from the editor
  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const editor = editorRef.current
      if (!editor) return
      try {
        const snap = editor.getSnapshot()
        onSave(snap)
      } catch {
        // Ignore serialization errors
      }
    }, 1000)
  }, [onSave])

  // When the editor mounts, load snapshot and subscribe to changes
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      // Force dark mode to match app theme
      editor.updateInstanceState({ isDarkMode: true })

      // Load previously saved snapshot if available
      if (snapshot && typeof snapshot === 'object' && 'document' in snapshot) {
        try {
          editor.loadSnapshot(snapshot as Parameters<Editor['loadSnapshot']>[0])
          // Re-apply dark mode after snapshot load (snapshot may override it)
          editor.updateInstanceState({ isDarkMode: true })
        } catch {
          // Snapshot format mismatch — start fresh
        }
      }

      // Listen for store changes and auto-save
      const unsubscribe = editor.store.listen(
        () => scheduleSave(),
        { scope: 'document', source: 'user' }
      )

      return () => {
        unsubscribe()
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    },
    [snapshot, scheduleSave]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="tldraw-container relative"
      style={{ height: '50vh', minHeight: 350 }}
    >
      <Tldraw
        onMount={handleMount}
        forceMobile={false}
        inferDarkMode={false}
        options={{ maxPages: 1 }}
      />
    </div>
  )
}
