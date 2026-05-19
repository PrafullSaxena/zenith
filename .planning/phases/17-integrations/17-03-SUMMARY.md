---
phase: 17
plan: "03"
subsystem: integrations
tags: [search, playwright, gemini, web-scraping]
dependency_graph:
  requires: []
  provides: [webSearch, SearchResult, SearchResponse]
  affects: []
tech_stack:
  added: []
  patterns: [two-strategy-fallback, spawn-child-process, headless-browser-scraping]
key_files:
  created:
    - src/main/integrations/search-client.ts
  modified: []
decisions:
  - Used playwright (already in package.json at ^1.50.1) — no new dependency added
  - html.duckduckgo.com used (HTML-only endpoint, no JS engine needed)
  - Regex `/\[[\s\S]*\]/` to extract JSON array from potentially noisy Gemini stdout
  - 30s timeout for Gemini CLI, 20s for Playwright navigation + selector wait
  - Never throws to caller — outermost catch returns skipped:true sentinel
metrics:
  duration_minutes: 3
  completed_date: "2026-05-20"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 17 Plan 03: Web Search Client Summary

Two-strategy web search client using Gemini CLI (primary) with Playwright DuckDuckGo HTML scraping as fallback, exporting typed SearchResponse that never throws.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement search-client.ts | 705e803 | src/main/integrations/search-client.ts |

## What Was Built

`src/main/integrations/search-client.ts` exports:

- **`SearchResult`** — `{ title, url, snippet }` interface
- **`SearchResponse`** — `{ results, skipped, reason, strategy }` interface
- **`webSearch(query)`** — main entry point, always resolves, never rejects
- **`isGeminiAvailable()`** — spawns `which gemini`, returns bool
- **`searchViaGemini(query)`** — spawns `gemini -p "..."`, 30s timeout, regex-extracts JSON array
- **`searchViaPlaywright(query)`** — headless Chromium on html.duckduckgo.com, evaluates `.result` selectors

Strategy flow: Gemini (if available and returns results) → Playwright → error sentinel.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

TypeScript type check: zero errors (`npx tsc --noEmit` clean).

## Self-Check: PASSED

- [x] `src/main/integrations/search-client.ts` — exists (131 lines)
- [x] Commit 705e803 — confirmed
- [x] TypeScript clean — confirmed
