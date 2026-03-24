---
phase: 03-codereviewbot-plugin
plan: "01"
subsystem: auth
tags: [bitbucket, oauth2, safeStorage, electron, rest-api, token-refresh]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Electron shell with safeStorage credentials IPC and settings store"
provides:
  - "Bitbucket OAuth 2.0 BrowserWindow popup flow with loopback redirect interception"
  - "Token lifecycle manager with auto-refresh and safeStorage encryption"
  - "Bitbucket REST API v2.0 client for PRs, diffs, and inline comments"
  - "TypeScript types for all Bitbucket API responses"
affects: [03-codereviewbot-plugin]

# Tech tracking
tech-stack:
  added: [ai, "@ai-sdk/anthropic", "@ai-sdk/google", "@ai-sdk/openai", ollama-ai-provider, parse-diff]
  patterns: [BrowserWindow OAuth popup with webRequest interception, safeStorage token encryption, concurrent refresh protection via shared promise]

key-files:
  created:
    - src/main/bitbucket/types.ts
    - src/main/bitbucket/oauth.ts
    - src/main/bitbucket/api.ts
    - src/main/bitbucket/token-manager.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Loopback redirect URI (http://127.0.0.1/oauth/bitbucket/callback) with webRequest.onBeforeRequest interception -- no local HTTP server needed"
  - "Concurrent refresh protection via shared promise pattern to avoid duplicate token refresh requests"
  - "Token refresh clears tokens on failure, forcing re-authentication rather than silently failing"

patterns-established:
  - "BrowserWindow OAuth popup: Create popup with parent window, intercept redirect via session.webRequest.onBeforeRequest, extract code from URL params"
  - "Token auto-refresh: Check expiresAt - Date.now() < 5min buffer before every API call, share refresh promise across concurrent callers"
  - "Bitbucket API client: All external HTTP via native fetch() in main process, Bearer token auth, to field for inline comments on new lines"

requirements-completed: [CRVW-01]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 03 Plan 01: Bitbucket Backend Summary

**Bitbucket OAuth 2.0 BrowserWindow flow, REST API client for PRs/diffs/comments, and token lifecycle manager with safeStorage encryption and auto-refresh**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T20:21:52Z
- **Completed:** 2026-03-06T20:27:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed all Phase 3 npm dependencies (ai, @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai, ollama-ai-provider, parse-diff)
- Created Bitbucket OAuth 2.0 authorization code grant flow using BrowserWindow popup with loopback redirect interception
- Built token manager with safeStorage encryption, auto-refresh (5-min buffer), and concurrent refresh protection
- Implemented REST API client for listing open PRs (with pagination), fetching diffs, and posting inline comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Phase 3 dependencies and create Bitbucket types** - `2de2cf6` (chore)
2. **Task 2: Implement Bitbucket OAuth flow, API client, and token manager** - `c93229f` (feat)

## Files Created/Modified
- `src/main/bitbucket/types.ts` - TypeScript interfaces for BitbucketTokenPair, BitbucketPR, BitbucketPRListResponse, BitbucketInlineComment, StoredTokens
- `src/main/bitbucket/oauth.ts` - OAuth 2.0 BrowserWindow popup flow with webRequest redirect interception and code-for-token exchange
- `src/main/bitbucket/api.ts` - Bitbucket REST API v2.0 client: listOpenPRs (paginated), getPRDiff, postInlineComment (uses `to` field)
- `src/main/bitbucket/token-manager.ts` - Token lifecycle with safeStorage encryption, auto-refresh before expiry, concurrent refresh protection
- `package.json` - Added Phase 3 dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made
- Loopback redirect URI with webRequest.onBeforeRequest interception avoids needing a local HTTP server for OAuth
- Concurrent token refresh uses shared promise pattern so multiple API calls hitting refresh simultaneously only trigger one actual refresh request
- Token refresh failure clears stored tokens completely, forcing the user to re-authenticate rather than leaving stale/invalid tokens in storage
- Error responses include HTTP status and body text for debugging Bitbucket API failures

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- npm cache corruption required a full cache clean and node_modules rebuild before packages could install successfully
- Pre-existing type error in `src/main/ai/providers.ts` (LanguageModelV1 vs LanguageModelV2 mismatch) -- not caused by this plan, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Bitbucket backend layer is complete and ready for IPC handler integration (Plan 02)
- Token manager, OAuth flow, and API client can be imported from `src/main/bitbucket/`
- All external HTTP calls are in the main process per the security model

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (2de2cf6, c93229f) verified in git log.

---
*Phase: 03-codereviewbot-plugin*
*Completed: 2026-03-07*
