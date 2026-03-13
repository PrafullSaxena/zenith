# Unified PDF Engine + Mermaid Live Preview Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all PDF exports into a single engine, add mermaid live preview in Nebula notes, and add "copy as code" to all rendered mermaid diagrams.

**Architecture:** Move the TextCraft PDF generator to `src/main/lib/pdf-generator.ts` as the single PDF engine. All plugins compose markdown and call one IPC channel (`app:exportPdf`). Mermaid code blocks in Nebula get a custom NodeView that renders diagrams inline with toggle-to-edit. MermaidRenderer gets a copy-code overlay.

**Tech Stack:** Electron (main/renderer/preload), pdfmake, mermaid, Tiptap v3, React, TypeScript

---

## Chunk 1: Unified PDF Engine + IPC Consolidation

### Task 1: Move PDF generator to shared location

**Files:**
- Create: `src/main/lib/pdf-generator.ts` (moved from `src/main/textcraft/pdf-generator.ts`)
- Delete: `src/main/textcraft/pdf-generator.ts`

- [ ] **Step 1: Create `src/main/lib/` directory and move the file**

```bash
mkdir -p src/main/lib
cp src/main/textcraft/pdf-generator.ts src/main/lib/pdf-generator.ts
```

- [ ] **Step 2: Add `orientation` support to the export interface**

In `src/main/lib/pdf-generator.ts`, update the `TextCraftExport` interface (rename to `PdfExportData`):

```typescript
interface PdfExportData {
  markdown: string
  title?: string
  mermaidImages?: Record<number, string>
  orientation?: 'portrait' | 'landscape'
}
```

Update the `exportTextCraftPdf` function signature (rename to `exportPdf`):

```typescript
export async function exportPdf(
  win: BrowserWindow,
  data: PdfExportData
): Promise<string | null> {
```

- [ ] **Step 3: Apply orientation in the document definition**

In the `docDefinition` object (around line 450), add orientation support:

```typescript
const docDefinition = {
  defaultStyle: { font: 'Helvetica', fontSize: 10, color: theme.textColor },
  content,
  pageMargins: [40, 40, 40, 40],
  pageOrientation: data.orientation || 'portrait',
  ...(isPretty ? { background: () => ({ ... }) } : {})
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/pdf-generator.ts
git commit -m "refactor: move PDF generator to src/main/lib/ with orientation support"
```

---

### Task 2: Register unified IPC handler and update preload

**Files:**
- Modify: `src/main/ipc-handlers.ts` (lines 432-447, 604-675)
- Modify: `src/preload/index.ts` (lines 166-176)
- Modify: `src/preload/index.d.ts` (lines 55-60)

- [ ] **Step 1: Add `app:exportPdf` handler in `ipc-handlers.ts`**

Add after the existing `app:` handlers (around line 430):

```typescript
ipcMain.handle('app:exportPdf', async (_event, data: {
  markdown: string;
  title?: string;
  mermaidImages?: Record<number, string>;
  orientation?: 'portrait' | 'landscape';
}) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available for save dialog')
  const { exportPdf } = await import('./lib/pdf-generator')
  const filePath = await exportPdf(mainWindow, data)
  return { filePath }
})
```

- [ ] **Step 2: Update the old `textcraft:exportPdf` handler to forward**

Replace the existing handler at line 441:

```typescript
ipcMain.handle('textcraft:exportPdf', async (_event, data) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available for save dialog')
  const { exportPdf } = await import('./lib/pdf-generator')
  const filePath = await exportPdf(mainWindow, data)
  return { filePath }
})
```

- [ ] **Step 3: Update the `launchpad:exportPdf` handler to forward to unified engine**

Replace the handler at line 432 to convert the structured estimation data to markdown:

