/**
 * DrawingCanvas -- Excalidraw wrapper component for Nebula note drawings.
 *
 * Replaces the previous tldraw v4 implementation with Excalidraw.
 *
 * Key design:
 *  - Uses <Excalidraw> for initial data hydration via initialData prop
 *  - Dark mode: enforced via `theme="dark"` prop
 *  - onChange fires on every canvas change → debounced 1000ms auto-save
 *  - Parent passes key={noteId} to force remount when switching notes
 *  - Snapshot stored as `{ type: 'excalidraw', elements, appState, files }`
 *    to allow format detection and safe upgrade in future
 *  - Old tldraw snapshots are silently reset (incompatible format)
 *
 * Note: Excalidraw CSS is imported here (via JS import) so Vite's module
 * resolver handles the package.json conditional exports (dev vs prod).
 * A plain CSS @import in main.css uses PostCSS resolution which does NOT
 * understand conditional exports, causing the stylesheet to silently fail.
 */

// Must be first — Vite resolves this via JS resolver (respects exports map)
import '@excalidraw/excalidraw/index.css'

import { useRef, useEffect, useCallback, memo } from 'react'
import { Excalidraw, FONT_FAMILY } from '@excalidraw/excalidraw'
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  AppState,
  BinaryFiles
} from '@excalidraw/excalidraw/types'
import { Card } from '@renderer/components/ui/card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExcalidrawSnapshot {
  type: 'excalidraw'
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

interface DrawingCanvasProps {
  snapshot: object | null
  onSave: (snapshot: object) => void
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Returns a parsed ExcalidrawSnapshot if the stored object is a valid
 * Excalidraw snapshot produced by this component.
 * Silently returns null for old tldraw snapshots or null/invalid data.
 */
function parseSnapshot(raw: object | null): ExcalidrawSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj.type !== 'excalidraw') return null // old tldraw data — start fresh
  if (!Array.isArray(obj.elements)) return null
  return raw as ExcalidrawSnapshot
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrawingCanvas({ snapshot, onSave }: DrawingCanvasProps): React.JSX.Element {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    // Tell Excalidraw where to load fonts from. Without this it falls back to
    // fetching from https://esm.sh CDN which is blocked by the app's CSP.
    // Fonts are copied from node_modules to public/excalidraw-assets/ by the
    // Vite plugin in electron.vite.config.ts at build/dev-start time.
    //
    // IMPORTANT: cannot use a root-relative path like '/excalidraw-assets/'
    // because in production Electron loads the renderer via file:// protocol,
    // which gives window.location.origin === "null" (literal string). Excalidraw's
    // normalizeBaseUrl does new URL(path, "null") → throws → no URL pushed →
    // falls through to CDN fallback (esm.sh) which is blocked by CSP.
    //
    // Fix: compute an absolute URL from window.location.href, which is a full
    // file:/// URL in production and http://localhost in dev. Both resolve correctly.
    window.EXCALIDRAW_ASSET_PATH = new URL('./excalidraw-assets/', window.location.href).href
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const snap: ExcalidrawSnapshot = {
          type: 'excalidraw',
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemStrokeColor: appState.currentItemStrokeColor,
            currentItemBackgroundColor: appState.currentItemBackgroundColor,
            currentItemFillStyle: appState.currentItemFillStyle,
            currentItemStrokeWidth: appState.currentItemStrokeWidth,
            currentItemStrokeStyle: appState.currentItemStrokeStyle,
            currentItemRoughness: appState.currentItemRoughness,
            currentItemOpacity: appState.currentItemOpacity,
            currentItemFontFamily: appState.currentItemFontFamily,
            currentItemFontSize: appState.currentItemFontSize,
            currentItemTextAlign: appState.currentItemTextAlign,
            currentItemStartArrowhead: appState.currentItemStartArrowhead,
            currentItemEndArrowhead: appState.currentItemEndArrowhead,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            zoom: appState.zoom
          },
          files
        }
        onSaveRef.current(snap)
      }, 1000)
    },
    []
  )

  const parsed = parseSnapshot(snapshot)

  return (
    <Card className="h-full w-full overflow-hidden rounded-none border-x-0 border-t-0 p-0">
      <div className="excalidraw-container h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api
          }}
          initialData={
            parsed
              ? {
                  elements: parsed.elements,
                  appState: parsed.appState,
                  files: parsed.files
                }
              : {
                  // Fresh drawing — default to Excalifont (the sketch/handwritten font)
                  appState: { currentItemFontFamily: FONT_FAMILY.Excalifont }
                }
          }
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              saveAsImage: false,
              loadScene: false,
              export: false
            }
          }}
        />
      </div>
    </Card>
  )
}

// Prevent re-renders from parent state changes (isSaving, showSaved, activeNote.drawing).
// key={noteId} on the parent forces remount when switching notes.
// snapshot is only for initial hydration; onSave updates via ref internally.
export default memo(DrawingCanvas, () => true)
