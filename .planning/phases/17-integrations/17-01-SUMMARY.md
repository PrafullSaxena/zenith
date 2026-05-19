---
phase: 17
plan: "01"
subsystem: integrations
tags: [credentials, safeStorage, jira, confluence, electron-store]
dependency_graph:
  requires: []
  provides: [integration-credential-store]
  affects: [ipc-handlers, settings-ui]
tech_stack:
  added: []
  patterns: [safeStorage-base64-wrap, plaintext-setting-helper]
key_files:
  created:
    - src/main/integrations/credentials.ts
  modified: []
decisions:
  - "Mirrored base64 encoding from pricing/credentials.ts (plan said 'hex' but reference is the authority)"
  - "CRED_JIRA_PROJECTS excluded from safeStorage — plaintext helpers for non-secret list"
  - "Store name 'zenith-integrations-credentials' keeps Integration creds isolated from launchpad store"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-20"
---

# Phase 17 Plan 01: Integration Credential Store Summary

**One-liner:** Thin safeStorage wrapper for Jira and Confluence credentials using a dedicated `zenith-integrations-credentials` electron-store instance, mirroring the established launchpad pattern.

## What Was Built

`src/main/integrations/credentials.ts` — main-process-only credential store for the Integrations plugin.

### Exported constants (7)

| Constant | Key path | Secret? |
|---|---|---|
| `CRED_JIRA_BASE_URL` | `integrations.jira.baseUrl` | yes |
| `CRED_JIRA_EMAIL` | `integrations.jira.email` | yes |
| `CRED_JIRA_API_TOKEN` | `integrations.jira.apiToken` | yes |
| `CRED_JIRA_PROJECTS` | `integrations.jira.projects` | no |
| `CRED_CONFLUENCE_BASE_URL` | `integrations.confluence.baseUrl` | yes |
| `CRED_CONFLUENCE_EMAIL` | `integrations.confluence.email` | yes |
| `CRED_CONFLUENCE_API_TOKEN` | `integrations.confluence.apiToken` | yes |

### Exported helpers

**Encrypted (safeStorage):**
- `saveIntegrationCredential(key, value)` — encrypts via safeStorage, stores as base64
- `getIntegrationCredential(key)` — decrypts from base64, returns null if missing
- `hasIntegrationCredential(key)` — boolean presence check
- `deleteIntegrationCredential(key)` — removes key from store
- `getIntegrationCredentialMasked(key)` — bullet-masked with last 4 chars visible

**Plaintext (for CRED_JIRA_PROJECTS):**
- `saveIntegrationSetting(key, value)` — direct store.set, no encryption
- `getIntegrationSetting(key)` — direct store.get, returns null if missing

## Decisions Made

1. **Base64 over hex:** The plan description said "stores as hex" but the authoritative reference file (`pricing/credentials.ts`) uses base64. Reference wins — base64 used throughout.
2. **CRED_JIRA_PROJECTS as plaintext:** The projects list is a non-secret comma-separated string; encryption adds friction without security benefit. Two separate plaintext helpers keep the API intent explicit.
3. **Store isolation:** Named `zenith-integrations-credentials` (not reusing `zenith-credentials` or `zenith-launchpad-credentials`) for clean separation between plugin credential namespaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Documentation discrepancy] Used base64 encoding instead of hex**
- **Found during:** Task 1 (reading reference file)
- **Issue:** Plan said "stores as hex" but `pricing/credentials.ts` encodes as base64
- **Fix:** Followed the actual reference pattern (base64) — the reference file is the authority
- **Files modified:** `src/main/integrations/credentials.ts`

## Verification

```
npx tsc --noEmit   →  0 errors
```

## Self-Check: PASSED

- `src/main/integrations/credentials.ts` — FOUND
- Commit `cb98492` — FOUND
