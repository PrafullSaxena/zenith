# Phase 9: Nebula UX Polish - Research

**Researched:** 2026-03-10
**Domain:** Rich text editor UX, resizable split panels, voice recording UI, note management patterns
**Confidence:** HIGH

## Summary

Phase 9 polishes the existing Nebula Notes plugin across four domains: (1) upgrading the text editor from a fixed toolbar to a floating Notion-style bubble menu with additional Tiptap extensions for links, images, and tables; (2) replacing the drawing canvas toggle with a resizable split-view layout; (3) transforming the voice recorder from a bottom bar into a floating action button with animated visual feedback; (4) enhancing the note list with a resizable sidebar, pinning, content preview, context menus, and a confirmation dialog for deletion.

The existing codebase uses Tiptap v3 (`@tiptap/react` ^3.20.1, `@tiptap/starter-kit` ^3.20.1) with StarterKit, Placeholder, and already has `@tiptap/extension-bubble-menu`, `@tiptap/extension-floating-menu`, `@tiptap/extension-link`, and `@floating-ui/dom` installed as transitive dependencies. The drawing canvas uses tldraw v4 (`tldraw` ^4.4.1). Framer-motion (^12.5.0) is in `package.json` but unused -- it is available for animations. The project uses Tailwind v4 CSS-first with dark-only oklch theme tokens, zustand for state management, and follows strict Electron security patterns (sandbox=true, contextBridge).

**Primary recommendation:** Use the already-installed Tiptap BubbleMenu component from `@tiptap/react/menus` for the floating toolbar, add `@tiptap/extension-table` + `@tiptap/extension-image` for new editor features, use `react-resizable-panels` for the split-view and sidebar resizing, build the voice FAB and toast system with framer-motion (already installed) + custom components (no new dependency needed for toasts), and implement context menus with native DOM event handling (no library needed for the simple right-click menu required).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Note Editor Experience
- Replace fixed toolbar with **floating toolbar** that appears near selected text (Notion-style)
- Full keyboard shortcuts: Cmd+B bold, Cmd+I italic, Cmd+Shift+1/2/3 headings, Cmd+Shift+8 bullet, etc.
- **Seamless inline title** -- large text that flows into editor body, no visible border, just size difference
- **Ghost placeholder** text ("Start writing...") in empty notes -- light gray, disappears on focus
- **Subtle auto-save dot** -- small colored dot in header: gray=synced, orange=unsaved, green flash=just saved. No text
- Add **links** (Cmd+K) and **image embeds** (paste/drag) support
- Add **interactive tables** -- click to add rows/columns, resize columns, drag to reorder
- **Metadata line below title** -- small gray text showing last edited time + word count
- **Topic tags** displayed as small tag pills below the title
- Undo/redo via keyboard only (Cmd+Z / Cmd+Shift+Z) -- no toolbar buttons

#### Drawing Canvas Integration
- **Split view layout** -- text editor on left, drawing canvas on right (replaces current toggle)
- Default split ratio: **60/40 text-first**
- **Both panels collapsible** -- can go full-screen text OR full-screen drawing
- **Draggable divider** between panels -- double-click to reset to 60/40
- When drawing panel is collapsed: **side rail tab** on the right edge labeled "Draw" that expands on click
- **Smooth slide animation** (~200ms) when panels open/close
- Use **tldraw's built-in toolbar** -- no custom overlay
- Drawing panel **closed by default** for new notes
- **Global panel size** -- one divider position for all notes (not per-note)
- Notes with drawings show a **small pen icon** in the note list

#### Voice Recording Flow
- Replace bottom bar recorder with **floating action button** (FAB) in bottom-right corner
- Recording state: FAB expands into **small card** with animated equalizer bars, timer, stop button
- **Animated bars** (pre-animated equalizer) for visual feedback during recording -- not real waveform
- Transcription appears as **inline transcription block** in the note -- expandable/collapsible
- **Colored speaker labels** -- each speaker gets a unique accent color
- **Editable speaker names** -- click to rename, renames all instances in the block
- **Compressed audio storage** -- save recording alongside note for playback, compressed to minimize disk space
- Small play button on transcription block to replay audio
- **Background processing** -- user can continue editing while transcription processes
- **Toast notification** when transcription completes ("Transcription added to [Note Name]" with click-to-navigate)

