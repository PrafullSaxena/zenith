---
phase: 17-integrations
plan: "02"
subsystem: integrations
tags: [jira, confluence, api-client, task-groomer]
dependency-graph:
  requires: [17-01]
  provides: [jira-client, confluence-client]
  affects: [17-03, 17-04]
tech-stack:
  added: []
  patterns: [skip-sentinel-pattern, ADF-text-extraction, AbortController-timeout]
key-files:
  created:
    - src/main/integrations/jira-client.ts
    - src/main/integrations/confluence-client.ts
  modified: []
decisions:
  - name: Skip sentinel over throwing
    summary: null credentials returns {results:[], skipped:true, reason:'no_credentials'} immediately — grooming never blocked by unconfigured integrations
  - name: ADF recursive text extraction
    summary: extractAdfText walks Atlassian Document Format nodes recursively; simpler and safer than regex on JSON blob
  - name: Node built-in fetch
    summary: No node-fetch or axios import — both clients use globalThis.fetch (available Node 18+, matches Electron 28+)
  - name: URLSearchParams for CQL encoding
    summary: Confluence client uses URLSearchParams to safely encode the CQL query string rather than manual encodeURIComponent calls
metrics:
  duration: "1 minute"
  completed: "2026-05-20"
  tasks-completed: 2
  files-created: 2
  files-modified: 0
---

# Phase 17 Plan 02: Jira and Confluence API Clients Summary

**One-liner:** Jira REST v3 + Confluence REST v1 clients with skip-sentinel pattern for null credentials, ADF text extraction, and 10s AbortController timeout.

## What Was Built

Two standalone API client files for the Task Groomer integration layer. Both follow the same structural contract: null credentials triggers an immediate skip return with no network I/O; exceptions are caught at the top level and returned as `{ skipped: true, reason: 'error' }`.

### jira-client.ts

- `JiraCredentials` / `JiraIssue` / `JiraSearchResponse` type exports
- `searchJira(query, credentials)`: direct key lookup (`/^[A-Z][A-Z0-9]+-\d+$/`) → GET `/rest/api/3/issue/{key}`; otherwise JQL text search via POST `/rest/api/3/issue/search` (maxResults: 5)
- Project scoping: if `projects.length > 0`, prepends `project IN (...)` to JQL
- ADF description extraction: recursive `extractAdfText()` over Atlassian Document Format nodes, 500-char truncation
- Basic auth header via `Buffer.from(\`${email}:${apiToken}\`).toString('base64')`
- AbortController with 10s timeout; `clearTimeout` on success path

### confluence-client.ts

- `ConfluenceCredentials` / `ConfluencePage` / `ConfluenceSearchResponse` type exports
- `searchConfluence(query, credentials)`: GET `/wiki/rest/api/content/search` with CQL `title~"{query}" OR label~"{query}"`, expand `space,body.storage`, limit 3
- `URLSearchParams` for safe CQL encoding
- `stripHtml()`: `replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)`
- Same Basic auth + AbortController pattern as Jira client

## Verification

```
npx tsc --noEmit 2>&1 | head -30
```
Result: zero TypeScript errors referencing either integration file.

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | jira-client.ts | 2ed9298 |
| 2 | confluence-client.ts | 6a3cc91 |

## Self-Check: PASSED

- `src/main/integrations/jira-client.ts` — FOUND
- `src/main/integrations/confluence-client.ts` — FOUND
- Commit 2ed9298 — FOUND
- Commit 6a3cc91 — FOUND
- TypeScript: zero errors