```typescript
ipcMain.handle('launchpad:exportPdf', async (_event, estimation: {
  name: string;
  provider: string;
  lineItems: Array<{ serviceName: string; configSummary: string; monthly: number; yearly: number }>;
  totalMonthly: number;
  totalYearly: number;
  aiRecommendations?: string;
}) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available for save dialog')

  // Convert estimation to markdown for unified engine
  const tableHeader = '| Service | Configuration | Monthly | Yearly |\n| --- | --- | --- | --- |'
  const tableRows = estimation.lineItems.map(
    (li) => `| ${li.serviceName} | ${li.configSummary} | $${li.monthly.toFixed(2)} | $${li.yearly.toFixed(2)} |`
  ).join('\n')
  const totalRow = `\n**Total: $${estimation.totalMonthly.toFixed(2)}/mo — $${estimation.totalYearly.toFixed(2)}/yr**`

  let md = `# ${estimation.name}\n\n**Provider:** ${estimation.provider}\n\n${tableHeader}\n${tableRows}\n${totalRow}`

  if (estimation.aiRecommendations) {
    md += `\n\n## AI Recommendations\n\n${estimation.aiRecommendations}`
  }

  const { exportPdf } = await import('./lib/pdf-generator')
  const filePath = await exportPdf(mainWindow, { markdown: md, title: estimation.name })
  return { filePath }
})
```

- [ ] **Step 4: Update the `db:exportErDiagramPdf` handler to forward**

Replace the handler at line 604 with:

```typescript
ipcMain.handle('db:exportErDiagramPdf', async (_event, data: {
  markdown?: string;
  mermaidImages?: Record<number, string>;
  title?: string;
  // Legacy fields (image-based export)
  imageDataUrl?: string;
  width?: number;
  height?: number;
  connectionName?: string;
  schema?: string;
  tableCount?: number;
  relationshipMode?: string;
}) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available for save dialog')
  const { exportPdf } = await import('./lib/pdf-generator')

  // If markdown is provided, use unified engine
  if (data.markdown) {
    const filePath = await exportPdf(mainWindow, {
      markdown: data.markdown,
      title: data.title || 'ER Diagram',
      mermaidImages: data.mermaidImages,
      orientation: 'landscape'
    })
    return { filePath }
  }

  // Legacy fallback: image-based export
  // Wrap the image in markdown with a mermaid placeholder
  const title = data.connectionName ? `${data.connectionName} — ${data.schema}` : 'ER Diagram'
  const md = `# ${title}\n\n**Tables:** ${data.tableCount ?? 'N/A'} | **Mode:** ${data.relationshipMode ?? 'N/A'}`
  const mermaidImages = data.imageDataUrl ? { 0: data.imageDataUrl } : undefined
  const mdWithDiagram = mermaidImages ? md + '\n\n```mermaid\nplaceholder\n```' : md

  const filePath = await exportPdf(mainWindow, {
    markdown: mdWithDiagram,
    title,
    mermaidImages,
    orientation: 'landscape'
  })
  return { filePath }
})
```

- [ ] **Step 5: Add `exportPdf` to preload API**

In `src/preload/index.ts`, add to the `app` namespace (after line 31):

```typescript
exportPdf: (data: {
  markdown: string;
  title?: string;
  mermaidImages?: Record<number, string>;
  orientation?: 'portrait' | 'landscape';
}): Promise<{ filePath: string | null }> =>
  ipcRenderer.invoke('app:exportPdf', data),
```

- [ ] **Step 6: Update type declarations**

In `src/preload/index.d.ts`, add to the `app` interface (after line 24):

```typescript
exportPdf: (data: {
  markdown: string
  title?: string
  mermaidImages?: Record<number, string>
  orientation?: 'portrait' | 'landscape'
}) => Promise<{ filePath: string | null }>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: unified app:exportPdf IPC handler with backward-compat aliases"
```

---

### Task 3: Migrate all call sites to unified API

**Files:**
- Modify: `src/renderer/src/plugins/textcraft/OutputPanel.tsx` (line 224)
- Modify: `src/renderer/src/plugins/nebula/NoteEditor.tsx` (line 453)
- Modify: `src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx` (line 131)
- Modify: `src/renderer/src/plugins/db-inspector/ERDiagram.tsx` (lines 135-187)
- Modify: `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` (PDF button)

- [ ] **Step 1: Update TextCraft OutputPanel**

In `src/renderer/src/plugins/textcraft/OutputPanel.tsx`, change line 224:

```typescript
// Before:
await window.api.textcraft.exportPdf({
  markdown: rawText,
  mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
})