#### Note Management & List
- **Resizable sidebar** with draggable edge -- collapsible to icon-only view, remembers width
- Collapsed sidebar shows **just an expand button** -- clean minimal
- **2-line content preview** in note list items (title + 2 lines of content, truncated)
- **Pinned notes** support -- pin icon on hover, pinned section at top, rest sorted by date
- **Confirmation dialog** for note deletion (modal "Are you sure?")
- **Both context menu AND hover icons** -- right-click menu (Pin/Unpin, Duplicate, Delete) plus hover trash icon
- **Cmd+N keyboard shortcut** to create new note -- focus jumps to title field
- **Automatic sort only** -- pinned first, then by last updated. No manual drag-to-reorder

### Claude's Discretion
- Exact floating toolbar dimensions and positioning logic
- Animation easing curves and exact timing
- Image embed size constraints and drag-drop zone styling
- Table cell styling details (borders, padding, font)
- Transcription block collapse/expand animation
- Audio compression format and quality settings
- Context menu styling and positioning
- Sidebar min/max width constraints

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEBL-01 | Modern minimal text editor with rich formatting (headings, bold, italic, lists, code blocks) | Tiptap BubbleMenu from `@tiptap/react/menus`, StarterKit already provides all formatting, Link + Image + Table extensions to add |
| NEBL-02 | Drawing canvas integrated into notes using tldraw | `react-resizable-panels` for split-view layout, tldraw v4 already integrated, panel collapse/expand with framer-motion |
| NEBL-03 | Notes stored locally on disk as structured files | Already complete from Phase 8; pinned state + audio path fields need adding to NoteFile schema |
| NEBL-06 | Search & Q&A -- natural-language questions over notes | No changes needed for search infrastructure; content preview extraction for note list relies on same plain text extraction |
| NEBL-07 | Voice recording -- start/stop audio recording | FAB pattern replaces bottom bar, compressed audio storage via WebM/Opus (MediaRecorder already uses this), IPC for audio file persistence |
| NEBL-08 | Voice transcription with speaker diarization | Inline transcription block component, colored speaker labels, editable names, audio playback button, toast notification system |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | ^3.20.1 | Rich text editor React bindings | Already in use, provides BubbleMenu/FloatingMenu from `/menus` |
| @tiptap/starter-kit | ^3.20.1 | Core formatting extensions | Already provides bold, italic, headings, lists, code blocks |
| @tiptap/extension-placeholder | ^3.20.1 | Ghost placeholder text | Already in use |
| @tiptap/extension-link | installed | Link marks with auto-linking | Already installed as transitive dep, needs explicit configuration |
| tldraw | ^4.4.1 | Drawing canvas | Already integrated |
| framer-motion | ^12.5.0 | Animations (FAB, panels, toasts) | Already in package.json but unused -- available for all animation needs |
| zustand | ^5.0.3 | State management | Already in use for nebula-store |
| lucide-react | ^0.475.0 | Icons | Already in use throughout the app |

### New Dependencies to Install
| Library | Version | Purpose | Why This Library |
|---------|---------|---------|-----------------|
| @tiptap/extension-table | ^3.20.1 | Interactive tables in editor | Official Tiptap table extension with resizable columns, add/delete rows/cols |
| @tiptap/extension-table-row | ^3.20.1 | Table row nodes | Required companion for @tiptap/extension-table |
| @tiptap/extension-table-cell | ^3.20.1 | Table cell nodes | Required companion for @tiptap/extension-table |
| @tiptap/extension-table-header | ^3.20.1 | Table header cells | Required companion for @tiptap/extension-table |
| @tiptap/extension-image | ^3.20.1 | Image embeds in editor | Official Tiptap image extension with base64 support and resize |
| react-resizable-panels | ^2.x | Resizable split panels | Used by shadcn/ui, supports collapse/expand, double-click reset, auto-save, keyboard accessible |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels | allotment | allotment has VS Code-style look but heavier; react-resizable-panels is more flexible and widely adopted |
| Custom toast | sonner / react-hot-toast | Adding a library for a single toast pattern is overhead; framer-motion AnimatePresence handles the animation, custom component is < 40 lines |
| Custom context menu | @radix-ui/react-context-menu | Only 3 menu items needed; native DOM approach with a positioned div is simpler and avoids adding radix dependency |

