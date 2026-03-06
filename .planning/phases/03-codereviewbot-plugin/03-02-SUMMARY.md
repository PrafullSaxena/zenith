---
phase: 03-codereviewbot-plugin
plan: "02"
subsystem: ai
tags: [vercel-ai-sdk, anthropic, google, ollama, openai, streaming, ipc, electron]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Electron shell, IPC handlers, safeStorage credentials store, agent store types"
  - phase: 03-codereviewbot-plugin plan 01
    provides: "Bitbucket types, AI SDK npm dependencies installed"
provides:
  - "AI provider factory mapping agent config IDs to Vercel AI SDK LanguageModel instances"
  - "AI review streaming with IPC forwarding (chunk/done/error channels)"
  - "Cancellable review sessions via AbortController"
  - "API key resolution from safeStorage credentials store"
affects: [03-codereviewbot-plugin plan 03, 03-codereviewbot-plugin plan 04, 05-astropatch]

# Tech tracking
tech-stack:
  added: [ai@6, "@ai-sdk/anthropic@3", "@ai-sdk/google@3", "@ai-sdk/openai@3", ollama-ai-provider@1]
  patterns: [provider-factory, ipc-streaming, abort-controller-cancellation]

key-files:
  created:
    - src/main/ai/providers.ts
    - src/main/ai/stream.ts
  modified: []

key-decisions:
  - "Cast ollama-ai-provider LanguageModelV1 to LanguageModel since ollama-ai-provider has not updated to V3 types yet; runtime compatible"
  - "Guard against destroyed BrowserWindow during streaming to prevent send-after-close crashes"
  - "Suppress AbortError on cancellation to avoid false error events in renderer"

patterns-established:
  - "Provider factory pattern: switch on providerId to construct LanguageModel via SDK-specific createX() functions"
  - "IPC streaming pattern: main process iterates textStream async iterable, forwards chunks via webContents.send()"
  - "Session-based cancellation: Map<sessionId, AbortController> for concurrent review management"

requirements-completed: [CRVW-04, CRVW-05]

# Metrics
duration: 7min
completed: 2026-03-07
---

# Phase 3 Plan 2: AI Streaming Infrastructure Summary

**Vercel AI SDK provider factory with multi-provider support and IPC-based token streaming for code review**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T20:22:12Z
- **Completed:** 2026-03-06T20:29:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Provider factory maps all 6 pre-listed provider IDs (claude, gemini, ollama, codex, opencode, cursor-agent) plus custom providers to Vercel AI SDK LanguageModel instances
- AI review streaming iterates textStream async iterable and forwards tokens via webContents.send with sessionId multiplexing
- Cancellable review sessions via AbortController with proper cleanup
- API keys resolved from safeStorage credentials store in main process (never exposed to renderer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement AI provider factory** - `6af13ab` (feat)
2. **Task 2: Implement AI review streaming with IPC forwarding** - `06586b0` (feat)

## Files Created/Modified
- `src/main/ai/providers.ts` - Provider factory: createModel() maps provider IDs to LanguageModel; getApiKeyForProvider() decrypts keys from safeStorage
- `src/main/ai/stream.ts` - Review streaming: streamReview() orchestrates AI calls and IPC forwarding; cancelReview() aborts sessions mid-flight

## Decisions Made
- Cast ollama-ai-provider V1 return type to LanguageModel since the community package has not updated to V3 types yet; the ai package accepts V1 models at runtime so this is safe
- Added BrowserWindow.isDestroyed() guard before sending IPC events to prevent crashes if the window closes during a streaming review
- Suppress AbortError exceptions during cancellation to prevent false error events reaching the renderer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ollama-ai-provider LanguageModelV1 type mismatch**
- **Found during:** Task 1 (Provider factory implementation)
- **Issue:** ollama-ai-provider exports LanguageModelV1, but ai@6 LanguageModel type expects V3/V2
- **Fix:** Added type cast `as unknown as LanguageModel` with explanatory comment
- **Files modified:** src/main/ai/providers.ts
- **Verification:** TypeScript typecheck passes cleanly
- **Committed in:** 6af13ab (Task 1 commit)

**2. [Rule 2 - Missing Critical] BrowserWindow destroyed guard**
- **Found during:** Task 2 (Stream implementation)
- **Issue:** Plan did not specify guard against sending IPC events to destroyed windows
- **Fix:** Added mainWindow.isDestroyed() check before each webContents.send() call
- **Files modified:** src/main/ai/stream.ts
- **Verification:** Code inspection confirms guard on all send paths
- **Committed in:** 06586b0 (Task 2 commit)

**3. [Rule 2 - Missing Critical] AbortError suppression**
- **Found during:** Task 2 (Stream implementation)
- **Issue:** Cancelling a review would trigger the error handler, sending ai:stream:error to renderer
- **Fix:** Added AbortError name check in catch block to skip error forwarding on cancellation
- **Files modified:** src/main/ai/stream.ts
- **Verification:** Code inspection confirms AbortError is silently handled
- **Committed in:** 06586b0 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness and robustness. No scope creep.

## Issues Encountered
- npm install failed due to pre-existing esbuild binary mismatch in node_modules; resolved by clean reinstall with --ignore-scripts flag (pre-existing environment issue, not caused by this plan)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AI streaming infrastructure ready for integration with Bitbucket diff fetching (plan 03) and review UI (plan 04)
- IPC channels (ai:stream:chunk/done/error) ready for preload bridge extension
- Provider factory supports all configured agent providers

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 03-codereviewbot-plugin*
*Completed: 2026-03-07*
