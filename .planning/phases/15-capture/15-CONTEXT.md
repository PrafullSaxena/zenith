# Phase 15: Capture - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the global hotkey (Cmd/Ctrl+Shift+D), create a lightweight popup window in Electron, implement the text input with auto-expand behavior, detect clipboard content on open (URLs and Jira IDs), and wire the IPC call to `taskgroomer:createTask` on submit. The task is written to tasks.db and the popup closes. No grooming, no Dumpyard UI — those are separate phases.

Follow existing Zenith patterns exactly:
- Global hotkey: Electron's `globalShortcut` module in main process
- Popup window: `new BrowserWindow({ ... })` with frameless, always-on-top, transparent options
- IPC: Reuse `taskgroomer:createTask` from Phase 14; no new IPC channels needed
- Renderer: Popup is its own renderer route (e.g. `/capture`) or a separate BrowserWindow HTML

Reference implementations for popup window pattern: check if Zenith has existing popup windows (e.g. OAuth popups). If not, model after Electron docs for utility/frameless windows.

</domain>

<decisions>
## Implementation Decisions

### Popup Appearance

- **Position:** Screen center — standard Spotlight/Raycast style, works on any monitor
- **Size:** Compact (~480px wide, input only) — no task list or preview inside the popup
- **Backdrop:** Dark overlay with backdrop blur — draws focus to the popup, consistent with Zenith modal patterns
- **Animation:** Quick fade + scale in/out (~150ms) — matches the 150ms open requirement
- **Title label:** Small label "Capture task" above the input — makes purpose explicit on first use
- **Submit hint:** Enter key hint below the input (⏎ to capture) — no visible submit button
- **Character limit:** None — no counter, no hard limit; tasks can be as long as needed
- **Clipboard source badge:** Show a small "from clipboard" chip/badge when input is auto-filled from clipboard — makes auto-fill visible so user understands why field has content

### Input Behavior

- **Input type:** Single-line that auto-expands to multi-line when content overflows — starts compact, handles long error pastes gracefully
- **Submit key:** Enter submits the task; Shift+Enter inserts a newline (standard for quick-capture tools like Linear, Notion quick-add)
- **Escape:** Closes popup and discards all input with no confirmation — fast, expected behavior
- **Auto-focus:** Always auto-focus input on open — user can start typing immediately with no click

### Clipboard Detection

- **Mode:** Auto-paste silently on popup open — input is pre-filled, "from clipboard" badge makes the source visible
- **Patterns that trigger auto-paste:**
  - URLs: `http://` or `https://` prefix
  - Jira ticket IDs: alphanumeric prefix + dash + number (e.g. `PROJ-123`, `ABC-4567`)
- **Non-matching clipboard:** If clipboard doesn't match either pattern, input opens empty
- **Multi-pattern match:** If clipboard matches multiple patterns (e.g. a URL containing a Jira ID), paste the full clipboard text as-is — the grooming agent will parse it; no extraction or cleaning
- **Timing:** Check clipboard exactly once on popup open — no re-check on focus or tab-in

### Post-Submit Flow

- **On submit:** Close popup immediately with no toast or confirmation — fastest possible flow (hotkey → type → Enter → done)
- **Empty submit:** No-op — Enter on blank input does nothing (no error, no close)
- **Batch mode:** None — one task per popup invocation; re-invoke hotkey for additional tasks
- **Dumpyard sync:** New task written to DB immediately; Dumpyard plugin screen reflects it live via Zustand store update (no manual refresh needed when user navigates to Dumpyard)

### Claude's Discretion

- Exact Electron BrowserWindow configuration for the popup (frameless vs not, vibrancy, transparency)
- CSS for the dark overlay and backdrop-blur (whether implemented as part of the popup window itself or as a separate overlay window)
- Zustand store update mechanism (broadcast via IPC or direct store write after `createTask` resolves)
- Placeholder text inside the input field
- Exact pixel dimensions and border-radius for the popup

</decisions>

<specifics>
## Specific Ideas

- The popup should feel like Raycast or Spotlight — center of screen, no decoration, just the input. Fast in, fast out.
- "from clipboard" badge should be dismissible (clicking it or editing the input removes/hides it) — it's informational, not structural.
- The popup must appear within 150ms of the hotkey press (per CAP-01 success criterion) — keep the BrowserWindow logic minimal.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-capture*
*Context gathered: 2026-05-20*