**Installation:**
```bash
npm install @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-image react-resizable-panels
```

## Architecture Patterns

### Recommended File Structure
```
src/renderer/src/plugins/nebula/
  NebulaView.tsx          # Modified: split-view layout, keyboard shortcuts
  NoteEditor.tsx          # Major rewrite: floating toolbar, inline title, metadata, tags
  NoteList.tsx            # Major rewrite: resizable sidebar, pinning, context menu, preview
  DrawingCanvas.tsx       # Modified: remove visibility toggle, always-mounted in panel
  VoiceRecorder.tsx       # Major rewrite: FAB pattern, animated equalizer, expanded card
  TranscriptionBlock.tsx  # NEW: inline collapsible block with speaker labels + audio playback
  NoteContextMenu.tsx     # NEW: right-click context menu component
  DeleteConfirmDialog.tsx # NEW: modal confirmation for note deletion
  ToastContainer.tsx      # NEW: positioned container for toast notifications
  FloatingToolbar.tsx     # NEW: BubbleMenu wrapper with formatting buttons
  LinkDialog.tsx          # NEW: small popup for Cmd+K link insertion
  TableControls.tsx       # NEW: table management buttons (add row/col, delete)
src/renderer/src/stores/
  nebula-store.ts         # Extended: pinned state, panel sizes, toast state
src/renderer/src/types/
  nebula.ts               # Extended: pinned field, audio path, panel state types
src/renderer/src/assets/
  main.css                # Extended: table styles, transcription block styles, FAB styles
src/main/nebula/
  file-storage.ts         # Extended: audio file storage alongside notes
  database.ts             # Extended: pinned column, content_preview field
src/main/ipc-handlers.ts  # Extended: audio save/load IPC, pin/unpin IPC
src/preload/
  index.ts                # Extended: new nebula IPC bindings
  index.d.ts              # Extended: type definitions for new IPC
```

### Pattern 1: Floating Toolbar with BubbleMenu
**What:** Replace fixed toolbar with Tiptap BubbleMenu that appears on text selection
**When to use:** When user selects text in the editor
**Example:**
```typescript
// Source: https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
import { BubbleMenu } from '@tiptap/react/menus'

// Inside the editor component:
{editor && (
  <BubbleMenu
    editor={editor}
    shouldShow={({ editor, state }) => {
      // Only show when text is selected (not empty selection)
      return !state.selection.empty && !editor.isActive('image')
    }}
  >
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-elevated px-1.5 py-1 shadow-lg">
      <ToolbarButton icon={<Bold size={14} />} ... />
      <ToolbarButton icon={<Italic size={14} />} ... />
      {/* etc. */}
    </div>
  </BubbleMenu>
)}
```

### Pattern 2: Resizable Split View with react-resizable-panels
**What:** Text editor + drawing canvas side by side with draggable divider
**When to use:** Notes tab layout replacing the current toggle pattern
**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

<PanelGroup
  direction="horizontal"
  autoSaveId="nebula-split-view" // Persists to localStorage
  onLayout={(sizes) => { /* update store */ }}
>
  <Panel defaultSize={60} minSize={30} collapsible>
    <NoteEditor ... />
  </Panel>
  <PanelResizeHandle
    className="w-1.5 bg-border hover:bg-accent/50 transition-colors"
    onDoubleClick={() => { /* reset to 60/40 */ }}
  />
  <Panel defaultSize={40} minSize={20} collapsible
    onCollapse={() => setDrawingCollapsed(true)}
    onExpand={() => setDrawingCollapsed(false)}
  >
    <DrawingCanvas ... />
  </Panel>
