# Cortex AI Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 layers of on-demand AI enrichment to Cortex's static analysis pipeline — digest builder, entity summaries, analysis validator, HLD generator, and Q&A enhancement.

**Architecture:** A shared codebase digest (built lazily on first enrichment click) provides context to all downstream AI enrichment calls. Each enrichment is on-demand via UI buttons, uses the existing agent-store/streaming infrastructure, and caches results independently in a new `ai_enrichment` SQLite table.

**Tech Stack:** Electron IPC, better-sqlite3, Zustand, React 19, existing AI streaming (`window.api.ai.startAnalysis`), TOON format parsing.

**Spec:** `docs/superpowers/specs/2026-03-15-cortex-ai-enrichment-design.md`

---

## Chunk 1: Shared Infrastructure

This chunk adds the `ai_enrichment` database table, enrichment types, preload bridge methods, and store scaffolding that all 5 phases depend on.

### Task 1: Add `ai_enrichment` table to cache-db

**Files:**
- Modify: `src/main/cortex/cache-db.ts`

- [ ] **Step 1: Add table creation to `initSchema()`**

In `src/main/cortex/cache-db.ts`, add the new table inside the `initSchema()` method's `this.db.exec()` call, after the `ai_insights` table (after line ~69):

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

- [ ] **Step 2: Add `saveEnrichment()` method**

Add after the `clearInsights()` method (~line 346):

```typescript
saveEnrichment(
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string,
  agentId: string,
  data: string
): void {
  this.db
    .prepare(
      `INSERT OR REPLACE INTO ai_enrichment (repoUrl, branch, commitSha, enrichmentType, agentId, data, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(repoUrl, branch, commitSha, enrichmentType, agentId, data)
}
```

- [ ] **Step 3: Add `getEnrichment()` method**

```typescript
getEnrichment(
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string
): string | null {
  const row = this.db
    .prepare(
      'SELECT data FROM ai_enrichment WHERE repoUrl = ? AND branch = ? AND commitSha = ? AND enrichmentType = ? ORDER BY createdAt DESC LIMIT 1'
    )
    .get(repoUrl, branch, commitSha, enrichmentType) as { data: string } | undefined
  return row?.data ?? null
}
```

- [ ] **Step 4: Add `clearEnrichments()` method**

```typescript
clearEnrichments(repoUrl: string, branch: string): void {
  this.db
    .prepare('DELETE FROM ai_enrichment WHERE repoUrl = ? AND branch = ?')
    .run(repoUrl, branch)
}

