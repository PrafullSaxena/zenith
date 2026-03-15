# Cortex AI Enrichment — Design Spec

**Date:** 2026-03-15
**Status:** Draft
**Approach:** Layered Enrichment (Approach C) — Progressive on-demand with shared context

## Problem

Cortex's analysis pipeline is 100% static parsing (regex/AST). It produces entities, call edges, routes, components, and pipelines — but with no semantic understanding. Entity summaries are empty strings. Call graphs miss dynamic dispatch, event-driven connections, and string-based DI. The HLD document field is empty. Q&A has minimal context (50 entity names, no source code).

AI agents are already integrated for TOON insights and Q&A, but the core analysis data that feeds APIs, Flows, Architecture, and Design tabs has zero AI involvement.

## Solution

Five on-demand AI enrichment layers, all sharing a common AI-refined codebase digest. Each layer is triggered by the user (no automatic AI calls during static analysis). Uses the existing agent infrastructure (agent-store, `startAnalysis` IPC, CLI + API streaming).

## Architecture Overview

```
Static Analysis (existing)
  → AnalysisResult { entities, calls, routes, components, pipelines, stats }
       ↓
First "Enrich" click from any section
  → Pass 1: Static digest assembly (instant)
  → Pass 2: AI digest refinement (streamed, ~5-10s)
  → Cached in ai_digest table
       ↓
Per-section enrichments reuse digest as shared context:
  ├─ Entity Summaries    → Overview, Flows, APIs tooltips
  ├─ Analysis Validator  → APIs, Flows correction review panel
  ├─ HLD Generator       → Design tab streamed document
  └─ Q&A Enhancement     → Automatic (progressive context, FTS retrieval, multi-turn)
```

## Caching Strategy

Separate `ai_enrichment` table — independent from the static `analysis_cache`.

- Keyed by `(repoUrl, branch, commitSha, enrichmentType, agentId)`
- Static re-analysis does NOT destroy AI enrichments (unless commit changes)
- Each enrichment type cached independently — regenerate one without losing others
- Enrichment types: `digest`, `entity_summaries`, `validations`, `hld`

Schema addition to `cache-db.ts`:

```sql
CREATE TABLE IF NOT EXISTS ai_enrichment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repoUrl TEXT NOT NULL,
  branch TEXT NOT NULL,
  commitSha TEXT NOT NULL,
  enrichmentType TEXT NOT NULL,
  agentId TEXT NOT NULL,
  data TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(repoUrl, branch, commitSha, enrichmentType, agentId)
);
```

---

## Phase 1: Codebase Digest Builder (Foundation)

### Purpose
Build a shared, AI-refined context that all downstream enrichments reuse. This is the foundation layer — its quality determines the quality of everything else.

### Two-Pass Approach

**Pass 1 — Static Assembly** (instant, no AI call)

1. **Rank entities by importance:**
   - Controllers/routes: high (define public API)
   - Services: high (business logic)
   - Repositories: medium (data access)
   - Classes with many call edges: high (graph centrality)
   - Utility functions/models: low
   - Select top ~100 entities

2. **Extract source snippets:**
   - For each selected entity, read source file lines `entity.line` to `entity.endLine`
   - Cap at 50 lines per entity
   - Total digest budget: ~15K tokens (~5000 lines depending on language). The token count is the hard constraint; line count is an estimate. If budget is exceeded after ranking, drop lowest-importance entities until under budget.

3. **Package into raw digest:**
   - Entity metadata + source snippets
   - All routes with full paths
   - All call edges
   - Stats summary (files, entities, routes, test coverage)

**Pass 2 — AI Refinement** (streamed, ~5-10s)

Send raw digest to AI with system prompt:

```
You are a codebase analyst. Given the raw parsed data below, produce a refined
codebase digest in TOON format. Your tasks:

1. CLASSIFY — Confirm or correct each entity's kind
2. RANK — Re-rank entities by actual architectural importance
3. CONNECT — Identify missing call edges the static parser missed
4. SUMMARIZE — One-line summary per entity based on actual source
5. ANNOTATE — Flag architectural patterns, entry points, and boundaries
```

AI output format (extended TOON):

```
DIGEST_META|architecture:hexagonal|entryPoints:3|layers:4
DIGEST_ENTITY|id|correctedKind|name|importance:high|summary:Handles user auth...
DIGEST_MISSING_EDGE|fromEntity|toEntity|reason:event-driven via EventBus.publish()
DIGEST_CORRECTION|entityId|field:kind|old:class|new:service|reason:annotated @Service
DIGEST_PATTERN|name:CQRS|entities:CommandHandler,QueryHandler|confidence:high
DIGEST_BOUNDARY|name:API Layer|entities:UserController,OrderController
```