</PanelGroup>
```

### Pattern 3: Voice FAB with Animated Expansion
**What:** Floating action button that expands into recording card
**When to use:** Bottom-right of the editor area, replaces bottom bar
**Example:**
```typescript
// Using framer-motion (already installed)
import { motion, AnimatePresence } from 'framer-motion'

<div className="fixed bottom-6 right-6 z-50">
  <AnimatePresence mode="wait">
    {voiceState === 'idle' ? (
      <motion.button
        key="fab"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="h-12 w-12 rounded-full bg-accent shadow-lg"
        onClick={startRecording}
      >
        <Mic size={20} />
      </motion.button>
    ) : (
      <motion.div
        key="card"
        initial={{ width: 48, height: 48, borderRadius: 24 }}
        animate={{ width: 280, height: 80, borderRadius: 16 }}
        className="bg-surface-elevated border border-border shadow-xl"
      >
        {/* Equalizer bars + timer + stop button */}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### Pattern 4: Auto-Save Status Dot
**What:** Small colored dot indicating save state (gray/orange/green)
**When to use:** In the editor header area, replacing the text-based "Saving..." indicator
**Example:**
```typescript
// Three states: synced (gray), unsaved (orange), just-saved (green flash)
<span className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
  isSaving ? 'bg-orange-400' :
  showSaved ? 'bg-green-400 animate-pulse' :
  'bg-text-secondary/30'
}`} />
```

### Pattern 5: Pinned Notes with Sort Order
**What:** Pin/unpin notes, pinned section at top of list
**When to use:** Note list sidebar
**Example:**
```typescript
// In nebula-store, extend NoteListItem:
interface NoteListItem {
  id: string
  title: string
  summary: string | null
  updatedAt: string
  pinned: boolean      // NEW
  hasDrawing: boolean  // NEW
  contentPreview: string | null  // NEW: first ~100 chars of plain text
}

// Sort: pinned first (by updatedAt), then unpinned (by updatedAt)
const sortedNotes = [...notes].sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
})
```

### Anti-Patterns to Avoid
- **Don't import BubbleMenu from `@tiptap/react`** -- In tiptap v3, it MUST be imported from `@tiptap/react/menus`. The old import path will fail.
- **Don't use per-note panel sizes** -- User decided on global panel size. Store the divider position once, not per note.
- **Don't build real waveform visualization** -- User explicitly wants pre-animated equalizer bars, not real audio data visualization.
- **Don't add undo/redo toolbar buttons** -- User decided keyboard-only for undo/redo.
- **Don't use Tiptap's built-in link dialog** -- It has none; build a minimal Cmd+K popup.
- **Don't store raw uncompressed audio** -- WebM/Opus (already the MediaRecorder default) is compressed enough. Don't add ffmpeg or other conversion tools.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable panels | Custom drag handlers with mousedown/mousemove | `react-resizable-panels` | Double-click reset, collapse state, keyboard accessibility, auto-save to localStorage, edge cases with min/max sizes |
| Floating toolbar positioning | Manual getBoundingClientRect + scroll offset | Tiptap BubbleMenu (uses @floating-ui internally) | Handles viewport edge detection, scroll repositioning, flip/shift automatically |
| Table editing | Custom contenteditable table | `@tiptap/extension-table` | Cell merging, column resize handles, tab navigation between cells, row/column insertion -- immensely complex to build |
| Image embed handling | Custom drag-drop with FileReader | `@tiptap/extension-image` with `allowBase64: true` | Handles paste events, drag-drop, inline vs block modes, ProseMirror schema integration |
| Panel collapse animation | CSS transition on width | `react-resizable-panels` `collapsible` prop + framer-motion | Library handles collapse state management; framer-motion handles smooth transitions |

**Key insight:** The editor enhancements all have official Tiptap extensions. Hand-rolling ProseMirror nodes for tables, images, or links would take days and produce inferior results with edge cases around selection, serialization, and keyboard navigation.

## Common Pitfalls

### Pitfall 1: BubbleMenu Import Path (Tiptap v3)
**What goes wrong:** BubbleMenu imported from `@tiptap/react` throws "tippy is not a function" error
**Why it happens:** Tiptap v3 moved BubbleMenu/FloatingMenu to `@tiptap/react/menus` and switched from Tippy.js to Floating UI
**How to avoid:** Always import from `@tiptap/react/menus`: `import { BubbleMenu } from '@tiptap/react/menus'`
**Warning signs:** Runtime error mentioning tippy_js or undefined function

### Pitfall 2: tldraw Remount on Panel Resize
**What goes wrong:** tldraw re-renders or loses state when its container resizes
**Why it happens:** tldraw watches container size; rapid resize events can cause performance issues or re-initialization
**How to avoid:** Use `react-resizable-panels` which handles resize events efficiently. Keep `key={noteId}` pattern so tldraw only remounts on note switch, not on resize. The tldraw `<Tldraw>` component handles container resizing gracefully as long as it's not unmounted/remounted.
**Warning signs:** Canvas flickering during divider drag

### Pitfall 3: Audio File Storage Across IPC Boundary
**What goes wrong:** Audio blob sent as number[] array to main process but never persisted to disk
**Why it happens:** Current implementation writes a temp file, transcribes, then deletes it. No persistent audio storage exists.
**How to avoid:** Add a new IPC handler `nebula:saveAudio` that writes the audio buffer to `{storagePath}/audio/{noteId}.webm` and returns the path. Store the path in the note's metadata. Add `nebula:loadAudio` to read it back for playback.
**Warning signs:** Audio playback button with no file to play

### Pitfall 4: Sidebar Resize vs. Panel Resize Conflict
**What goes wrong:** Using react-resizable-panels for both the sidebar AND the text/drawing split can create nested PanelGroups that fight over layout
**Why it happens:** Two independent PanelGroups need different autoSaveIds and careful CSS containment
**How to avoid:** Use separate PanelGroup instances: one horizontal group for sidebar|content, and inside the content panel, another horizontal group for editor|drawing. Give them distinct `autoSaveId` values: `"nebula-sidebar"` and `"nebula-editor-split"`.
**Warning signs:** Panels jumping to wrong sizes, CSS overflow issues

### Pitfall 5: Context Menu Positioning at Window Edges
**What goes wrong:** Right-click near the bottom or right edge of the window causes menu to render off-screen
**Why it happens:** Menu positioned at mouse coordinates without viewport boundary checking
**How to avoid:** Calculate available space in both X and Y directions; flip menu to appear above/left of cursor if insufficient space. Use `window.innerWidth/innerHeight` minus menu dimensions.
**Warning signs:** Menu items clipped or invisible near window edges

### Pitfall 6: Tiptap Table Extension CSS Missing
**What goes wrong:** Tables render without borders, resize handles invisible, cells misaligned
**Why it happens:** @tiptap/extension-table requires specific CSS for `.column-resize-handle`, table borders, and cell padding
**How to avoid:** Add table-specific CSS to `main.css` under `.nebula-editor` scope. Include styles for `table`, `th`, `td`, `.column-resize-handle`, and `.selectedCell`.
**Warning signs:** Invisible table borders, resize cursor not appearing

### Pitfall 7: Pinned State Persistence
**What goes wrong:** Pinned state lost on app restart because it's only stored in zustand
**Why it happens:** `pinned` is a UI state that needs to persist but isn't part of the note file content
**How to avoid:** Add a `pinned` INTEGER column to the `notes` table in SQLite. Update via a new `nebula:togglePin` IPC handler. Include `pinned` in `listNotes()` query results.
**Warning signs:** Pins disappearing after app restart

## Code Examples

### Tiptap BubbleMenu with Formatting Controls
```typescript
// Source: https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
import { BubbleMenu } from '@tiptap/react/menus'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Placeholder.configure({ placeholder: 'Start writing...' }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: { class: 'text-accent underline cursor-pointer' }
    }),
    Image.configure({
      allowBase64: true,
      inline: false
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader
  ],
  content: content ?? undefined,
  onUpdate: ({ editor: ed }) => onUpdate(ed.getJSON())
})
```

### Keyboard Shortcuts via Tiptap Extension
```typescript
// Source: https://tiptap.dev/docs/editor/core-concepts/keyboard-shortcuts
// Tiptap StarterKit already binds:
//   Mod-b → bold, Mod-i → italic, Mod-z → undo, Mod-Shift-z → redo
//   Mod-Shift-7 → ordered list, Mod-Shift-8 → bullet list
//   Mod-e → code

