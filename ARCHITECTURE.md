# Zenith — Architecture Design Document

> **Version:** 1.0.0 | **Author:** Prafull Saxena | **Last Updated:** 2026-03-30

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Overall Architecture](#2-overall-architecture)
3. [Main Process](#3-main-process)
4. [Renderer Process](#4-renderer-process)
5. [AI Agent System](#5-ai-agent-system)
6. [Settings & Credentials System](#6-settings--credentials-system)
7. [Plugin: Code Review Bot](#7-plugin-code-review-bot)
8. [Plugin: DB Inspector](#8-plugin-db-inspector)
9. [Plugin: Nebula (Notes & Knowledge)](#9-plugin-nebula-notes--knowledge)
10. [Plugin: Cortex (Code Analysis)](#10-plugin-cortex-code-analysis)
11. [Plugin: TextCraft](#11-plugin-textcraft)
12. [Plugin: Launchpad (Cloud Cost Estimator)](#12-plugin-launchpad-cloud-cost-estimator)
13. [Dashboard & Supporting Views](#13-dashboard--supporting-views)
14. [Database Layer](#14-database-layer)
15. [PDF Export System](#15-pdf-export-system)
16. [Type System Reference](#16-type-system-reference)

---

## 1. Project Overview

Zenith is an **AI-powered developer tools desktop application** built with Electron. It bundles six plugins — Code Review Bot, DB Inspector, Nebula Notes, Cortex Code Analysis, TextCraft, and Launchpad Cloud Estimator — into a single unified experience, all powered by pluggable AI agents.

### 1.1 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Framework | Electron | 39.2.6 |
| UI Library | React | 19.2.1 |
| Language | TypeScript | 5.9.3 |
| Bundler | Vite + electron-vite | 7.2.6 / 5.0.0 |
| Styling | Tailwind CSS | 4.0.12 |
| Routing | React Router v7 | 7.x |
| State Management | Zustand | 5.0.3 |
| Animations | Framer Motion | 12.5.0 |
| Rich Text Editor | TipTap | 3.20.1 |
| Code Editor | CodeMirror 6 | 6.x |
| Diagram Rendering | Mermaid | 11.12.3 |
| UI Primitives | Radix UI + shadcn | 1.4.3 |
| Table | TanStack React Table | 8.21.2 |
| Panel Layouts | react-resizable-panels | 4.7.2 |
| Drawing Canvas | tldraw | 4.4.1 |
| Flow Diagrams | @xyflow/react | 12.10.1 |
| Knowledge Graph | react-force-graph-2d | 1.29.1 |
| AI SDK | Vercel AI SDK | 6.0.116 |
| AI Providers | @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai, ollama-ai-provider | — |
| SQLite (Nebula/Cortex) | better-sqlite3 | 12.6.2 |
| PostgreSQL | pg | 8.20.0 |
| MySQL | mysql2 | 3.19.1 |
| Git | simple-git | 3.33.0 |
| Diff Parsing | parse-diff | 0.11.1 |
| PDF Generation | pdfmake | 0.3.5 |
| Settings Storage | electron-store | 10.0.0 |
| Validation | zod | 3.25.76 |

### 1.2 Build & Packaging

- **Dev:** `electron-vite dev` — Vite HMR for renderer, Node.js restart for main
- **Build:** `electron-vite build` → `out/` — Main (ESM), Preload (CommonJS), Renderer (SPA)
- **Package:** `electron-builder` → macOS `.dmg`, Windows `.nsis`, Linux `.AppImage/.deb/.snap`
- **App ID:** `com.zenith.app`
- **Entry points:**
  - Main: `src/main/index.ts` → `out/main/index.js`
  - Preload: `src/preload/index.ts` → `out/preload/index.cjs` (CJS for sandbox)
  - Renderer: `src/renderer/src/main.tsx` → SPA

---

## 2. Overall Architecture

### 2.1 Electron Three-Process Model

```
┌────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS  (Node.js — src/main/)                          │
│                                                                │
│  index.ts          App lifecycle, BrowserWindow creation       │
│  ipc-handlers.ts   All IPC handler registrations (1,200+ LOC) │
│  settings-store.ts electron-store persistence                  │
│  log-collector.ts  Diagnostic log buffering                    │
│                                                                │
│  ai/               LLM streaming (SDK + CLI)                   │
│  db/               PostgreSQL + MySQL connection management     │
│  nebula/           SQLite notes DB + audio file storage        │
│  cortex/           Git, code parsing, caching                  │
│  bitbucket/        REST API client + credentials               │
│  textcraft/        (prompt building only)                      │
│  launchpad/        PDF export wrapper                          │
│  lib/              PDF generation (pdfmake)                    │
└──────────────────────────┬─────────────────────────────────────┘
                           │ ipcMain.handle / webContents.send
┌──────────────────────────▼─────────────────────────────────────┐
│  PRELOAD BRIDGE  (Context-Isolated Sandbox — src/preload/)     │
│                                                                │
│  index.ts     Wraps all IPC calls, exposes window.api         │
│  index.d.ts   TypeScript types for window.api                 │
│                                                                │
│  window.api.{settings, credentials, app, bitbucket,           │
│               ai, db, cortex, nebula, launchpad, textcraft}   │
└──────────────────────────┬─────────────────────────────────────┘
                           │ contextBridge.exposeInMainWorld
┌──────────────────────────▼─────────────────────────────────────┐
│  RENDERER PROCESS  (React SPA — src/renderer/src/)             │
│                                                                │
│  App.tsx          HashRouter, theme, routes                    │
│  plugins/         6 compiled-in plugins                        │
│  components/      Shared UI (Layout, Dashboard, Settings)      │
│  stores/          12 Zustand stores                            │
│  types/           TypeScript interfaces                        │
│  data/            Static cloud pricing catalogs                │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Security Boundaries

| Setting | Value | Purpose |
|---------|-------|---------|
| `contextIsolation` | `true` | Renderer can't access Node.js APIs |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `true` | Additional Chromium sandboxing |
| `safeStorage` | Yes | API keys encrypted at OS keychain level |
| Preload output | `.cjs` | CommonJS required for contextBridge |

### 2.3 IPC Communication

All communication uses `ipcRenderer.invoke()` (request/response) for calls and `webContents.send()` (push) for streaming events.

**Request/Response channels (invoke):**

| Namespace | Channels | Count |
|-----------|----------|-------|
| `settings:*` | getAll, get, set, reset | 4 |
| `credentials:*` | set, has | 2 |
| `bitbucket:*` | connect, disconnect, isConnected, listPRs, getPRDiff, postComment, postTopLevelComment, getDiffstatCount | 8 |
| `ai:*` | startReview, cancelReview, startAnalysis, cancelAnalysis | 4 |
| `db:*` | testConnection, connect, disconnect, getConnections, isConnected, getDatabases, switchDatabase, getSchemas, getTables, getColumns, getForeignKeys, getIndexes, getTableStats, query, cancelQuery, allColumns, explain, buildSchemaContext, buildOptimizationContext, getTableDDL, storeCredentials, getCredentials | 22+ |
| `nebula:*` | saveNote, loadNote, listNotes, deleteNote, searchNotes, getGraph, updateEdges, transcribeAudio, saveTranscription, selectAudioFile, togglePin, saveAudio, loadAudio | 13 |
| `cortex:*` | listRepos, saveRepo, removeRepoById, updateRepoFields, fetchBranches, clone, analyze, getFileContent, removeRepo, getCachedAnalysis, searchCode, generateHLD, generateInsights, saveInsights, getInsights, reanalyze, buildDigest, saveEnrichment, getEnrichment, buildEntityBatches, buildValidationPrompts | 21+ |
| `app:*` | probeOllama, probeCli, openExternal, exportDiagnosticLogs, selectDirectory, exportPdf, saveTextFile | 7 |
| `launchpad:exportPdf` | — | 1 |
| `textcraft:exportPdf` | — | 1 |

**Push (streaming) channels (webContents.send):**

| Channel | Payload | Used for |
|---------|---------|----------|
| `ai:stream:chunk` | `{ sessionId, chunk }` | AI text tokens |
| `ai:stream:done` | `{ sessionId, usage? }` | Stream complete |
| `ai:stream:error` | `{ sessionId, error }` | Stream failure |
| `cortex:cloneProgress` | `{ stage, progress, detail }` | Git clone updates |
| `cortex:analysisProgress` | `{ phase, progress, detail, filesProcessed, totalFiles }` | Parse updates |

### 2.4 Preload Bridge Structure

```typescript
window.api = {
  settings: { getAll, get, set, reset },
  credentials: { set, has },
  app: { probeOllama, probeCli, openExternal, exportDiagnosticLogs,
         selectDirectory, exportPdf, saveTextFile },
  bitbucket: { connect, disconnect, isConnected, listPRs, getPRDiff,
               postComment, postTopLevelComment, getDiffstatCount },
  ai: { startReview, cancelReview, startAnalysis, cancelAnalysis,
        onStreamChunk, onStreamDone, onStreamError },
  db: { testConnection, connect, disconnect, getConnections, isConnected,
        getDatabases, switchDatabase, getSchemas, getTables, getColumns,
        getForeignKeys, getIndexes, getTableStats, query, cancelQuery,
        allColumns, explain, buildSchemaContext, buildOptimizationContext,
        getTableDDL, storeCredentials, getCredentials },
  cortex: { listRepos, saveRepo, removeRepoById, updateRepoFields,
            fetchBranches, clone, analyze, getFileContent, removeRepo,
            getCachedAnalysis, searchCode, generateHLD, generateInsights,
            saveInsights, getInsights, reanalyze, buildDigest, saveEnrichment,
            getEnrichment, buildEntityBatches, buildValidationPrompts,
            onCloneProgress, onAnalysisProgress },
  nebula: { saveNote, loadNote, listNotes, deleteNote, searchNotes,
            getGraph, updateEdges, transcribeAudio, saveTranscription,
            selectAudioFile, togglePin, saveAudio, loadAudio },
  launchpad: { exportPdf },
  textcraft: { exportPdf }
}
```

---

## 3. Main Process

### 3.1 Entry Point (`src/main/index.ts`)

- Creates `BrowserWindow` with strict security settings
- Loads preload script and renderer URL (dev: Vite server, prod: file://)
- Registers all IPC handlers via `registerIpcHandlers(mainWindow)`
- Persists window state (position/size) via `electron-win-state`
- Handles macOS `activate` event (re-open window on dock click)
- Custom uncaught exception handler suppresses EPIPE (broken CLI pipes)

**Window Configuration:**
```typescript
{
  width: 1280, height: 800,
  minWidth: 800, minHeight: 600,
  titleBarStyle: 'hiddenInset',  // macOS native title bar
  trafficLightPosition: { x: 16, y: 16 },
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}
```

### 3.2 IPC Handlers (`src/main/ipc-handlers.ts`)

Central registry (~1,200 lines). Organized in feature blocks:

1. **Settings** — delegated to `settings-store.ts`
2. **Credentials** — uses `electron.safeStorage` for OS-level encryption, stored separately in `zenith-credentials` electron-store
3. **Bitbucket** — delegates to `./bitbucket/token-manager.ts` and `./bitbucket/api.ts`
4. **AI Streaming** — routes to `streamReview()`/`streamCliReview()` or `streamAnalysis()`/`streamCliAnalysis()` based on presence of `command` parameter
5. **Database** — delegates to `./db/db-manager.ts` (unified router → postgres or mysql)
6. **Nebula** — delegates to `./nebula/database.ts` and `./nebula/file-storage.ts`
7. **Cortex** — delegates to `./cortex/analyzer.ts`, `./cortex/git-service.ts`, `./cortex/cache-db.ts`
8. **App utilities** — Ollama probe, CLI probe, file dialogs, PDF export, log export

**AI Routing Decision:**
```
ai:startReview(providerId, modelName, diff, sessionId, command?, guidelines?)
  ├── command present? → streamCliReview({ command, diff, sessionId })
  └── no command?     → streamReview({ providerId, modelName, diff, sessionId })
```

### 3.3 AI Layer (`src/main/ai/`)

#### `providers.ts` — SDK Model Factory
Creates Vercel AI SDK `LanguageModel` instances:

```
providerId
  'claude'       → @ai-sdk/anthropic (Claude models)
  'gemini'       → @ai-sdk/google (Gemini models)
  'ollama-*'     → ollama-ai-provider (local)
  'codex'        → @ai-sdk/openai
  'custom-*'     → @ai-sdk/openai (user-configured endpoint)
  default        → @ai-sdk/openai
```

API keys are decrypted via `safeStorage.decryptString()` from the credentials store. Base URLs are read from persisted settings.

#### `stream.ts` — SDK Streaming
- `streamReview(params)` — Uses Vercel AI SDK `streamText()` with TOON system prompt
- `streamAnalysis(params)` — Generic version accepting separate systemPrompt/userPrompt
- Both use `AbortController` for cancellation
- Token usage reported to renderer on completion via `ai:stream:done`
- `safeSend()` guards against window destruction during stream

#### `cli-stream.ts` — CLI Agent Streaming (850+ lines)
- `streamCliReview(params)` — Spawns CLI subprocess, pipes prompt via stdin
- `streamCliAnalysis(params)` — Same but with generic prompts
- `probeCliBinary(command)` — Runs `which`/`where` to check binary availability
- `getLoginShellPath()` — Resolves full PATH from login shell (Homebrew, nvm, pip, etc.) so CLI tools are found even when Electron is launched from Finder/Dock
- `extractJsonEventText(buffer)` — JSON event parser supporting:
  - **Codex format:** `{"type":"item.completed","item":{"type":"agent_message","text":"..."}}`
  - **Cursor Agent format:** `{"type":"assistant","timestamp_ms":...,"message":{"content":[{"type":"text","text":"..."}]}}` — only processes events WITH `timestamp_ms` (streaming deltas); skips final event without `timestamp_ms` (full accumulated text) to avoid content duplication
  - **Cursor result:** `{"type":"result","subtype":"success","usage":{"inputTokens":N,"outputTokens":N}}` — extracts real token counts

**TOON Output Format (Token-Optimized Output Notation):**
```
SEV|CONF|KIND|FILE:LINE|TITLE|EXPLANATION|FIX
B|H|bug|src/utils.ts:42|Null dereference|Object may be null here|Add null check before access
---
Overall summary text here
```
- SEV: B=Blocking, I=Important, S=Suggestion
- CONF: H=High, M=Medium, L=Low
- KIND: bug, sec, perf, cor, mnt, test, sty

#### `db-prompts.ts`
System prompts for database Q&A and query optimization tasks.

### 3.4 Database Layer (`src/main/db/`)

#### `db-manager.ts` — Unified Router
Maintains an `engineMap` (connectionId → engine type). Routes all operations to either `PostgresConnectionManager` or `MySqlConnectionManager`. Default engine is PostgreSQL for legacy connections.

#### `postgres.ts` — PostgreSQL Manager (600+ lines)
- Connection pooling via `pg.Pool` (one pool per connection ID)
- Schema introspection via `information_schema` and `pg_*` catalog tables
- Read-only enforcement via SQL keyword regex blocklist
- EXPLAIN ANALYZE for query plan analysis
- FKs from `information_schema.key_column_usage`
- Indexes from `pg_indexes`
- Row counts/sizes from `pg_stat_user_tables`

#### `mysql.ts` — MySQL Manager (600+ lines)
- Uses `mysql2/promise` for async connections
- Schema introspection adapted to MySQL's `INFORMATION_SCHEMA`
- `SHOW CREATE TABLE` for DDL generation
- `INFORMATION_SCHEMA.STATISTICS` for index information
- Same result format as postgres for uniform renderer handling

#### `introspection.ts`
- `buildSchemaContext()` — Generates markdown schema summary for AI context
- `buildQueryOptimizationContext()` — Combines EXPLAIN output + schema for AI optimizer
- `buildTableDDL()` — Returns CREATE TABLE statement

### 3.5 Nebula Backend (`src/main/nebula/`)

#### `database.ts` — NebulaDatabase (SQLite)
Uses `better-sqlite3` in WAL mode for synchronous SQLite operations.

**Schema:**
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,       -- TipTap JSON (stringified)
  drawing TEXT,       -- tldraw snapshot JSON
  summary TEXT,       -- AI-generated summary
  topics TEXT,        -- JSON array of topic strings
  pinned INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE edges (
  source_id TEXT,
  target_id TEXT,
  relationship TEXT,
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (source_id, target_id)
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content_text,
  content=notes,
  tokenize='porter unicode61'
);

CREATE TABLE transcriptions (
  id TEXT PRIMARY KEY,
  note_id TEXT,
  audio_path TEXT,
  transcript TEXT,
  speakers TEXT       -- JSON diarization data
);
```

#### `file-storage.ts` — NoteFileStorage
- Persists note content as JSON files to `~/.zenith/nebula/notes/{id}.json`
- Audio files saved to `~/.zenith/nebula/audio/{noteId}.webm`
- `extractPlainText()` strips TipTap JSON to plain text for FTS indexing

#### `transcription.ts`
- Routes to Whisper API (SDK) or CLI binary based on provided command
- Returns diarized transcript with speaker segments

### 3.6 Cortex Backend (`src/main/cortex/`)

#### `analyzer.ts` — CodebaseAnalyzer
Orchestrates repository analysis with `PARSER_VERSION = 3` (incremented to invalidate stale cache):
1. Get current commit SHA via git
2. Check cache — return if hit with matching parser version
3. Run `parseRepository()` (language detection, entity extraction, call graph)
4. Build FTS5 search index from file names and content
5. Cache result in SQLite

#### `git-service.ts`
- `clone(url, name, branch?)` → clones to `~/.zenith/cortex/repos/{name}`
- `fetchBranches(url)` → `git ls-remote` without cloning
- `getCurrentCommit(repoPath)` → `git rev-parse HEAD`
- `fetchAndReset(repoPath, branch)` → `git fetch && git reset --hard origin/{branch}`

#### `cache-db.ts` — AnalyzerDatabase (SQLite)
**Schema:**
```sql
CREATE TABLE repositories (
  id TEXT PRIMARY KEY, url TEXT, branch TEXT, repo_path TEXT,
  name TEXT, language TEXT, framework TEXT, status TEXT,
  commit_sha TEXT, last_analyzed TEXT
);

CREATE TABLE analysis_results (
  repo_url TEXT, branch TEXT, commit_sha TEXT,
  _parser_version INTEGER, data_json TEXT,
  PRIMARY KEY (repo_url, branch, commit_sha)
);

CREATE VIRTUAL TABLE analysis_fts USING fts5(
  file_path, content_snippet,
  content=analysis_results,
  tokenize='unicode61'
);

CREATE TABLE insights (
  repo_url TEXT, branch TEXT, commit_sha TEXT,
  agent_id TEXT, toon_json TEXT
);

CREATE TABLE enrichments (
  repo_url TEXT, branch TEXT, commit_sha TEXT,
  enrichment_type TEXT, data_json TEXT
);
```

#### `parser/index.ts`
Multi-language repository parser. Detects languages by extension, frameworks by config files.

Extracts:
- **CodeEntity[]** — functions, classes, methods, routes, components, DAG tasks
- **CallEdge[]** — function calls, imports, injections, inferred relationships
- **RouteInfo[]** — HTTP endpoints (method, path, handler)
- **ComponentInfo[]** — React/Vue components with props
- **PipelineInfo[]** — Airflow DAGs, ML pipelines
- **FileTree[]** — directory structure
- **TestStats** — test files, frameworks, coverage

Supported frameworks: React, Vue, Angular, Spring Boot, Django, FastAPI, Express, NestJS, Flask, Go HTTP, Rust Actix, Airflow, and more.

#### `mermaid-generator.ts`
Generates Mermaid syntax for architecture, API flow, component tree, pipeline, and class diagrams from `AnalysisResult`.

#### `doc-generator.ts`
Generates a markdown High-Level Design document with embedded Mermaid diagrams, component lists, API flows, test coverage, and key configuration.

#### `toon-parser.ts`
Parses TOON-format AI responses into structured `ToonInsights` objects (architecture, patterns, security, config, async, test, entities, dependencies).

#### `digest-builder.ts`
Builds a concise markdown summary of the codebase for use as AI context window content. Also generates refinement prompts for multi-step AI enrichment.

#### `entity-enricher.ts`
Groups `CodeEntity[]` into batches for efficient parallel AI summarization.

### 3.7 Bitbucket Integration (`src/main/bitbucket/`)

#### `token-manager.ts`
In-memory credential store. Credentials are NOT persisted to disk between sessions — user must re-enter or they are kept only for the current session. `getAuthHeader()` returns `Basic <base64(user:password)>`.

#### `api.ts`
Direct Bitbucket REST API v2 calls:
- PR listing: `GET /2.0/repositories/{ws}/{repo}/pullrequests?state=OPEN&pagelen=30`
- PR diff: `GET /2.0/repositories/{ws}/{repo}/pullrequests/{id}/diff`
- Inline comment: `POST /2.0/repositories/{ws}/{repo}/pullrequests/{id}/comments` with `inline.path` and `inline.to`
- PR comment: Same endpoint without `inline`
- Diffstat: `GET /2.0/repositories/{ws}/{repo}/diffstat/{id}`
- User validation: `GET /2.0/user`

---

## 4. Renderer Process

### 4.1 Application Entry (`App.tsx`)

```
HashRouter
  AppLayout (Sidebar + Outlet)
    /dashboard         → MissionControl
    /activity          → ActivityLog
    /about             → AboutView
    /settings          → SettingsLayout
    /code-review-bot   → CodeReviewBotView (lazy)
    /db-inspector      → DbInspectorView (lazy)
    /launchpad         → LaunchpadView (lazy)
    /nebula            → NebulaView (lazy)
    /textcraft         → TextCraftView (lazy)
    /cortex            → CortexView (lazy)
    /                  → <Navigate to="/dashboard" />
```

**Theme system:** `data-theme` attribute set on `<html>` from settings. CSS variables in `main.css` define color palettes per theme. highlight.js theme injected dynamically as a `<style>` tag.

### 4.2 Layout

#### `AppLayout.tsx`
```
┌─────────────────────────────────────┐
│  drag-region (8px)                  │
├────────┬────────────────────────────┤
│        │                            │
│Sidebar │  <Outlet />                │
│(56px)  │  (plugin content)          │
│        │                            │
└────────┴────────────────────────────┘
```

#### `Sidebar.tsx`
- Fixed 56px left strip
- Plugin icons from PLUGINS registry (Lucide React icons)
- Bottom section: Activity, About, Settings
- Active state: circular highlight on icon
- Navigation via React Router `Link`

### 4.3 Plugin Registry (`src/renderer/src/plugins/registry.ts`)

```typescript
interface PluginDefinition {
  id: PluginId
  name: string
  description: string
  icon: LucideIcon
  route: string
  component: React.LazyExoticComponent<...>
  settingsSchema: SettingsField[]
  defaultAgent: string | null
}
```

All 6 plugins are registered here. `settingsSchema` drives the dynamic settings form in `PluginSettings.tsx`. Components are lazy-loaded via `React.lazy()` for code splitting.

### 4.4 Shared Components

#### `PageHeader.tsx`
Reusable header with icon, gradient title, and tab bar. Used by all 6 plugins.

#### `SpotlightCard.tsx`
Custom card with a radial gradient spotlight effect that follows mouse hover. Used extensively for glassmorphism UI.

#### `EmptyState.tsx`
Centered empty state with icon, title, description, and optional action button.

#### `MermaidRenderer.tsx` (`src/renderer/src/plugins/db-inspector/`)
Shared Mermaid diagram renderer with:
- Lazy-import of `mermaid` library
- Syntax pre-processing (escapes `|` in node labels)
- Orphaned error SVG cleanup
- Optional interactive zoom/pan mode (mouse wheel + drag)
- Copy-code overlay button

### 4.5 Zustand Stores

| Store | Purpose | Key State |
|-------|---------|-----------|
| `settings-store` | App preferences | theme, defaultView, pdfStyle |
| `agent-store` | AI provider config | providers[], isLoading |
| `token-store` | Usage tracking | entries[], totalTokens |
| `review-store` | Code Review Bot | isConnected, pullRequests, sessions |
| `cortex-store` | Cortex analysis | repos, analysisResult, qaSession |
| `nebula-store` | Nebula notes | notes, activeNote, graph |
| `launchpad-store` | Cloud cost | provider, selectedServices, history |
| `db-store` | DB Inspector | connections, schema, queryResults |
| `textcraft-store` | Text refinement | inputText, tone, format, outputText |
| `activity-store` | Event logging | entries[] |
| `health-store` | Resource monitoring | resources[] |

---

## 5. AI Agent System

### 5.1 Agent Types

```typescript
type AgentProviderType = 'cloud' | 'local' | 'cli' | 'custom'

interface AgentProvider {
  id: string            // e.g., 'claude', 'cursor-agent'
  name: string          // Display name
  type: AgentProviderType
  baseUrl: string       // API URL (cloud/custom only)
  model: string         // Model ID (cloud/custom only)
  command: string       // CLI command (cli type only)
  requiresApiKey: boolean
  hasApiKey: boolean    // Runtime: from credentials store
  status: AgentStatus   // 'connected' | 'not-configured' | 'testing' | 'failed'
}
```

### 5.2 Default Providers

| ID | Name | Type | Command |
|----|------|------|---------|
| `claude` | Claude | cli | `claude -p --trust` |
| `codex` | Codex | cli | `codex exec --json --skip-git-repo-check -` |
| `gemini` | Gemini | cli | `gemini prompt -` |
| `ollama-qwen25-pr-32k` | Ollama Qwen 2.5 PR 32K | cli | `ollama run qwen25-pr-32k` |
| `ollama-qwen-coder-14b` | Ollama Qwen 2.5 Coder 14B | cli | `ollama run qwen2.5-coder:14b-instruct-q4_K_M` |
| `cursor-agent` | Cursor Agent | cli | `cursor-agent --trust --output-format=stream-json --stream-partial-output -p` |

Custom providers can be added by the user via Settings → AI Agents (type: CLI or API).

### 5.3 Agent Lifecycle

```
App start
  → useAgentStore.loadProviders()
  → Load saved providers from settings:agents.providers
  → Merge with DEFAULT_PROVIDERS (defaults always present; type/command from defaults win)
  → For each provider:
      CLI  → probeCli(command) → status: 'connected' | 'not-configured'
      Cloud → credentials.has(providerId) → status: 'connected' | 'not-configured'
```

**Merge strategy** (agent-store.ts):
- Default `type` and `command` always win over saved values (handles provider type migrations)
- Saved `model`, `baseUrl` preserved
- CLI command preserved only for CLI-type agents (cloud agents always use empty command)

### 5.4 CLI Streaming Flow

```
Renderer: window.api.ai.startReview(providerId, model, diff, sessionId, command, guidelines)
  ↓
Main: ipc-handlers.ts receives 'ai:startReview'
  ↓ command present?
  YES → streamCliReview({ mainWindow, diff, command, sessionId, guidelines })
         ↓
         getLoginShellPath() → resolve full PATH
         spawn(command, { shell: true, env: resolvedEnv })
         child.stdin.write(TOON_PROMPT + diff)
         child.stdin.end()
         ↓
         stdout.on('data')
           auto-detect: first char === '{' → JSON stream
           JSON → extractJsonEventText() → text chunks
           plain → pass through directly
         ↓
         webContents.send('ai:stream:chunk', { sessionId, chunk })
         ↓
         child.on('close', code === 0)
           → webContents.send('ai:stream:done', { sessionId, usage })
  NO  → streamReview({ mainWindow, diff, providerId, modelName, sessionId, guidelines })
         ↓
         createModel(providerId, modelName, apiKey, baseUrl)
         Vercel AI SDK: streamText({ model, system: TOON_PROMPT, prompt: diff })
         ↓
         for await (chunk of textStream)
           webContents.send('ai:stream:chunk', { sessionId, chunk })
         ↓
         result.usage → webContents.send('ai:stream:done', { sessionId, usage })

Renderer: window.api.ai.onStreamChunk(cb) accumulates rawText
Renderer: window.api.ai.onStreamDone(cb) parses TOON format → ReviewComment[]
```

### 5.5 JSON Stream Format Support

The `extractJsonEventText()` function handles two JSON stream formats:

**Codex format:**
```json
{"type":"item.completed","item":{"type":"agent_message","text":"AI response text"}}
```

**Cursor Agent format** (with `--stream-partial-output`):
```json
{"type":"assistant","timestamp_ms":1774822066843,"message":{"role":"assistant","content":[{"type":"text","text":"chunk..."}]}}
{"type":"result","subtype":"success","usage":{"inputTokens":0,"outputTokens":59,"cacheReadTokens":5120,"cacheWriteTokens":2708}}
```
- Events WITH `timestamp_ms` → streaming deltas, forwarded to renderer
- Final event WITHOUT `timestamp_ms` → full accumulated text, **skipped** (avoids duplication)
- `result` event → real token counts extracted and reported

### 5.6 Token Usage Tracking

`token-store.ts` records every AI session:
```typescript
interface TokenEntry {
  sessionId: string
  providerId: string
  tokensUsed: number
  isEstimated: boolean  // true for plain-text CLI output
  timestamp: string
  plugin: string
}
```
Dashboard shows 7-day token consumption chart via `TokenChart.tsx`.

---

## 6. Settings & Credentials System

### 6.1 Settings Store (`src/main/settings-store.ts`)

Uses `electron-store` for persistent JSON at OS app data location.

**Default schema:**
```typescript
{
  general: {
    defaultView: 'dashboard',
    showWelcomeOnStart: true,
    workingDirectory: '',
    pdfStyle: 'colored',  // 'colored' | 'traditional' | 'pretty'
    theme: 'zenith',
    hljsTheme: 'zenith'
  },
  plugins: {
    'code-review-bot': { bitbucketUsername, bitbucketAppPassword, repos, reviewGuidelines, autoReview },
    'db-inspector': { connections: [] },
    'nebula': { whisperModel },
    'cortex': { maxFileSizeKb, excludePatterns },
    'textcraft': { defaultTone, defaultFormat },
    'launchpad': {}
  },
  agents: {
    providers: []  // AgentProviderPersist[]
  },
  reviewHistory: []
}
```

**Functions:** `getSettings()`, `getSetting(key)`, `setSetting(key, value)`, `resetSettings(namespace)`.
Dot-notation key support: `getSetting('plugins.code-review-bot.bitbucketUsername')`.

### 6.2 Credentials Store

Separate `zenith-credentials` electron-store. All values encrypted via `electron.safeStorage` (OS keychain on macOS, DPAPI on Windows, libsecret on Linux).

```typescript
// Store
const encrypted = safeStorage.encryptString(plaintext)
credentialsStore.set(serviceId, encrypted.toString('base64'))

// Retrieve
const b64 = credentialsStore.get(serviceId) as string
safeStorage.decryptString(Buffer.from(b64, 'base64'))
```

Used for: Bitbucket app password, AI API keys, database passwords.

### 6.3 Settings UI

```
SettingsLayout.tsx
  ├── Left sidebar: General, AI Agents, MCP Servers, [plugin names]
  └── Right content:
      ├── GeneralSettings.tsx  — theme, PDF style, working dir, welcome screen
      ├── AIAgentsSettings.tsx — provider list, status dots, API key mgmt, test buttons
      │   ├── AgentRow.tsx     — single provider row
      │   └── AddCustomAgentForm.tsx — add CLI or API custom provider
      ├── MCPSettings.tsx      — Model Context Protocol server config
      └── PluginSettings.tsx   — renders settingsSchema for each plugin dynamically
```

---

## 7. Plugin: Code Review Bot

### 7.1 Purpose
Connects to Bitbucket, lists open pull requests, fetches diffs, streams AI code review in TOON format, and allows posting inline comments back to Bitbucket.

### 7.2 Data Flow

```
Settings: username + app password
  → bitbucket:connect() → TokenManager stores Basic auth header
  → bitbucket:isConnected() → check

CodeReviewBotView tabs:
  [Diff]    PRList → select PR → PRDiffView fetches diff → parse-diff renders
  [Review]  ReviewPanel → ai:startReview(providerId, model, diff, sessionId, command?)
                        → stream TOON → parse → ReviewComment[]
  [History] ReviewHistory → load past sessions from settings.reviewHistory
```

### 7.3 Key Files

| File | Purpose |
|------|---------|
| `CodeReviewBotView.tsx` | Main container, connection badge, tab router |
| `PRList.tsx` | Paginated PR browser (30 per page), workspace/repo selectors |
| `PRDiffView.tsx` | parse-diff rendered diff with syntax highlighting |
| `ReviewPanel.tsx` | Streaming TOON findings with severity/confidence badges |
| `ReviewHistory.tsx` | Past reviews, session restore |
| `SettingsPanel.tsx` | Bitbucket credential form |
| `review-store.ts` | All review state, streaming lifecycle |
| `src/renderer/src/types/review.ts` | All review types |

### 7.4 TOON Parsing

```typescript
// Each finding line: SEV|CONF|KIND|FILE:LINE|TITLE|EXPLANATION|FIX
const SEVERITY_MAP = { B: 'blocking', I: 'important', S: 'suggestion' }
const KIND_MAP = { bug: 'bug', sec: 'security', perf: 'performance', ... }
const CONFIDENCE_MAP = { H: 'high', M: 'medium', L: 'low' }
```

The `---` separator distinguishes findings from the overall summary paragraph.

### 7.5 Comment Posting

Inline comments include `inline: { path: filePath, to: lineNumber }`. Top-level comments omit the `inline` field. Both are `POST /2.0/repositories/{ws}/{repo}/pullrequests/{id}/comments`.

### 7.6 State (`review-store.ts`)

```typescript
{
  isConnected: boolean
  pullRequests: PullRequest[]
  selectedPR: PullRequest | null
  diffFiles: DiffFile[]
  currentSession: ReviewSession | null
  sessions: Map<prId, ReviewSession>  // per-PR session persistence
  history: ReviewHistoryEntry[]
}
```

---

## 8. Plugin: DB Inspector

### 8.1 Purpose
Multi-database inspector with schema browsing, SQL execution, AI-powered query optimization, schema-aware Q&A, and ER diagram generation via AI inference.

### 8.2 Supported Databases

| Database | Client | Introspection |
|----------|--------|---------------|
| PostgreSQL | `pg` | information_schema + pg_catalog |
| MySQL | `mysql2` | information_schema + SHOW queries |

### 8.3 Connection Flow

```
ConnectionManager: host, port, username, password, database, schema, engine
  → db:testConnection() → verify without storing
  → db:connect() → store connection + encrypt password
  → db:getSchemas() → populate schema list
  → db:getTables(schema) → populate table tree
  → db:getColumns(schema, table) → column details
```

### 8.4 Query Execution

```
SqlEditor (CodeMirror + SQL language + autocomplete)
  → db:query(connectionId, sql, allowWrite?, limit?, offset?)
  → ResultsGrid (TanStack Table, paginated, column resizing)
  → CellModal (large value viewer)
  → db:explain(connectionId, sql) → query plan
```

Read-only by default. `allowWrite` bypasses the blocklist for DDL/DML when explicitly enabled.

### 8.5 AI Features

**Query Optimizer:**
```
db:buildOptimizationContext(connectionId, schema, sql)
  → EXPLAIN output + schema context
  → ai:startAnalysis(systemPrompt, contextPrompt, sessionId, command?)
  → stream optimization suggestions
```

**Ask AI (Schema Q&A):**
```
db:buildSchemaContext(connectionId, schema, tables?)
  → markdown schema description
  → ai:startAnalysis(dbSystemPrompt, userQuestion + schemaContext, sessionId, command?)
  → stream SQL answers / explanations
```

### 8.6 ER Diagram

```
Select tables → click Generate
  → db:getColumns() + db:getForeignKeys() for selected tables
  → Build Mermaid erDiagram syntax from actual FK constraints
  → Optionally: ai:startAnalysis() → AI infers additional relationships
  → relationship-inference.ts parses AI response → InferredRelationship[]
  → MermaidRenderer (interactive zoom/pan)
  → Export as PDF (mermaid-to-png → pdfmake)
```

**Relationship modes:** `fk-only` (only actual FKs), `infer-conventions` (naming convention inference), `infer-ai` (AI-powered inference), `all` (combine all).

### 8.7 Key Files

| File | Purpose |
|------|---------|
| `DbInspectorView.tsx` | Main container, tab router, ERSidebar |
| `ConnectionManager.tsx` | Create/delete/test connections |
| `SchemaExplorer.tsx` | Tree: database → schema → table → columns |
| `QueryTab.tsx` | SQL editor, results, optimizer, Q&A |
| `SqlEditor.tsx` | CodeMirror SQL with autocomplete |
| `ResultsGrid.tsx` | TanStack Table with pagination |
| `ERDiagram.tsx` | Diagram toolbar + Mermaid visual/code modes |
| `MermaidRenderer.tsx` | Shared mermaid render + zoom/pan |
| `db-store.ts` | All DB state, streaming sessions |
| `src/renderer/src/types/database.ts` | All DB types |

---

## 9. Plugin: Nebula (Notes & Knowledge)

### 9.1 Purpose
Rich text note-taking with AI summarization, voice transcription, drawing canvas, full-text search, and a knowledge graph visualizing note relationships.

### 9.2 Architecture

```
Renderer (nebula-store.ts) ↔ IPC ↔ Main (nebula/database.ts + file-storage.ts)
                                     SQLite: notes, edges, notes_fts, transcriptions
                                     Disk: ~/.zenith/nebula/notes/{id}.json
                                           ~/.zenith/nebula/audio/{id}.webm
```

### 9.3 Note Lifecycle

```
Create note → nebula:saveNote() → SQLite upsert + disk JSON write
Edit title → debounced 800ms → nebula:saveNote()
Edit content → dirty ref → save on editor blur → nebula:saveNote()
Delete → nebula:deleteNote() → SQLite DELETE + disk unlink
Pin → nebula:togglePin() → SQLite update
```

### 9.4 TipTap Editor

TipTap extensions used:
- StarterKit (bold, italic, headings, lists, blockquote, code)
- Table, TableRow, TableCell, TableHeader
- Link, Image
- CodeBlock with language selector
- Placeholder
- Custom CodeBlockNodeView for syntax highlighting

`tiptap-to-markdown.ts` serializes TipTap JSON → markdown for AI consumption and FTS indexing.

### 9.5 Voice & Transcription

```
VoiceRecorder → MediaRecorder API → .webm audio blob
  → nebula:saveAudio(noteId, buffer) → disk
  → nebula:transcribeAudio(buffer, providerId?, command?)
       SDK route: Whisper API (OpenAI or Anthropic)
       CLI route: spawn CLI with audio file
  → Diarized TranscriptionSegment[] with speaker labels
  → TranscriptionBlock in editor
```

### 9.6 Knowledge Graph

```
nebula:getGraph() → GraphData { nodes: NoteNode[], edges: NoteEdge[] }
KnowledgeGraph.tsx → react-force-graph-2d force-directed visualization
  Nodes: note title, size by connection count
  Edges: relationship type, weight
Click node → navigate to note
Link notes → nebula:updateEdges(sourceId, [{targetId, relationship}])
```

### 9.7 Search

FTS5 virtual table on `(title, content_text)` with porter stemmer. `nebula:searchNotes(query)` returns highlighted snippets via `highlight(notes_fts, 0, '<mark>', '</mark>')`.

### 9.8 AI Summarization

```
Trigger summarize button
  → tiptap-to-markdown() → plain text
  → ai:startAnalysis(NEBULA_SYSTEM_PROMPT, plainText, sessionId, command?)
  → stream response
  → Parse: title (first line) + summary + topics (comma list)
  → Update note in SQLite + refresh list
```

### 9.9 Key Files

| File | Purpose |
|------|---------|
| `NebulaView.tsx` | Tab router, sidebar/content panels (react-resizable-panels) |
| `NoteEditor.tsx` | TipTap rich editor, toolbar, title input |
| `NoteList.tsx` | Sidebar with search, pin, tag filter |
| `DrawingCanvas.tsx` | tldraw embedded canvas, snapshot save |
| `VoiceRecorder.tsx` | MediaRecorder FAB, transcription upload |
| `KnowledgeGraph.tsx` | react-force-graph-2d visualization |
| `SearchView.tsx` | FTS5 results with highlighted snippets |
| `nebula-store.ts` | All notes state, streaming sessions |
| `src/renderer/src/types/nebula.ts` | All nebula types |

---

## 10. Plugin: Cortex (Code Analysis)

### 10.1 Purpose
Analyzes Git repositories to extract architecture, entities, API flows, and generates AI-powered insights, searchable code index, HLD documentation, and interactive diagrams.

### 10.2 Repository Management

```
Add repo → cortex:fetchBranches(url) → list branches
  → cortex:clone(url, name, branch?) → ~/.zenith/cortex/repos/{name}
  → clone progress: cortex:cloneProgress push events
  → cortex:analyze(repoPath, branch, repoUrl)
  → analysis progress: cortex:analysisProgress push events
  → AnalysisResult cached in SQLite
```

### 10.3 Analysis Pipeline

```
analyzeRepository(repoPath, branch, repoUrl)
  1. getCurrentCommit() → sha
  2. getCachedAnalysis(url, branch, sha) → return if PARSER_VERSION matches
  3. parseRepository():
     a. Enumerate files (respects .gitignore patterns)
     b. Language detection by extension
     c. Framework detection by config files (package.json, pom.xml, requirements.txt, etc.)
     d. Parse each file:
        - AST-like extraction (regex-based for most languages)
        - Extract: functions, classes, routes, components, DAG tasks
        - Build call graph (import + invocation edges)
        - Collect HTTP routes with methods
     e. Aggregate: stats, FileTree, TestStats
  4. buildFtsIndex(result) → INSERT into analysis_fts
  5. saveAnalysis(url, branch, sha, result)
  6. Report progress via onProgress callback
```

### 10.4 AI Enrichment

```
Generate Insights:
  cortex:generateInsights(url, branch) → build insights prompt
  ai:startAnalysis(prompt, digest, sessionId, command?)
  stream TOON response → toon-parser.ts → ToonInsights
  cortex:saveInsights(url, branch, sha, agentId, toonData)

Build Digest:
  cortex:buildDigest(url, branch) → markdown codebase summary
  → Used as AI context for Q&A

Entity Enrichment:
  cortex:buildEntityBatches(url, branch, existingIds) → batches
  ai:startAnalysis(enrichmentPrompt, batch, sessionId, command?)
  → AI-written summaries for functions/classes
  cortex:saveEnrichment(url, branch, sha, 'entity-summaries', data)
```

### 10.5 Q&A

```
User question
  cortex:buildDigest(url, branch) → context
  ai:startAnalysis(QA_SYSTEM_PROMPT, digest + question, sessionId, command?)
  stream answer → display in QAPanel
```

### 10.6 Diagrams

The `mermaid-generator.ts` generates Mermaid syntax from `AnalysisResult`:

| Diagram Type | Content |
|-------------|---------|
| Architecture | System layers, service interactions |
| API Flow | HTTP route call chains |
| Component Tree | React/Vue component hierarchy |
| Pipeline | Airflow DAG task flow |
| Class Diagram | Classes, inheritance, associations |

Rendered via `MermaidRenderer` in `DiagramPanel.tsx`.

### 10.7 HLD Generation

```
cortex:generateHLD(url, branch)
  → doc-generator.ts builds markdown document
  → Includes: overview, architecture, entities, API routes, data flows, test stats
  → Embedded Mermaid diagrams
  → Display in HLDDocument.tsx
  → Export PDF via mermaid-to-png + pdfmake
```

### 10.8 Key Files

| File | Purpose |
|------|---------|
| `CortexView.tsx` | Main container, tab router |
| `components/RepoManager.tsx` | Repository list, add/remove |
| `components/CloneDialog.tsx` | Clone progress modal |
| `components/InsightsPanel.tsx` | TOON-parsed AI insights |
| `components/CodeViewer.tsx` | File tree + syntax-highlighted viewer |
| `components/QAPanel.tsx` | Chat interface |
| `components/DiagramPanel.tsx` | Diagram type selector |
| `components/HLDDocument.tsx` | Markdown document + export |
| `cortex-store.ts` | All analysis state, streaming sessions |
| `src/renderer/src/types/cortex.ts` | All cortex types |

---

## 11. Plugin: TextCraft

### 11.1 Purpose
AI-powered text refinement with configurable tone and output format.

### 11.2 Tones & Formats

**Tones:** professional, casual, technical, friendly, concise, instructive

**Formats:** general, email, one-pager, tech-doc, RCA (Root Cause Analysis), prompt

### 11.3 Flow

```
InputPanel: paste/type text
ControlsPanel: select tone + format
Click Refine
  → textcraft-store.refine()
  → Build systemPrompt (tone + format instructions)
  → ai:startAnalysis(systemPrompt, inputText, sessionId, command?)
  → stream refined text → OutputPanel
  → save to history
OutputPanel: display + copy + save to file
HistoryPanel: past refinements, reuse, delete
textcraft:exportPdf() → pdfmake PDF with input + output
```

### 11.4 Key Files

| File | Purpose |
|------|---------|
| `TextCraftView.tsx` | Main container, panel layout |
| `InputPanel.tsx` | Text input area |
| `ControlsPanel.tsx` | Tone/format dropdowns |
| `OutputPanel.tsx` | Streaming output, copy, save |
| `HistoryPanel.tsx` | Past refinements |
| `textcraft-store.ts` | State + streaming lifecycle |
| `src/renderer/src/types/textcraft.ts` | Types |

---

## 12. Plugin: Launchpad (Cloud Cost Estimator)

### 12.1 Purpose
Estimate and compare cloud infrastructure costs across AWS, GCP, and Azure with AI-powered architecture recommendations.

### 12.2 Architecture

All cost data is **static** in the renderer — no live pricing API calls. Services and pricing are defined in `src/renderer/src/data/cloud-pricing/`.

```typescript
// Service definition pattern
interface CloudService {
  id: string
  name: string
  family: string  // compute, storage, networking, database, etc.
  description: string
  pricing: { [region: string]: PricingTier[] }
}
```

### 12.3 Flow

```
ProviderSelector → pick AWS | GCP | Azure
  → ServiceCatalog: browse services by family, search by name
  → select service → ResourceConfigurator: configure instance type, quantity, usage hours
  → EstimationSummary: calculator.ts computes monthly/yearly costs
  → AI Advisor: ai:startAnalysis(ADVISOR_SYSTEM_PROMPT, estimationContext, sessionId, command?)
                parses structured suggestions block from AI response
  → Apply suggestion → auto-configure service
  → ComparisonView: side-by-side table for 2-3 providers
  → History: save estimate, revisit
  → launchpad:exportPdf() → detailed cost breakdown PDF
```

### 12.4 Cost Calculator

`src/renderer/src/data/cloud-pricing/calculator.ts`:
```typescript
calculateTotalCost(provider, selectedServices, configs) → {
  monthly: number,
  yearly: number,
  breakdown: { serviceId, name, monthly, yearly }[]
}
```

### 12.5 Key Files

| File | Purpose |
|------|---------|
| `LaunchpadView.tsx` | Main container, tab router |
| `ProviderSelector.tsx` | AWS/GCP/Azure picker |
| `ServiceCatalog.tsx` | Browseable + searchable service list |
| `ResourceConfigurator.tsx` | Instance type, quantity, usage config |
| `EstimationSummary.tsx` | Cost breakdown table |
| `AiAdvisor.tsx` | Streaming advisor, suggestion apply |
| `EstimationHistory.tsx` | Saved estimates |
| `ComparisonView.tsx` | Multi-provider comparison |
| `launchpad-store.ts` | State + streaming |
| `data/cloud-pricing/` | AWS, GCP, Azure service catalogs |
| `src/renderer/src/types/launchpad.ts` | Types |

---

## 13. Dashboard & Supporting Views

### 13.1 Dashboard (`MissionControl.tsx`)

Main landing page. Grid layout with:

| Widget | Data Source |
|--------|------------|
| Token Usage (7-day chart) | `token-store.ts` entries |
| Connections | `db-store.ts` activeConnections count |
| Today's Ops | `activity-store.ts` today's event count |
| System Health | `health-store.ts` resource statuses |
| Token Usage Chart | `TokenChart.tsx` + `token-store.ts` |
| Activity Stream | `activity-store.ts` recent entries |
| System Health Panel | `HealthPanel.tsx` + `health-store.ts` |
| Command Center | Plugin cards from `PLUGINS` registry |

Health checks: AI agents (configured/not), DB connections (active/failed).

### 13.2 Activity Log (`ActivityLog.tsx`)

Chronological event feed. `activity-store.ts` records events from all plugins (AI sessions, DB queries, note saves, reviews). Events have: type, plugin, description, timestamp, metadata.

### 13.3 About View (`AboutView.tsx`)

Bento-grid layout with hero card, author card, capabilities, getting-started steps. Export diagnostic logs button.

---

## 14. Database Layer

### 14.1 SQLite Databases (better-sqlite3)

| Database | Path | Used by |
|----------|------|---------|
| Nebula notes | `~/.zenith/nebula/zenith-nebula.db` | Notes, edges, FTS5 search, transcriptions |
| Cortex cache | `~/.zenith/cortex/zenith-cortex.db` | Repos, analysis results, insights, enrichments |

Both use **WAL mode** for better concurrent read performance. Both have FTS5 virtual tables for full-text search.

### 14.2 electron-store (JSON files)

| Store | Path | Used by |
|-------|------|---------|
| Settings | `%AppData%/zenith/config.json` | All app settings, plugin configs |
| Credentials | `%AppData%/zenith/zenith-credentials.json` | Encrypted API keys, passwords |

### 14.3 File Storage

| Content | Path |
|---------|------|
| Note JSON files | `~/.zenith/nebula/notes/{id}.json` |
| Note audio | `~/.zenith/nebula/audio/{noteId}.webm` |
| Cloned repos | `~/.zenith/cortex/repos/{name}/` |

---

## 15. PDF Export System

### 15.1 Unified Engine (`src/main/lib/pdf-generator.ts`)

All plugins use the same PDF engine via `app:exportPdf`. Uses **pdfmake** with custom document definition.

**Capabilities:**
- Markdown → styled pdfmake content
- Mermaid diagrams → pre-rendered PNG images (via `mermaid-to-png.ts`)
- Orientation: portrait or landscape
- Styles: `colored` (primary color accents) or `traditional` (grayscale)
- Custom fonts: Inter
- Save via native file save dialog

### 15.2 Mermaid to PNG (`src/renderer/src/lib/mermaid-to-png.ts`)

Renders Mermaid code blocks to PNG data URLs in the renderer process (using the DOM), then passes them to the main process for embedding in PDFs.

### 15.3 Plugin-Specific Wrappers

- `textcraft:exportPdf` → formats input/output sections
- `launchpad:exportPdf` → formats cost estimation with provider branding
- `app:exportPdf` → generic (used by Cortex HLD, DB ER diagram, Nebula notes)

---

## 16. Type System Reference

### Core Types

```typescript
// src/renderer/src/types/agent.ts
AgentProvider, AgentProviderType, AgentStatus, DEFAULT_PROVIDERS

// src/renderer/src/types/plugin.ts
PluginId, PluginDefinition, SettingsField

// src/renderer/src/types/review.ts
ReviewComment, ReviewSession, ReviewSeverity, ReviewConfidence, ReviewKind

// src/renderer/src/types/database.ts
DbConnection, TableInfo, ColumnInfo, ForeignKey, QueryResult,
ERDiagramSession, InferredRelationship, RelationshipMode

// src/renderer/src/types/nebula.ts
NoteFile, NoteListItem, SearchResult, GraphData, GraphNode, GraphEdge,
SummarizationResult, DiarizedTranscript, NebulaTab

// src/renderer/src/types/cortex.ts
Repository, RepoType, AnalysisResult, CodeEntity, CallEdge,
RouteInfo, ComponentInfo, ToonInsights

// src/renderer/src/types/launchpad.ts
CloudProvider, ServiceSelection, EstimationEntry, AiAdvisorSession

// src/renderer/src/types/textcraft.ts
RefinementTone, RefinementFormat, RefinementSession, HistoryEntry

// src/renderer/src/types/bitbucket.ts
PullRequest, DiffFile, DiffHunk

// src/renderer/src/types/activity.ts
ActivityEntry, ActivityType

// src/renderer/src/types/mcp.ts
MCPServer, MCPServerStatus (Model Context Protocol)

// src/preload/index.d.ts
ElectronAPI — augments Window with window.api
```

---

*Copyright (c) 2026 Prafull Saxena. All rights reserved.*
