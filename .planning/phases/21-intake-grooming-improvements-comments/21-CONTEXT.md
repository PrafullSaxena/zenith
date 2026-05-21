# Phase 21: InTake Grooming Improvements + Comments - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Three deliverables for the InTake plugin:
1. **Two-pass grooming agent** — first AI call decides which sources each task needs (and handles tasks requiring no sources in a single call); second call summarizes results using compact token-efficient output
2. **Task comments** — timestamped thread of user annotations per task, with edit/delete, persisted across re-grooms
3. **Integration status ribbon** — read-only icon row in the task detail modal showing which sources the AI queried

</domain>

<decisions>
## Implementation Decisions

### Two-Pass Grooming Architecture

**Pass 1 — Source selection (per-task):**
- For each task, ask the AI: "Which sources does this task need? If no sources are needed, also provide the Summary and Next Steps in this same response."
- If the AI returns "no sources needed": the summary + next steps are already in pass-1 response — no second AI call is made. This is a key optimization.
- If the AI returns sources needed: query those sources, then do pass 2.
- Timing: per-task sequential (simpler to implement correctly than batch pre-filter).
- Use compact/TOON-style output format to reduce token consumption on both passes.

**Pass 2 — Summarization (only when sources were queried):**
- Receives task text + source results.
- Returns structured output: Summary section + Next Steps section.

**Re-groom (single task):**
- Claude's discretion — pick the simpler implementation (likely same two-pass logic as batch, since consistency matters more than micro-optimization for a single task).

### Grooming Output Format

**Summary section:**
- Source-by-source structure: one block per source that returned results (Jira findings, Confluence findings, Google findings).
- Each source block contains bullet points.
- If a source returned no relevant results → omit that source's block entirely (no empty sections).

**Next Steps section:**
- Mix of open questions + concrete actions.
- 3-5 bullets max.
- Bullet length: Claude's discretion per bullet — AI judges what context each point needs.

### Progress UI During Grooming

Three visible stages in the grooming button/status area:
1. `Analyzing tasks...` — first pass running
2. `Querying sources...` — source integrations being called
3. `Summarizing...` — second pass running

The existing shimmer on task cards continues throughout. Task cards update in-place when complete.

### Task Comments

- **Type:** Timestamped thread (multiple entries appended over time, not a single editable block).
- **Location:** Separate "Notes" tab inside the task detail modal (alongside the existing Grooming Results content).
- **Each entry shows:** Timestamp + comment text + edit button + delete button.
- **Save:** Explicit "Save" button appears when the user is typing or editing a comment; auto-saves when Save is clicked.
- **Edit/delete:** Full control — users can edit or delete any individual comment at any time.
- **Persistence:** Notes/comments are NEVER cleared by re-grooming. Re-groom only updates AI fields (priority, evidenceSummary, etc.). Comments are independent.
- **New DB column(s):** Comments stored as JSON array in a `comments TEXT` column on the tasks table (each entry: `{ id, text, createdAt, updatedAt }`).

### Integration Status Ribbon

- **Placement:** Top of the Grooming Results section, above the Summary content (before the source blocks).
- **Sources shown:** Always 4 icons — AI agent, Jira, Confluence, Google — regardless of configuration.
- **Used vs unused:**
  - Used: full-color icon (matches the icon colors in the settings health dashboard)
  - Unused: 30% opacity + grayscale — same pattern as the health dashboard's unconfigured state
- **Interactivity:** Read-only. No click behavior.
- **Data source:** The grooming result stores which sources were actually queried (new `sourcesUsed` field on the GroomingResult object). The ribbon reads this field.

### Claude's Discretion

- Exact TOON format / compact schema for the AI prompts (headers, field names, abbreviations)
- Whether pass 1 and pass 2 share a conversation context or are independent calls
- Per-task sequential vs batched source queries (choose whichever is simpler to implement correctly)
- Re-groom single task: use same two-pass logic as batch for consistency
- Exact icon choices for the ribbon (use Bot for AI agent, Ticket for Jira, FileText for Confluence, Globe for Google — matching health dashboard)
- Tab UI inside the task detail modal for switching between Grooming Results and Notes

</decisions>

<specifics>
## Specific Ideas

- **No-sources optimization**: "When the first AI call says no sources needed, it should also give a summary and next steps in the same call to reduce unnecessary calls to AI Agent." — This is a key product decision: pass-1 doubles as pass-2 for simple tasks.
- **Token efficiency**: "Use TOON or anything else that reduces token consumption." The existing app already uses TOON in the code review CLI streaming. Use a similar compact schema for grooming.
- **Health dashboard consistency**: The ribbon should visually match the integration health dashboard in Settings — same icon choices, same color/opacity treatment.
- **Comments thread**: Inspired by Jira comments — append-only entries with timestamps, editable/deletable.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-intake-grooming-improvements-comments*
*Context gathered: 2026-05-21*
