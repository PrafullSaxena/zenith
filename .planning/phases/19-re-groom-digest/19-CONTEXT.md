# Phase 19: Re-groom + Digest - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two features to the existing Task Groomer: (1) a Re-groom button on any task that triggers a fresh single-task AI analysis on demand, (2) a digest panel that surfaces all newly groomed tasks sorted by priority after every batch groom run. Both features build on the grooming agent and IPC infrastructure from Phase 18. Phase 20 (Settings & Polish) is separate.

</domain>

<decisions>
## Implementation Decisions

### Re-groom Placement & Scope

- **Button location:** TaskSidePanel only — not on the task card. Keeps cards clean; re-groom is a deliberate action from the detail view.
- **Which tasks:** Any task in any status (Dump, Groomed, Done, Delegated, Aborted) can be re-groomed. Status reflects lifecycle, not AI freshness.
- **Enrichment merge strategy:** Replace all AI-generated fields (priority, suggestedAction, evidenceSummary, researchSummary, researchLinks, priorityRationale) but **preserve the Jira ticket key/URL** if the AI does not return a new one with high confidence. Fresh AI result overwrites Jira link only if the agent is confident about a new association.
- **Status after re-groom:** Task stays in its current status. No status reset, no badge/indicator for "re-groomed" — status reflects where the task is in its lifecycle, not when it was last analyzed.

### Re-groom UX During Run

- **Button state:** "Re-groom" button transforms to Loader2 spinner + "Grooming..." text — same pattern as the batch Groom button.
- **Concurrency lock:** Shared lock with batch grooming. If any groom (batch or single-task) is running, all Re-groom buttons are disabled. One at a time — no queuing.
- **Result display:** In-place update in the open TaskSidePanel. Priority badge, action chip, evidence bullets, research links, and priority rationale update live when the result returns. No toast needed — user is already looking at the panel.
- **Failure handling:** Error toast "Re-groom failed — try again." Existing enrichment (priority, evidence, Jira link) is preserved. No data loss on failure.

### Digest View Placement & Persistence

- **Where:** Slide-in drawer/panel in the right-side slot of the Task Groomer screen — the same slot used by TaskSidePanel. Non-intrusive, stays within the plugin, and the task list remains visible alongside it.
- **Trigger:** Only after batch groom runs (Groom All button). Individual re-grooms do NOT open the digest — the TaskSidePanel already shows the result inline.
- **Persistence:** Stays visible until the next batch groom run replaces it. Always shows the most recent batch run's results.
- **Task click while digest open:** Clicking any task in the main list closes the digest and opens TaskSidePanel for that task. Normal task panel behavior takes over.

### Digest Content & Interactions

- **Info density per row:** Compact — task title + priority badge (P1/P2/P3 colored chip) + action chip (Do/Delegate/Defer/Delete). Users click a task to open TaskSidePanel for full evidence and research details.
- **Sort order:** Priority first (P1 → P2 → P3), then within same priority: Do → Delegate → Defer → Delete.
- **Interactions:** Read-only digest. Clicking a task opens it in the TaskSidePanel slot (closes digest). No inline status changes or bulk actions from the digest.
- **Header:** Summary line at the top: "Groomed 8 tasks · 3 P1 · 3 P2 · 2 P3" — at-a-glance run stats before the task rows.

### Claude's Discretion

- Exact animation for the digest panel sliding in (CSS transition or Framer Motion)
- Whether the digest panel has an explicit close (X) button in addition to the task-click-to-close behavior
- Typography and spacing within digest rows
- How to handle the digest when all groomed tasks have been moved to Done/Delegated (empty state message)

</decisions>

<specifics>
## Specific Ideas

- The digest header ("Groomed 8 tasks · 3 P1 · 3 P2 · 2 P3") should feel like a run summary — stats at a glance, not just a label.
- The right-side panel slot is shared: normally shows TaskSidePanel, shows digest after a groom run, and clicking a task from anywhere always brings back TaskSidePanel. The digest is a temporary overlay in that slot, not a new pane.

</specifics>

<deferred>
## Deferred Ideas

- Bulk actions from the digest ("Mark all P1 tasks as Done") — noted for v4 roadmap
- Slack as an evidence source during re-groom — noted for v4 roadmap
- Digest accessible from a "Last Digest" button after it's been dismissed — could be added in Phase 20 polish

</deferred>

---

*Phase: 19-re-groom-digest*
*Context gathered: 2026-05-20*