// After:
await window.api.app.exportPdf({
  markdown: rawText,
  mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
})
```

- [ ] **Step 2: Update Nebula NoteEditor**

In `src/renderer/src/plugins/nebula/NoteEditor.tsx`, change the `handleExportPdf` handler:

```typescript
// Before:
await window.api.textcraft.exportPdf({
  markdown: md,
  title: title || 'Untitled',
  mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
})

// After:
await window.api.app.exportPdf({
  markdown: md,
  title: title || 'Untitled',
  mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined
})
```

- [ ] **Step 3: Update QueryOptimizer**

In `src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx`, update the exportPdf call:

```typescript
// Before:
await window.api.textcraft.exportPdf({ markdown, title })

// After:
await window.api.app.exportPdf({ markdown, title })
```

- [ ] **Step 4: Update ERDiagram to use mermaid-markdown approach**

In `src/renderer/src/plugins/db-inspector/ERDiagram.tsx`, replace the SVG→Canvas→PNG export with:

```typescript
import { renderAllMermaidBlocks } from '../../lib/mermaid-to-png'

const handleExportPdf = useCallback(async () => {
  if (!currentSyntax) return
  setIsExporting(true)
  try {
    const md = `# ER Diagram — ${session?.connectionName ?? 'Database'}\n\n**Schema:** ${session?.schema ?? 'N/A'} | **Tables:** ${session?.tables?.length ?? 0} | **Mode:** ${relationshipMode}\n\n\`\`\`mermaid\n${currentSyntax}\n\`\`\``
    const mermaidImages = await renderAllMermaidBlocks(md)
    await window.api.app.exportPdf({
      markdown: md,
      title: `ER Diagram — ${session?.connectionName ?? 'Database'}`,
      mermaidImages: Object.keys(mermaidImages).length > 0 ? mermaidImages : undefined,
      orientation: 'landscape'
    })
  } finally {
    setIsExporting(false)
  }
}, [currentSyntax, session, relationshipMode])
```

Remove the old SVG→Canvas→PNG export code (lines ~136-186).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/plugins/textcraft/OutputPanel.tsx \
  src/renderer/src/plugins/nebula/NoteEditor.tsx \
  src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx \
  src/renderer/src/plugins/db-inspector/ERDiagram.tsx
git commit -m "refactor: migrate all PDF exports to unified app.exportPdf API"
```

---

### Task 4: Delete old PDF generators

**Files:**
- Delete: `src/main/textcraft/pdf-generator.ts`
- Delete: `src/main/launchpad/pdf-generator.ts`

- [ ] **Step 1: Remove old files**

```bash
rm src/main/textcraft/pdf-generator.ts
rm src/main/launchpad/pdf-generator.ts
```

- [ ] **Step 2: Verify no remaining imports reference the deleted files**

Run: `npx tsc --noEmit`
Expected: No errors (all imports now point to `./lib/pdf-generator`)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old TextCraft and Launchpad PDF generators (replaced by unified engine)"
```

---

## Chunk 2: Mermaid Live Preview in Nebula + Copy as Code

### Task 5: Add "mermaid" to language selector

**Files:**
- Modify: `src/renderer/src/lib/lowlight-setup.ts` (line 74, LANGUAGES array)

- [ ] **Step 1: Add mermaid to LANGUAGES**

In `src/renderer/src/lib/lowlight-setup.ts`, add to the `LANGUAGES` array (after the first entry `plaintext`):

```typescript
{ value: 'mermaid', label: 'Mermaid', ext: 'mmd' },
```

No lowlight grammar registration needed — mermaid blocks render as diagrams, not syntax-highlighted code.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/lib/lowlight-setup.ts
git commit -m "feat: add mermaid to code block language selector"
```

---

### Task 6: Add copy-code overlay to MermaidRenderer

**Files:**
- Modify: `src/renderer/src/plugins/db-inspector/MermaidRenderer.tsx`

- [ ] **Step 1: Add new props and copy overlay**

