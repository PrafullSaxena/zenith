# Phase 17: Integrations - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire three API clients (Jira, Confluence, Google/web search) with encrypted credential storage (Electron safeStorage). Add an "Integrations" section to Zenith Settings for credential entry, connection status, and "Test connection" buttons. No grooming logic (Phase 18), no Jira push button (Phase 20) — this phase delivers callable client functions that Phase 18 will invoke.

**Critical constraint:** Missing credentials must NEVER block grooming. The grooming agent skips unconfigured integrations and proceeds with whatever is available.

Follow existing Zenith patterns:
- Credential storage: Electron safeStorage (same as GCP API key in Launchpad)
- Settings: Add to existing Settings page under a new "Integrations" section
- IPC: New `integrations:*` handlers in `src/main/ipc-handlers.ts` for Settings reads/writes and test connections
- Clients live in `src/main/integrations/` — one file per integration

</domain>

<decisions>
## Implementation Decisions

### Credential Entry UX

- **Location:** Zenith Settings page — new "Integrations" section (consistent with Launchpad credential storage)
- **Status display:** Each integration shows connection status: "Not connected" (with setup CTA) or "Connected ✓" with "Test connection" button
- **Jira credentials required:**
  - Jira base URL (e.g. `https://company.atlassian.net`)
  - User email
  - API token (stored encrypted via safeStorage)
  - Project key(s) to search (comma-separated, e.g. `PROJ, ENG`) — scopes Jira queries
- **Confluence credentials:** Separate from Jira — own base URL, email, and API token (even though most users share an Atlassian account, the user wants them configurable independently)
- **Google search:** Free approach — no paid API required:
  1. Check if user has Gemini CLI installed (`gemini` binary or `~/.gemini/`) → use it for web research if available
  2. Fallback: use Playwright (already in project) to scrape search results from DuckDuckGo or Bing
  3. Return top 5 ranked links with title + URL + snippet
- **Validation on save:** Test the connection when credentials are saved — show success/failure inline in Settings
- **Test connection button:** Per-integration button that fires a lightweight test query (Jira: list accessible projects; Confluence: get spaces list; Google: test query) and shows pass/fail

### Jira Query Scope

- **Search type:** Full-text JQL search across configured project(s): `project IN (<keys>) AND text ~ "<query>"`
- **Query construction:** The Phase 18 grooming AI agent generates the JQL query from task context; the Jira client just executes it
- **Direct key lookup:** If task text or clipboard source contains a Jira ticket ID pattern (e.g. `PROJ-123`), fetch that issue directly by key — bypasses text search for precise results
- **Result limit:** Top 5 issues per task
- **Fields returned per issue:** key, summary, status, URL, description (first 500 chars), assignee, priority

### Confluence Query Scope

- **Spaces:** Search all spaces the user has access to (no space filtering in Phase 17; user manages access at Confluence level)
- **Match on:** Page title + labels/tags (not full body text — keeps results higher precision)
- **Result limit:** Top 3 pages per task (pages are longer and more expensive for the AI)
- **Fields returned per page:** title, URL, space name, body excerpt (first 500 chars)

### Missing Credential Behavior

- **Grooming never blocked:** If Jira, Confluence, or Google credentials are missing, the corresponding client returns `{ results: [], skipped: true, reason: 'no_credentials' }` — grooming continues with the remaining integrations
- **Partial grooming:** A task can be groomed with 0, 1, 2, or all 3 evidence sources — quality scales with configured integrations
- **Settings indicator:** Unconfigured integrations show "Not connected" status in Settings, but the app never surfaces an error during grooming for missing credentials

### Claude's Discretion

- Exact safeStorage encryption/decryption helper (can reuse existing pattern from Launchpad GCP key)
- IPC channel naming for integrations (`integrations:jira:search`, `integrations:confluence:search`, etc. or a unified `integrations:query` with source param)
- Playwright selectors for web scraping fallback (DuckDuckGo vs Bing — whichever is more scrape-stable)
- Gemini CLI detection logic and invocation format
- Error handling for rate limits, network timeouts (return empty results with `reason: 'error'` rather than throwing)

</decisions>

<specifics>
## Specific Ideas

- The "not configured = skip silently" rule is a hard constraint from the user. Grooming must always produce output even with zero integrations configured (Phase 18 will handle the zero-evidence case).
- Confluence uses separate credentials from Jira even if they're the same Atlassian account — gives the user flexibility to point at different instances.
- Google search: try Gemini CLI first (already installed on many developer machines) because it handles web research natively. Playwright scraping is the robust fallback with no API key requirement.
- Jira direct key lookup (e.g. `PROJ-123` in task text) should bypass JQL search entirely — a direct `GET /issue/PROJ-123` call is more precise and cheaper than text search.

</specifics>

<deferred>
## Deferred Ideas

- Push to Jira (create issue from groomed task) — Phase 20
- Slack integration as evidence source — noted for v4 roadmap
- Google Calendar integration — noted for v4 roadmap
- Confluence space filtering in Settings — could be added if users find all-spaces too noisy

</deferred>

---

*Phase: 17-integrations*
*Context gathered: 2026-05-20*