clearEnrichmentByType(
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string
): void {
  this.db
    .prepare(
      'DELETE FROM ai_enrichment WHERE repoUrl = ? AND branch = ? AND commitSha = ? AND enrichmentType = ?'
    )
    .run(repoUrl, branch, commitSha, enrichmentType)
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/main/cortex/cache-db.ts
git commit -m "feat(cortex): add ai_enrichment table and CRUD methods"
```

---

### Task 2: Add enrichment types to renderer types

**Files:**
- Modify: `src/renderer/src/types/cortex.ts`

- [ ] **Step 1: Add enrichment-related types**

Add at the end of `src/renderer/src/types/cortex.ts`:

```typescript
// ── AI Enrichment types ──────────────────────────────────────────────

export type EnrichmentType = 'digest' | 'entity_summaries' | 'validations' | 'hld'

export interface DigestMeta {
  architecture: string
  entryPoints: number
  layers: number
}

export interface DigestEntity {
  id: string
  correctedKind: string
  name: string
  importance: 'high' | 'medium' | 'low'
  summary: string
}

export interface DigestMissingEdge {
  fromEntity: string
  toEntity: string
  reason: string
}

export interface DigestCorrection {
  entityId: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface DigestPattern {
  name: string
  entities: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface DigestBoundary {
  name: string
  entities: string[]
}

export interface DigestResult {
  meta: DigestMeta | null
  entities: DigestEntity[]
  missingEdges: DigestMissingEdge[]
  corrections: DigestCorrection[]
  patterns: DigestPattern[]
  boundaries: DigestBoundary[]
  rawText: string
}

export type ValidationCorrectionType =
  | 'missing_edge'
  | 'missing_route'
  | 'kind_correction'
  | 'route_correction'
  | 'dead_route'

export interface ValidationCorrection {
  id: string
  type: ValidationCorrectionType
  description: string
  reason: string
  data: Record<string, unknown>
  status: 'pending' | 'accepted' | 'dismissed'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/types/cortex.ts
git commit -m "feat(cortex): add AI enrichment type definitions"
```

---

### Task 3: Add enrichment IPC handlers (scaffold)

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Add digest IPC handlers**

Add after the `cortex:reanalyze` handler (~line 956), before the `cortex:probeRtk` handler:

```typescript
// --- Cortex AI Enrichment ---

// Build or return cached codebase digest
ipcMain.handle(
  'cortex:buildDigest',
  async (event, repoUrl: string, branch: string) => {
    const { analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found. Analyze the repository first.')

    const commitSha = (analysis as Record<string, unknown>).commitSha as string

    // Check for cached digest
    const cached = analyzer.cache.getEnrichment(repoUrl, branch, commitSha, 'digest')
    if (cached) return { data: cached, cached: true }

    // Will be implemented in Phase 1 — for now return null
    return { data: null, cached: false }
  }
)

// Save enrichment data
ipcMain.handle(
  'cortex:saveEnrichment',
  async (
    _event,
    repoUrl: string,
    branch: string,
    commitSha: string,
    enrichmentType: string,
    agentId: string,
    data: string
  ) => {
    const { analyzer } = getCortexInstances()
    analyzer.cache.saveEnrichment(repoUrl, branch, commitSha, enrichmentType, agentId, data)
  }
)

// Get cached enrichment
ipcMain.handle(
  'cortex:getEnrichment',
  async (
    _event,
    repoUrl: string,
    branch: string,
    commitSha: string,
    enrichmentType: string
  ) => {
    const { analyzer } = getCortexInstances()
    return analyzer.cache.getEnrichment(repoUrl, branch, commitSha, enrichmentType)
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat(cortex): add enrichment IPC handler scaffolds"
```

---

### Task 4: Add enrichment methods to preload bridge

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add methods to preload bridge**

In `src/preload/index.ts`, add to the `cortex` object (after the existing cortex methods, before the closing `}`):

```typescript
// AI Enrichment
buildDigest: (
  repoUrl: string,
  branch: string
): Promise<{ data: string | null; cached: boolean }> =>
  ipcRenderer.invoke('cortex:buildDigest', repoUrl, branch),

saveEnrichment: (
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string,
  agentId: string,
  data: string
): Promise<void> =>
  ipcRenderer.invoke(
    'cortex:saveEnrichment',
    repoUrl,
    branch,
    commitSha,
    enrichmentType,
    agentId,
    data
  ),

getEnrichment: (
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string
): Promise<string | null> =>
  ipcRenderer.invoke('cortex:getEnrichment', repoUrl, branch, commitSha, enrichmentType),
```

- [ ] **Step 2: Add type declarations**

In `src/preload/index.d.ts`, add to the `cortex` interface:

```typescript
// AI Enrichment
buildDigest: (
  repoUrl: string,
  branch: string
) => Promise<{ data: string | null; cached: boolean }>
saveEnrichment: (
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string,
  agentId: string,
  data: string
) => Promise<void>
getEnrichment: (
  repoUrl: string,
  branch: string,
  commitSha: string,
  enrichmentType: string
) => Promise<string | null>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat(cortex): add enrichment preload bridge methods"
```

---

### Task 5: Add enrichment state to Zustand store

**Files:**
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Import enrichment types**

Add to the import at the top of `cortex-store.ts`:

```typescript
import type {
  Repository,
  AnalysisResult,
  AnalysisProgress,
  FileContent,
  QAMessage,
  DigestResult,
  ValidationCorrection
} from '../types/cortex'
```

- [ ] **Step 2: Add enrichment state fields to CortexState interface**

Add after the Q&A fields (~line 153):

```typescript
// AI Enrichment
digest: DigestResult | null
isDigestBuilding: boolean
entityEnrichmentProgress: { done: number; total: number } | null
validationResults: ValidationCorrection[]
suppressedRoutes: Set<number>
hldContent: string
hldSections: { index: number; content: string; isGenerating: boolean }[]
isHLDGenerating: boolean
```

- [ ] **Step 3: Add enrichment action signatures to CortexState interface**

Add after the existing action signatures (~line 181):

```typescript
// AI Enrichment actions
setDigest: (digest: DigestResult | null) => void
setIsDigestBuilding: (v: boolean) => void
setEntityEnrichmentProgress: (p: { done: number; total: number } | null) => void
setValidationResults: (results: ValidationCorrection[]) => void
updateValidationStatus: (id: string, status: ValidationCorrection['status']) => void
setSuppressedRoutes: (routes: Set<number>) => void
setHLDContent: (content: string) => void
setHLDSections: (sections: { index: number; content: string; isGenerating: boolean }[]) => void
setIsHLDGenerating: (v: boolean) => void
```

- [ ] **Step 4: Add initial state values**

Add to the `create<CortexState>` initializer (after the Q&A initial values):

```typescript
// AI Enrichment
digest: null,
isDigestBuilding: false,
entityEnrichmentProgress: null,
validationResults: [],
suppressedRoutes: new Set(),
hldContent: '',
hldSections: [],
isHLDGenerating: false,
```

- [ ] **Step 5: Add enrichment action implementations**

Add after the existing action implementations:

```typescript
// AI Enrichment actions
setDigest: (digest) => set({ digest }),
setIsDigestBuilding: (v) => set({ isDigestBuilding: v }),
setEntityEnrichmentProgress: (p) => set({ entityEnrichmentProgress: p }),
setValidationResults: (results) => set({ validationResults: results }),
updateValidationStatus: (id, status) =>
  set((s) => ({
    validationResults: s.validationResults.map((v) =>
      v.id === id ? { ...v, status } : v
    )
  })),
setSuppressedRoutes: (routes) => set({ suppressedRoutes: routes }),
setHLDContent: (content) => set({ hldContent: content }),
setHLDSections: (sections) => set({ hldSections: sections }),
setIsHLDGenerating: (v) => set({ isHLDGenerating: v }),
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/stores/cortex-store.ts
git commit -m "feat(cortex): add enrichment state and actions to Zustand store"
```

---

## Chunk 2: Phase 1 — Codebase Digest Builder

The foundation layer. Builds a shared, AI-refined digest from static analysis + source code that all downstream enrichments reuse.

### Task 6: Create digest TOON parser

**Files:**
- Create: `src/main/cortex/digest-toon-parser.ts`

- [ ] **Step 1: Create the digest TOON parser module**

Create `src/main/cortex/digest-toon-parser.ts`:

```typescript
/**
 * digest-toon-parser.ts — Parses AI-generated digest TOON output into structured data.
 * Extended TOON format with DIGEST_* record types.
 */

export interface DigestMeta {
  architecture: string
  entryPoints: number
  layers: number
}

export interface DigestEntity {
  id: string
  correctedKind: string
  name: string
  importance: 'high' | 'medium' | 'low'
  summary: string
}

export interface DigestMissingEdge {
  fromEntity: string
  toEntity: string
  reason: string
}

export interface DigestCorrection {
  entityId: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface DigestPattern {
  name: string
  entities: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface DigestBoundary {
  name: string
  entities: string[]
}

export interface ParsedDigest {
  meta: DigestMeta | null
  entities: DigestEntity[]
  missingEdges: DigestMissingEdge[]
  corrections: DigestCorrection[]
  patterns: DigestPattern[]
  boundaries: DigestBoundary[]
}

export function parseDigestToon(text: string): ParsedDigest {
  const result: ParsedDigest = {
    meta: null,
    entities: [],
    missingEdges: [],
    corrections: [],
    patterns: [],
    boundaries: []
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = (parts[0] ?? '').toUpperCase()

    switch (type) {
      case 'DIGEST_META': {
        const props = parseKeyValueParts(parts.slice(1))
        result.meta = {
          architecture: props.architecture ?? '',
          entryPoints: parseInt(props.entryPoints ?? '0', 10),
          layers: parseInt(props.layers ?? '0', 10)
        }
        break
      }
      case 'DIGEST_ENTITY': {
        if (parts.length >= 6) {
          const props = parseKeyValueParts(parts.slice(3))
          result.entities.push({
            id: parts[1]?.trim() ?? '',
            correctedKind: parts[2]?.trim() ?? '',
            name: parts[3]?.trim() ?? '',
            importance: (props.importance as DigestEntity['importance']) ?? 'medium',
            summary: props.summary ?? ''
          })
        }
        break
      }
      case 'DIGEST_MISSING_EDGE': {
        if (parts.length >= 4) {
          const props = parseKeyValueParts(parts.slice(3))
          result.missingEdges.push({
            fromEntity: parts[1]?.trim() ?? '',
            toEntity: parts[2]?.trim() ?? '',
            reason: props.reason ?? parts[3]?.trim() ?? ''
          })
        }
        break
      }
      case 'DIGEST_CORRECTION': {
        if (parts.length >= 3) {
          const props = parseKeyValueParts(parts.slice(1))
          result.corrections.push({
            entityId: props.entityId ?? parts[1]?.trim() ?? '',
            field: props.field ?? '',
            oldValue: props.old ?? '',
            newValue: props.new ?? '',
            reason: props.reason ?? ''
          })
        }
        break
      }
      case 'DIGEST_PATTERN': {
        const props = parseKeyValueParts(parts.slice(1))
        result.patterns.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          confidence: (props.confidence as DigestPattern['confidence']) ?? 'medium'
        })
        break
      }
      case 'DIGEST_BOUNDARY': {
        const props = parseKeyValueParts(parts.slice(1))
        result.boundaries.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        })
        break
      }
      default:
        break
    }
  }

  return result
}

/** Parse key:value pairs from pipe-delimited segments */
function parseKeyValueParts(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim()
      const value = part.slice(colonIdx + 1).trim()
      result[key] = value
    }
  }
  return result
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/cortex/digest-toon-parser.ts
git commit -m "feat(cortex): add digest TOON parser for AI-refined digest output"
```

---

### Task 7: Create digest builder module

**Files:**
- Create: `src/main/cortex/digest-builder.ts`

- [ ] **Step 1: Create the digest builder**

Create `src/main/cortex/digest-builder.ts`:

```typescript
/**
 * digest-builder.ts — Two-pass codebase digest builder.
 * Pass 1: Static assembly — ranks entities, extracts source snippets.
 * Pass 2: AI refinement — sends digest to AI for classification, correction, summarization.
 */
import fs from 'fs/promises'
import path from 'path'
import type { AnalyzerDatabase } from './cache-db'
import type { GitService } from './git-service'

/** Max tokens for the digest (hard constraint). ~4 chars per token heuristic. */
const MAX_DIGEST_TOKENS = 15000
const CHARS_PER_TOKEN = 4
const MAX_DIGEST_CHARS = MAX_DIGEST_TOKENS * CHARS_PER_TOKEN

/** Max source lines per entity */
const MAX_LINES_PER_ENTITY = 50

/** Max entities to include in digest */
const MAX_ENTITIES = 100

interface CodeEntity {
  id: string
  name: string
  kind: string
  filePath: string
  line: number
  endLine: number
  decorators: string[]
  parameters: { name: string; type: string }[]
  returnType: string
  summary: string
  parentId: string | null
}

interface CallEdge {
  id: string
  callerId: string
  calleeId: string
  filePath: string
  line: number
  type: string
}

interface RouteInfo {
  method: string
  path: string
  handlerName: string
  controllerName: string
  filePath: string
  line: number
  fullPath: string
}

interface AnalysisData {
  repoType: string
  framework: string
  language: string
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
  stats: {
    totalFiles: number
    totalLines: number
    routeCount: number
    entityCount: { kind: string; count: number }[]
  }
  testStats: { testFiles: number; testCount: number; fileCoveredPct: number }
}

const KIND_PRIORITY: Record<string, number> = {
  controller: 100,
  'web-adapter': 95,
  service: 90,
  'port-in': 85,
  'port-out': 80,
  repository: 70,
  'db-adapter': 65,
  middleware: 60,
  filter: 55,
  configuration: 50,
  class: 30,
  method: 20,
  function: 15,
  component: 40,
  model: 25,
  decorator: 10,
  dag: 45,
  task: 35
}

function scoreEntity(entity: CodeEntity, edgeCounts: Map<string, number>): number {
  const kindScore = KIND_PRIORITY[entity.kind] ?? 10
  const edgeScore = Math.min((edgeCounts.get(entity.id) ?? 0) * 5, 50)
  // Top-level entities (parentId === null) rank higher
  const topLevelBonus = entity.parentId === null ? 20 : 0
  return kindScore + edgeScore + topLevelBonus
}

/**
 * Pass 1: Build the raw static digest from analysis data + source code.
 */
export async function buildStaticDigest(
  analysis: AnalysisData,
  repoPath: string,
  git: GitService
): Promise<string> {
  // Count edges per entity for centrality scoring
  const edgeCounts = new Map<string, number>()
  for (const edge of analysis.calls) {
    edgeCounts.set(edge.callerId, (edgeCounts.get(edge.callerId) ?? 0) + 1)
    edgeCounts.set(edge.calleeId, (edgeCounts.get(edge.calleeId) ?? 0) + 1)
  }

  // Score and rank entities
  const scored = analysis.entities
    .map((e) => ({ entity: e, score: scoreEntity(e, edgeCounts) }))
    .sort((a, b) => b.score - a.score)

  // Build digest within token budget
  const lines: string[] = []
  let charCount = 0

  // Stats header
  const statsLine = `DIGEST_STAT|totalFiles:${analysis.stats.totalFiles}|totalEntities:${analysis.entities.length}|routes:${analysis.stats.routeCount}|testCoverage:${Math.round(analysis.testStats.fileCoveredPct)}%|framework:${analysis.framework}|language:${analysis.language}|repoType:${analysis.repoType}`
  lines.push(statsLine)
  charCount += statsLine.length

  // Routes
  for (const route of analysis.routes) {
    const routeLine = `DIGEST_ROUTE|${route.method}|${route.fullPath}|${route.handlerName}|${route.controllerName}`
    if (charCount + routeLine.length > MAX_DIGEST_CHARS) break
    lines.push(routeLine)
    charCount += routeLine.length
  }

  // Call edges (compact)
  for (const edge of analysis.calls) {
    const edgeLine = `DIGEST_EDGE|${edge.callerId}|${edge.calleeId}|${edge.type}`
    if (charCount + edgeLine.length > MAX_DIGEST_CHARS) break
    lines.push(edgeLine)
    charCount += edgeLine.length
  }

  // Entities with source snippets
  let entityCount = 0
  for (const { entity } of scored) {
    if (entityCount >= MAX_ENTITIES) break
    if (charCount >= MAX_DIGEST_CHARS) break

    // Entity header
    const entityHeader = `DIGEST_ENTITY|${entity.id}|${entity.kind}|${entity.name}|${entity.filePath}|lines:${entity.line}-${entity.endLine}`
    lines.push(entityHeader)
    charCount += entityHeader.length

    // Try to read source snippet
    try {
      const content = await git.getFileContent(repoPath, entity.filePath)
      const sourceLines = content.split('\n')
      const startLine = Math.max(0, entity.line - 1)
      const endLine = Math.min(sourceLines.length, entity.endLine)
      const snippetLines = sourceLines.slice(startLine, Math.min(endLine, startLine + MAX_LINES_PER_ENTITY))
      const snippet = snippetLines.join('\n')

      if (charCount + snippet.length + 10 < MAX_DIGEST_CHARS) {
        lines.push('```')
        lines.push(snippet)
        lines.push('```')
        charCount += snippet.length + 10
      }
    } catch {
      // File not readable — skip snippet
    }

    entityCount++
  }

  return lines.join('\n')
}

/**
 * Build the system prompt for Pass 2 AI refinement.
 */
export function buildDigestRefinementPrompt(): string {
  return `You are a codebase analyst. Given the raw parsed data below, produce a refined codebase digest in TOON format. Use ONLY these record types, one per line, pipe-delimited:

DIGEST_META|architecture:<pattern>|entryPoints:<count>|layers:<count>
DIGEST_ENTITY|<entityId>|<correctedKind>|<name>|importance:<high|medium|low>|summary:<one-line description>
DIGEST_MISSING_EDGE|<fromEntityId>|<toEntityId>|reason:<why this connection exists>
DIGEST_CORRECTION|entityId:<id>|field:<fieldName>|old:<oldValue>|new:<newValue>|reason:<why>
DIGEST_PATTERN|name:<patternName>|entities:<comma-separated>|confidence:<high|medium|low>
DIGEST_BOUNDARY|name:<layerName>|entities:<comma-separated>

Your tasks:
1. CLASSIFY — Confirm or correct each entity's kind based on its actual source code
2. CONNECT — Identify missing call edges the static parser likely missed (dynamic dispatch, events, string-based DI)
3. SUMMARIZE — Write a one-line summary per entity based on the actual source code shown
4. ANNOTATE — Flag architectural patterns and layer boundaries

Rules:
- Output ONLY TOON records. No prose, no markdown, no explanations.
- One record per line.
- Use pipe | as delimiter.
- For DIGEST_ENTITY, include ALL entities from the input (not just corrected ones).
- For DIGEST_MISSING_EDGE, only include edges you are confident about from the source code.`
}

/**
 * Build the user prompt containing the raw digest.
 */
export function buildDigestUserPrompt(rawDigest: string): string {
  return `Analyze this codebase digest and produce the refined TOON output:\n\n${rawDigest}`
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/cortex/digest-builder.ts
git commit -m "feat(cortex): add digest builder with entity ranking and source extraction"
```

---

### Task 8: Wire digest builder into IPC handler

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Import digest builder**

Add to imports at the top of `src/main/ipc-handlers.ts`:

```typescript
import { buildStaticDigest, buildDigestRefinementPrompt, buildDigestUserPrompt } from './cortex/digest-builder'
```

- [ ] **Step 2: Replace the scaffold `cortex:buildDigest` handler**

Replace the scaffold handler (from Task 3) with the full implementation:

```typescript
// Build or return cached codebase digest
ipcMain.handle(
  'cortex:buildDigest',
  async (event, repoUrl: string, branch: string) => {
    const { git, analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found. Analyze the repository first.')

    const typedAnalysis = analysis as Record<string, unknown>
    const commitSha = typedAnalysis.commitSha as string

    // Check for cached digest
    const cached = analyzer.cache.getEnrichment(repoUrl, branch, commitSha, 'digest')
    if (cached) return { data: cached, cached: true }

    // Pass 1: Build static digest
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.webContents.send('cortex:analysisProgress', {
      phase: 'enriching',
      progress: 10,
      detail: 'Building AI context...',
      filesProcessed: 0,
      totalFiles: 0
    })

    const repoPath = typedAnalysis.repoType
      ? (analyzer.cache.getLatestAnalysis(repoUrl, branch) as Record<string, unknown> | null)
      : null
    // Get repoPath from repos table
    const repos = analyzer.cache.listRepos()
    const repo = repos.find((r) => r.url === repoUrl && r.branch === branch)
    if (!repo) throw new Error('Repository not found in database')

    const rawDigest = await buildStaticDigest(
      typedAnalysis as unknown as Parameters<typeof buildStaticDigest>[0],
      repo.repoPath,
      git
    )

    win?.webContents.send('cortex:analysisProgress', {
      phase: 'enriching',
      progress: 30,
      detail: 'Static digest built, preparing AI refinement...',
      filesProcessed: 0,
      totalFiles: 0
    })

    // Return raw digest + prompts for renderer to stream via AI
    const systemPrompt = buildDigestRefinementPrompt()
    const userPrompt = buildDigestUserPrompt(rawDigest)

    return {
      data: null,
      cached: false,
      rawDigest,
      systemPrompt,
      userPrompt,
      commitSha
    }
  }
)
```

- [ ] **Step 3: Update preload types for the richer return**

In `src/preload/index.d.ts`, update the `buildDigest` return type:

```typescript
buildDigest: (
  repoUrl: string,
  branch: string
) => Promise<{
  data: string | null
  cached: boolean
  rawDigest?: string
  systemPrompt?: string
  userPrompt?: string
  commitSha?: string
}>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/index.d.ts
git commit -m "feat(cortex): wire digest builder into IPC with AI refinement prompts"
```

---

### Task 9: Add `buildDigest()` action to store with AI streaming

**Files:**
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Import the digest TOON parser types**

The renderer needs a lightweight TOON parser. Add a `parseDigestToon` function inside `cortex-store.ts` (similar to how `parseToonResponseRenderer` already exists in the same file). Add after the `parseToonResponseRenderer` function:

```typescript
// ── Lightweight renderer-side Digest TOON parser ─────────────────────

function parseDigestToonRenderer(text: string): DigestResult {
  const result: DigestResult = {
    meta: null,
    entities: [],
    missingEdges: [],
    corrections: [],
    patterns: [],
    boundaries: [],
    rawText: text
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = (parts[0] ?? '').toUpperCase()

    switch (type) {
      case 'DIGEST_META': {
        const props = parseKV(parts.slice(1))
        result.meta = {
          architecture: props.architecture ?? '',
          entryPoints: parseInt(props.entryPoints ?? '0', 10),
          layers: parseInt(props.layers ?? '0', 10)
        }
        break
      }
      case 'DIGEST_ENTITY': {
        if (parts.length >= 4) {
          const props = parseKV(parts.slice(4))
          result.entities.push({
            id: parts[1]?.trim() ?? '',
            correctedKind: parts[2]?.trim() ?? '',
            name: parts[3]?.trim() ?? '',
            importance: (props.importance ?? 'medium') as 'high' | 'medium' | 'low',
            summary: props.summary ?? ''
          })
        }
        break
      }
      case 'DIGEST_MISSING_EDGE': {
        if (parts.length >= 3) {
          const props = parseKV(parts.slice(3))
          result.missingEdges.push({
            fromEntity: parts[1]?.trim() ?? '',
            toEntity: parts[2]?.trim() ?? '',
            reason: props.reason ?? ''
          })
        }
        break
      }
      case 'DIGEST_CORRECTION': {
        const props = parseKV(parts.slice(1))
        result.corrections.push({
          entityId: props.entityId ?? '',
          field: props.field ?? '',
          oldValue: props.old ?? '',
          newValue: props.new ?? '',
          reason: props.reason ?? ''
        })
        break
      }
      case 'DIGEST_PATTERN': {
        const props = parseKV(parts.slice(1))
        result.patterns.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          confidence: (props.confidence ?? 'medium') as 'high' | 'medium' | 'low'
        })
        break
      }
      case 'DIGEST_BOUNDARY': {
        const props = parseKV(parts.slice(1))
        result.boundaries.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        })
        break
      }
      default:
        break
    }
  }

  return result
}

function parseKV(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx > 0) {
      result[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
    }
  }
  return result
}
```

- [ ] **Step 2: Add `buildDigest` action implementation**

Add the `buildDigest` action to the store (after the enrichment action stubs from Task 5):

```typescript
buildDigest: async () => {
  const state = get()
  const repo = state.repos.find((r) => r.id === state.activeRepoId)
  if (!repo) return

  const agent = getCortexAgent()
  set({ isDigestBuilding: true })

  try {
    const response = await window.api.cortex.buildDigest(repo.url, repo.branch)

    // If cached, parse and set immediately
    if (response.cached && response.data) {
      const parsed = parseDigestToonRenderer(response.data)
      set({ digest: parsed, isDigestBuilding: false })
      return
    }

    // No agent configured — use raw digest as fallback (no AI refinement)
    if (!agent) {
      const fallback: DigestResult = {
        meta: null,
        entities: [],
        missingEdges: [],
        corrections: [],
        patterns: [],
        boundaries: [],
        rawText: response.rawDigest ?? ''
      }
      set({ digest: fallback, isDigestBuilding: false })
      return
    }

    // Pass 2: Stream AI refinement
    const sessionId = crypto.randomUUID()
    let accumulated = ''

    window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
      if (sid !== sessionId) return
      accumulated += chunk
      const partial = parseDigestToonRenderer(accumulated)
      set({ digest: partial })
    })

    window.api.ai.onStreamDone(({ sessionId: sid }) => {
      if (sid !== sessionId) return
      const final = parseDigestToonRenderer(accumulated)
      set({ digest: final, isDigestBuilding: false })
      // Cache the result
      if (response.commitSha) {
        window.api.cortex.saveEnrichment(
          repo.url,
          repo.branch,
          response.commitSha,
          'digest',
          agent.providerId,
          accumulated
        )
      }
      window.api.ai.removeStreamListeners()
    })

    window.api.ai.onStreamError(({ sessionId: sid }) => {
      if (sid !== sessionId) return
      // Fallback to raw digest on error
      const fallback: DigestResult = {
        meta: null,
        entities: [],
        missingEdges: [],
        corrections: [],
        patterns: [],
        boundaries: [],
        rawText: response.rawDigest ?? ''
      }
      set({ digest: fallback, isDigestBuilding: false })
      window.api.ai.removeStreamListeners()
    })

    await window.api.ai.startAnalysis(
      agent.providerId,
      agent.model,
      response.systemPrompt!,
      response.userPrompt!,
      sessionId,
      agent.command
    )
  } catch (err) {
    set({ isDigestBuilding: false })
  }
},
```

- [ ] **Step 3: Add `buildDigest` to the CortexState interface action signatures**

Add to the action signatures in the interface:

```typescript
buildDigest: () => Promise<void>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/cortex-store.ts
git commit -m "feat(cortex): implement buildDigest store action with AI streaming"
```

---

## Chunk 3: Phase 2 — Entity Summaries

Extends the digest's top-100 entity summaries to cover ALL entities via batched AI calls.

### Task 10: Create entity enricher module

**Files:**
- Create: `src/main/cortex/entity-enricher.ts`

- [ ] **Step 1: Create the entity enricher**

Create `src/main/cortex/entity-enricher.ts`:

```typescript
/**
 * entity-enricher.ts — Builds prompts for batched entity summary generation.
 * Entities already summarized by the digest are skipped.
 */
