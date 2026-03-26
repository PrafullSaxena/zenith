# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Multi-process Electron desktop app with plugin-based architecture and lateral scaling through modular services.

**Key Characteristics:**
- IPC-driven communication between Electron main and renderer processes
- Plugin-based UI with lazy-loaded React components
- Service layer abstractions for AI, database, git operations, and file management
- Zustand for client-side state management
- Typed preload bridge for secure context isolation
- Module-level singleton instances for stateful services

## Layers

**Electron Main Process (`src/main/`):**
- Purpose: Node.js runtime for OS-level operations, IPC handler registration, service orchestration
- Location: `src/main/index.ts` (entry), `src/main/ipc-handlers.ts` (channel registrations)
- Contains: Git operations, database connections, AI SDK integration, file I/O, credentials management
- Depends on: Electron, vercel/ai SDK, pg/mysql2, better-sqlite3, simple-git
- Used by: Renderer process via IPC (ipcRenderer.invoke/on)

**Preload Bridge (`src/preload/index.ts`):**
- Purpose: Context-isolated API bridge exposing main process capabilities to renderer with sandbox security
- Location: `src/preload/index.ts`
- Contains: IPC wrapper functions for settings, credentials, AI operations, database, Bitbucket, Cortex, Nebula
- Depends on: Electron contextBridge, ipcRenderer
- Used by: All renderer code via `window.api` namespace

**Renderer Process / UI Layer (`src/renderer/src/`):**
- Purpose: React-based UI for all plugins and core navigation
- Location: `src/renderer/src/App.tsx` (router root), `src/renderer/src/plugins/*/` (plugin views)
- Contains: Plugin views, components, stores, asset management
- Depends on: React, React Router, Zustand, Lucide icons, Tailwind CSS
- Used by: End users via the Electron window

**Plugin System (`src/renderer/src/plugins/` + registry):**
- Purpose: Extensible UI module architecture where each plugin is a lazy-loaded React component with settings
- Location: `src/renderer/src/plugins/registry.ts` (definitions), `src/renderer/src/plugins/{plugin-id}/` (implementations)
- Contains: CodeReviewBot, DbInspector, Launchpad, Nebula, TextCraft, Cortex
- Each plugin has: View component, optional helper components, integration with IPC
- Pattern: Plugin registry drives routes, sidebar icons, and settings schemas

