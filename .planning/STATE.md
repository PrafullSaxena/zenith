# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** CodeReviewBot must work flawlessly — automated PR code review that connects to Bitbucket, fetches diffs, and posts inline AI-generated review comments
**Current focus:** Phase 13 — Codebase Analyzer Plugin

## Current Position

**Current Phase:** 13
**Current Phase Name:** Codebase Analyzer
**Total Phases:** 13
**Current Plan:** 1 (complete)
**Total Plans in Phase:** 6
**Status:** Plan 13-01 complete — foundation layer ready
**Last Activity:** 2026-03-14
**Last Activity Description:** Completed 13-01 (Foundation -- Types, DB, Git, Plugin Registration)

**Progress:** [█████████░] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Duration | Tasks | Files |
|-------|----------|-------|-------|
| Phase 01-foundation P01 | 15min | 2 tasks | 11 files |
| Phase 01-foundation P03 | 2min | 2 tasks | 6 files |
| Phase 01-foundation P02 | 3min | 2 tasks | 6 files |
| Phase 01-foundation P04 | 4min | 2 tasks | 9 files |
| Phase 01-foundation P05 | 3min | 2 tasks | 7 files |
| Phase 02 P01 | 2min | 2 tasks | 2 files |
| Phase 02 P02 | 3min | 2 tasks | 5 files |
| Phase 02 P03 | 2min | 2 tasks | 5 files |
| Phase 03 P01 | 5min | 2 tasks | 6 files |
| Phase 03 P02 | 7min | 2 tasks | 2 files |
| Phase 03 P03 | 3min | 2 tasks | 7 files |
| Phase 03 P04 | 4min | 2 tasks | 7 files |
| Phase 07 P01 | 5min | 2 tasks | 8 files |
| Phase 07 P02 | 5min | 2 tasks | 8 files |
| Phase 07-launchpad-plugin P03 | 4min | 2 tasks | 5 files |
| Phase 07-launchpad-plugin P04 | 3min | 2 tasks | 4 files |
| Phase 08-nebula-plugin P02 | 3min | 2 tasks | 7 files |
| Phase 08 P01 | 5min | 2 tasks | 5 files |
| Phase 08-nebula-plugin PP04 | 3min | 2 tasks | 4 files |
| Phase 08-nebula-plugin P03 | 6min | 2 tasks | 8 files |
| Phase 08-nebula-plugin P06 | 3min | 1 tasks | 3 files |
| Phase 08-nebula-plugin PP05 | 5min | 2 tasks | 9 files |
| Phase 09 P01 | 7min | 2 tasks | 9 files |
| Phase 09 P02 | 4min | 2 tasks | 7 files |
| Phase 09 P03 | 6min | 2 tasks | 5 files |
| Phase 09 P04 | 10min | 2 tasks + 3 fixes | 4 files |
| Phase 11-full-ui-ux-revamp P01 | 2min | 2 tasks | 6 files |
| Phase 11-full-ui-ux-revamp P03 | 3min | 2 tasks | 9 files |
| Phase 11 P02 | 4min | 2 tasks | 17 files |
| Phase 12 P01 | 2min | 2 tasks | 6 files |
| Phase 12 P02 | 4min | 3 tasks | 4 files |
| Phase 04-dbinspector-plugin P01 | 5 | 2 tasks | 7 files |
| Phase 04-dbinspector-plugin P03 | 8min | 2 tasks | 3 files |
| Phase 04-dbinspector-plugin P02 | 6 | 2 tasks | 5 files |
| Phase 04-dbinspector-plugin P04 | 10min | 1 tasks | 6 files |
| Phase 13-codebase-analyzer P01 | 6min | 3 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 1 covers entire foundation (shell + plugin system + settings + AI agent config) — all 22 requirements before any plugin work begins
- [Roadmap]: Mission Control and Activity Log in Phase 2 (separate from Phase 1) to keep foundation phase focused on architecture, not UI content
- [Roadmap]: CodeReviewBot in Phase 3 (not Phase 2) — highest ROI, validates AI + Bitbucket + streaming patterns early
- [Roadmap]: AstroPatch in Phase 5 (after DbInspector) — highest operational complexity, depends on AI streaming patterns proven by CodeReviewBot
- [Phase 01-foundation]: Scaffold: electron-vite 5 react-ts template as electron app foundation; type=module in package.json for electron-store ESM
- [Phase 01-foundation]: Security: nodeIntegration=false, contextIsolation=true, sandbox=true mandatory — never override; window.api only contextBridge export
- [Phase 01-foundation]: Tailwind v4 CSS-first: @theme blocks in main.css, no tailwind.config.js; dark-only via oklch() tokens
- [Phase 01-foundation]: Plugin registry: compiled-in PLUGINS array with PluginDefinition type drives sidebar, router, settings — single source of truth
- [Phase 01-foundation]: Settings schema pattern: SettingsField[] on each PluginDefinition enables auto-rendered per-plugin settings forms
- [Phase 01-foundation]: HashRouter over BrowserRouter: Electron file:// protocol requires hash-based routing
- [Phase 01-foundation]: Static icon map pattern: import all lucide icons statically, map by string name in ICON_MAP record
- [Phase 01-foundation]: CSS tooltip with group-hover: Tailwind group/group-hover opacity pattern instead of tooltip library
- [Phase 01-foundation]: Settings: registerIpcHandlers() before createWindow(); separate electron-store for credentials; zustand with optimistic updates; auto-save per field change
- [Phase 01-foundation]: Agent store pattern: DEFAULT_PROVIDERS merged with persisted state on load; runtime fields reconstructed; Ollama auto-probed
- [Phase 01-foundation]: Per-plugin default agent dropdown: shows all providers as fallback, derives configured list reactively from providers array
- [Phase 02]: Activity store uses MAX_ENTRIES constant (500) for entry cap and STORAGE_KEY constant for settings persistence
- [Phase 02]: Activity store follows same optimistic-update-then-IPC pattern as settings-store for consistency
- [Phase 02]: Local ICON_MAP per dashboard component rather than shared module -- avoids touching Sidebar.tsx, keeps components self-contained
- [Phase 02]: Default export for MissionControl for React.lazy() compatibility in App.tsx routing
- [Phase 02]: Default redirect changed from PLUGINS[0].route to /dashboard for DASH-01 compliance
- [Phase 02]: ActivityLog reuses ActivityFeed component rather than duplicating entry rendering
- [Phase 02]: Sidebar uses visual separator between app-level icons (dashboard, activity) and plugin icons
- [Phase 03]: Loopback redirect URI with webRequest.onBeforeRequest interception for OAuth -- no local HTTP server needed
- [Phase 03]: Concurrent token refresh via shared promise pattern to avoid duplicate refresh requests
- [Phase 03]: Token refresh failure clears stored tokens, forcing re-authentication rather than silently failing
- [Phase 03]: Cast ollama-ai-provider LanguageModelV1 to LanguageModel since ollama-ai-provider has not updated to V3 types yet; runtime compatible
- [Phase 03]: Guard against destroyed BrowserWindow during IPC streaming to prevent send-after-close crashes
- [Phase 03]: Suppress AbortError on review cancellation to avoid false error events in renderer
- [Phase 03]: Fire-and-forget streamReview in ai:startReview IPC handler -- returns immediately while chunks stream via webContents.send events
- [Phase 03]: Session-scoped IPC listeners with removeStreamListeners cleanup in done/error/cancel to prevent listener accumulation
- [Phase 03]: parse-diff output mapped to custom DiffFile[] renderer type to avoid Node.js type leaks into renderer
- [Phase 03]: Review history persisted via settings.set/get IPC with optimistic local update, capped at 100 entries
- [Phase 03]: Tab navigation with local useState for diff/review/history tabs rather than router-based sub-routes
- [Phase 03]: Unified diff view with green/red line backgrounds; inline AI comment cards with severity-colored left borders
- [Phase 03]: Agent fallback: if no defaultAgent configured, first provider with connected/hasApiKey status is used
- [Phase 07]: Static curated pricing embedded as TypeScript constants — avoids AWS 300MB+ bulk JSON and network dependencies
- [Phase 07]: HOURS_PER_MONTH = 730 exported from calculator.ts as single source of truth (AWS standard assumption)
- [Phase 07]: pricePerHour encoded on SelectOption for compute tiers — keeps pricing co-located with display label
- [Phase 07]: Azure fixed monthly prices stored as pricePerHour = monthlyPrice/730 for uniform calculation path
- [Phase 07]: Placeholder LaunchpadView.tsx created for React.lazy() compatibility — full implementation in Plan 03
- [Phase 07]: pdfmake createPdf().getBuffer() used over PdfPrinter for simpler async API
- [Phase 07]: EstimationExport interface duplicated in main process to avoid renderer type imports crossing process boundary
- [Phase 07]: SelectOption passed as full object into config — preserves pricePerHour for calculator dispatch without separate lookup array
- [Phase 07]: Stub-then-replace pattern for TypeScript compatibility — stub files created in Task 1 for TS to compile, replaced with full implementations in Task 2
- [Phase 07]: AiAdvisor strips suggestions code-fence block from displayed text — user sees AI reasoning prose without raw JSON
- [Phase 07]: Suggestions never auto-applied in AiAdvisor — explicit Apply button required, prevents accidental estimator overwrites
- [Phase 07]: ComparisonView uses catalog default configs for non-current providers to produce conservative baseline cost comparison
- [Phase 08-nebula-plugin]: Nebula store actions use try/catch with graceful fallback for unconnected IPC -- store compiles and UI works before Plan 03 wires IPC
- [Phase 08-nebula-plugin]: NebulaView matches LaunchpadView tab pattern exactly: border-b-2 border-accent for active, text-text-secondary hover for inactive
- [Phase 08-nebula-plugin]: Created nebula.ts types and electron.d.ts nebula IPC namespace as Rule 3 deviations since Plan 01 not yet executed
- [Phase 08]: FTS5 with external content table synced via manual INSERT/DELETE in CRUD methods for explicit control
- [Phase 08]: Note shape duplicated in file-storage.ts to avoid renderer type imports in main process
- [Phase 08]: better-sqlite3 externalized from ASAR and rebuilt via electron-rebuild for Electron compatibility
- [Phase 08-nebula-plugin]: Fire-and-forget AI summarization: note saves immediately, AI runs in background with session-scoped streaming listeners and updates note asynchronously
- [Phase 08-nebula-plugin]: Knowledge graph edge inference uses keyword-overlap on NoteListItem title+summary for lightweight renderer-side matching
- [Phase 08-nebula-plugin]: Lazy-init getNebulaInstances() pattern for database/file-storage in IPC handlers, matching TokenManager/PostgresConnectionManager singletons
- [Phase 08-nebula-plugin]: tldraw inferDarkMode prop instead of manual colorScheme; props spread for snapshot union type workaround
- [Phase 08-nebula-plugin]: Debounced saves: 500ms for content/title edits, 1000ms for drawing canvas auto-save
- [Phase 08-nebula-plugin]: AI Q&A searches notes first to build context string from top 5 results before sending to AI agent
- [Phase 08-nebula-plugin]: FTS5 highlight <mark> tags rendered via dangerouslySetInnerHTML -- safe since data comes from our own SQLite
- [Phase 08-nebula-plugin]: Use getApiKeyForProvider('openai') for transcription API key retrieval -- consistent with existing AI streaming pattern
- [Phase 08-nebula-plugin]: Audio buffer as number[] across contextBridge (sandbox=true safety); temp file write/cleanup for OpenAI transcription
- [Phase 08-nebula-plugin]: Transcription-to-knowledge pipeline: VoiceRecorder -> handleTranscription -> saveNote -> triggerSummarization -> inferEdges (full NEBL-09 automation)
- [Phase 09]: Idempotent ALTER TABLE migration: try/catch per column to handle re-run gracefully
- [Phase 09]: Content preview auto-computed in upsertNote from Tiptap JSON (first 150 chars)
- [Phase 09]: Notes sorted pinned-first at SQLite level and in-store after mutations
- [Phase 09]: Toast auto-dismiss after 5s via setTimeout in addToast action
- [Phase 09]: BubbleMenu from @tiptap/react/menus (not @tiptap/react) per Tiptap v3 requirement
- [Phase 09]: Auto-save dot: 4-state machine (synced/unsaved/saving/just-saved) with 1.5s green flash timeout
- [Phase 09]: VoiceRecorder removed from NoteEditor; Plan 04 relocates as FAB in NebulaView
- [Phase 09]: TableControls as conditional bar (not second BubbleMenu) to avoid floating menu conflicts
- [Phase 09]: react-resizable-panels REMOVED — caused infinite re-render loops; replaced with plain flexbox (w-64 sidebar, w-3/5/w-2/5 splits)
- [Phase 09]: Drawing panel collapsed by default with side rail tab; visibility controlled by simple state toggle
- [Phase 09]: Custom event nebula:focus-title for Cmd+N cross-component title focus signaling
- [Phase 09]: @tiptap/extension-table uses named exports only — import { Table } not default import
- [Phase 09]: VoiceRecorder FAB: framer-motion AnimatePresence with idle/recording/processing states
- [Phase 09]: TranscriptionBlock: colored speaker labels via hash-based color palette, editable names
- [Phase 09]: ToastContainer: fixed bottom-right (above FAB), framer-motion spring animations, click-to-navigate
- [Phase 11]: Semantic tokens use oklch() in @theme and hex/rgba in portfolio theme for consistency with existing pattern
- [Phase 11]: bg-bg-primary mapped to bg-background (base layer), bg-bg-secondary mapped to bg-surface (elevation hierarchy)
- [Phase 11]: Semantic color token naming: --color-{status} and --color-{status}-muted; diff naming: --color-diff-{add|del}
- [Phase 11]: ReviewPanel findings list uses animate-fade-in-up (not stagger-children) because AI findings are variable-length
- [Phase 11]: Stub plugin glow pattern: animate-status-pulse on blur div behind icon for breathing effect
- [Phase 11]: HealthPanel STATUS_DOT migrated to semantic tokens (bg-success/bg-error/bg-warning) alongside STATUS_BADGE_STYLE
- [Phase 11]: PRDiffView file addition/deletion counts use text-diff-add-text/text-diff-del-text for semantic consistency
- [Phase 11]: ConnectionManager connecting state uses bg-warning + animate-status-pulse for visual pending feedback
- [Phase 11]: PluginCard arrow icon opacity raised from /30 to /50 (decorative, not body text)
- [Phase 12]: buildSystemPrompt uses tone description map and format instruction map for clear AI directives
- [Phase 12]: History auto-saved on stream completion (onStreamDone) with 50-entry cap
- [Phase 12]: loadFromHistory creates completed session for immediate re-viewing of past refinements
- [Phase 12]: OutputPanel stub created in Task 1 for TypeScript compilation, replaced with full impl in Task 2 (stub-then-replace pattern)
- [Phase 12]: Auto-scroll during streaming uses useRef scrollTop pattern for smooth output tracking UX
- [Phase 04-dbinspector-plugin]: engine field optional on DbConnection/DbConnectionConfig — defaults to postgresql for backward compat with safeStorage-encrypted connections
- [Phase 04-dbinspector-plugin]: MySqlConnectionManager.cancelQuery tracks thread IDs via SELECT CONNECTION_ID() before each query, uses KILL QUERY for cancellation
- [Phase 04-dbinspector-plugin]: db:query pagination: appends LIMIT N OFFSET M only if not present in SQL; hasMore detection when rows.length === limit
- [Phase 04-dbinspector-plugin]: introspection.ts uses DbManagerLike duck-type interface instead of PostgresConnectionManager — both managers satisfy it
- [Phase 04-dbinspector-plugin]: isLoadingMoreRef (useRef) guards scroll-triggered loadMore to prevent concurrent calls when rows prop changes
- [Phase 04-dbinspector-plugin]: ResultsGrid receives onLoadMore callback prop — parent wires to loadMoreRows store action for decoupling
- [Phase 04-dbinspector-plugin]: EditorView created once in mount-only useEffect — Compartment handles schema/dialect live updates without recreation
- [Phase 04-dbinspector-plugin]: buildCmSchema exported as standalone function (pure transform) — transforms columnsCache to CodeMirror schema format
- [Phase 04-dbinspector-plugin]: QueryConsole added as 5th tab in DbInspectorView; inline/split output mode toggle per-tab (DataGrip-style)
- [Phase 04-dbinspector-plugin]: query-console tab placed FIRST in DbInspectorView TABS array and set as default activeTab — query console is primary feature of phase 04
- [Phase 04-dbinspector-plugin]: Collapsible left panel uses style-based width transition (0/256px) with overflow:hidden; inner content div fixed at 256px for smooth animation
- [Phase 04-dbinspector-plugin]: onInsertAtCursor only passed to SchemaExplorer when activeTab === query-console to prevent accidental inserts from other tabs
- [Phase 04-dbinspector-plugin]: Auto-reconnect in executeQuery: ECONNRESET/ETIMEDOUT/Connection terminated regex, connectToDb + single retry; falls through to error on failure
- [Phase 04-dbinspector-plugin]: Engine selector in ConnectionListEditor (Settings form) not ConnectionManager — aligns with connection creation location; handleEngineChange auto-swaps port only when port matches well-known default
- [Phase 13-codebase-analyzer]: Lazy-init getCbanInstances() pattern for GitService/CodebaseAnalyzer -- matches Nebula getNebulaInstances() singleton pattern
- [Phase 13-codebase-analyzer]: cban: IPC namespace prefix -- short consistent naming like db:, ai:, nebula:
- [Phase 13-codebase-analyzer]: AnalysisResult shape duplicated in main process analyzer.ts to avoid cross-process type imports
- [Phase 13-codebase-analyzer]: FTS5 file_index_fts manually synced via INSERT/DELETE in insertFileIndex/clearFileIndex
- [Phase 13-codebase-analyzer]: SearchCode icon with amber accent palette for codebase-analyzer plugin card

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: Bitbucket OAuth 2.0 scope names for inline comment posting need verification against current docs before implementation begins
- [Phase 3]: AI streaming via Electron IPC (token-by-token) needs proof-of-concept — no standard documented pattern; warrants early spike in Phase 1 or 3
- [Phase 5]: Jira REST API v3 scope requirements and issue creation payload need verification before AstroPatch implementation

## Session Continuity

**Last session:** 2026-03-14T10:52:28Z
**Stopped at:** Completed 13-01-PLAN.md
**Resume file:** None