import type { GitService } from './git-service'

interface CodeEntity {
  id: string
  name: string
  kind: string
  filePath: string
  line: number
  endLine: number
  summary: string
}

const BATCH_SIZE = 50
const MAX_CONTEXT_LINES = 10

export interface EntityBatch {
  entities: CodeEntity[]
  systemPrompt: string
  userPrompt: string
}

/**
 * Build batches of unsummarized entities with their prompts.
 */
export async function buildEntityBatches(
  entities: CodeEntity[],
  existingSummaryIds: Set<string>,
  repoPath: string,
  git: GitService
): Promise<EntityBatch[]> {
  // Filter to entities without summaries
  const unsummarized = entities.filter(
    (e) => !e.summary && !existingSummaryIds.has(e.id)
  )

  if (unsummarized.length === 0) return []

  const systemPrompt = `You are a codebase analyst. For each entity below, generate a concise one-line summary describing what it does.

Output format — one record per line, pipe-delimited:
ENTITY_SUMMARY|<entityId>|summary:<one-line description>

Rules:
- Output ONLY ENTITY_SUMMARY records. No prose, no markdown.
- Every entity in the input MUST have a corresponding output line.
- Summaries should be 5-15 words, describing the entity's purpose.
- Use present tense ("Handles...", "Validates...", "Stores...").`

  const batches: EntityBatch[] = []

  for (let i = 0; i < unsummarized.length; i += BATCH_SIZE) {
    const batch = unsummarized.slice(i, i + BATCH_SIZE)
    const entityLines: string[] = []

    for (const entity of batch) {
      let contextSnippet = ''
      try {
        const content = await git.getFileContent(repoPath, entity.filePath)
        const lines = content.split('\n')
        const start = Math.max(0, entity.line - 1)
        const end = Math.min(lines.length, start + MAX_CONTEXT_LINES)
        contextSnippet = lines.slice(start, end).join('\n')
      } catch {
        // Skip source context if unreadable
      }

      entityLines.push(`ENTITY|${entity.id}|${entity.kind}|${entity.name}|${entity.filePath}`)
      if (contextSnippet) {
        entityLines.push('```')
        entityLines.push(contextSnippet)
        entityLines.push('```')
      }
    }

    batches.push({
      entities: batch,
      systemPrompt,
      userPrompt: `Generate summaries for these ${batch.length} entities:\n\n${entityLines.join('\n')}`
    })
  }

  return batches
}

