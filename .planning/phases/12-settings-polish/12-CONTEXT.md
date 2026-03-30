# Phase 12: Settings & Polish - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manage provider credentials, configure sync preferences (frequency, default region per provider), inspect per-provider sync health, and see a live sync status badge in the Launchpad header. The plugin feels production-ready with clear status visibility.

</domain>

<decisions>
## Implementation Decisions

### Settings panel layout
- Single Launchpad card in Settings with stacked sections: Sync Preferences, Credentials, Provider Status
- Sync frequency: dropdown with presets (Every 6h, Every 12h, Daily, Weekly, Manual only)
- Manual Sync button: top of Sync Preferences section, right-aligned — most prominent action
- Default region: per-provider dropdowns (not one global dropdown) — each provider has different region lists

### Credential field UX
- Masked display: dots + last 4 characters (e.g., ••••••••abcd) to identify which key is set
- Edit flow: inline expand — click 'Edit' → field expands to text input with Save/Cancel. No modal
- Clear action: requires confirmation dialog — "Are you sure? This will disable live pricing for [provider]."
- GCP API key field: subtle inline hint below the field — "Required for live pricing · Get API key" with link to GCP Console API key setup page

### Provider status display
- Status indicators: colored dot + label — green = Live, gray = No Key, amber = Stale (matches existing AgentRow pattern)
- Last-sync timestamp: relative time ("2 hours ago", "Yesterday", "Never") with exact date/time in tooltip
- Provider list: mini cards per provider (not table rows) — each provider gets a small card with name, status, timestamp
- Stale threshold: based on sync frequency — if last sync > 2x configured sync frequency, provider is Stale

### Sync status badge & popover
- Badge placement: right side of Launchpad header bar, alongside existing header actions
- Badge style: colored dot + text pill — green "Live", amber "Partial", gray "Cached", red "Stale"
- Popover content: per-provider rows with status dot + label + relative timestamp — quick health overview
- Popover footer: "Manage in Settings →" link for quick navigation to Launchpad settings section

### Claude's Discretion
- Exact region dropdown option lists per provider
- Popover open/close animation and positioning
- How badge state aggregates from individual provider states (e.g., any Stale → badge is "Partial"?)
- Loading state during manual sync
- Error handling for failed sync attempts

</decisions>

<specifics>
## Specific Ideas

- Provider status dots should match the same pattern used in AI Agents settings (AgentRow) for visual consistency
- The Settings card should feel like the rest of the glass-themed settings UI — bg-white/[0.04] borders, no heavy shadows
- Badge in header should be subtle enough to not compete with main actions but visible enough to notice stale state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-settings-polish*
*Context gathered: 2026-03-31*
