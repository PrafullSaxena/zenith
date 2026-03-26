# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
zenith/
├── src/
│   ├── main/                      # Electron main process (Node.js runtime)
│   │   ├── index.ts               # Entry point: window creation, IPC setup
│   │   ├── ipc-handlers.ts        # All IPC handler registrations
│   │   ├── settings-store.ts      # Settings persistence wrapper
│   │   ├── log-collector.ts       # Console logging capture
│   │   ├── ai/                    # AI streaming (SDK + CLI)
│   │   │   ├── stream.ts          # Vercel AI SDK streaming
│   │   │   ├── cli-stream.ts      # CLI tool streaming (ollama, anthropic-cli)
│   │   │   ├── providers.ts       # Provider factory + API key resolution
│   │   │   └── db-prompts.ts      # Prompt templates for DB optimization
│   │   ├── bitbucket/             # Bitbucket API integration
│   │   │   ├── api.ts             # REST API calls (PRs, diffs, comments)
│   │   │   ├── oauth.ts           # OAuth flow (unused/stub)
│   │   │   ├── token-manager.ts   # Credential storage + basic auth
│   │   │   └── types.ts           # Type definitions for Bitbucket models
│   │   ├── db/                    # Database connection + query layer
│   │   │   ├── db-manager.ts      # Unified router (PostgreSQL/MySQL)
│   │   │   ├── postgres.ts        # PostgreSQL connection manager
│   │   │   ├── mysql.ts           # MySQL connection manager
│   │   │   └── introspection.ts   # Schema/table/FK introspection
│   │   ├── cortex/                # Codebase analysis engine
│   │   │   ├── analyzer.ts        # Main orchestrator (parse → cache → result)
│   │   │   ├── git-service.ts     # Git clone, branch, commit operations
│   │   │   ├── cache-db.ts        # SQLite3 for analysis caching
│   │   │   ├── repo-detector.ts   # Detect repo type (monorepo vs. single)
│   │   │   ├── test-detector.ts   # Count test files/coverage stats
│   │   │   ├── mermaid-generator.ts # Generate Mermaid diagrams
│   │   │   ├── doc-generator.ts   # Generate HLD markdown
│   │   │   ├── toon-parser.ts     # Parse TOON findings into objects
│   │   │   ├── digest-builder.ts  # Build AI digest prompts
│   │   │   ├── digest-toon-parser.ts # Parse digest TOON output
│   │   │   ├── entity-enricher.ts # Build AI enrichment batches
│   │   │   ├── analysis-validator.ts # Validate analysis completeness
│   │   │   ├── rtk-integration.ts # Rust Token Killer probe
│   │   │   └── parser/            # Language-specific parsers
│   │   │       ├── index.ts       # Router by file extension
│   │   │       ├── ts-parser.ts   # TypeScript/JavaScript AST parsing
│   │   │       ├── python-parser.ts # Python AST parsing
│   │   │       ├── java-parser.ts # Java parsing
│   │   │       ├── fe-parser.ts   # Frontend (React, Vue, Angular) detection
│   │   │       ├── de-parser.ts   # Backend/deployment parsing
│   │   │       └── call-graph-builder.ts # Call graph construction
│   │   ├── nebula/                # Notes & knowledge system
│   │   │   ├── database.ts        # SQLite3 schema + CRUD
│   │   │   ├── file-storage.ts    # Audio/file I/O on disk
│   │   │   └── transcription.ts   # Whisper API integration
│   │   ├── launchpad/             # Cloud cost estimation (stub)
│   │   ├── textcraft/             # Text refinement (stub)
│   │   └── lib/
│   │       └── pdf-generator.ts   # PDFMake-based PDF export
│   │
│   ├── preload/                   # Electron preload (context isolation bridge)
│   │   └── index.ts               # IPC wrapper API exposed to renderer
│   │
│   └── renderer/                  # React UI (Vite-bundled)
│       └── src/
│           ├── main.tsx           # React DOM mount
│           ├── App.tsx            # Router root with PLUGINS registry
│           ├── env.d.ts           # Type definitions for global api
│           ├── components/        # Shared UI components
│           │   ├── AppLayout.tsx  # Sidebar + plugin router outlet
│           │   ├── ErrorBoundary.tsx
│           │   ├── dashboard/     # MissionControl dashboard
│           │   ├── activity/      # Activity log view
│           │   ├── settings/      # Settings forms (per-plugin)
│           │   └── about/         # About dialog
│           ├── plugins/           # Plugin implementations
│           │   ├── registry.ts    # Centralized plugin definitions
│           │   ├── code-review-bot/       # Bitbucket PR review
│           │   │   ├── CodeReviewBotView.tsx
│           │   │   ├── PRList.tsx
│           │   │   ├── PRDiffView.tsx
│           │   │   ├── ReviewPanel.tsx
│           │   │   ├── ReviewHistory.tsx
│           │   │   └── SettingsPanel.tsx
│           │   ├── db-inspector/         # PostgreSQL/MySQL browser
│           │   │   └── DbInspectorView.tsx (main; nested components in same dir)
│           │   ├── launchpad/           # Cloud cost calculator
│           │   │   └── LaunchpadView.tsx
│           │   ├── nebula/              # Notes + knowledge graph
│           │   │   └── NebulaView.tsx
│           │   ├── textcraft/           # Text refinement
│           │   │   └── TextCraftView.tsx
│           │   ├── cortex/              # Codebase analyzer UI
│           │   │   ├── CortexView.tsx   # Main tabbed interface
│           │   │   └── components/      # 30+ reusable components
│           │   │       ├── MindGraph3D.tsx      # Three.js 3D force graph
│           │   │       ├── MindGraphTab.tsx     # Tab wrapper
│           │   │       ├── OverviewTab.tsx      # Stats + metadata
│           │   │       ├── DesignDocTab.tsx     # HLD markdown
│           │   │       ├── APIListTab.tsx       # API/endpoint list
│           │   │       ├── ArchitectureTab.tsx
│           │   │       ├── FlowEdge.tsx         # Edge renderer
│           │   │       ├── QAPanel.tsx          # AI Q&A chat
│           │   │       ├── InsightsPanel.tsx    # Enrichment results
│           │   │       ├── ExportDialog.tsx     # PDF export
│           │   │       ├── RepoManager.tsx      # Clone/select UI
│           │   │       ├── RepoCard.tsx         # Repo grid cell
│           │   │       └── ... (utilities)
│           │   └── stubs/         # Disabled plugins
│           ├── stores/            # Zustand state management
│           │   ├── settings-store.ts  # Read/write settings via IPC
│           │   ├── agent-store.ts     # AI providers + model config
│           │   ├── cortex-store.ts    # Analysis + enrichment state
│           │   ├── db-store.ts        # Database connections + query results
│           │   ├── review-store.ts    # Code review findings
│           │   ├── nebula-store.ts    # Notes + graph
│           │   ├── activity-store.ts  # User activity log
│           │   ├── health-store.ts    # App health metrics
│           │   ├── textcraft-store.ts # Text refinement state
│           │   ├── launchpad-store.ts # Cloud estimation state
│           │   └── token-store.ts     # Token usage tracking
│           ├── types/             # TypeScript type definitions
│           │   ├── plugin.ts
│           │   ├── cortex.ts
│           │   ├── agent.ts
│           │   ├── database.ts
│           │   ├── review.ts
│           │   ├── bitbucket.ts
│           │   ├── nebula.ts
│           │   ├── textcraft.ts
│           │   ├── launchpad.ts
│           │   ├── mcp.ts
│           │   ├── activity.ts
│           │   ├── health.ts
│           │   └── electron.d.ts  # Electron globals
│           ├── lib/               # Utilities
│           │   ├── highlight.ts           # Highlight.js setup
│           │   ├── lowlight-setup.ts      # Lowlight (JS AST highlighting)
│           │   ├── hljs-themes.ts         # HLJS theme CSS
│           │   ├── markdown-to-tiptap.ts  # Markdown ↔ Tiptap editor
│           │   ├── tiptap-to-markdown.ts
│           │   └── mermaid-to-png.ts      # Mermaid rendering
│           ├── data/              # Static data files
│           │   └── cloud-pricing/ # AWS/GCP/Azure pricing data
│           └── assets/            # Images, fonts, icons
│               └── fonts/
│
├── build/                         # Electron builder resources
│   └── (DMG/exe installers)
├── dist/                          # Build outputs
├── out/                           # Electron-vite build output
├── resources/                     # Icon + app assets
│   └── icon.png
├── scripts/                       # Build/patch scripts
├── electron.vite.config.ts        # Electron-vite build config
├── electron-builder.yml           # Installer config
├── package.json                   # Dependencies + scripts
├── tsconfig.json                  # TypeScript root config
├── tsconfig.node.json             # Main process config
├── tsconfig.web.json              # Renderer config
└── .planning/                     # GSD analysis artifacts
    └── codebase/
