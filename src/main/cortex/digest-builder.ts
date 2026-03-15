/**
 * digest-builder.ts — Two-pass codebase digest builder.
 * Pass 1: Static assembly — ranks entities, extracts source snippets.
 * Pass 2: AI refinement — sends digest to AI for classification, correction, summarization.
 */
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
  const testStats = analysis.testStats ?? { testFiles: 0, testCount: 0, fileCoveredPct: 0 }
  const statsLine = `DIGEST_STAT|totalFiles:${analysis.stats.totalFiles}|totalEntities:${analysis.entities.length}|routes:${analysis.stats.routeCount}|testCoverage:${Math.round(testStats.fileCoveredPct)}%|framework:${analysis.framework}|language:${analysis.language}|repoType:${analysis.repoType}`
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