/**
 * Parse entity summary TOON response.
 */
export function parseEntitySummaries(
  text: string
): Map<string, string> {
  const summaries = new Map<string, string>()

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('ENTITY_SUMMARY')) continue

    const parts = line.split('|')
    if (parts.length >= 3) {
      const entityId = parts[1]?.trim() ?? ''
      const summaryPart = parts.slice(2).join('|')
      const summaryMatch = summaryPart.match(/summary:(.+)/)
      const summary = summaryMatch ? summaryMatch[1].trim() : summaryPart.trim()
      if (entityId && summary) {
        summaries.set(entityId, summary)
      }
    }
  }

  return summaries
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/cortex/entity-enricher.ts
git commit -m "feat(cortex): add entity enricher with batched prompt builder"
```

---

### Task 11: Add entity enrichment IPC handler

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Import entity enricher**

Add to imports in `src/main/ipc-handlers.ts`:

```typescript
import { buildEntityBatches } from './cortex/entity-enricher'
```

- [ ] **Step 2: Add IPC handler**

Add after the existing enrichment handlers:

```typescript
// Build entity summary batches for AI processing
ipcMain.handle(
  'cortex:buildEntityBatches',
  async (_event, repoUrl: string, branch: string, existingSummaryIds: string[]) => {
    const { git, analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found.')

    const typedAnalysis = analysis as Record<string, unknown>
    const entities = typedAnalysis.entities as Array<{
      id: string; name: string; kind: string; filePath: string;
      line: number; endLine: number; summary: string
    }>

    const repos = analyzer.cache.listRepos()
    const repo = repos.find((r) => r.url === repoUrl && r.branch === branch)
    if (!repo) throw new Error('Repository not found')

    const batches = await buildEntityBatches(
      entities,
      new Set(existingSummaryIds),
      repo.repoPath,
      git
    )

    return batches.map((b) => ({
      entityIds: b.entities.map((e) => e.id),
      systemPrompt: b.systemPrompt,
      userPrompt: b.userPrompt
    }))
  }
)
```

- [ ] **Step 3: Add preload bridge method**

In `src/preload/index.ts`, add to cortex object:

```typescript
buildEntityBatches: (
  repoUrl: string,
  branch: string,
  existingSummaryIds: string[]
): Promise<Array<{ entityIds: string[]; systemPrompt: string; userPrompt: string }>> =>
  ipcRenderer.invoke('cortex:buildEntityBatches', repoUrl, branch, existingSummaryIds),
```

- [ ] **Step 4: Add type declaration**

In `src/preload/index.d.ts`, add to cortex interface:

```typescript
buildEntityBatches: (
  repoUrl: string,
  branch: string,
  existingSummaryIds: string[]
) => Promise<Array<{ entityIds: string[]; systemPrompt: string; userPrompt: string }>>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat(cortex): add entity batch enrichment IPC handler"
```

---

### Task 12: Add `enrichEntities()` store action

**Files:**
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Add entity summary parser**

Add after the `parseDigestToonRenderer` function:

```typescript
function parseEntitySummariesRenderer(text: string): Map<string, string> {
  const summaries = new Map<string, string>()
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('ENTITY_SUMMARY')) continue
    const parts = line.split('|')
    if (parts.length >= 3) {
      const entityId = parts[1]?.trim() ?? ''
      const summaryPart = parts.slice(2).join('|')
      const match = summaryPart.match(/summary:(.+)/)
      const summary = match ? match[1].trim() : summaryPart.trim()
      if (entityId && summary) summaries.set(entityId, summary)
    }
  }
  return summaries
}
```

- [ ] **Step 2: Add `enrichEntities` action**

```typescript
enrichEntities: async () => {
  const state = get()
  const repo = state.repos.find((r) => r.id === state.activeRepoId)
  if (!repo || !state.analysisResult) return

  const agent = getCortexAgent()
  if (!agent) return

  // Build digest first if needed
  if (!state.digest) {
    await get().buildDigest()
  }

  // Collect IDs already summarized by digest
  const digestSummaryIds = (get().digest?.entities ?? [])
    .filter((e) => e.summary)
    .map((e) => e.id)

  // Also collect IDs already summarized in analysisResult
  const alreadySummarized = state.analysisResult.entities
    .filter((e) => e.summary)
    .map((e) => e.id)

  const existingIds = [...new Set([...digestSummaryIds, ...alreadySummarized])]

  // Get batches from main process
  const batches = await window.api.cortex.buildEntityBatches(
    repo.url,
    repo.branch,
    existingIds
  )

  if (batches.length === 0) {
    set({ entityEnrichmentProgress: null })
    return
  }

  const totalEntities = batches.reduce((sum, b) => sum + b.entityIds.length, 0)
  let completedEntities = 0
  const allSummaries = new Map<string, string>()

  set({ entityEnrichmentProgress: { done: 0, total: totalEntities } })

  // Process batches sequentially
  for (const batch of batches) {
    const sessionId = crypto.randomUUID()
    let accumulated = ''

    await new Promise<void>((resolve) => {
      window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
        if (sid !== sessionId) return
        accumulated += chunk
      })

      window.api.ai.onStreamDone(({ sessionId: sid }) => {
        if (sid !== sessionId) return
        const batchSummaries = parseEntitySummariesRenderer(accumulated)
        for (const [id, summary] of batchSummaries) {
          allSummaries.set(id, summary)
        }
        completedEntities += batch.entityIds.length
        set({ entityEnrichmentProgress: { done: completedEntities, total: totalEntities } })
        window.api.ai.removeStreamListeners()
        resolve()
      })

      window.api.ai.onStreamError(({ sessionId: sid }) => {
        if (sid !== sessionId) return
        completedEntities += batch.entityIds.length
        set({ entityEnrichmentProgress: { done: completedEntities, total: totalEntities } })
        window.api.ai.removeStreamListeners()
        resolve()
      })

      window.api.ai.startAnalysis(
        agent.providerId,
        agent.model,
        batch.systemPrompt,
        batch.userPrompt,
        sessionId,
        agent.command
      )
    })
  }

  // Merge summaries into analysisResult
  const currentResult = get().analysisResult
  if (currentResult) {
    const updatedEntities = currentResult.entities.map((e) => {
      const summary = allSummaries.get(e.id) ?? e.summary
      return summary !== e.summary ? { ...e, summary } : e
    })
    set({
      analysisResult: { ...currentResult, entities: updatedEntities },
      entityEnrichmentProgress: null
    })
  }

  // Cache all summaries
  const summaryData = JSON.stringify(Object.fromEntries(allSummaries))
  window.api.cortex.saveEnrichment(
    repo.url,
    repo.branch,
    repo.commitSha,
    'entity_summaries',
    agent.providerId,
    summaryData
  )
},
```

- [ ] **Step 3: Add action signature to interface**

```typescript
enrichEntities: () => Promise<void>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/cortex-store.ts
git commit -m "feat(cortex): implement enrichEntities store action with batched AI calls"
```

---

### Task 13: Add "Enrich with AI" button to OverviewTab

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx`

