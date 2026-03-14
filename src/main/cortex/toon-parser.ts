/**
 * TOON (Tokenized Object Output Notation) parser and prompt builder for Cortex insights.
 *
 * TOON is a pipe-delimited, line-oriented format where the first field is the record type.
 * This makes it cheap to parse and token-efficient for LLM output.
 */

export interface ToonInsights {
  summary: string
  architecture: { pattern: string; framework: string; language: string; libs: string[] }
  patterns: { name: string; description: string }[]
  security: { type: string; description: string }[]
  config: { source: string; description: string }[]
  async: { type: string; description: string }[]
  tests: { framework: string; details: string[] }
  insights: { severity: 'strength' | 'concern'; description: string }[]
  entities: { name: string; kind: string; location: string; summary: string }[]
  dependencies: { category: string; name: string; version: string }[]
}

function emptyInsights(): ToonInsights {
  return {
    summary: '',
    architecture: { pattern: '', framework: '', language: '', libs: [] },
    patterns: [],
    security: [],
    config: [],
    async: [],
    tests: { framework: '', details: [] },
    insights: [],
    entities: [],
    dependencies: []
  }
}

/**
 * Parse a TOON-formatted response string into a structured ToonInsights object.
 *
 * Record types:
 *   SUMMARY|<text>
 *   ARCH|<pattern>|<framework>|<language>|<lib1,lib2,...>
 *   PATTERN|<name>|<description>
 *   SECURITY|<type>|<description>
 *   CONFIG|<source>|<description>
 *   ASYNC|<type>|<description>
 *   TEST|<framework>|<detail1>|<detail2>|...
 *   INSIGHT|<strength|concern>|<description>
 *   ENTITY|<name>|<kind>|<location>|<summary>
 *   DEP|<category>|<name>|<version>
 */
