# Phase 16: Dumpyard View - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Task Groomer plugin's main screen (replacing the Phase 14 placeholder): a tabbed view with two tabs (Dumpyard and Groomed), task cards with status controls and stale indicators, a side panel for task detail, and a slim toolbar. Wire everything to the existing `window.api.taskgroomer.*` IPC from Phase 14. No grooming logic, no AI — that's Phase 18.

Follow existing Zenith plugin patterns: `PluginShell` wrapper, Zustand store for task state, IPC calls in the store, shadcn/ui components throughout.

</domain>

<decisions>
## Implementation Decisions

### Two-Section Layout

- **Structure:** Tabs (not side-by-side columns) — "Dumpyard" tab and "Groomed" tab, one section at a time
- **Tab headers:** Each tab shows a count badge (e.g. "Dumpyard (12)", "Groomed (4)")
- **Toolbar:** Slim top toolbar with plugin title ("Task Groomer") and a "Groom" button placeholder — button is visible but disabled/no-op in Phase 16 (wired in Phase 18)

### Task Card Design

- **Style:** Compact rows — one line of truncated text, tight vertical spacing, like Linear's issue list
- **Visible info per card:**
  - Task text (truncated with ellipsis, full text on hover via tooltip)
  - Status badge (colored: Dump / Groomed / Done / Delegated / Aborted)
  - Creation time (relative, e.g. "2h ago", "3d ago")
  - Capture source chip NOT shown (omitted to keep cards clean)
- **Groomed tab cards:** Show priority badge (`P1`/`P2`/`P3`) and suggested action chip when present; render as empty placeholders otherwise — structure is ready for Phase 18 to populate
- **Click behavior:** Clicking a card opens a side panel that slides in from the right showing full task text and all available metadata (grooming data shown when present, placeholders when not)

### Status Change Interaction

- **Mechanism:** Click the colored status badge on the card to open a dropdown menu with all 5 status options
- **Quick shortcuts:** None — all status changes go through the dropdown only
- **Confirmation:** None — status changes apply immediately with no confirmation or undo toast
- **Dropdown ordering:** Context-aware:
  - From "dump": Groomed → Done → Delegated → Aborted → (Dump grayed out as current)
  - From "groomed": Done → Delegated → Aborted → Dump (re-open) → (Groomed grayed out as current)
  - Done/Delegated/Aborted tasks: all other statuses listed, current grayed out

### Empty States & Stale Indicator

- **Dumpyard empty state:** Friendly message with hotkey reminder — e.g. "Your dumpyard is clear. Press ⌘⇧D to capture your first task." Center of the tab area, muted text + icon.
- **Groomed empty state:** Contextual message — e.g. "Tasks will appear here after the grooming agent runs. Use the Groom button above to start." Center of the tab area.
- **Stale indicator:** Amber/yellow accent on the card + "Stale Xd" badge (e.g. "Stale 5d") — shown when task has been in Dump status for ≥3 days. Amber fits Zenith's warning color convention without being alarmist.
- **Stale threshold:** 3 days (72 hours from `createdAt` if status has been "dump" since creation; or from `updatedAt` if it was moved back to dump)

### Claude's Discretion

- Exact Zustand store structure for the Dumpyard view (whether to extend the existing task store or create a new dumpyard store)
- Side panel component design (width, animation, close behavior)
- Sorting within each tab (newest-first is the default assumption)
- Exact color tokens for status badges (use existing Zenith color variables)
- Whether the Groom button shows a disabled state with tooltip or renders but does nothing on click

</decisions>

<specifics>
## Specific Ideas

- Cards should feel like Linear's issue list — dense, fast to scan, not cluttered. The side panel is where you go to read the full task.
- The stale badge should stand out but not panic the user — amber, not red.
- "Groom" button in toolbar is a placeholder for Phase 18. It should look real (not greyed-out skeleton) but simply not function yet, or show a "Grooming coming soon" tooltip.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-dumpyard-view*
*Context gathered: 2026-05-20*