- [ ] **Step 1: Add the enrich button to OverviewTab**

Read the current `OverviewTab.tsx` file first. Then add an "Enrich with AI" button in the header area. Add the following near the top of the component's return JSX (in the header/toolbar area):

```tsx
const enrichEntities = useCortexStore((s) => s.enrichEntities)
const entityEnrichmentProgress = useCortexStore((s) => s.entityEnrichmentProgress)
const isDigestBuilding = useCortexStore((s) => s.isDigestBuilding)
```

Add an enrich button in the header:

```tsx
<button
  type="button"
  onClick={() => enrichEntities()}
  disabled={!!entityEnrichmentProgress || isDigestBuilding}
  className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
>
  <Sparkles size={12} />
  {entityEnrichmentProgress
    ? `Enriching... ${entityEnrichmentProgress.done}/${entityEnrichmentProgress.total}`
    : isDigestBuilding
      ? 'Building AI context...'
      : 'Enrich with AI'}
</button>
```

Import `Sparkles` from `lucide-react`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/OverviewTab.tsx
git commit -m "feat(cortex): add Enrich with AI button to OverviewTab"
```

---

### Task 14: Show entity summaries in FlowNode tooltips

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowNode.tsx`

- [ ] **Step 1: Add summary display to FlowNode**

Read `FlowNode.tsx` first. The `FlowNodeData` type (from `types/cortex.ts`) already has a `summary` field. Add a subtitle line in the node rendering that shows `data.summary` when it's non-empty:

