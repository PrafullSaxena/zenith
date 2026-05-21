# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** Reduce the friction of developer workflows through AI-augmented tooling — all in a single, fast, consistent desktop app.
**Current focus:** v3.0 — Task Groomer Plugin (Phase 20: Settings & Polish)

## Current Position

Milestone: v3.0 — Task Groomer Plugin (IN PROGRESS)
Phase: 20-settings-polish — In Progress (Plan 04/05 complete)
Status: Plan 20-04 complete (2026-05-21). Polished GroomDigest (text-sm rows, focus rings), StatusDropdown a11y focus ring, and capture popup spotlight aesthetic with styled submit button.

Progress: [█████████░] 90% (6/7 phases complete — Phase 20 in progress)

## Performance Metrics

**v1.0 UI Revamp + v2.0 Launchpad Enhancement (combined — completed 2026-05-20):**
- Total phases: 13
- Total plans completed: 42
- ~62,400 LOC TypeScript
- Timeline: 2026-03-06 → 2026-05-20 (~75 days)

## Accumulated Context

### Decisions

All v2.0 decisions logged in PROJECT.md Key Decisions table.

**Key v3.0 decisions made during planning:**
- Task Groomer as standalone Zenith plugin (not global overlay) — consistent plugin pattern
- Tasks stored in tasks.db (SQLite, isolated from nebula.db/cortex.db)
- Jira: read for enrichment during grooming, push on explicit button click (not auto-sync)
- Re-groom per task available on demand (not batch-only)
- Task lifecycle: Dump → Groomed → Done / Delegated / Aborted (5 states)
- Stale indicator after 3 days in Dump status
- Clipboard auto-detection on popup open (URL, Jira ID, error text patterns)

**Phase 14 Plan 01 decisions (2026-05-19):**
- All 14 schema columns present from day one (grooming metadata nullable) — zero migrations needed until Phase 18
- No ORDER BY in listTasks SQL — renderer Zustand store handles sort order
- crypto.randomUUID() for UUID generation (built-in Node.js, no external dep)
- deleteTask is idempotent (success:true always); updateTask throws on missing id (fail-fast)

**Phase 14 Plan 02 decisions (2026-05-20):**
- Task interface declared locally in electron.d.ts (not imported from main) — preserves contextBridge isolation
- Preload uses unknown/unknown[] return types; typed returns live only in electron.d.ts
- PluginId union extended explicitly in plugin.ts (string literal union, not inferred from PLUGINS array)
- settingsSchema keys use dot notation (schedule.enabled, schedule.time, schedule.frequency) matching electron-store path convention
- [Phase 17-01]: Used base64 encoding to match pricing/credentials.ts reference (plan said hex)
- [Phase 17-01]: CRED_JIRA_PROJECTS stored as plaintext (non-secret list); two plaintext helpers expose intent
- [Phase 17-01]: Store named 'zenith-integrations-credentials' to isolate integration creds from launchpad store
- [Phase 17-integrations]: Two-strategy search: Gemini CLI primary, Playwright/DuckDuckGo HTML fallback — no API key required
- [Phase 17-02]: null credentials returns skip sentinel immediately — grooming never blocked by unconfigured integrations
- [Phase 17-02]: Node built-in fetch used in both clients — no node-fetch or axios dependency

**Phase 18-01 decisions (2026-05-20):**
- generateText (non-streaming) over streamText — batch grooming result sufficient; no streaming UI needed
- withTimeout helper races promise against setTimeout; each integration catches independently to return skip sentinel
- Credential builders return null for entire set if any required field missing — no partial credentials, zero network calls
- JSON parse error throws with 200-char raw text preview for debuggability
- researchLinks serialized to JSON string (matches existing research_links TEXT column); only set when isResearchMode=true

**Phase 19-03 decisions (2026-05-20):**
- CSS transition-transform used for GroomDigest slide-in — no Framer Motion, avoids extra dependency per CONTEXT.md discretion
- GroomDigest renders as fixed inset-y-0 right-0 z-50 overlay (same pattern as Sheet) independently from TaskSidePanel
- TaskSidePanel open prop gates on !showDigest to prevent both panels showing at once
- Priority badge and action chip color configs defined locally in GroomDigest.tsx, mirroring TaskSidePanel PRIORITY_CONFIG

