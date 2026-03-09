# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** CodeReviewBot must work flawlessly — automated PR code review that connects to Bitbucket, fetches diffs, and posts inline AI-generated review comments
**Current focus:** Phase 7 — Launchpad Plugin

## Current Position

**Current Phase:** 07
**Current Phase Name:** Launchpad Plugin
**Total Phases:** 7
**Current Plan:** 4
**Total Plans in Phase:** 4
**Status:** Ready to execute
**Last Activity:** 2026-03-09
**Last Activity Description:** Phase 07 Plan 01 complete — data foundation (types, catalogs, calculator, equivalences)

**Progress:** [█████████░] 94%

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: Bitbucket OAuth 2.0 scope names for inline comment posting need verification against current docs before implementation begins
- [Phase 3]: AI streaming via Electron IPC (token-by-token) needs proof-of-concept — no standard documented pattern; warrants early spike in Phase 1 or 3
- [Phase 5]: Jira REST API v3 scope requirements and issue creation payload need verification before AstroPatch implementation

## Session Continuity

**Last session:** 2026-03-09T02:19:19.654Z
**Stopped at:** Completed 07-03-PLAN.md
**Resume file:** None
