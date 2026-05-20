# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** Reduce the friction of developer workflows through AI-augmented tooling — all in a single, fast, consistent desktop app.
**Current focus:** v3.0 — Task Groomer Plugin (Phase 18: AI Grooming Engine)

## Current Position

Milestone: v3.0 — Task Groomer Plugin (IN PROGRESS)
Phase: 18-ai-grooming-engine — Plan 03 of 4 complete
Status: Executing Phase 18 (18-03 done — preload bridge + TypeScript types wired)

Progress: [████░░░░░░] 57% (Phase 17 complete — 4/7 phases done; Phase 18 started)

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

**Phase 18-03 decisions (2026-05-20):**
- onGroomProgress/onGroomStart return void (not ipcRenderer.on() result) — contextBridge cannot serialize IpcRenderer instances
- removeGroomListeners() removes both groom:progress and groom:start channels in a single call

**Phase 18-02 decisions (2026-05-20):**
- isDestroyed() guard added before every webContents.send() in schedule callbacks — window may close between tick and send
- taskgroomer:groom handler returns {started: true} immediately (fire-and-forget); batch runs as background async task
- groomingRunActive module-level flag prevents double-trigger from both IPC and schedule
- taskgroomer:groom:start is a separate push channel for schedule-triggered runs so renderer can react without initiating the IPC call

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-20
Stopped at: Phase 18 Plan 03 complete — preload bridge + TypeScript types (commit 15926d9).
Resume file: /gsd:execute-phase 18 (continue with Plan 04)