Add `syntax` and `showCopyCode` props to the MermaidRenderer component:

```typescript
interface MermaidRendererProps {
  syntax: string
  interactive?: boolean
  showCopyCode?: boolean  // NEW: show copy-code overlay on hover
}
```

Add a state for copy feedback and the overlay JSX inside the component (after the render logic, before the closing wrapper div):

```typescript
const [codeCopied, setCodeCopied] = useState(false)

const handleCopyCode = useCallback(() => {
  navigator.clipboard.writeText(syntax).then(() => {
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  })
}, [syntax])
```

Add the overlay JSX inside the diagram container (conditionally rendered):

```tsx
{showCopyCode && (
  <button
    type="button"
    onClick={handleCopyCode}
    className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md
      text-[10px] font-medium bg-surface/80 backdrop-blur-sm border border-border/50
      text-text-secondary hover:text-text-primary hover:bg-surface-elevated
      opacity-0 group-hover:opacity-100 transition-opacity"
    title="Copy mermaid code"
  >
    {codeCopied ? (
      <><Check size={11} className="text-green-400" /> Copied</>
    ) : (
      <><Code2 size={11} /> Code</>
    )}
  </button>
)}
```

Add `group` class to the wrapper div so the hover trigger works. Import `Check`, `Code2` from lucide-react. Import `useState`, `useCallback` from react.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/db-inspector/MermaidRenderer.tsx
git commit -m "feat: add copy-code overlay to MermaidRenderer"
```

---

### Task 7: Pass syntax to MermaidRenderer in MarkdownRenderer

**Files:**
- Modify: `src/renderer/src/components/MarkdownRenderer.tsx` (lines 92-114)

- [ ] **Step 1: Update the mermaid code fence rendering**

In the code fence handler where `lang === 'mermaid'` is detected, pass the `showCopyCode` prop:

```tsx
// Before:
<MermaidRenderer syntax={trimmedCode} interactive />

// After:
<MermaidRenderer syntax={trimmedCode} interactive showCopyCode />
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/MarkdownRenderer.tsx
git commit -m "feat: enable copy-code on mermaid diagrams in MarkdownRenderer"
```

---

### Task 8: Mermaid live preview in Nebula CodeBlockNodeView

**Files:**
- Modify: `src/renderer/src/plugins/nebula/CodeBlockNodeView.tsx`

- [ ] **Step 1: Add mermaid rendering state and lazy import**

Add imports at the top of the file:

```typescript
import { useCallback, useMemo, useState, lazy, Suspense, useEffect } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const MermaidRenderer = lazy(() => import('../../plugins/db-inspector/MermaidRenderer'))
```

- [ ] **Step 2: Add mermaid mode detection and diagram/code toggle**

Inside the `CodeBlockNodeView` component, add:

```typescript
const isMermaid = language === 'mermaid'
const [showDiagram, setShowDiagram] = useState(isMermaid)
const [editorFocused, setEditorFocused] = useState(false)