```tsx
{data.summary && (
  <p className="mt-0.5 truncate text-[9px] text-text-secondary/70" title={data.summary}>
    {data.summary}
  </p>
)}
```

Add this after the entity name label inside the node.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/FlowNode.tsx
git commit -m "feat(cortex): show entity summaries in flow diagram nodes"
```

---

## Chunk 4: Phase 3 — Analysis Validator

AI reviews static parser output and suggests corrections. User accepts or dismisses each.

### Task 15: Create analysis validator module

**Files:**
- Create: `src/main/cortex/analysis-validator.ts`

- [ ] **Step 1: Create the validator module**

Create `src/main/cortex/analysis-validator.ts`:

```typescript
/**
 * analysis-validator.ts — Builds prompts for AI analysis validation.
 * AI reviews routes, call edges, and entity kinds for corrections.
 */

export function buildValidationPrompt(): string {
  return `You are a codebase analyst reviewing the output of a static code parser. The parser uses regex/AST and sometimes misses or misclassifies things. Review the data below and identify issues.

Output format — one record per line, pipe-delimited:
MISSING_ROUTE|<method>|<path>|<handlerEntity>|reason:<explanation>
MISSING_EDGE|<fromEntityId>|<toEntityId>|type:<call|event|inject>|reason:<explanation>
KIND_CORRECTION|<entityId>|old:<currentKind>|new:<correctKind>|reason:<explanation>
ROUTE_CORRECTION|<routeIndex>|field:<fieldName>|old:<currentValue>|new:<correctValue>|reason:<explanation>
DEAD_ROUTE|<routeIndex>|reason:<explanation>

Rules:
- Output ONLY the record types above. No prose, no markdown.
- Only report issues you are confident about based on the source code shown.
- routeIndex is the 0-based index in the routes array provided.
- For MISSING_EDGE, the type should be 'event' for event-driven, 'inject' for DI, 'call' for direct calls.
- Be conservative — false positives waste the developer's time.`
}

export function buildValidationUserPrompt(
  digestText: string,
  routes: string,
  edges: string
): string {
  return `Review this codebase analysis for errors and missing data:

## Digest (entity source + metadata)
${digestText}

## Current Routes
${routes}

## Current Call Edges
${edges}

Identify any issues (missing routes, missing edges, wrong entity kinds, wrong route paths, dead routes).`
}

export interface ParsedValidation {
  type: 'missing_route' | 'missing_edge' | 'kind_correction' | 'route_correction' | 'dead_route'
  data: Record<string, string>
  reason: string
  raw: string
}

export function parseValidationResponse(text: string): ParsedValidation[] {
  const results: ParsedValidation[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = parts[0]?.toUpperCase() ?? ''

    switch (type) {
      case 'MISSING_ROUTE': {
        if (parts.length >= 5) {
          const props = parseKV(parts.slice(3))
          results.push({
            type: 'missing_route',
            data: { method: parts[1]?.trim() ?? '', path: parts[2]?.trim() ?? '', handler: parts[3]?.trim() ?? '' },
            reason: props.reason ?? '',
            raw: line
          })
        }
        break
      }
      case 'MISSING_EDGE': {
        if (parts.length >= 4) {
          const props = parseKV(parts.slice(3))
          results.push({
            type: 'missing_edge',
            data: { from: parts[1]?.trim() ?? '', to: parts[2]?.trim() ?? '', edgeType: props.type ?? 'call' },
            reason: props.reason ?? '',
            raw: line
          })
        }
        break
      }
      case 'KIND_CORRECTION': {
        if (parts.length >= 2) {
          const props = parseKV(parts.slice(1))
          results.push({
            type: 'kind_correction',
            data: { entityId: parts[1]?.trim() ?? '', old: props.old ?? '', new: props.new ?? '' },
            reason: props.reason ?? '',
            raw: line
          })
        }
        break
      }
      case 'ROUTE_CORRECTION': {
        if (parts.length >= 2) {
          const props = parseKV(parts.slice(1))
          results.push({
            type: 'route_correction',
            data: { routeIndex: parts[1]?.trim() ?? '', field: props.field ?? '', old: props.old ?? '', new: props.new ?? '' },
            reason: props.reason ?? '',
            raw: line
          })
        }
        break
      }
      case 'DEAD_ROUTE': {
        if (parts.length >= 2) {
          const props = parseKV(parts.slice(1))
          results.push({
            type: 'dead_route',
            data: { routeIndex: parts[1]?.trim() ?? '' },
            reason: props.reason ?? '',
            raw: line
          })
        }
        break
      }
      default:
        break
    }
  }

  return results
}