// Custom shortcuts for headings and links:
import { Extension } from '@tiptap/core'

const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Shift-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Shift-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-k': () => {
        // Open link dialog (handled by parent component via callback)
        this.editor.commands.focus()
        // Emit custom event or call a callback
        return true
      }
    }
  }
})
```

### react-resizable-panels Sidebar + Split View
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

// Outer group: sidebar | content
<PanelGroup direction="horizontal" autoSaveId="nebula-sidebar">
  <Panel
    defaultSize={20}
    minSize={5}
    maxSize={40}
    collapsible
    collapsedSize={3}
    ref={sidebarPanelRef}
  >
    {isSidebarCollapsed ? (
      <button onClick={() => sidebarPanelRef.current?.expand()}>
        <ChevronRight size={16} />
      </button>
    ) : (
      <NoteList />
    )}
  </Panel>
  <PanelResizeHandle className="w-1 bg-border hover:bg-accent/30 transition-colors" />
  <Panel defaultSize={80}>
    {/* Inner group: editor | drawing */}
    <PanelGroup direction="horizontal" autoSaveId="nebula-editor-split">
      <Panel defaultSize={100} minSize={30}>
        <NoteEditor />
      </Panel>
      {showDrawing && (
        <>
          <PanelResizeHandle className="w-1.5 bg-border hover:bg-accent/30" />
          <Panel defaultSize={40} minSize={20} collapsible>
            <DrawingCanvas />
          </Panel>
        </>
      )}
    </PanelGroup>
  </Panel>
</PanelGroup>
```