**Service Layer - AI (`src/main/ai/`):**
- Purpose: Handle AI model requests via Vercel AI SDK or CLI tools
- Location: `src/main/ai/stream.ts` (SDK streaming), `src/main/ai/cli-stream.ts` (CLI streaming)
- Contains: Provider abstraction (Anthropic, OpenAI, Google, Ollama), token streaming, session management
- Depends on: @ai-sdk/*, openai, ollama-ai-provider
- Patterns: AbortController for cancellation, safeSend() guards for IPC window destruction, session-based streaming

**Service Layer - Database (`src/main/db/`):**
- Purpose: Database connection management and query execution for PostgreSQL and MySQL
- Location: `src/main/db/db-manager.ts` (unified router), `src/main/db/postgres.ts`, `src/main/db/mysql.ts`
- Contains: Connection pooling, schema introspection, query optimization context building
- Depends on: pg, mysql2
- Pattern: UnifiedDbManager routes to engine-specific managers; encrypted credential storage via safeStorage

**Service Layer - Git (`src/main/cortex/git-service.ts`):**
- Purpose: Repository cloning, branch fetching, commit resolution
- Location: `src/main/cortex/git-service.ts`
- Contains: Clone operations with progress events, branch enumeration, commit SHA resolution
- Depends on: simple-git
- Used by: CodebaseAnalyzer for source code analysis

**Service Layer - Codebase Analysis (`src/main/cortex/`):**
- Purpose: Parse repositories, extract entities, build call graphs and visualization data
- Location: `src/main/cortex/analyzer.ts` (orchestrator), `src/main/cortex/parser/` (language-specific)
- Contains: Language parsers (TypeScript, Python, Java, frontend, backend), entity enrichment, test detection
- Depends on: fs/promises, path
- Pattern: Parser plugins by language; caching via AnalyzerDatabase; progress events to renderer

**Service Layer - State Persistence (`src/main/settings-store.ts`):**
- Purpose: Settings and credentials storage with encryption
- Location: `src/main/settings-store.ts` (main), `src/renderer/src/stores/settings-store.ts` (client)
- Contains: Electron Store wrapper with nested dot-notation access, encrypted credential storage
- Depends on: electron-store, Electron.safeStorage
- Pattern: Renderer optimistic updates + IPC persistence; one-time migrations for plugin renames

**Client State Management (`src/renderer/src/stores/`):**
- Purpose: React hooks (Zustand) for UI state, AI session tracking, and data caching
- Location: `src/renderer/src/stores/*.ts`
- Contains: Settings, agents, cortex analysis, databases, reviews, notes, activity, health
- Pattern: Zustand stores with IPC reads on init; optimistic updates with fallback to server state
- Key stores: `cortex-store.ts` (analysis + enrichment), `review-store.ts` (AI reviews), `db-store.ts` (connections)

## Data Flow

**PR Code Review Flow:**
1. User selects PR in CodeReviewBot
2. Renderer calls `window.api.bitbucket.getPRDiff()` → IPC invokes `bitbucket:getPRDiff` handler
3. Handler fetches diff from Bitbucket API, calls `streamReview()` in main
4. AI SDK streams tokens; main process sends via `webContents.send('ai:stream:chunk')` per token
5. Renderer listens on `ai:stream:chunk` event, accumulates into review findings
6. On completion (`ai:stream:done`), findings are parsed and stored in `review-store.ts`

**Database Inspector Flow:**
1. User creates connection with `window.api.db.testConnection()` → handler tests, stores engine type
2. Renderer calls `window.api.db.getSchemas()` → UnifiedDbManager routes to postgres/mysql manager
3. Connection manager executes introspection query; returns schema list
4. User navigates tables; `db-store.ts` caches schema/table metadata
5. Query execution: `window.api.db.query()` → handler validates readability, executes with limit/offset

**Cortex Code Analysis Flow:**
1. User provides repo URL → `window.api.cortex.clone()` triggers git clone with progress events
2. On clone complete, `window.api.cortex.analyze()` calls CodebaseAnalyzer.analyzeRepository()
3. Analyzer checks cache by (repoUrl, branch, commitSha); if miss, parses all files with language-specific parsers
4. Parser extracts entities, call graphs, routes, components; builder constructs visualization data
5. Result cached in SQLite; `cortex-store.ts` updates with analysis; renderer renders MindGraph3D + tabs

**Settings Persistence Flow:**
1. Renderer: `useSettingsStore.setSetting(key, value)` → optimistic local update
2. IPC: `window.api.settings.set(key, value)` → handler calls `settingsStore.set()`
3. Main: Updates electron-store file on disk
4. On app restart: Renderer calls `useSettingsStore.loadSettings()` → IPC `settings:getAll` → handler returns full tree

## Key Abstractions

**PluginDefinition:**
- Purpose: Describes a plugin's UI, routing, settings schema, and lazy component
- Examples: `src/renderer/src/plugins/registry.ts` (definitions), `src/renderer/src/types/plugin.ts` (type)
- Pattern: Compile-time registry drives routing, sidebars, and settings forms; no dynamic plugin discovery

**IPC Handler Registration:**
- Purpose: Centralized handler definitions matching preload API shape
- Examples: `src/main/ipc-handlers.ts` lines 92+ (registerIpcHandlers function)
- Pattern: Single function called from main process setup; uses ipcMain.handle() for invoke/response, ipcMain.on() for events

**Session Management (AI Streaming):**
- Purpose: Track active streams by sessionId; allow mid-stream cancellation
- Examples: `src/main/ai/stream.ts` (activeSdkSessions Map), `src/main/ai/cli-stream.ts` (activeCliSessions Map)
- Pattern: AbortController per session; cancellation handler removes from map

**Service Singletons:**
- Purpose: Module-level instances to avoid re-initialization costs
- Examples: `cortexGit`, `cortexAnalyzer`, `dbManager` in `ipc-handlers.ts` (lines 44-55)
- Pattern: Lazy initialization via getter function; singletons live for app lifetime

**Language Parser Plugin System:**
- Purpose: Extract code entities from language-specific ASTs
- Examples: `src/main/cortex/parser/ts-parser.ts`, `src/main/cortex/parser/python-parser.ts`
- Pattern: Each parser exports `parseFile(content)` returning entities; main parser index routes by extension

## Entry Points

**Electron Main Process:**
- Location: `src/main/index.ts`
- Triggers: App startup (via electron-vite)
- Responsibilities: Electron window creation, log collector setup, IPC handler registration, menu building, platform-specific permissions

**Renderer Root:**
- Location: `src/renderer/src/main.tsx`
- Triggers: Window load complete
- Responsibilities: React DOM mount, app initialization

**App Router & Plugin Loading:**
- Location: `src/renderer/src/App.tsx`
- Triggers: App component mount
- Responsibilities: Route setup from PLUGINS registry, lazy component loading, theme/HLJS CSS injection, sidebar composition

**Preload Bridge:**
- Location: `src/preload/index.ts`
- Triggers: Window creation (configured in BrowserWindow webPreferences)
- Responsibilities: Context isolation, API exposition via contextBridge, handler wrapping

## Error Handling

**Strategy:** Layered error catching with fallbacks to prevent crashes.

**Patterns:**
- Main process uncaught exceptions: Catch EPIPE (broken pipes from CLI children), log others, re-throw non-EPIPE (`src/main/index.ts` lines 18-26)
- IPC handler errors: Each handler try/catch or reject promise; renderer catches via `.catch()` on invoke
- Stream errors: SDK errors caught, sent via `ai:stream:error` event; CLI stream errors handled similarly
- Window destruction race: `safeSend()` checks `win.isDestroyed()` before sending; swallows errors
- Store operations: Optimistic updates with fallback; failed persistence logs error but doesn't crash UI
- Parser failures: Try/catch per file; failed parses skip that file, continue analysis, report stats

## Cross-Cutting Concerns

**Logging:** Console-based (no external service); collected at startup via `installLogCollector()` in `src/main/log-collector.ts`; can be exported as diagnostic ZIP

**Validation:**
- Settings: Zustand stores validate types via schema definitions
- Credentials: Electron safeStorage handles encryption/decryption; availability checked before use
- Database queries: `validateQuery()` in `src/main/db/postgres.ts` checks read/write intent
- File paths: Introspection validates table/schema names before building queries

**Authentication:**
- Bitbucket: App Password → TokenManager caches base64(username:password) → Basic Auth header
- Database: Credentials stored encrypted via safeStorage; connection manager retrieves and decrypts
- AI providers: API keys fetched from settings or env vars; passed to SDK at request time

**Progress Tracking:**
- Cortex clone: Git progress events translated to `cortex:cloneProgress` IPC events
- Cortex analysis: Parser loop emits progress; main sends via `cortex:analysisProgress` event
- Both events include phase, progress %, detail string, filesProcessed, totalFiles

---

*Architecture analysis: 2026-03-24*
