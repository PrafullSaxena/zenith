/**
 * DrawingCanvas -- tldraw v4 wrapper component for Nebula note drawings.
 *
 * Mounts the tldraw editor in dark mode, auto-saves on changes
 * via a debounced callback. Only renders when visible to save resources.
 *
 * Key design:
 *  - Uses `snapshot` prop on <Tldraw> for initial data hydration
 *  - Dark mode: CSS safety net in main.css forces dark theme variables,
 *    onMount sets full dark mode via user preferences API
 *  - onMount returns a cleanup function (tldraw v4 supports this)
 *  - Parent passes key={noteId} to force remount when switching notes
 *
 * Note: tldraw CSS is imported in main.css (after Tailwind) to ensure
 * deterministic CSS ordering and avoid code-split loading issues.
 */

import { useCallback, useRef, useEffect } from 'react'
import { Tldraw } from 'tldraw'
import type { Editor, TLEditorSnapshot, TLStoreSnapshot } from 'tldraw'

interface DrawingCanvasProps {
  snapshot: object | null
  onSave: (snapshot: object) => void
  visible: boolean
}

/**
 * Type guard: check if snapshot looks like a valid tldraw editor snapshot.
 * A TLEditorSnapshot has { document: { store: {...} }, session: {...} }
 */
function isValidSnapshot(
  snap: unknown
): snap is TLEditorSnapshot | TLStoreSnapshot {
  if (!snap || typeof snap !== 'object') return false
  const obj = snap as Record<string, unknown>
  // TLEditorSnapshot shape (from editor.getSnapshot()) — must have document
  if ('document' in obj && obj.document && typeof obj.document === 'object') return true
  // TLStoreSnapshot shape (from store.getSnapshot()) — must have store
  if ('store' in obj && obj.store && typeof obj.store === 'object') return true
  return false
}

export default function DrawingCanvas({
  snapshot,
  onSave,
  visible
}: DrawingCanvasProps): React.JSX.Element | null {
  const editorRef = useRef<Editor | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Use a ref for onSave to avoid stale closures in the store listener
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // When the editor mounts, set dark mode and subscribe to changes
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor

    // Force dark mode to match app theme.
    // CSS safety net in main.css ensures icons are visible immediately;
    // this call applies the full .tl-theme__dark class for all theme variables.
    editor.user.updateUserPreferences({ colorScheme: 'dark' })

    // Subscribe to user document changes for auto-save
    const unsubscribe = editor.store.listen(
      () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          try {
            const snap = editor.getSnapshot()
            onSaveRef.current(snap)
          } catch {
            // Ignore serialization errors
          }
        }, 1000)
      },
      { source: 'user', scope: 'document' }
    )

    // tldraw v4 supports returning a cleanup function from onMount
    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Cleanup timer on unmount (belt-and-suspenders for the onMount cleanup)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!visible) return null

  // Parse snapshot for tldraw — pass undefined if null or invalid
  const tldrawSnapshot = isValidSnapshot(snapshot) ? snapshot : undefined

  return (
    <div style={{ height: '50vh', minHeight: 350 }}>
      <div className="tldraw__editor">
        <Tldraw
          snapshot={tldrawSnapshot}
          onMount={handleMount}
          inferDarkMode={false}
          options={{ maxPages: 1 }}
        />
      </div>
    </div>
  )
}