### Animated Equalizer Bars (CSS)
```css
/* Pre-animated equalizer bars -- not real waveform */
@keyframes equalizer-1 { 0%, 100% { height: 4px; } 50% { height: 16px; } }
@keyframes equalizer-2 { 0%, 100% { height: 8px; } 50% { height: 20px; } }
@keyframes equalizer-3 { 0%, 100% { height: 6px; } 50% { height: 14px; } }
@keyframes equalizer-4 { 0%, 100% { height: 10px; } 50% { height: 18px; } }

.equalizer-bar:nth-child(1) { animation: equalizer-1 0.6s ease-in-out infinite; }
.equalizer-bar:nth-child(2) { animation: equalizer-2 0.5s ease-in-out infinite 0.1s; }
.equalizer-bar:nth-child(3) { animation: equalizer-3 0.7s ease-in-out infinite 0.2s; }
.equalizer-bar:nth-child(4) { animation: equalizer-4 0.4s ease-in-out infinite 0.15s; }
```

### Audio File Persistence IPC Pattern
```typescript
// Main process: save audio buffer to disk alongside note
ipcMain.handle('nebula:saveAudio', async (_event, noteId: string, audioBuffer: number[]) => {
  const { fileStorage } = getNebulaInstances()
  const audioDir = path.join(fileStorage.getStoragePath(), 'audio')
  fs.mkdirSync(audioDir, { recursive: true })
  const audioPath = path.join(audioDir, `${noteId}.webm`)
  fs.writeFileSync(audioPath, Buffer.from(audioBuffer))
  return { audioPath }
})

// Main process: load audio for playback
ipcMain.handle('nebula:loadAudio', async (_event, noteId: string) => {
  const { fileStorage } = getNebulaInstances()
  const audioPath = path.join(fileStorage.getStoragePath(), 'audio', `${noteId}.webm`)
  if (!fs.existsSync(audioPath)) return null
  const buffer = fs.readFileSync(audioPath)
  return Array.from(new Uint8Array(buffer))
})
```

