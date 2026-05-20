# Phase 20: Settings & Polish - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Task Groomer plugin production-ready: polish the UI to match the existing Zenith aesthetic, add an integration health dashboard to settings, and wire the existing Jira ticket key as a clickable link. Jira ticket creation/push is deferred. Phase 20 does not add new capabilities — it finishes and polishes what phases 14-19 built.

</domain>

<decisions>
## Implementation Decisions

### Jira Push — Deferred
- **No "Push to Jira" button in Phase 20.** The ROADMAP.md success criterion for Jira push is intentionally scoped out.
- The linked Jira ticket key (already stored in `task.jiraTicketKey`) becomes a **clickable link** in TaskSidePanel that opens the Jira ticket URL in the browser via `window.api.app.openExternal`. Read-only display only.
- Creating or updating Jira tickets via button is noted for the v4 roadmap.

### Integration Health Dashboard
- **Location:** Top of the TaskGroomerSettings panel — above the AI Agent section — as a compact status row.
- **Visual design:** Service icons (one per service: Claude/AI agent, Jira, Confluence, Web search).
  - **Configured/connected:** Full-color, vivid icon
  - **Not configured / failed:** Same icon but blurred/dimmed (opacity ~30%, desaturated)
  - No text labels like "✅" or "❌" — icon visual language only
- **Services shown:** AI Agent (brain/bot icon), Jira (Jira icon or generic ticket), Confluence (Confluence icon or document), Web search (globe/search icon)
- **Tapping an icon:** No action — purely informational. Settings sections below handle configuration.

### Layout & Spacing Polish
- **Primary polish target:** Overall plugin layout and spacing — header, two-column layout (task list + side panel slot), section dividers.
- Match the visual weight, font sizes, and spacing of the existing Zenith plugins (CodeReviewBot, DB Inspector, etc.) exactly.
- TaskGroomerView header should match the plugin shell header style used elsewhere in the app.

### TaskSidePanel Empty State
- When a task is selected but has **no AI enrichment yet** (never been groomed): show a placeholder state below the task title.
- Placeholder: muted text + a hint that grooming will fill this in. No broken/empty field grid.
- The Re-groom button should still be visible and actionable even in this empty state.

### Digest Panel Styling
- GroomDigest.tsx needs visual consistency with the main task list — same border radius, background, text sizing, and spacing as TaskSidePanel.
- The slide-in animation timing should feel consistent with how other panels transition in the app.

### Capture Popup Polish
- The global hotkey popup (Cmd/Ctrl+Shift+D) should match the Zenith aesthetic: same dark background, border treatment, and input styling as other Zenith dialogs.
- Input field and submit button should feel polished, not bare.

### Status Dropdown UX
- The status dropdown on task cards (Dump / Groomed / Done / Delegated / Aborted) should feel smooth — consistent open/close animation and visual weight with the rest of the UI.

### Error UI for Failed Grooming
- When a batch groom run completes with failures: **do not rely on toast alone**.
- Show a persistent banner or inline error state in the TaskGroomerView indicating "N tasks failed to groom" with the option to retry (re-trigger groom) or dismiss.
- Failed tasks should have a subtle visual indicator on their task card (e.g., a small warning icon or color shift) so the user can identify which tasks failed.

### Schedule Config
- Grooming schedule stays in **Settings only** — no quick-access toggle in the main TaskGroomerView header.
- No changes to schedule UI beyond what's already implemented.

### No Inline Integration Hints
- TaskGroomerView does **not** show any banner or hint when integrations (Jira/Confluence) are not configured. Settings are discoverable enough.

### Accessibility
- Basic a11y pass: focus rings on all interactive elements, aria-labels on icon-only buttons (Re-groom spinner, close X on digest, status dropdown).
- No major new keyboard shortcuts or full keyboard navigation in Phase 20.

### Claude's Discretion
- Exact icon choices for the health dashboard (can use Lucide icons or plugin-specific SVGs)
- Exact blur/desaturation CSS for unconfigured service icons
- Specific spacing values for layout tightening
- Whether the digest slide-in uses the same Tailwind transition as implemented or gets refined
- Exact wording for TaskSidePanel empty state placeholder

</decisions>

<specifics>
## Specific Ideas

- Integration health dashboard icons: **colored = active, blurred/dimmed = inactive** — no text, purely visual. Think of it like signal bars or app connection indicators.
- The plugin should feel like it belongs next to CodeReviewBot and DB Inspector — same polish level.
- The capture popup is the first touch point — it should feel as refined as a spotlight/launcher.
- Failed task cards: a small visual indicator is important so the user knows which tasks to manually re-groom.

</specifics>

<deferred>
## Deferred Ideas

- **Push to Jira button** — create a new Jira ticket from a groomed task. Noted for v4 roadmap.
- **Update existing Jira ticket** — sync priority/status to a linked Jira ticket via button. Noted for v4 roadmap.
- **Grooming history & stats** — how many tasks groomed, last run time, success rate. Future phase.
- **Full keyboard navigation** — arrow keys through task list, Enter to open panel. Future polish pass.
- **Digest accessible after dismiss** — "Last Digest" button to bring back the most recent groom digest. Noted in Phase 19 deferred.

</deferred>

---

*Phase: 20-settings-polish*
*Context gathered: 2026-05-21*
