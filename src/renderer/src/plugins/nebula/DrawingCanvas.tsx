/**
 * DrawingCanvas -- tldraw v4 wrapper component for Nebula note drawings.
 *
 * Always-mounted inside the resizable drawing panel. The panel's
 * collapse/expand state controls visibility -- this component no longer
 * has a `visible` prop.
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

import { useCallback, useRef, useEffect, memo } from 'react'
import { Tldraw } from 'tldraw'
import type { Editor, TLEditorSnapshot, TLStoreSnapshot } from 'tldraw'
import { Card } from '@renderer/components/ui/card'

interface DrawingCanvasProps {
  snapshot: object | null
  onSave: (snapshot: object) => void
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

function DrawingCanvas({
  snapshot,
  onSave
}: DrawingCanvasProps): React.JSX.Element {
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

  // Parse snapshot for tldraw — pass undefined if null or invalid
  const tldrawSnapshot = isValidSnapshot(snapshot) ? snapshot : undefined

  return (
    <Card className="h-full w-full overflow-hidden rounded-none border-x-0 border-t-0 p-0">
      <div className="tldraw__editor h-full">
        <Tldraw
          snapshot={tldrawSnapshot}
          onMount={handleMount}
          inferDarkMode={false}
          options={{ maxPages: 1 }}
        />
      </div>
    </Card>
  )
}

// Prevent re-renders from parent state changes (isSaving, showSaved, activeNote.drawing).
// key={noteId} on the parent forces remount when switching notes.
// snapshot is only for initial hydration; onSave updates via ref internally.
export default memo(DrawingCanvas, () => true)