### Toast Notification with framer-motion
```typescript
// Simple custom toast -- no library needed
import { motion, AnimatePresence } from 'framer-motion'

function Toast({ message, onClick, onDismiss }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer
        rounded-lg border border-border bg-surface-elevated px-4 py-3 shadow-xl"
      onClick={onClick}
    >
      <span className="text-sm text-text-primary">{message}</span>
    </motion.div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tiptap BubbleMenu from `@tiptap/react` | Import from `@tiptap/react/menus` | Tiptap v3 (2024) | Must use new import path |
| Tippy.js for floating menus | @floating-ui/dom for positioning | Tiptap v3 (2024) | No tippy.js dependency needed |
| Fixed toolbar above editor | Floating BubbleMenu on selection | Notion/Linear pattern (mainstream) | Cleaner editing surface |
| Toggle-based panel visibility | Resizable split panels | VS Code / modern IDE pattern | More flexible workspace |
| Bottom-bar recording UI | FAB with expandable card | Mobile-first pattern adapted to desktop | Less visual clutter when not recording |

**Deprecated/outdated:**
- `@tiptap/extension-bubble-menu` as standalone install: Not needed when using `@tiptap/react` v3 -- BubbleMenu component is included in `@tiptap/react/menus`
- Tippy.js positioning: Replaced by @floating-ui in Tiptap v3

## Open Questions

1. **Table drag-to-reorder rows**
   - What we know: `@tiptap/extension-table` supports add/delete rows/columns and column resize, but native row reordering via drag is not a built-in feature
   - What's unclear: Whether row drag-to-reorder requires a custom ProseMirror plugin or if a workaround exists
   - Recommendation: Implement add/delete/resize first. If drag-to-reorder is complex, defer to a future iteration and document the limitation

2. **Audio playback across IPC boundary**
   - What we know: Audio must be loaded from main process (disk) and played in renderer. Current pattern sends number[] arrays across contextBridge
   - What's unclear: Whether sending a full audio file as number[] is performant for longer recordings (> 5 min)
   - Recommendation: For files under ~50MB, the number[] pattern works fine. For larger files, could use a file:// URL via a custom protocol handler, but this is likely premature optimization for typical voice notes

3. **Image embed storage strategy**
   - What we know: Tiptap Image extension supports base64 inline images and URL references
   - What's unclear: Whether to store images as base64 in the Tiptap JSON (simple but bloats note files) or save to disk and reference by path
   - Recommendation: Use `allowBase64: true` for simplicity. Pasted/dropped images get base64-encoded into the document JSON. This is the simplest approach and note files remain self-contained. Add size constraint (~5MB max per image) to prevent bloat

## Sources

### Primary (HIGH confidence)
- Tiptap official docs - BubbleMenu extension, Table extension, Link extension, Image extension, keyboard shortcuts
- react-resizable-panels GitHub and npm - API documentation, PanelGroup/Panel/PanelResizeHandle components
- Existing codebase analysis - all Nebula source files from Phase 8

### Secondary (MEDIUM confidence)
- Tiptap v2 to v3 migration guide - BubbleMenu import path change verified
- react-resizable-panels npm page - autoSaveId, collapsible, double-click reset features
- WebM/Opus compression - MediaRecorder already uses this format by default in Chromium/Electron

### Tertiary (LOW confidence)
- Table drag-to-reorder capability - could not verify official support, flagged in Open Questions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm, official docs, and existing codebase analysis. Tiptap extensions are from the same ecosystem at matching versions.
- Architecture: HIGH - Patterns verified against official documentation and existing project conventions. Split-view with react-resizable-panels is a well-documented pattern.
- Pitfalls: HIGH - BubbleMenu import path verified via official migration guide. tldraw resize behavior confirmed via existing DrawingCanvas.tsx patterns. IPC audio storage gap identified from direct code analysis.

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable ecosystem, no major releases expected)