### Caching
- Stored in `ai_enrichment` table with `enrichmentType: 'digest'`
- Keyed by `(repoUrl, branch, commitSha, agentId)`
- Invalidated when commit changes

### Fallback
If no AI agent is configured, Pass 2 is skipped. Raw static digest is used as-is. All enrichment features still work, just with less refined context.

### IPC
- New handler: `cortex:buildDigest(repoUrl, branch)` — builds or returns cached digest
- Progress reported via existing `cortex:analysisProgress` channel as "Building AI context..."

---

## Phase 2: Entity Summaries

### Purpose
Generate one-line descriptions for all entities. The digest (Phase 1) already covers the top ~100; this extends to remaining entities.

### Trigger
"Enrich with AI" button on Overview tab (entity cards) and Flow diagram (node tooltips).

### Flow
1. User clicks "Enrich Entities"
2. If digest doesn't exist → build it first (Phase 1)
3. Identify entities without summaries (outside top 100 from digest)
4. Batch into chunks of ~50 entities per AI call
5. For each batch, send entity metadata + a few lines of surrounding source
6. AI returns TOON: `ENTITY_SUMMARY|entityId|summary:Validates JWT tokens and extracts user claims`
7. Merge summaries into Zustand store's `analysisResult.entities[].summary`
8. Cache in `ai_enrichment` with `enrichmentType: 'entity_summaries'`

### Batching Strategy
- Cloud APIs: 50 entities per batch
- If response truncated or errors: halve batch size and retry
- Progress: "Enriching entities... 50/230"

### Where Summaries Appear
- **OverviewTab** — Entity count cards: summary on hover
- **FlowDiagram** — Flow nodes: summary as subtitle below entity name
- **APIListTab** — Handler column: tooltip with handler entity's summary
- **ArchitectureDashboard** — Static entity graph nodes: summary text

### No Re-summarization
Entities already summarized by the digest are skipped. Only unsummarized entities get batched.

### IPC
- New handler: `cortex:enrichEntities(repoUrl, branch)` — triggers batched summarization
- Streams progress via `cortex:analysisProgress`

---

## Phase 3: Analysis Validator

### Purpose
Surface corrections that AI identifies in the static parser output. AI suggests, user decides — nothing is auto-applied.

### Trigger
"Validate with AI" button on APIs tab and Flows tab.

### Flow
1. User clicks "Validate"
2. If digest doesn't exist → build it first
3. Pull `DIGEST_MISSING_EDGE` and `DIGEST_CORRECTION` entries from cached digest
4. If digest already has corrections → present them directly (no extra AI call)
5. If user clicks "Deep Validate" → focused AI call:
   - Send digest + all current routes + all call edges
   - System prompt asks AI to identify issues

AI output format:

```
MISSING_ROUTE|method|path|handlerEntity|reason:Found @Scheduled endpoint not detected
MISSING_EDGE|fromId|toId|type:event|reason:publishes to EventBus, consumed by OrderListener
KIND_CORRECTION|entityId|old:class|new:repository|reason:extends JpaRepository
ROUTE_CORRECTION|routeIdx|field:fullPath|old:/api/user|new:/api/v1/user|reason:missed class-level @RequestMapping
DEAD_ROUTE|routeIdx|reason:handler method is private, unreachable
```

### UI — Validation Review Panel

```
┌─────────────────────────────────────────────────┐
│  AI Validation Results           3 found  [Apply All]
├─────────────────────────────────────────────────┤
│ ⚠ Missing Edge                     [Accept] [Dismiss]
│   UserService → NotificationService
│   Reason: publishes via EventBus.emit('user.created')
├─────────────────────────────────────────────────┤
│ ⚠ Route Correction                 [Accept] [Dismiss]
│   GET /user → GET /api/v1/user
│   Reason: class-level @RequestMapping("/api/v1") missed
├─────────────────────────────────────────────────┤
│ ℹ Kind Correction                  [Accept] [Dismiss]
│   CacheManager: class → service
│   Reason: annotated @Service, injected by 3 controllers
└─────────────────────────────────────────────────┘
```

