# Phase 8: Nebula Plugin - Research

**Researched:** 2026-03-09
**Domain:** Notes & knowledge management, rich text editing, drawing canvas, voice recording/transcription, knowledge graph visualization, embedded SQLite
**Confidence:** MEDIUM-HIGH

## Summary

The Nebula plugin is the most feature-rich plugin in the Zenith project, spanning six distinct technical domains: rich text editing, drawing canvas, local file storage with embedded database indexing, AI-powered summarization, knowledge graph visualization, and voice recording with speaker-diarized transcription. The project already has mature patterns for plugin registration, IPC communication, AI streaming, and Zustand state management that Nebula must follow.

The primary technical challenge is integrating several heavyweight libraries (Tiptap editor, tldraw drawing canvas, react-force-graph, better-sqlite3) while maintaining the lean Electron architecture. The voice transcription pipeline introduces an external API dependency (OpenAI's `gpt-4o-transcribe-diarize` model) that can leverage the existing `@ai-sdk/openai` package already installed in the project. The knowledge graph requires building a relationship inference system from AI-generated summaries.

**Primary recommendation:** Use Tiptap for the rich text editor (headless, extensible, JSON serialization), tldraw for the drawing canvas (per user requirement -- note licensing implications), better-sqlite3 with FTS5 for embedded search indexing, react-force-graph-2d for knowledge graph visualization, MediaRecorder API for voice capture, and OpenAI's `gpt-4o-transcribe-diarize` for transcription with speaker diarization.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEBL-01 | Modern minimal text editor with rich formatting (headings, bold, italic, lists, code blocks) | Tiptap + StarterKit provides all these extensions out of the box with JSON persistence |
| NEBL-02 | Drawing canvas integrated into notes using tldraw | tldraw SDK 4.3 (React 18/19 compatible), snapshot save/load, dark mode support; requires license key for production |
| NEBL-03 | Notes stored locally on disk as structured files | JSON files on disk via Node.js fs in main process, accessed through IPC; directory path configurable in plugin settings |
| NEBL-04 | AI agent auto-summarization on save/update | Reuse existing `ai:startAnalysis` IPC channel with summarization system prompt |
| NEBL-05 | Knowledge graph visualization of note connections | react-force-graph-2d for Obsidian-style graph; nodes = notes, links = AI-inferred connections stored in SQLite |
| NEBL-06 | Search & Q&A over notes via AI | SQLite FTS5 for full-text search + AI Q&A using summaries and graph context via existing streaming infrastructure |
| NEBL-07 | Voice recording (start/stop) | MediaRecorder API in renderer (Electron Chromium supports it); macOS entitlements already configured for microphone |
| NEBL-08 | Voice transcription with speaker diarization | OpenAI `gpt-4o-transcribe-diarize` model via `@ai-sdk/openai` (already installed); accepts audio file, returns diarized JSON |
| NEBL-09 | Transcription-to-knowledge pipeline | Automated: transcription stored as note, AI summarizes, summary added to knowledge graph -- reuses NEBL-04 + NEBL-05 flows |
| NEBL-10 | Plugin settings via standard settings page | PluginDefinition.settingsSchema pattern; fields: storagePath (directory), AI agent, voice input device |
| NEBL-11 | Three-tab UI layout (Note Taking, Search, Knowledge) | Tab pattern identical to LaunchpadView -- local useState or store-driven tab state |
| NEBL-12 | Embedded SQLite via better-sqlite3 for indexing | better-sqlite3 v12.6.2, externalized in electron-vite, FTS5 for full-text indexing, schema for notes/summaries/graph edges |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | ^3.20.1 | Rich text editor React bindings | Headless, extensible, built on ProseMirror; JSON serialization; best DX for custom editors |
| @tiptap/starter-kit | ^3.20.0 | Bundle of common extensions (headings, bold, italic, lists, code blocks) | Single import covers all NEBL-01 requirements |
| @tiptap/pm | ^3.20.0 | ProseMirror dependency for Tiptap | Required peer dependency |
| tldraw | ^4.3.0 | Infinite drawing canvas | User requirement specifies tldraw; React component with snapshot save/load |
| better-sqlite3 | ^12.6.2 | Embedded SQLite database (synchronous, fast) | User requirement (NEBL-12); FTS5 support built-in; no external process |
| @types/better-sqlite3 | ^7.x | TypeScript types for better-sqlite3 | Dev dependency for type safety |
| react-force-graph-2d | ^1.29.1 | 2D force-directed graph visualization | Canvas-based, performant for 100s of nodes; d3-force physics; zoom/pan/drag |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tiptap/extension-placeholder | ^3.20.0 | Placeholder text in empty editor | UX polish -- shows "Start writing..." when editor is empty |
| @tiptap/extension-code-block-lowlight | ^3.20.0 | Syntax-highlighted code blocks | Only if code block highlighting is wanted beyond basic code blocks |
| openai | ^4.x | OpenAI API client for audio transcription | Voice transcription -- the Vercel AI SDK does NOT support audio endpoints; need direct OpenAI client |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Lexical (Meta) | Lexical is lighter but not yet 1.0; less mature ecosystem; Tiptap has better extension model |
| tldraw | Excalidraw | Excalidraw is MIT-licensed (no production key needed) but user explicitly requested tldraw |
| react-force-graph-2d | Custom d3 force layout | react-force-graph-2d wraps d3-force with React bindings; building custom is unnecessary |
| better-sqlite3 | sql.js (WASM) | sql.js runs in renderer but is slower; better-sqlite3 is synchronous and 2-10x faster |
| OpenAI transcription | AssemblyAI | AssemblyAI has great diarization but adds another API dependency; OpenAI already integrated |

**Installation:**
```bash
# Rich text editor
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder

# Drawing canvas
npm install tldraw

# Embedded database (main process only)
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Knowledge graph visualization
npm install react-force-graph-2d

# OpenAI direct client for audio transcription (Vercel AI SDK doesn't cover audio endpoints)
npm install openai

# Rebuild native modules for Electron
npx electron-rebuild -f -w better-sqlite3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── nebula/
│   │   ├── database.ts          # SQLite database manager (better-sqlite3)
│   │   ├── file-storage.ts      # Note file I/O (read/write JSON to disk)
│   │   └── transcription.ts     # OpenAI audio transcription handler
│   └── ipc-handlers.ts          # Add nebula:* IPC channels
├── preload/
│   └── index.ts                 # Add nebula namespace to api object
├── renderer/src/
│   ├── plugins/nebula/
│   │   ├── NebulaView.tsx        # Main view with 3-tab layout (default export)
│   │   ├── NoteEditor.tsx        # Tiptap editor + toolbar
│   │   ├── DrawingCanvas.tsx     # tldraw wrapper component
│   │   ├── NoteList.tsx          # Sidebar list of notes
│   │   ├── SearchView.tsx        # AI Q&A + full-text search
│   │   ├── KnowledgeGraph.tsx    # react-force-graph-2d visualization
│   │   └── VoiceRecorder.tsx     # MediaRecorder UI + transcription trigger
│   ├── stores/
│   │   └── nebula-store.ts       # Zustand store for notes, search, graph, voice
│   └── types/
│       └── nebula.ts             # All Nebula type definitions
```

### Pattern 1: Main-Process SQLite Manager
**What:** Singleton class in main process that manages the better-sqlite3 database instance, exposes query methods via IPC.
**When to use:** All database operations (notes CRUD, FTS search, graph queries).
**Example:**
```typescript
// src/main/nebula/database.ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

export class NebulaDatabase {
  private db: Database.Database

  constructor(storagePath?: string) {
    const dbPath = storagePath
      ? path.join(storagePath, 'nebula.db')
      : path.join(app.getPath('userData'), 'nebula.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '{}',
        drawing TEXT,
        summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, summary, content_text,
        content='notes', content_rowid='rowid'
      );

      CREATE TABLE IF NOT EXISTS graph_edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'related',
        weight REAL NOT NULL DEFAULT 1.0,
        UNIQUE(source_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        audio_path TEXT NOT NULL,
        transcript TEXT NOT NULL,
        speakers TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
  }

  // ... CRUD methods, FTS search, graph queries
}
```

### Pattern 2: Note File Storage + DB Indexing (Dual Persistence)
**What:** Notes stored as JSON files on disk (human-readable, portable) with SQLite indexing for fast search and graph queries.
**When to use:** Every note save operation writes to disk AND updates the SQLite index.
**Example:**
```typescript
// Note saved as: {storagePath}/notes/{id}.json
interface NoteFile {
  id: string
  title: string
  content: object          // Tiptap JSON document
  drawing: object | null   // tldraw snapshot
  summary: string | null   // AI-generated summary
  createdAt: string
  updatedAt: string
}

// SQLite stores: id, title, summary, content_text (plain text extracted from Tiptap JSON)
// FTS5 indexes: title + summary + content_text for full-text search
```

### Pattern 3: AI Summarization on Save (Fire-and-Forget)
**What:** When a note is saved, trigger AI summarization via the existing `ai:startAnalysis` channel. When complete, update the note's summary and refresh knowledge graph edges.
**When to use:** Every note save triggers a background summarization.
**Example:**
```typescript
// In nebula-store.ts (same pattern as launchpad-store.ts AI chat)
const SUMMARIZE_SYSTEM_PROMPT = `You are a knowledge assistant. Given a note's content, produce:
1. A concise title (max 10 words)
2. A 2-3 sentence summary
3. A list of key topics/concepts mentioned
4. Suggested connections to other notes (by topic similarity)

Output as JSON:
{ "title": "...", "summary": "...", "topics": ["..."], "connections": ["topic1", "topic2"] }`

// Use ai:startAnalysis with session-scoped listeners, same as Launchpad AI
```

### Pattern 4: tldraw Dark Mode + Snapshot Persistence
**What:** Mount tldraw with dark mode forced, save/load via snapshot API.
**When to use:** DrawingCanvas component within the note editor.
**Example:**
```typescript
// src/renderer/src/plugins/nebula/DrawingCanvas.tsx
import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function DrawingCanvas({ snapshot, onSave }: Props) {
  return (
    <div style={{ height: 400 }}>
      <Tldraw
        inferDarkMode={true}
        snapshot={snapshot}
        onMount={(editor) => {
          editor.updateInstanceState({ colorScheme: 'dark' })
          // Listen for changes to auto-save
          editor.store.listen(() => {
            const snap = editor.store.getStoreSnapshot()
            onSave(snap)
          }, { scope: 'document' })
        }}
      />
    </div>
  )
}
```

### Pattern 5: Voice Recording with MediaRecorder
**What:** Use browser MediaRecorder API in renderer to capture audio, then send to main process for transcription via IPC.
**When to use:** VoiceRecorder component.
**Example:**
```typescript
// Renderer: capture audio as blob
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
const chunks: Blob[] = []
recorder.ondataavailable = (e) => chunks.push(e.data)
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' })
  const buffer = await blob.arrayBuffer()
  // Send buffer to main process via IPC for transcription
  const result = await window.api.nebula.transcribeAudio(
    Array.from(new Uint8Array(buffer))
  )
}
```

### Pattern 6: Knowledge Graph Data Structure
**What:** Graph nodes and edges derived from SQLite, rendered by react-force-graph-2d.
**When to use:** KnowledgeGraph component.
**Example:**
```typescript
// Graph data shape for react-force-graph-2d
interface GraphData {
  nodes: { id: string; name: string; val: number }[]
  links: { source: string; target: string; label: string }[]
}

// Query from SQLite:
// SELECT n.id, n.title, COUNT(e.id) as connections
// FROM notes n LEFT JOIN graph_edges e ON n.id = e.source_id OR n.id = e.target_id
// GROUP BY n.id
```

### Anti-Patterns to Avoid
- **Running better-sqlite3 in the renderer process:** NEVER. It's a native module that must run in the main process only. All DB access via IPC.
- **Storing entire Tiptap JSON in SQLite for search:** FTS5 cannot index JSON blobs. Extract plain text from Tiptap content and index that separately.
- **Using tldraw without license key in production:** The SDK will not work in production without a valid license key. Must be configured.
- **Blocking the main process with synchronous SQLite calls:** While better-sqlite3 is synchronous, wrap heavy queries in try/catch and keep them fast. Consider WAL mode (already recommended above).
- **Sending raw audio blobs through IPC structured clone:** Large audio files can freeze IPC. Write to temp file first, send file path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable | Tiptap + StarterKit | Selection, cursor, undo/redo, formatting are deceptively complex |
| Drawing canvas | Custom SVG/Canvas tool | tldraw | Pressure sensitivity, shape tools, undo/redo, pan/zoom are years of work |
| Full-text search | Custom string matching | SQLite FTS5 | Tokenization, ranking (BM25), boolean queries, accent folding |
| Force-directed graph | Custom d3 simulation | react-force-graph-2d | WebGL rendering, physics simulation, zoom/pan, hit detection |
| Audio recording | Custom WebAudio capture | MediaRecorder API | Encoding, chunking, codec negotiation handled by browser |
| Speaker diarization | Custom ML model | OpenAI gpt-4o-transcribe-diarize | State-of-the-art diarization requires massive models and training data |
| JSON file I/O | Custom serialization | Node.js fs.writeFile/readFile with JSON.stringify/parse | Atomic writes, encoding, error handling |

**Key insight:** Every subdomain of Nebula (text editing, drawing, search, graph viz, audio, transcription) has mature solutions. Building custom versions would multiply development time by 10x with worse results.

## Common Pitfalls

### Pitfall 1: tldraw CSS Not Loading
**What goes wrong:** tldraw renders but looks broken -- no styles, overlapping UI.
**Why it happens:** tldraw requires importing its CSS file (`tldraw/tldraw.css`), which is easy to forget.
**How to avoid:** Import `import 'tldraw/tldraw.css'` at the top of the DrawingCanvas component. Ensure Vite/Tailwind doesn't purge it.
**Warning signs:** Drawing canvas renders but tools panel is unstyled or invisible.

### Pitfall 2: better-sqlite3 Binary Mismatch
**What goes wrong:** App crashes on startup with "NODE_MODULE_VERSION mismatch" error.
**Why it happens:** better-sqlite3 compiled against Node.js headers, not Electron's.
**How to avoid:** Run `npx electron-rebuild -f -w better-sqlite3` after install. In electron-builder.yml, add `better-sqlite3` to `asarUnpack`. Set `npmRebuild: true` or use postinstall script.
**Warning signs:** Error mentioning NODE_MODULE_VERSION in console.

### Pitfall 3: Electron ASAR Packaging Breaks Native Modules
**What goes wrong:** App works in dev but crashes in production build with "cannot find better-sqlite3.node".
**Why it happens:** Native .node binaries cannot be loaded from inside ASAR archives.
**How to avoid:** Add to electron-builder.yml: `asarUnpack: ['**/better-sqlite3/**', '**/node_modules/better-sqlite3/**']`
**Warning signs:** Works in `electron-vite dev` but fails in packaged app.

### Pitfall 4: FTS5 Sync Triggers Missing
**What goes wrong:** Full-text search returns stale results or misses recently saved notes.
**Why it happens:** FTS5 virtual tables with external content (`content='notes'`) require manual sync via triggers or explicit INSERT/DELETE on the FTS table.
**How to avoid:** Create triggers on the notes table that update notes_fts, or manually maintain the FTS table in the save/delete methods.
**Warning signs:** Search finds old content but not recently edited notes.

### Pitfall 5: MediaRecorder mimeType Compatibility
**What goes wrong:** Audio recording fails silently or produces corrupt files.
**Why it happens:** Not all mimeTypes are supported in Electron's Chromium. `audio/webm;codecs=opus` is the safest.
**How to avoid:** Check `MediaRecorder.isTypeSupported()` before creating the recorder. Fallback to `audio/webm`.
**Warning signs:** `ondataavailable` fires with empty data, or transcription API rejects the file.

### Pitfall 6: tldraw Production License Key
**What goes wrong:** tldraw shows watermark or fails to render in production builds.
**Why it happens:** tldraw SDK 2.0+ requires a valid license key for production deployments.
**How to avoid:** Obtain a tldraw license key (100-day free trial available). Pass via `licenseKey` prop or explore hobby license (requires "made with tldraw" watermark).
**Warning signs:** Console warning about missing license; canvas renders with overlay.

### Pitfall 7: Large Audio Files Freezing IPC
**What goes wrong:** App becomes unresponsive when sending recorded audio through IPC.
**Why it happens:** Electron IPC uses structured clone, which blocks the main thread for large buffers.
**How to avoid:** Write audio to a temp file in the renderer (via File API or IPC), then send the file path to main process. Main process reads the file for transcription.
**Warning signs:** UI freezes for several seconds after stopping a long recording.

## Code Examples

### Tiptap Minimal Editor Setup
```typescript
// Source: https://tiptap.dev/docs/editor/getting-started/install/react
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

function NoteEditor({ content, onUpdate }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content, // Tiptap JSON or HTML
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON())
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-1 border-b border-border px-2 py-1">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive('bold') ? 'text-accent' : 'text-text-secondary'}>
          B
        </button>
        {/* ... more toolbar buttons */}
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto p-4" />
    </div>
  )
}
```

### SQLite FTS5 Search Query
```typescript
// Source: https://sqlite.org/fts5.html
// Full-text search with BM25 ranking
const searchNotes = db.prepare(`
  SELECT n.id, n.title, n.summary, n.updated_at,
         highlight(notes_fts, 0, '<mark>', '</mark>') as title_highlight,
         highlight(notes_fts, 1, '<mark>', '</mark>') as summary_highlight,
         bm25(notes_fts) as rank
  FROM notes_fts
  JOIN notes n ON notes_fts.rowid = n.rowid
  WHERE notes_fts MATCH ?
  ORDER BY rank
  LIMIT 20
`)

const results = searchNotes.all(searchQuery)
```

### OpenAI Transcription with Diarization (Main Process)
```typescript
// Source: https://platform.openai.com/docs/guides/speech-to-text
import OpenAI from 'openai'
import fs from 'fs'

export async function transcribeAudio(
  audioPath: string,
  apiKey: string
): Promise<DiarizedTranscript> {
  const client = new OpenAI({ apiKey })

  const response = await client.audio.transcriptions.create({
    model: 'gpt-4o-transcribe-diarize',
    file: fs.createReadStream(audioPath),
    response_format: 'verbose_json',
    // chunking_strategy required for audio > 30s
    chunking_strategy: { type: 'auto' },
  })

  // response includes segments with speaker labels, timestamps
  return {
    text: response.text,
    segments: response.segments?.map(seg => ({
      speaker: seg.speaker ?? 'unknown',
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })) ?? [],
  }
}
```

### IPC Channel Pattern (following project conventions)
```typescript
// In ipc-handlers.ts — same fire-and-forget pattern as ai:startReview
ipcMain.handle('nebula:saveNote', async (_event, note) => {
  await nebulaFileStorage.writeNote(note)
  nebulaDb.upsertNote(note)
  // Trigger AI summarization asynchronously (fire-and-forget)
  return { saved: true }
})

ipcMain.handle('nebula:searchNotes', async (_event, query: string) => {
  return nebulaDb.searchFTS(query)
})

ipcMain.handle('nebula:getGraph', async () => {
  return nebulaDb.getGraphData()
})

ipcMain.handle('nebula:transcribeAudio', async (_event, audioBuffer: number[]) => {
  // Write to temp file, call OpenAI, return transcript
  const tmpPath = path.join(app.getPath('temp'), `nebula-${Date.now()}.webm`)
  fs.writeFileSync(tmpPath, Buffer.from(audioBuffer))
  const apiKey = await getApiKeyForProvider('openai') // or configured provider
  const result = await transcribeAudio(tmpPath, apiKey!)
  fs.unlinkSync(tmpPath) // cleanup
  return result
})
```

### Preload Bridge Extension
```typescript
// Add to src/preload/index.ts
nebula: {
  saveNote: (note: unknown): Promise<{ saved: boolean }> =>
    ipcRenderer.invoke('nebula:saveNote', note),
  loadNote: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('nebula:loadNote', id),
  listNotes: (): Promise<unknown[]> =>
    ipcRenderer.invoke('nebula:listNotes'),
  deleteNote: (id: string): Promise<void> =>
    ipcRenderer.invoke('nebula:deleteNote', id),
  searchNotes: (query: string): Promise<unknown[]> =>
    ipcRenderer.invoke('nebula:searchNotes', query),
  getGraph: (): Promise<unknown> =>
    ipcRenderer.invoke('nebula:getGraph'),
  transcribeAudio: (buffer: number[]): Promise<unknown> =>
    ipcRenderer.invoke('nebula:transcribeAudio', buffer),
  selectAudioFile: (): Promise<{ canceled: boolean; path: string }> =>
    ipcRenderer.invoke('nebula:selectAudioFile'),
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quill / Draft.js for rich text | Tiptap 3.x (headless, ProseMirror-based) | 2024-2025 | Better extensibility, TypeScript support, active maintenance |
| tldraw 1.x (MIT) | tldraw 4.x (proprietary license) | 2024 | Production requires license key; v1 no longer maintained |
| Whisper API (no diarization) | gpt-4o-transcribe-diarize | 2025 | Built-in speaker identification, no separate diarization service |
| Manual FTS triggers | FTS5 with external content tables | Stable since SQLite 3.9 | Better ranking (BM25), snippet support |
| D3 force layout from scratch | react-force-graph-2d (canvas/WebGL) | 2023+ | 10x less code, better performance for 100s of nodes |

**Deprecated/outdated:**
- **Draft.js:** Archived by Meta, no longer maintained. Do not use.
- **tldraw v1:** Still MIT but unmaintained. v2+ is the current SDK.
- **Quill 1.x:** Major rewrite (Quill 2.0) happened but Tiptap is more extensible.

## Key Licensing Consideration: tldraw

The user requirement (NEBL-02) specifies "use tldraw" and notes "MIT license." However, tldraw 2.0+ is **NOT MIT-licensed** for production use. Options:

1. **Hobby license (free):** Requires visible "made with tldraw" watermark on the canvas. Suitable if the app is non-commercial.
2. **Trial license (free, 100 days):** Full functionality, no watermark, but expires.
3. **Commercial license (paid):** Required for commercial production use.
4. **Alternative: Excalidraw (MIT):** Fully open-source drawing canvas with similar features. Would require changing from user's explicit tldraw preference.

**Recommendation:** Use tldraw per the requirement. Obtain a trial or hobby license. The planner should note this licensing requirement in task instructions. If licensing is a blocker, Excalidraw is the fallback.

## electron-vite Configuration for better-sqlite3

The existing `electron.vite.config.ts` already uses `externalizeDepsPlugin()` for main and preload, which automatically externalizes dependencies listed in `package.json` `dependencies`. Since better-sqlite3 will be a production dependency, it will be automatically externalized. No config changes needed for build.

**However, for packaging:**
```yaml
# electron-builder.yml additions needed:
asarUnpack:
  - resources/**
  - '**/better-sqlite3/**'    # Unpack native binary from ASAR

npmRebuild: true               # Currently false! Must change for native modules
```

The current `npmRebuild: false` must be changed to `true` (or a postinstall electron-rebuild script must be added) for better-sqlite3 to work in production builds.

## Open Questions

1. **tldraw License Key Management**
   - What we know: Production use requires a license key passed as a prop.
   - What's unclear: Whether a trial license is acceptable for the project; pricing for commercial license.
   - Recommendation: Start with trial license (100 days free). Add license key to plugin settings or app config.

2. **Audio File Size Limits for OpenAI Transcription**
   - What we know: OpenAI API accepts files up to 25 MB; `gpt-4o-transcribe-diarize` requires `chunking_strategy: 'auto'` for files > 30 seconds.
   - What's unclear: Whether very long recordings (1+ hour meetings) will work reliably or need chunking on the client side.
   - Recommendation: Set a maximum recording duration (e.g., 60 minutes) and chunk if needed. Document the 25 MB file size limit.

3. **Knowledge Graph Edge Inference Quality**
   - What we know: AI will extract topics from notes and infer connections. Quality depends on the AI model and prompt engineering.
   - What's unclear: How well automatic connection inference will work in practice.
   - Recommendation: Start with topic-based matching (AI extracts keywords, notes sharing keywords get connected). Allow manual edge creation as override.

4. **OpenAI Package Compatibility with Existing AI SDK Setup**
   - What we know: Project uses `@ai-sdk/openai` (Vercel) for language models. Audio transcription requires the `openai` npm package directly (Vercel AI SDK doesn't wrap audio endpoints).
   - What's unclear: Whether both packages can coexist without version conflicts.
   - Recommendation: Install `openai` as a separate dependency. They have different scopes and should not conflict.

## Sources

### Primary (HIGH confidence)
- [tldraw official docs](https://tldraw.dev/) - Licensing, React integration, snapshot API, dark mode
- [Tiptap official docs](https://tiptap.dev/docs/editor/getting-started/install/react) - React setup, StarterKit, JSON persistence
- [SQLite FTS5 documentation](https://sqlite.org/fts5.html) - Full-text search configuration and queries
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) - Version 12.6.2, Electron rebuild support
- [OpenAI GPT-4o Transcribe Diarize](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize) - Audio transcription with speaker labels
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API) - Browser audio recording
- [electron-vite C/C++ Addons guide](https://electron-vite.github.io/guide/cpp-addons) - Native module externalization

### Secondary (MEDIUM confidence)
- [react-force-graph-2d GitHub](https://github.com/vasturiano/react-force-graph) - Graph visualization component, v1.29.1
- [tldraw license page](https://tldraw.dev/community/license) - Production license requirements
- [Liveblocks rich text editor comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) - Tiptap vs Lexical vs ProseMirror

### Tertiary (LOW confidence)
- [Fixing node-gyp rebuild errors with better-sqlite3 in Electron (Jan 2026)](https://coldfusion-example.blogspot.com/2026/01/fixing-node-gyp-rebuild-errors-with.html) - Electron 38+ native module issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Tiptap, better-sqlite3, MediaRecorder are well-documented and widely used
- Architecture: HIGH - Follows established Zenith patterns (IPC, Zustand, plugin registry)
- tldraw integration: MEDIUM - License model is clear but requires key management; API is documented
- Voice transcription: MEDIUM - OpenAI diarize model is new (2025); API is documented but `openai` package needs separate install
- Knowledge graph: MEDIUM - react-force-graph-2d is well-documented; edge inference quality depends on AI prompt engineering
- Pitfalls: HIGH - Better-sqlite3 in Electron is a well-known pain point with documented solutions

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days - stack is stable)