// Auto-switch to diagram when language changes to mermaid
useEffect(() => {
  setShowDiagram(isMermaid)
}, [isMermaid])
```

- [ ] **Step 3: Conditionally render diagram or code content**

Replace the `<pre>` section (lines 242-244) with a conditional:

```tsx
{/* Code content or Mermaid diagram */}
{isMermaid && showDiagram && code.trim() ? (
  <div className="relative min-h-[100px]" contentEditable={false}>
    <Suspense fallback={
      <div className="flex items-center justify-center py-8 text-text-secondary/50">
        <Loader2 size={16} className="animate-spin mr-2" />
        Rendering diagram...
      </div>
    }>
      <MermaidRenderer syntax={code} interactive showCopyCode />
    </Suspense>
  </div>
) : (
  <pre className="code-block-pre">
    <NodeViewContent as="code" className={`hljs language-${language}`} />
  </pre>
)}
```

- [ ] **Step 4: Add diagram/code toggle button to the header**

Add a toggle button in the header bar (before the language selector, inside the right-side flex container):

```tsx
{/* Mermaid diagram/code toggle */}
{isMermaid && code.trim() && (
  <button
    type="button"
    onClick={() => setShowDiagram(!showDiagram)}
    className="code-block-action-btn"
    title={showDiagram ? 'Edit code' : 'Show diagram'}
  >
    {showDiagram ? <EyeOff size={11} /> : <Eye size={11} />}
  </button>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/plugins/nebula/CodeBlockNodeView.tsx
git commit -m "feat: mermaid live preview in Nebula code blocks with toggle"
```

---

### Task 9: Update mermaid-to-png for light mode PDF themes

**Files:**
- Modify: `src/renderer/src/lib/mermaid-to-png.ts`

- [ ] **Step 1: Add lightMode parameter to renderMermaidToPng**

```typescript
export async function renderMermaidToPng(
  syntax: string,
  width = 800,
  lightMode = false
): Promise<string | null> {
```

Update the mermaid initialization to use theme based on `lightMode`:

```typescript
mermaid.default.initialize({
  startOnLoad: false,
  theme: lightMode ? 'default' : 'dark',
  themeVariables: lightMode ? {
    primaryColor: '#0d9488',
    primaryTextColor: '#1a1a1a',
    primaryBorderColor: '#0d9488',
    lineColor: '#64748b',
    secondaryColor: '#f0fdfa',
    tertiaryColor: '#ccfbf1',
    background: '#ffffff',
    mainBkg: '#f0fdfa',
    nodeBorder: '#0d9488',
    clusterBkg: '#f8fafc',
    titleColor: '#1a1a1a',
    edgeLabelBackground: '#ffffff'
  } : {
    // existing dark theme variables...
  },
  flowchart: { useMaxWidth: true, curve: 'basis' },
  er: { useMaxWidth: true }
})
```

Update the canvas background in `svgToPng`:

```typescript
async function svgToPng(svgString: string, targetWidth: number, lightMode = false): Promise<string> {
  // ...
  ctx.fillStyle = lightMode ? '#ffffff' : '#1a1b2e'
  // ...
}
```

- [ ] **Step 2: Add lightMode parameter to renderAllMermaidBlocks**

```typescript
export async function renderAllMermaidBlocks(
  markdown: string,
  lightMode = false
): Promise<Record<number, string>> {
```

Pass it through to `renderMermaidToPng`:

```typescript
const png = await renderMermaidToPng(block.syntax, 800, lightMode)
```

- [ ] **Step 3: Update call sites to pass lightMode based on PDF style**

In each call site that exports PDF (OutputPanel, NoteEditor, ERDiagram, QueryOptimizer), read the `pdfStyle` setting before calling `renderAllMermaidBlocks`:

```typescript
// Read PDF style setting to determine mermaid theme
const settings = await window.api.settings.getAll()
const pdfStyle = (settings?.['general.pdfStyle'] as string) ?? 'colored'
const lightMode = pdfStyle !== 'pretty'
const mermaidImages = await renderAllMermaidBlocks(md, lightMode)
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/lib/mermaid-to-png.ts \
  src/renderer/src/plugins/textcraft/OutputPanel.tsx \
  src/renderer/src/plugins/nebula/NoteEditor.tsx \
  src/renderer/src/plugins/db-inspector/ERDiagram.tsx \
  src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx
git commit -m "feat: light/dark mode mermaid rendering matched to PDF theme"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Start dev server and verify no build errors**

Run: `npm run dev` or electron-vite dev
Expected: Server starts, no compilation errors

- [ ] **Step 3: Visual verification checklist**

In the Electron app:
1. Open Nebula → create a note → add a `mermaid` code block → verify diagram renders inline
2. Toggle between diagram and code view using the eye icon
3. Hover over the diagram → verify "Code" copy button appears top-right
4. Export the note as PDF → verify mermaid diagram appears as image (not placeholder text)
5. Open TextCraft → refine text with mermaid → export PDF → verify diagram in PDF
6. Open DB Inspector → ER Diagram → export PDF → verify landscape orientation with diagram
7. Check that the "Copy Code" button works on mermaid diagrams in MarkdownRenderer (TextCraft output)

- [ ] **Step 4: Final commit if any fixes needed**