```

## Directory Purposes

**`src/main/`:**
- Purpose: All backend logic running in Electron main process (Node.js with full OS access)
- Contains: Service implementations (AI, database, git, Bitbucket), IPC handlers, settings persistence
- Key files: `ipc-handlers.ts` (command dispatch), `index.ts` (bootstrap)

**`src/main/ai/`:**
- Purpose: AI streaming orchestration (SDK vs. CLI providers)
- Contains: Vercel AI SDK integration, CLI tool spawning (ollama, anthropic-cli), token streaming
- Key files: `stream.ts` (SDK), `cli-stream.ts` (CLI), `providers.ts` (factory)

**`src/main/cortex/`:**
- Purpose: Code repository analysis and visualization data generation
- Contains: Language parsers, caching, diagram generation, enrichment builders
- Key files: `analyzer.ts` (main), `parser/` (language-specific)

**`src/main/db/`:**
- Purpose: Database connection pooling and query execution
- Contains: PostgreSQL and MySQL managers, introspection utilities
- Key files: `db-manager.ts` (router), `postgres.ts`, `mysql.ts`

**`src/preload/`:**
- Purpose: Context-isolated IPC bridge between main and renderer
- Contains: Type-safe API wrappers for all main process services
- Exports: `window.api` namespace with `settings`, `credentials`, `ai`, `db`, `cortex`, etc.

**`src/renderer/src/`:**
- Purpose: React UI layer (Vite-bundled, runs in Electron renderer process)
- Contains: Plugin views, components, Zustand stores, type definitions
- Key files: `App.tsx` (router root), `plugins/registry.ts` (plugin catalog)

**`src/renderer/src/plugins/`:**
- Purpose: Pluggable feature modules, each with lazy-loaded view and settings schema
- Structure: Each plugin (e.g., `cortex/`, `db-inspector/`) is a self-contained directory
- Plugin implementation: Main view + helper components + integration via window.api

**`src/renderer/src/stores/`:**
- Purpose: Zustand hooks for client-side state (AI models, analysis results, query cache)
- Pattern: Stores fetch from IPC on init; optimistic updates; fallback to server state
- Key stores: `cortex-store.ts` (largest, 41KB), `db-store.ts` (67KB), `review-store.ts` (30KB)

**`src/renderer/src/lib/`:**
- Purpose: Shared utility functions and integrations (syntax highlighting, markdown, mermaid)
- Contains: Highlight.js setup, Tiptap editor bridges, Mermaid rendering to canvas

**`src/renderer/src/components/`:**
- Purpose: Reusable UI components (not plugin-specific)
- Contains: Layout (AppLayout, sidebar), dashboard, activity log, settings forms, error boundary

**`build/` and `dist/`:**
- Purpose: Electron builder outputs (macOS DMG, Windows EXE, Linux AppImage)
- Generated: Post-build; ignored from git

## Key File Locations

**Entry Points:**
- `src/main/index.ts`: Electron main process boot (window creation, menu, permissions)
- `src/renderer/src/main.tsx`: React DOM mount + app initialization
- `src/renderer/src/App.tsx`: Route setup, plugin router, theme injection
- `src/preload/index.ts`: Context bridge setup (runs before renderer code)

**IPC & Command Dispatch:**
- `src/preload/index.ts`: API definitions exposed to renderer
- `src/main/ipc-handlers.ts`: All handler registrations (invokes and events)

**Configuration:**
- `package.json`: Dependencies, build scripts
- `electron.vite.config.ts`: Vite config (main/preload/renderer separate builds)
- `electron-builder.yml`: Installer signing, code-sign cert, app metadata
- `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`: Separate TS configs per process

**Core Logic:**
- `src/main/cortex/analyzer.ts`: Repository analysis orchestration
- `src/main/db/db-manager.ts`: Database query routing
- `src/main/ai/stream.ts`: AI token streaming
- `src/renderer/src/plugins/registry.ts`: Plugin definitions (routes, icons, schemas)

**Testing:**
- No dedicated test directory; testing uses Vitest (in package.json)
- Test files: Likely co-located with sources (not found in glob, may be unstubbed)

**Styling:**
- Tailwind CSS: `tailwindcss` in dependencies
- Theme system: `src/renderer/src/cortex/cortex-theme.ts` (CSS variable overrides)
- Data attribute theming: `src/renderer/src/App.tsx` applies `data-theme` to `<html>`

## Naming Conventions

**Files:**
- Main exports: `CamelCase.tsx` (React components), `camelCase.ts` (utilities/modules)
- Stores: `{feature}-store.ts` (e.g., `cortex-store.ts`, `db-store.ts`)
- Types: `camelCase.ts` in `types/` directory (e.g., `src/renderer/src/types/cortex.ts`)
- Directories: `kebab-case` for feature folders (e.g., `code-review-bot/`, `db-inspector/`)

**Functions:**
- Event handlers: `onXxx` or `handleXxx` (e.g., `onCloneProgress`, `handleFileSelect`)
- Async operations: No prefix; use Promise return type
- Utilities: Verb phrases (e.g., `resolvePath`, `validateQuery`, `safeSend`)
- Stores: `useFeatureStore` (Zustand convention)

**Variables & Types:**
- State properties: `camelCase` (e.g., `isLoading`, `selectedRepoId`)
- Types: `PascalCase` interfaces/classes (e.g., `AnalysisResult`, `PluginDefinition`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `PARSER_VERSION`, `MAX_INDEX_FILES`)
- IPC channels: `namespace:action` (e.g., `cortex:analyze`, `ai:stream:chunk`)

**Imports:**
- All files use ES6 modules (`import`/`export`)
- Path aliases: `@renderer` → `src/renderer/src` (configured in `electron.vite.config.ts`)
- No circular dependencies; layers only import downward (main → lib; renderer → stores → types)

## Where to Add New Code

**New Feature (Backend Logic):**
- Primary code: `src/main/{feature}/` (e.g., `src/main/myfeature/`)
- IPC handlers: Add to `src/main/ipc-handlers.ts` (call existing service, register handler)
- Preload API: Add to `src/preload/index.ts` (add `window.api.{feature}` namespace)
- Tests: Co-locate as `*.test.ts` or `*.spec.ts` with source

**New Plugin (UI Feature):**
- Implementation: `src/renderer/src/plugins/{plugin-id}/`
- Main view: `src/renderer/src/plugins/{plugin-id}/{PluginNameView}.tsx`
- Helper components: `src/renderer/src/plugins/{plugin-id}/components/` (optional)
- Register: Add entry to `PLUGINS` array in `src/renderer/src/plugins/registry.ts`
- Store (if needed): `src/renderer/src/stores/{plugin-id}-store.ts` using Zustand
- Types: `src/renderer/src/types/{plugin-id}.ts`

**New Database Engine:**
- Connection manager: `src/main/db/{engine}.ts` (export connect/query/disconnect)
- Register in UnifiedDbManager: Update `src/main/db/db-manager.ts` (add manager instance, routing logic)
- IPC handlers: Already generic in `src/main/ipc-handlers.ts` (engine param routing)

**New Language Parser:**
- Parser implementation: `src/main/cortex/parser/{language}-parser.ts`
- Export: `parseFile(content: string): ParseResult`
- Register: Add to file extension → parser mapping in `src/main/cortex/parser/index.ts`

**Utilities:**
- Shared libs: `src/main/lib/` (backend) or `src/renderer/src/lib/` (frontend)
- Feature-specific utils: Co-locate in feature directory
- Types: `src/renderer/src/types/` for all renderer types

## Special Directories

**`.planning/`:**
- Purpose: GSD analysis artifacts (this directory)
- Generated: Via `/gsd:map-codebase` command
- Committed: Yes (tracked as design docs)

**`node_modules/`:**
- Purpose: Dependency binaries
- Generated: `npm install`
- Committed: No (git ignored)

**`out/`:**
- Purpose: Electron-vite build output (main/preload/renderer compiled JS)
- Generated: `npm run build`
- Committed: No

**`dist/`:**
- Purpose: Installer artifacts (DMG, EXE, AppImage)
- Generated: `npm run build:mac` etc.
- Committed: No

**`resources/`:**
- Purpose: Icon and static assets bundled into installers
- Committed: Yes
- Key files: `resources/icon.png` (app icon)

---

*Structure analysis: 2026-03-24*