function parseKV(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx > 0) {
      result[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
    }
  }
  return result
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/cortex/analysis-validator.ts
git commit -m "feat(cortex): add analysis validator prompt builder and TOON parser"
```

---

### Task 16: Add validation IPC handler and preload bridge

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Import validator**

Add to imports in `ipc-handlers.ts`:

```typescript
import { buildValidationPrompt, buildValidationUserPrompt } from './cortex/analysis-validator'
```

- [ ] **Step 2: Add validation IPC handler**

```typescript
// Build validation prompts for AI review
ipcMain.handle(
  'cortex:buildValidationPrompts',
  async (_event, repoUrl: string, branch: string, digestText: string) => {
    const { analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found.')

    const typedAnalysis = analysis as Record<string, unknown>
    const routes = typedAnalysis.routes as Array<Record<string, unknown>>
    const calls = typedAnalysis.calls as Array<Record<string, unknown>>

    const routesText = routes
      .map((r, i) => `[${i}] ${r.method} ${r.fullPath} → ${r.handlerName} (${r.controllerName})`)
      .join('\n')

    const edgesText = calls
      .map((c) => `${c.callerId} → ${c.calleeId} (${c.type})`)
      .join('\n')

    return {
      systemPrompt: buildValidationPrompt(),
      userPrompt: buildValidationUserPrompt(digestText, routesText, edgesText),
      commitSha: typedAnalysis.commitSha as string
    }
  }
)
```

- [ ] **Step 3: Add preload bridge + types**

In `src/preload/index.ts`:

```typescript
buildValidationPrompts: (
  repoUrl: string,
  branch: string,
  digestText: string
): Promise<{ systemPrompt: string; userPrompt: string; commitSha: string }> =>
  ipcRenderer.invoke('cortex:buildValidationPrompts', repoUrl, branch, digestText),
```

In `src/preload/index.d.ts`:

```typescript
buildValidationPrompts: (
  repoUrl: string,
  branch: string,
  digestText: string
) => Promise<{ systemPrompt: string; userPrompt: string; commitSha: string }>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/main/cortex/analysis-validator.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat(cortex): add validation IPC handler and preload bridge"
```

---

### Task 17: Create ValidationPanel component

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/ValidationPanel.tsx`

- [ ] **Step 1: Create the validation review panel**

Create `src/renderer/src/plugins/cortex/components/ValidationPanel.tsx`:

```tsx
/**
 * ValidationPanel — Renders AI validation corrections as an accept/dismiss review queue.
 */
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import type { ValidationCorrection } from '../../../types/cortex'

const TYPE_LABELS: Record<ValidationCorrection['type'], { label: string; icon: typeof AlertTriangle; color: string }> = {
  missing_edge: { label: 'Missing Edge', icon: AlertTriangle, color: 'text-amber-400' },
  missing_route: { label: 'Missing Route', icon: AlertTriangle, color: 'text-amber-400' },
  kind_correction: { label: 'Kind Correction', icon: Info, color: 'text-blue-400' },
  route_correction: { label: 'Route Correction', icon: AlertTriangle, color: 'text-amber-400' },
  dead_route: { label: 'Dead Route', icon: AlertTriangle, color: 'text-red-400' }
}

export default function ValidationPanel(): React.JSX.Element | null {
  const validationResults = useCortexStore((s) => s.validationResults)
  const updateValidationStatus = useCortexStore((s) => s.updateValidationStatus)

  const pending = validationResults.filter((v) => v.status === 'pending')

  if (validationResults.length === 0) return null

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-semibold text-text-primary">AI Validation Results</h4>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            {pending.length} pending
          </span>
        </div>
        {pending.length > 1 && (
          <button
            type="button"
            onClick={() => {
              for (const v of pending) {
                updateValidationStatus(v.id, 'accepted')
              }
            }}
            className="text-[10px] text-accent hover:underline"
          >
            Apply All
          </button>
        )}
      </div>

      <div className="max-h-60 overflow-y-auto">
        {validationResults.map((correction) => {
          const typeInfo = TYPE_LABELS[correction.type]
          const Icon = typeInfo.icon

          return (
            <div
              key={correction.id}
              className={`flex items-start gap-3 border-t border-border/40 px-4 py-2.5 ${
                correction.status !== 'pending' ? 'opacity-50' : ''
              }`}
            >
              <Icon size={14} className={`mt-0.5 flex-shrink-0 ${typeInfo.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-text-primary">
                  {typeInfo.label}
                </p>
                <p className="mt-0.5 text-[10px] text-text-secondary">
                  {correction.description}
                </p>
                <p className="mt-0.5 text-[10px] italic text-text-secondary/70">
                  {correction.reason}
                </p>
              </div>
              {correction.status === 'pending' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateValidationStatus(correction.id, 'accepted')}
                    className="rounded p-1 text-green-400 hover:bg-green-500/10"
                    title="Accept"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateValidationStatus(correction.id, 'dismissed')}
                    className="rounded p-1 text-text-secondary hover:bg-surface-elevated"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {correction.status === 'accepted' && (
                <span className="text-[10px] text-green-400">Applied</span>
              )}
              {correction.status === 'dismissed' && (
                <span className="text-[10px] text-text-secondary">Dismissed</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/ValidationPanel.tsx
git commit -m "feat(cortex): add ValidationPanel accept/dismiss review component"
```

---

### Task 18: Add "Validate" button to APIListTab and FlowsTab

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/APIListTab.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/FlowsTab.tsx`

- [ ] **Step 1: Add validateAnalysis store action**

First add the `validateAnalysis` action to `cortex-store.ts`. This follows the same streaming pattern as `buildDigest`:

Add the action signature to the interface:
```typescript
validateAnalysis: () => Promise<void>
```

Add the implementation (it builds digest if needed, gets validation prompts, streams AI response, parses corrections):

```typescript
validateAnalysis: async () => {
  const state = get()
  const repo = state.repos.find((r) => r.id === state.activeRepoId)
  if (!repo || !state.analysisResult) return

  const agent = getCortexAgent()
  if (!agent) return

  // Build digest first if needed
  if (!state.digest) {
    await get().buildDigest()
  }

  const digestText = get().digest?.rawText ?? ''
  const { systemPrompt, userPrompt, commitSha } =
    await window.api.cortex.buildValidationPrompts(repo.url, repo.branch, digestText)

  const sessionId = crypto.randomUUID()
  let accumulated = ''

  await new Promise<void>((resolve) => {
    window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
      if (sid !== sessionId) return
      accumulated += chunk
    })

    window.api.ai.onStreamDone(({ sessionId: sid }) => {
      if (sid !== sessionId) return

      // Parse validation TOON
      const corrections: ValidationCorrection[] = []
      for (const rawLine of accumulated.split('\n')) {
        const line = rawLine.trim()
        if (!line) continue
        const parts = line.split('|')
        const type = parts[0]?.toUpperCase() ?? ''

        const typeMap: Record<string, ValidationCorrection['type']> = {
          MISSING_ROUTE: 'missing_route',
          MISSING_EDGE: 'missing_edge',
          KIND_CORRECTION: 'kind_correction',
          ROUTE_CORRECTION: 'route_correction',
          DEAD_ROUTE: 'dead_route'
        }

        const correctionType = typeMap[type]
        if (!correctionType) continue

        const kv: Record<string, string> = {}
        for (const p of parts.slice(1)) {
          const idx = p.indexOf(':')
          if (idx > 0) kv[p.slice(0, idx).trim()] = p.slice(idx + 1).trim()
        }

        corrections.push({
          id: crypto.randomUUID(),
          type: correctionType,
          description: parts.slice(1, -1).join(' | '),
          reason: kv.reason ?? '',
          data: kv,
          status: 'pending'
        })
      }

      set({ validationResults: corrections })

      // Cache validations
      window.api.cortex.saveEnrichment(
        repo.url,
        repo.branch,
        commitSha,
        'validations',
        agent.providerId,
        accumulated
      )

      window.api.ai.removeStreamListeners()
      resolve()
    })

    window.api.ai.onStreamError(({ sessionId: sid }) => {
      if (sid !== sessionId) return
      window.api.ai.removeStreamListeners()
      resolve()
    })

    window.api.ai.startAnalysis(
      agent.providerId,
      agent.model,
      systemPrompt,
      userPrompt,
      sessionId,
      agent.command
    )
  })
},
```

- [ ] **Step 2: Add "Validate" button to APIListTab**

Read `APIListTab.tsx` first. Add a validate button next to the search filter in the header:

```tsx
const validateAnalysis = useCortexStore((s) => s.validateAnalysis)
const validationResults = useCortexStore((s) => s.validationResults)
```

Add button near the filter input:

```tsx
<button
  type="button"
  onClick={() => validateAnalysis()}
  className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
>
  <ShieldCheck size={12} />
  Validate
</button>
```

Import `ShieldCheck` from `lucide-react`. Also import and render `ValidationPanel` at the bottom of the tab:

```tsx
import ValidationPanel from './ValidationPanel'
```

Add `<ValidationPanel />` after the table.

- [ ] **Step 3: Add similar "Validate" button to FlowsTab**

Read `FlowsTab.tsx`. Add the same validate button and ValidationPanel in the FlowsTab toolbar area.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/stores/cortex-store.ts src/renderer/src/plugins/cortex/components/APIListTab.tsx src/renderer/src/plugins/cortex/components/FlowsTab.tsx
git commit -m "feat(cortex): add Validate button to APIs and Flows tabs with review panel"
```

---

## Chunk 5: Phase 4 — HLD Generator + Phase 5 — Q&A Enhancement

### Task 19: Add HLD generation store action

**Files:**
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Add `generateHLD` action signature**

```typescript
generateHLD: () => Promise<void>
```

- [ ] **Step 2: Implement `generateHLD`**

This streams a full HLD markdown document from AI into `hldContent`:

```typescript
generateHLD: async () => {
  const state = get()
  const repo = state.repos.find((r) => r.id === state.activeRepoId)
  if (!repo || !state.analysisResult) return

  const agent = getCortexAgent()
  if (!agent) return

  // Build digest first if needed
  if (!state.digest) {
    await get().buildDigest()
  }

  set({ isHLDGenerating: true, hldContent: '' })

  // Build context from all available enrichments
  const digest = get().digest
  const summaries = state.analysisResult.entities
    .filter((e) => e.summary)
    .map((e) => `${e.name} (${e.kind}): ${e.summary}`)
    .slice(0, 50)
    .join('\n')

  const routes = state.analysisResult.routes
    .map((r) => `${r.method} ${r.fullPath} → ${r.handlerName}`)
    .join('\n')

  const systemPrompt = `You are a technical writer generating a High-Level Design document for a codebase. Write in markdown with Mermaid diagrams where helpful.

Generate these sections in order:
## 1. Overview
## 2. Architecture
## 3. API Surface
## 4. Data Flow
## 5. Component Interactions
## 6. Testing Strategy
## 7. Security & Configuration
## 8. Deployment Considerations

Rules:
- Use clear, technical prose.
- Include Mermaid diagrams in code blocks where they add value.
- Reference specific entities and routes by name.
- Be concise but thorough.`

  const userPrompt = `Generate the HLD for this codebase:

Framework: ${state.analysisResult.framework}
Language: ${state.analysisResult.language}
Type: ${state.analysisResult.repoType}

${digest?.rawText ? `## Codebase Digest\n${digest.rawText.slice(0, 8000)}` : ''}

## Entity Summaries
${summaries || '(not yet enriched)'}

## API Routes
${routes || '(none detected)'}

## Patterns
${digest?.patterns?.map((p) => `${p.name} (${p.confidence}): ${p.entities.join(', ')}`).join('\n') || '(none detected)'}

## Test Stats
Files: ${state.analysisResult.testStats.testFiles}, Cases: ${state.analysisResult.testStats.testCount}, Coverage: ${Math.round(state.analysisResult.testStats.fileCoveredPct ?? 0)}%`

  const sessionId = crypto.randomUUID()
  let accumulated = ''

  window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
    if (sid !== sessionId) return
    accumulated += chunk
    set({ hldContent: accumulated })
  })

  window.api.ai.onStreamDone(({ sessionId: sid }) => {
    if (sid !== sessionId) return
    set({ hldContent: accumulated, isHLDGenerating: false })
    // Cache
    window.api.cortex.saveEnrichment(
      repo.url,
      repo.branch,
      repo.commitSha,
      'hld',
      agent.providerId,
      accumulated
    )
    window.api.ai.removeStreamListeners()
  })

  window.api.ai.onStreamError(({ sessionId: sid }) => {
    if (sid !== sessionId) return
    set({ isHLDGenerating: false })
    window.api.ai.removeStreamListeners()
  })

  await window.api.ai.startAnalysis(
    agent.providerId,
    agent.model,
    systemPrompt,
    userPrompt,
    sessionId,
    agent.command
  )
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/stores/cortex-store.ts
git commit -m "feat(cortex): implement HLD generation store action with AI streaming"
```

---

### Task 20: Add "Generate" button to DesignDocTab

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/DesignDocTab.tsx`

- [ ] **Step 1: Add HLD generation UI**

Read `DesignDocTab.tsx` first. Add a "Generate Design Doc" button and render `hldContent` as markdown when available:

```tsx
const generateHLD = useCortexStore((s) => s.generateHLD)
const hldContent = useCortexStore((s) => s.hldContent)
const isHLDGenerating = useCortexStore((s) => s.isHLDGenerating)
```

Add a generate button in the header area:

```tsx
<button
  type="button"
  onClick={() => generateHLD()}
  disabled={isHLDGenerating}
  className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
>
  <FileText size={12} />
  {isHLDGenerating ? 'Generating...' : 'Generate Design Doc'}
</button>
```

Import `FileText` from `lucide-react`.

When `hldContent` is non-empty, render it using the existing markdown renderer in the codebase (check what DesignDocTab currently uses for rendering markdown). The HLD content should take priority over the static design doc when available.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/DesignDocTab.tsx
git commit -m "feat(cortex): add Generate Design Doc button to DesignDocTab"
```

---

### Task 21: Enhance Q&A with progressive context

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/QAPanel.tsx`

- [ ] **Step 1: Read QAPanel.tsx to understand the current system prompt building**

Read the file and identify where the system prompt is constructed (likely in a `handleSend` or similar function).

- [ ] **Step 2: Enhance the system prompt builder**

Modify the system prompt construction to include digest + enrichment data when available:

```typescript
const digest = useCortexStore((s) => s.digest)
const hldContent = useCortexStore((s) => s.hldContent)
```

In the prompt builder, add layers of context based on what's available:

```typescript
// Progressive context — include whatever enrichments exist
let enrichmentContext = ''

if (digest) {
  // Include patterns and boundaries from digest
  const patterns = digest.patterns.map((p) => `${p.name}: ${p.entities.join(', ')}`).join('\n')
  const boundaries = digest.boundaries.map((b) => `${b.name}: ${b.entities.join(', ')}`).join('\n')
  if (patterns) enrichmentContext += `\nArchitectural Patterns:\n${patterns}`
  if (boundaries) enrichmentContext += `\nLayer Boundaries:\n${boundaries}`
}

// Include entity summaries (up to 100)
const summarizedEntities = analysisResult.entities
  .filter((e) => e.summary)
  .slice(0, 100)
  .map((e) => `${e.name} (${e.kind}): ${e.summary}`)
  .join('\n')
if (summarizedEntities) {
  enrichmentContext += `\nEntity Descriptions:\n${summarizedEntities}`
}

// Include HLD overview if available
if (hldContent) {
  const overviewSection = hldContent.split('## 2.')[0] ?? ''
  if (overviewSection.length < 2000) {
    enrichmentContext += `\nArchitecture Overview:\n${overviewSection}`
  }
}
```

Append `enrichmentContext` to the system prompt.

- [ ] **Step 3: Add FTS5 code retrieval**

Before sending the question, search for relevant code:

```typescript
// Retrieve relevant source code via FTS5
let codeContext = ''
try {
  const searchResults = await window.api.cortex.searchCode(repo.url, question)
  if (searchResults.length > 0) {
    const snippets = searchResults.slice(0, 5)
    codeContext = '\n\nRelevant code snippets:\n' +
      snippets.map((s) => `--- ${s.filePath} ---\n${s.snippet}`).join('\n\n')
  }
} catch {
  // FTS search optional — continue without code context
}
```

Append `codeContext` to the user prompt.

- [ ] **Step 4: Add multi-turn memory**

Include the last 5 Q&A messages in the system prompt:

```typescript
const qaMessages = useCortexStore((s) => s.qaMessages)

// Include conversation history (last 5 turns, ~2K token budget)
const recentHistory = qaMessages.slice(-10) // last 5 Q+A pairs
let historyText = ''
for (const msg of recentHistory) {
  const prefix = msg.role === 'user' ? 'Q' : 'A'
  const content = msg.content.slice(0, 400) // Cap per message
  historyText += `${prefix}: ${content}\n`
}
if (historyText) {
  // Add before the current question in the user prompt
  enrichmentContext += `\nPrevious conversation:\n${historyText}`
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/plugins/cortex/components/QAPanel.tsx
git commit -m "feat(cortex): enhance Q&A with progressive context, FTS retrieval, and multi-turn memory"
```

---

### Task 22: Final verification and build

- [ ] **Step 1: TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Full build**

Run: `npx electron-vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(cortex): resolve any remaining TypeScript or build issues"
```