**Phase 19-02 decisions (2026-05-20):**
- Dynamic import('sonner') inside startReGroom action — avoids module-level import side effects; matches pattern where toast is used inside effects
- Two-minute freshness window (groomedAt < TWO_MINUTES) at __run_complete__ to identify batch-groomed tasks for digest
- Re-groom button placed above "Grooming Results" heading — visible regardless of whether grooming data exists
- isReGrooming checks reGroomTaskId === task.id so only the active task shows spinner, not all tasks

**Phase 19-01 decisions (2026-05-20):**
- taskgroomer:regroom awaits full result and returns synchronously — unlike batch groom which is fire-and-forget; single-task re-groom needs immediate response for renderer in-place update
- listTasks() without status filter — re-groom works on any task status (dump/groomed/done/delegated/aborted)
- Task status NOT changed during re-groom — only grooming metadata fields updated
- Jira merge: result.jiraTicketKey ?? existingJiraKey — preserves existing Jira ticket when AI returns null

**Phase 18-05 decisions (2026-05-20):**
- ALTER TABLE under version < 2 guard with try/catch: idempotent schema migration — new installs and existing DBs both converge safely
- IIFE for JSON.parse in JSX: keeps try/catch scoped without useMemo or extra component
- window.api.app.openExternal (not <a href>) for research links — Electron CSP blocks external anchor navigation in renderer

**Phase 18-04 decisions (2026-05-20):**
- Listener deduplication: initGroomListeners() calls removeGroomListeners() first to prevent IPC listener stacking on component re-mount
- prevSummaryRef pattern to detect lastGroomSummary change without an extra boolean state field
- animate-pulse + opacity-70 for task shimmer — CSS-only Tailwind, no Framer Motion per-card

**Phase 18-03 decisions (2026-05-20):**
- onGroomProgress/onGroomStart return void (not ipcRenderer.on() result) — contextBridge cannot serialize IpcRenderer instances
- removeGroomListeners() removes both groom:progress and groom:start channels in a single call

**Phase 18-02 decisions (2026-05-20):**
- isDestroyed() guard added before every webContents.send() in schedule callbacks — window may close between tick and send
- taskgroomer:groom handler returns {started: true} immediately (fire-and-forget); batch runs as background async task
- groomingRunActive module-level flag prevents double-trigger from both IPC and schedule
- taskgroomer:groom:start is a separate push channel for schedule-triggered runs so renderer can react without initiating the IPC call

**Phase 20-02 decisions (2026-05-21):**
- failedTaskIds persists after __run_complete__ (not cleared) so banner and card indicators remain visible post-run
- Banner reset uses two triggers: new lastGroomSummary reference (prevSummaryRef pattern) and groomingActive becoming true
- AlertCircle icon placed before creation time span (rightmost slot after stale badge) to maintain left-to-right data density

**Post-Phase-19 fix (2026-05-21):**
- resolveGroomingProvider() reads plugins.task-groomer.groomingProvider from settings, falls back to first entry in agents.providers
- SDK path: provider.requiresApiKey=true → getApiKeyForProvider() → generateText via Vercel AI SDK
- CLI path: provider.command set → groomWithCLI() spawns shell, writes combined system+user prompt to stdin, extracts first JSON object from stdout via regex
- TaskGroomerSettings gains "AI Agent" section (Section 0) with dropdown of connected providers from useAgentStore
- [Phase 20-01]: IntegrationHealthDashboard: webSearchConfigured always true; icons display-only (no click handlers); cn utility for conditional border/opacity classes
- [Phase 20-settings-polish]: Jira link button uses window.api.app.openExternal (not anchor tag) — Electron CSP blocks external anchor navigation in renderer
- [Phase 20-settings-polish]: Empty grooming state renders styled card (rounded-lg border bg-white/[0.02]) for visual clarity
- [Phase 20-settings-polish]: Re-groom aria-label reflects runtime state: 'Grooming in progress' when active, 'Re-groom this task' otherwise

**Quick-1 decisions (2026-05-21):**
- Phase 19-01 decision ("Task status NOT changed during re-groom") intentionally overridden — product requirement is that re-grooming promotes task to 'groomed'
- Reload button placed as first item in statusIndicator div (always visible regardless of active tab)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-21
Stopped at: Completed quick-1-PLAN.md (InTake reload button + re-groom status fix, commits f24aacc, 1b885dd)
Resume at: 20-05-PLAN.md (final plan in 20-settings-polish phase)