### Accept Behavior
- **Missing Edge** → adds `CallEdge` with `type: 'inferred'` to `analysisResult.calls`
- **Missing Route** → adds `RouteInfo` to `analysisResult.routes`
- **Kind Correction** → updates `entity.kind` in the store
- **Route Correction** → updates the route field in the store
- **Dead Route** → soft-deletes the route (adds to a `suppressedRoutes` set in the store). A toast notification appears with an "Undo" button for 5 seconds. Undo removes the route from `suppressedRoutes`. Suppressed routes are persisted alongside other validations.

### Persistence
Accepted corrections stored in `ai_enrichment` with `enrichmentType: 'validations'` as a JSON array of correction objects. On next cache load, accepted corrections are re-applied on top of the static result by matching on entity ID / route index.

**Stale correction handling:** When re-applying corrections after a new static analysis (same commit), each correction is validated before application:
- If the target entity ID no longer exists → skip the correction (it's stale)
- If a route correction's target route index is out of bounds → skip
- If a kind correction's `old` value doesn't match the current entity kind → skip (entity already changed)
- Skipped corrections are logged but not deleted — they remain in cache for reference until the commit changes.

### IPC
- New handler: `cortex:validateAnalysis(repoUrl, branch)` — triggers deep validation
- New handler: `cortex:applyCorrection(repoUrl, branch, correction)` — persists accepted correction
- New handler: `cortex:dismissCorrection(repoUrl, branch, correctionId)` — marks dismissed

---

## Phase 4: HLD Generator

### Purpose
Generate a comprehensive High-Level Design document combining static data, digest insights, and AI narrative. Streamed section by section into the Design tab.

### Trigger
"Generate Design Doc" button on the Design tab.

### Flow
1. User clicks "Generate"
2. If digest doesn't exist → build it first
3. Collect all available context:
   - AI digest (patterns, boundaries, corrected entities)
   - Entity summaries (if enriched)
   - Accepted validations (if any)
   - Static Mermaid diagrams from `doc-generator.ts`
   - Test stats
4. Send to AI with structured system prompt requesting markdown with Mermaid

### Document Structure

```markdown
# {RepoName} — Architecture Document

## 1. Overview
What this system does, primary purpose, key technologies.

## 2. Architecture
Pattern (layered/hexagonal/domain), layer organization.
[Mermaid architecture diagram]

## 3. API Surface
Endpoint groups by domain, auth requirements, request/response patterns.
Route table with handler descriptions from entity summaries.

## 4. Data Flow
Request flow through system — entry point to database.
Per-endpoint flow narratives for top 3-5 important routes.
[Mermaid sequence diagrams]

## 5. Component Interactions
Service dependencies, injection patterns, event-driven connections.
[Mermaid dependency diagram — enhanced with AI-discovered edges]

## 6. Testing Strategy
Coverage, frameworks, untested areas, risk assessment.

## 7. Security & Configuration
Auth mechanisms, config management, secrets handling.

## 8. Deployment Considerations
Inferred from Dockerfile, CI configs, environment variables.
```

### Streaming UX
- Section headers appear immediately, content streams below
- Mermaid blocks render as diagrams when closing ``` is received
- Progress: "Generating design doc... Section 3/8"

### Section-Level Regeneration
- Each section has a "Regenerate" icon button
- Re-sends just that section's context for a fresh take
- Only that section replaced — rest preserved
- The full HLD markdown is stored as a single blob in cache. On section regeneration, the blob is split by `## N.` headers, the target section is replaced, and the full blob is rewritten to cache. This avoids per-section cache complexity while supporting granular regeneration.

### Relationship to Existing `doc-generator.ts`
- Static `doc-generator.ts` still produces Mermaid diagrams
- Included in AI prompt as reference for AI to enhance or replace
- AI output supersedes static doc; static doc remains as no-agent fallback

### Caching
- Full HLD markdown in `ai_enrichment` with `enrichmentType: 'hld'`
- Also written to `analysisResult.documentation` in Zustand store
- Exportable via existing ExportDialog

### IPC
- New handler: `cortex:generateHLDWithAI(repoUrl, branch)` — streams HLD markdown
- New handler: `cortex:regenerateHLDSection(repoUrl, branch, sectionIndex)` — regenerates one section

---

## Phase 5: Q&A Enhancement

### Purpose
Make Q&A progressively smarter as the user enriches more sections. No new triggers — improvements are automatic.

### 5A. Progressive System Prompt

System prompt automatically includes whatever enrichments are available:

```
Base (always):       stats, entity names, routes              ← today
+ If digest exists:  AI-refined digest with summaries, patterns, boundaries
+ If summaries done: all entity summaries (not just top 50)
+ If validations:    accepted corrections + inferred edges
+ If HLD exists:     architecture overview section from HLD
```

Token budget: ~8K tokens total for system prompt. Priority order: digest > summaries > routes > HLD excerpt > raw entity list. Trim from bottom if exceeded.

### 5B. Source-Aware Answers (FTS5 Retrieval)

Before sending each question to AI:

1. Extract keywords from question (split + remove stop words)
2. Run FTS5 search via existing `cortex:searchCode` — top 5 matching snippets
3. Append snippets to user prompt:
   ```
   User question: How does authentication work?

   Relevant code snippets:
   --- src/auth/JwtFilter.java (lines 15-45) ---
   <code>
   --- src/auth/AuthService.java (lines 8-30) ---
   <code>
   ```

The existing `cortex:searchCode` IPC returns `{ filePath, snippet }[]` via FTS5 matching on file content. To get actual source code lines for the AI prompt, the flow is:
1. Call `cortex:searchCode(repoUrl, query)` → get top 5 matching file paths + FTS snippets
2. For each match, call `cortex:getFileContent(repoPath, filePath)` → get full source
3. Extract a window of ~30 lines around the FTS match location
4. Append these code windows to the user prompt

This uses two existing IPC channels — no new infrastructure needed.

### 5C. Multi-Turn Memory

1. Include last 5 Q&A turns in system prompt as conversation context
2. Token budget: ~2K tokens for history, oldest turns trimmed first
3. "Clear conversation" button (existing `clearQA`) resets context
4. Session-scoped only — conversation history lives in Zustand, not persisted

### Summary

| Aspect | Today | After |
|--------|-------|-------|
| System context | 50 entity names + routes | Digest + summaries + patterns + HLD |
| Source code | None | FTS5 retrieval, top 5 snippets per question |
| Memory | Stateless | Last 5 turns in context |
| User action | None | None — automatic |

---

## Implementation Phases

| Phase | Depends On | New Files | Modified Files |
|-------|-----------|-----------|---------------|
| 1. Digest Builder | — | `src/main/cortex/digest-builder.ts` | `cache-db.ts`, `ipc-handlers.ts`, `preload/index.ts` |
| 2. Entity Summaries | Phase 1 | `src/main/cortex/entity-enricher.ts` | `ipc-handlers.ts`, `preload/index.ts`, `cortex-store.ts`, `OverviewTab.tsx`, `FlowDiagram.tsx`, `APIListTab.tsx`, `FlowNode.tsx`, `ArchitectureDashboard.tsx` |
| 3. Analysis Validator | Phase 1 | `src/main/cortex/analysis-validator.ts`, `src/renderer/.../ValidationPanel.tsx` | `ipc-handlers.ts`, `preload/index.ts`, `cortex-store.ts`, `APIListTab.tsx`, `FlowsTab.tsx` |
| 4. HLD Generator | Phase 1 | `src/main/cortex/hld-ai-generator.ts` | `ipc-handlers.ts`, `preload/index.ts`, `cortex-store.ts`, `DesignDocTab.tsx` |
| 5. Q&A Enhancement | Phases 1-4 (progressive) | — | `cortex-store.ts`, `QAPanel.tsx` |

## Shared Infrastructure Changes

### New IPC Channels
- `cortex:buildDigest` — build or return cached digest
- `cortex:enrichEntities` — batch entity summarization
- `cortex:validateAnalysis` — deep analysis validation
- `cortex:applyCorrection` — persist accepted correction
- `cortex:dismissCorrection` — mark correction dismissed
- `cortex:generateHLDWithAI` — stream AI-generated HLD
- `cortex:regenerateHLDSection` — regenerate one HLD section

### Zustand Store Additions (`cortex-store.ts`)
- `digest: DigestResult | null` — cached digest data
- `isDigestBuilding: boolean`
- `entityEnrichmentProgress: { done: number; total: number } | null`
- `validationResults: ValidationCorrection[]`
- `hldSections: { index: number; content: string; isGenerating: boolean }[]`
- Actions: `buildDigest()`, `enrichEntities()`, `validateAnalysis()`, `applyCorrection()`, `dismissCorrection()`, `generateHLD()`, `regenerateHLDSection()`

### Preload Bridge Additions (`preload/index.ts`)
- Mirror all new IPC channels in the `cortex` namespace of `window.api`

## Non-Goals
- No automatic AI calls during static analysis — always on-demand
- No new AI provider integration — uses existing agent-store infrastructure
- No vector/embedding search — FTS5 keyword search is sufficient for now
- No persistent Q&A history — conversations are session-scoped
