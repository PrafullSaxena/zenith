# Phase 18: AI Grooming Engine - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Groom button to a real AI agent (Claude) that reads all Dump-status tasks, queries configured integrations (Jira, Confluence, web search), and writes structured grooming results back to tasks.db. The agent runs both on manual trigger (Groom button) and on the user-configured schedule. This phase wires the AI call, integration queries, result persistence, and live UI progress feedback. Re-groom on demand and the post-grooming digest view are Phase 19.

Follow existing Zenith patterns:
- AI call: Anthropic SDK in main process (same as other AI features)
- IPC: new `taskgroomer:groom` channel in `src/main/ipc-handlers.ts`
- Scheduling: Electron's `setInterval` / date comparison in main process (no launchd/system scheduler)
- Progress feedback: IPC push events from main → renderer via `webContents.send`

</domain>

<decisions>
## Implementation Decisions

### Grooming Output Per Task

- **Priority:** P1 / P2 / P3 with a one-sentence rationale (e.g. "P1 — blocks the auth release happening this week")
  - P1 = do today, P2 = this week, P3 = someday/low urgency
- **Suggested action:** Do / Delegate / Defer / Delete (4Ds) displayed as a chip on the task card
- **Evidence summary:** Bullet list — one bullet per source that returned results (e.g. "• Jira: PROJ-42 in progress — auth token refresh bug", "• Confluence: 'Auth Redesign' page is relevant"). If a source returned nothing, omit that bullet.
- **Jira link:** Store the Jira key only when the AI is confident it's the same work item — not just the closest match. Avoids false associations. Field stays null if confidence is low.

### Research Mode

- **Trigger:** AI decides per task based on task text complexity. Short, clear tasks (e.g. "Fix typo in docs") get fast grooming (priority + action + any direct Jira key lookup). Ambiguous, technical, or multi-part tasks trigger research mode.
- **Research sources when triggered:** All three — Jira (if configured), Confluence (if configured), web search (always available via DuckDuckGo fetch / Gemini CLI)
- **Research output:** A 3–5 sentence mini-summary synthesizing what was found across all sources, plus up to 5 relevant links (Jira ticket URLs, Confluence page URLs, web URLs). Stored in `researchSummary` and `researchLinks` columns.
- **Integration timeout:** 30 seconds per integration. If an integration times out or errors, grooming continues with whatever returned — missing integrations are skipped silently (consistent with Phase 17's skip sentinel).

### Groom Button UX & Progress

- **On click:** Button transforms to a spinner + "Grooming N tasks..." label. N is the count of Dump-status tasks before the run starts.
- **Live updates:** Each task updates as it finishes — the task card gets a subtle shimmer while being processed, then transitions to Groomed status in place. Dumpyard task list updates in real time (no manual refresh).
- **Double-trigger prevention:** Button is disabled for the entire duration of a grooming run. No queuing.
- **Per-task failure handling:** Skip the failed task (leave it in Dump status), continue with remaining tasks. When the run finishes, show a summary toast: "Groomed 8/10 tasks. 2 failed — they'll retry on next run." Task cards for failed tasks are unchanged.
- **Progress IPC:** Main process pushes `taskgroomer:groom:progress` events to renderer with `{ taskId, status: 'grooming' | 'done' | 'failed', result? }` payload. Renderer Zustand store listens and updates card state in real time.

### Schedule Mechanics

- **App closed at schedule time:** Skip — no background process, no launchd. Grooming only runs when Electron is open.
- **Catch-up on app open:** On every app start, check: "Was today's scheduled time already missed AND are there ungroomed tasks?" If yes, auto-run grooming silently with the same UX as a manual trigger. No prompt.
- **Auto-start when app is open at schedule time:** Yes — schedule fires, grooming starts automatically. User sees the Groom button enter its "Grooming N tasks..." state. No notification, no opt-in.
- **New tasks:** Only groomed on the next scheduled run or manual Groom. No auto-trigger on capture.

### Claude's Discretion

- Exact system prompt and user prompt structure for the grooming agent
- Whether to process tasks sequentially or with limited parallelism (sequential is safer for rate limits)
- Shimmer animation implementation (CSS animation or Framer Motion)
- Exact wording of the failure summary toast
- How to detect "task complexity" for research mode trigger (keyword heuristics, length threshold, or full AI judgment call in the same prompt)
- Anthropic model to use (default to claude-sonnet-4-6 for cost/quality balance)

</decisions>

<specifics>
## Specific Ideas

- The Groom button state change should feel like a real operation is happening — not just a spinner. The live card-by-card updates make it feel like watching work get done.
- Research mode is invisible to the user from a trigger perspective — they don't flag tasks, the AI just decides. The difference shows up in the richer output (research summary + links vs just priority + action + evidence bullets).
- Per-task failure should not feel alarming — tasks simply stay in Dump and get retried on the next run. The failure summary toast is informational, not an error state.

</specifics>

<deferred>
## Deferred Ideas

- Re-groom individual tasks on demand — Phase 19
- Post-grooming digest view (prioritized list of newly groomed tasks) — Phase 19
- Slack as an evidence source — noted for v4 roadmap
- Streaming AI responses (real-time token streaming to renderer) — could be added but adds complexity; batch result is sufficient for Phase 18

</deferred>

---

*Phase: 18-ai-grooming-engine*
*Context gathered: 2026-05-20*