export function parseToonResponse(toonText: string): ToonInsights {
  const result = emptyInsights()

  const lines = toonText.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = parts[0].toUpperCase()

    switch (type) {
      case 'SUMMARY':
        result.summary = parts[1] ?? ''
        break

      case 'ARCH':
        result.architecture = {
          pattern: parts[1] ?? '',
          framework: parts[2] ?? '',
          language: parts[3] ?? '',
          libs: parts[4] ? parts[4].split(',').map((l) => l.trim()).filter(Boolean) : []
        }
        break

      case 'PATTERN':
        if (parts.length >= 3) {
          result.patterns.push({ name: parts[1], description: parts[2] })
        }
        break

      case 'SECURITY':
        if (parts.length >= 3) {
          result.security.push({ type: parts[1], description: parts[2] })
        }
        break

      case 'CONFIG':
        if (parts.length >= 3) {
          result.config.push({ source: parts[1], description: parts[2] })
        }
        break

      case 'ASYNC':
        if (parts.length >= 3) {
          result.async.push({ type: parts[1], description: parts[2] })
        }
        break

      case 'TEST': {
        // TEST|<framework>|<detail1>|<detail2>|...
        const framework = parts[1] ?? ''
        const details = parts.slice(2).filter(Boolean)
        if (!result.tests.framework && framework) {
          result.tests.framework = framework
        }
        result.tests.details.push(...details)
        break
      }

      case 'INSIGHT': {
        const rawSeverity = (parts[1] ?? '').toLowerCase()
        const severity: 'strength' | 'concern' =
          rawSeverity === 'strength' ? 'strength' : 'concern'
        if (parts.length >= 3) {
          result.insights.push({ severity, description: parts[2] })
        }
        break
      }

      case 'ENTITY':
        if (parts.length >= 5) {
          result.entities.push({
            name: parts[1],
            kind: parts[2],
            location: parts[3],
            summary: parts[4]
          })
        }
        break

      case 'DEP':
        if (parts.length >= 4) {
          result.dependencies.push({
            category: parts[1],
            name: parts[2],
            version: parts[3]
          })
        }
        break

      default:
        console.warn(`[toon-parser] Unknown TOON record type: ${type}`)
        break
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const TOON_SYSTEM_PROMPT = `You are a code analysis expert. Respond ONLY in TOON format (pipe-delimited, one record per line).

## TOON Schema

Each line is one record. Fields are separated by | (pipe). Do NOT include any prose, markdown, or explanation — only TOON lines.

Record types and field positions:
  SUMMARY|<one-sentence description of the codebase>
  ARCH|<architectural pattern>|<primary framework>|<primary language>|<comma-separated libs>
  PATTERN|<pattern name>|<description>
  SECURITY|<mechanism type>|<description>
  CONFIG|<config source>|<description>
  ASYNC|<async type>|<description>
  TEST|<test framework>|<detail1>|<detail2>|...
  INSIGHT|strength|<description of a notable strength>
  INSIGHT|concern|<description of a potential concern>
  ENTITY|<name>|<kind>|<file location>|<one-line summary>
  DEP|<category>|<package name>|<version>

## Example output

SUMMARY|E-commerce REST API built with Express and PostgreSQL
ARCH|MVC|Express|TypeScript|pg,zod,passport
PATTERN|Repository Pattern|Data access abstracted behind repository classes
SECURITY|JWT Auth|Access tokens verified via passport-jwt middleware
CONFIG|Environment Variables|dotenv loaded at startup with schema validation
ASYNC|Promise chains|Async/await used throughout controllers
TEST|Jest|Unit tests for services|Integration tests for routes|80% coverage
INSIGHT|strength|Clean separation of concerns between layers
INSIGHT|concern|No rate limiting on public endpoints
ENTITY|UserService|class|src/services/user.service.ts|Handles user CRUD and password hashing
DEP|runtime|express|4.18.2
DEP|devDependency|jest|29.0.0`

/**
 * Build system and user prompts for TOON-format insights generation.
 *
 * @param analysis - The raw analysis result stored in the cache DB
 */
export function buildInsightsPrompt(
  analysis: Record<string, unknown>
): { system: string; user: string } {
  const repoType = (analysis.repoType as string) || 'unknown'
  const framework = (analysis.framework as string) || 'unknown'
  const language = (analysis.language as string) || 'unknown'

  const entities = (analysis.entities as Array<Record<string, unknown>>) ?? []
  const routes = (analysis.routes as Array<Record<string, unknown>>) ?? []
  const fileTree = (analysis.fileTree as Array<Record<string, unknown>>) ?? []
  const stats = (analysis.stats as Record<string, unknown>) ?? {}
  const testStats = (analysis.testStats as Record<string, unknown>) ?? {}

  // Sort entities by importance heuristic: classes > functions > others
  const kindPriority: Record<string, number> = {
    class: 0,
    interface: 1,
    function: 2,
    component: 2,
    method: 3
  }
  const sortedEntities = [...entities].sort((a, b) => {
    const aKind = ((a.kind as string) || '').toLowerCase()
    const bKind = ((b.kind as string) || '').toLowerCase()
    const ap = kindPriority[aKind] ?? 99
    const bp = kindPriority[bKind] ?? 99
    return ap - bp
  })
  const topEntities = sortedEntities.slice(0, 100)

  // Abbreviated file tree — top-level paths only
  const topPaths = fileTree
    .slice(0, 50)
    .map((n) => (n.path as string) || '')
    .filter(Boolean)
    .join('\n')

  // Routes/endpoints
  const routeLines = routes
    .slice(0, 50)
    .map((r) => `${r.method ?? 'GET'} ${r.path ?? r.route ?? ''}`)
    .join('\n')

  // Test stats summary
  const testSummary = [
    testStats.framework ? `Framework: ${testStats.framework}` : null,
    testStats.testFileCount != null ? `Test files: ${testStats.testFileCount}` : null,
    testStats.testCount != null ? `Test cases: ${testStats.testCount}` : null,
    testStats.hasCI != null ? `CI: ${testStats.hasCI ? 'yes' : 'no'}` : null
  ]
    .filter(Boolean)
    .join(', ')

  // Entity summary lines
  const entityLines = topEntities
    .map((e) => `${e.kind ?? 'entity'} ${e.name ?? ''} @ ${e.location ?? e.file ?? ''}`)
    .join('\n')

  const userPrompt = `Analyze the following codebase and produce TOON output.

## Repository Info
- Type: ${repoType}
- Framework: ${framework}
- Language: ${language}
- Total files: ${(stats.totalFiles as number) ?? 'unknown'}
- Total lines: ${(stats.totalLines as number) ?? 'unknown'}

## Top Entities (up to 100)
${entityLines || '(none)'}

## Routes / Endpoints
${routeLines || '(none)'}

## File Tree (abbreviated)
${topPaths || '(none)'}

## Test Stats
${testSummary || '(none)'}

Respond ONLY in TOON format. Do not include any prose.`

  return { system: TOON_SYSTEM_PROMPT, user: userPrompt }
}
