# Unified PDF Engine + Mermaid Live Preview

**Date:** 2026-03-13
**Status:** Approved

## Problem

1. PDF exports are inconsistent — TextCraft produces formatted PDFs with themes but Nebula doesn't preserve formatting; mermaid diagrams show as placeholder text instead of images
2. Three separate PDF generators exist (TextCraft, Launchpad, ER Diagram) with no shared logic
3. Mermaid code blocks in Nebula notes render as raw syntax — no live diagram preview
4. No "copy as code" option on rendered mermaid diagrams anywhere in the app

## Design

### 1. Unified PDF Engine

**Move** `src/main/textcraft/pdf-generator.ts` to `src/main/lib/pdf-generator.ts`.

**Single IPC channel** `app:exportPdf` replaces:
- `textcraft:exportPdf`
- `launchpad:exportPdf`
- `db:exportErDiagramPdf`

**Interface:**
```typescript
interface PdfExportData {
  markdown: string
  title?: string
  mermaidImages?: Record<number, string>  // pre-rendered PNGs from renderer
  orientation?: 'portrait' | 'landscape'  // default: portrait
}
```

**Preload API:**
```typescript
window.api.exportPdf(data: PdfExportData): Promise<{ filePath: string | null }>
```

The old `window.api.textcraft.exportPdf` becomes an alias during transition.

**Theme selection** stays via `general.pdfStyle` setting (colored/basic/pretty).

**Call site migration:**

| Plugin | Before | After |
|--------|--------|-------|
| TextCraft OutputPanel | `window.api.textcraft.exportPdf()` | `window.api.exportPdf()` |
| Nebula NoteEditor | `window.api.textcraft.exportPdf()` | `window.api.exportPdf()` |
| QueryOptimizer | `window.api.textcraft.exportPdf()` | `window.api.exportPdf()` |
| ER Diagram | `window.api.db.exportErDiagramPdf()` | Compose mermaid markdown, call `window.api.exportPdf({ markdown, orientation: 'landscape' })`. ER Diagram already stores mermaid syntax in `cachedSyntax` — wrap it in a markdown code fence and pass through the unified pipeline. |
| Launchpad EstimationSummary | `window.api.launchpad.exportPdf()` | Serialize estimation data to markdown (table + totals + AI recommendations) and call `window.api.exportPdf()`. The unified engine's table parser handles markdown tables with headers. Currency formatting preserved via inline text. |

**Mermaid pre-rendering** stays in the renderer process (needs DOM for SVG-to-Canvas-to-PNG). Each call site calls `renderAllMermaidBlocks(markdown)` before invoking IPC.

**Mermaid PNG theme matching:** Update `src/renderer/src/lib/mermaid-to-png.ts` to accept an optional `lightMode` param. When the PDF style is "basic" or "colored" (light backgrounds), use a light canvas background (`#ffffff`) and light mermaid theme variables. The `general.pdfStyle` setting is read in the renderer before calling `renderAllMermaidBlocks()`.

### 2. Nebula Mermaid Live Preview

Custom Tiptap NodeView for `codeBlock` nodes where `language === 'mermaid'`:

- **Diagram mode** (default when not focused): renders the mermaid syntax via lazy-loaded `MermaidRenderer` component, replacing the raw code view
- **Code mode** (when editing): shows the normal code editor with syntax highlighting
- **Toggle**: button in top-right corner to switch between modes
- **Auto-switch**: uses Tiptap NodeView's `selected` prop combined with editor selection state — when the cursor enters the code block, switch to code mode; when selection leaves, switch back to diagram mode after a short debounce (300ms)
- **Error handling**: if mermaid syntax is invalid, stays in code mode with error indicator

**Language registration:** Add `{ value: 'mermaid', label: 'Mermaid', ext: 'mmd' }` to the `LANGUAGES` array in `src/renderer/src/lib/lowlight-setup.ts`. No lowlight grammar registration needed — mermaid blocks render as diagrams, not syntax-highlighted code.

Implementation: extend the existing `CodeBlockNodeView` to detect `language === 'mermaid'` and conditionally render the diagram.

### 3. "Copy as Code" on Mermaid Diagrams

Add a `</>` icon overlay (top-right, visible on hover) to all rendered mermaid diagrams:

- **MermaidRenderer**: new optional props `syntax?: string` and `showCopyCode?: boolean`
  - When `showCopyCode` is true and `syntax` is provided, shows the copy overlay
  - Click copies the mermaid syntax to clipboard with brief "Copied!" feedback
- **MarkdownRenderer**: passes syntax + `showCopyCode={true}` to MermaidRenderer
- **Nebula NodeView**: shows copy overlay in diagram mode
- **ERDiagram**: already has "Copy Mermaid" button — no change needed

### Error Handling

- Mermaid render failure in PDF: falls back to `[Mermaid Diagram — view in app]` placeholder
- Mermaid render failure in NodeView: stays in code mode with error message
- PDF save cancelled: returns `null`
- Invalid markdown: degrades to plain text paragraphs

### Files Changed

**New:**
- `src/main/lib/pdf-generator.ts` (moved from `src/main/textcraft/pdf-generator.ts`)

**Modified:**
- `src/main/ipc-handlers.ts` — new `app:exportPdf` handler, remove old handlers
- `src/preload/index.ts` + `index.d.ts` — add `window.api.exportPdf()`
- `src/renderer/src/plugins/db-inspector/MermaidRenderer.tsx` — add copy-code overlay
- `src/renderer/src/components/MarkdownRenderer.tsx` — pass syntax to MermaidRenderer
- `src/renderer/src/plugins/nebula/CodeBlockNodeView.tsx` — mermaid live preview
- `src/renderer/src/plugins/nebula/CodeBlockControls.tsx` — handle mermaid mode
- `src/renderer/src/plugins/textcraft/OutputPanel.tsx` — use `window.api.exportPdf`
- `src/renderer/src/plugins/nebula/NoteEditor.tsx` — use `window.api.exportPdf`
- `src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx` — use `window.api.exportPdf`
- `src/renderer/src/plugins/db-inspector/ERDiagram.tsx` — use `window.api.exportPdf`, compose mermaid markdown
- `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` — serialize to markdown, use `window.api.exportPdf`
- `src/renderer/src/stores/launchpad-store.ts` — update exportPdf action
- `src/renderer/src/lib/lowlight-setup.ts` — add mermaid to LANGUAGES
- `src/renderer/src/lib/mermaid-to-png.ts` — add light mode support

**Deleted:**
- `src/main/textcraft/pdf-generator.ts` (moved)
- `src/main/launchpad/pdf-generator.ts` (replaced by unified engine)
- ER Diagram PDF logic in ipc-handlers.ts (replaced)
