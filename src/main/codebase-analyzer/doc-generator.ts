/**
 * doc-generator.ts — Generate an HLD (High Level Design) document from analysis results.
 * Returns a markdown string with embedded Mermaid diagrams.
 */

/** Shape matching renderer AnalysisResult — duplicated to avoid cross-process type import */
interface AnalysisResult {
  repoId: string
  repoType: string
  framework: string
  language: string
  commitSha: string
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
  components: ComponentInfo[]
  pipelines: PipelineInfo[]
  fileTree: unknown[]
  stats: {
    totalFiles: number
    totalLines: number
    languages: { language: string; fileCount: number; lineCount: number }[]
    entityCount: { kind: string; count: number }[]
    routeCount: number
    componentCount: number
    pipelineCount: number
  }
  documentation: string
}

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

interface ComponentInfo {
  name: string
  filePath: string
  children: string[]
  props: string[]
  hooks: string[]
  isRoute: boolean
  routePath: string | null
  imports: string[]
}

interface PipelineInfo {
  id: string
  name: string
  type: string
  filePath: string
  schedule: string | null
  tasks: { id: string; name: string; operator: string; filePath: string; line: number }[]
  dependencies: { upstream: string; downstream: string }[]
}

/**
 * Generate the full HLD document as a markdown string with embedded Mermaid diagrams.
 */
export function generateHLDDocument(
  result: AnalysisResult,
  mermaidDiagrams: Record<string, string>
): string {
  const sections: string[] = []

  // 1. Project Overview
  sections.push('# High Level Design Document')
  sections.push('')
  sections.push('## Project Overview')
  sections.push('')
  sections.push(`- **Repository Type:** ${formatRepoType(result.repoType)}`)
  sections.push(`- **Framework:** ${result.framework}`)
  sections.push(`- **Primary Language:** ${result.language}`)
  sections.push(`- **Total Files:** ${result.stats.totalFiles.toLocaleString()}`)
  sections.push(`- **Total Lines:** ${result.stats.totalLines.toLocaleString()}`)
  if (result.stats.routeCount > 0) {
    sections.push(`- **API Endpoints:** ${result.stats.routeCount}`)
  }
  if (result.stats.componentCount > 0) {
    sections.push(`- **Components:** ${result.stats.componentCount}`)
  }
  if (result.stats.pipelineCount > 0) {
    sections.push(`- **Pipelines:** ${result.stats.pipelineCount}`)
  }
  sections.push('')

  // Language breakdown
  if (result.stats.languages.length > 0) {
    sections.push('### Language Distribution')
    sections.push('')
    sections.push('| Language | Files | Lines | Percentage |')
    sections.push('| --- | --- | --- | --- |')
    const totalLines = result.stats.totalLines || 1
    for (const lang of result.stats.languages.slice(0, 10)) {
      const pct = ((lang.lineCount / totalLines) * 100).toFixed(1)
      sections.push(`| ${lang.language} | ${lang.fileCount} | ${lang.lineCount.toLocaleString()} | ${pct}% |`)
    }
    sections.push('')
  }

  // 2. Architecture Overview
  if (mermaidDiagrams.architecture) {
    sections.push('## Architecture Overview')
    sections.push('')
    sections.push('The following diagram shows the high-level architecture, grouping code entities by their architectural role.')
    sections.push('')
    sections.push('```mermaid')
    sections.push(mermaidDiagrams.architecture)
    sections.push('```')
    sections.push('')
  }

  // 3. API Endpoints (BE repos)
  if (result.routes.length > 0) {
    sections.push('## API Endpoints')
    sections.push('')
    sections.push('| Method | Path | Handler | Controller | File |')
    sections.push('| --- | --- | --- | --- | --- |')
    for (const route of result.routes) {
      sections.push(
        `| ${route.method} | \`${route.fullPath}\` | ${route.handlerName} | ${route.controllerName} | ${route.filePath}:${route.line} |`
      )
    }
    sections.push('')

    // API Flow diagram
    if (mermaidDiagrams.apiFlow) {
      sections.push('### API Flow')
      sections.push('')
      sections.push('```mermaid')
      sections.push(mermaidDiagrams.apiFlow)
      sections.push('```')
      sections.push('')
    }
  }

  // 4. Component Structure (FE repos)
  if (result.components.length > 0) {
    sections.push('## Component Structure')
    sections.push('')
    sections.push(`This project contains **${result.components.length}** React components.`)
    sections.push('')

    // Component summary table (top 20)
    sections.push('| Component | Props | Hooks | Children | Route |')
    sections.push('| --- | --- | --- | --- | --- |')
    for (const comp of result.components.slice(0, 20)) {
      const route = comp.isRoute ? comp.routePath ?? 'yes' : '-'
      sections.push(
        `| ${comp.name} | ${comp.props.length} | ${comp.hooks.join(', ') || '-'} | ${comp.children.length} | ${route} |`
      )
    }
    sections.push('')

    // Component tree diagram
    if (mermaidDiagrams.componentTree) {
      sections.push('### Component Tree')
      sections.push('')
      sections.push('```mermaid')
      sections.push(mermaidDiagrams.componentTree)
      sections.push('```')
      sections.push('')
    }
  }

  // 5. Data Pipelines (DE repos)
  if (result.pipelines.length > 0) {
    sections.push('## Data Pipelines')
    sections.push('')
    for (const pipeline of result.pipelines) {
      sections.push(`### ${pipeline.name}`)
      sections.push('')
      sections.push(`- **Type:** ${pipeline.type}`)
      if (pipeline.schedule) sections.push(`- **Schedule:** ${pipeline.schedule}`)
      sections.push(`- **Tasks:** ${pipeline.tasks.length}`)
      sections.push(`- **File:** ${pipeline.filePath}`)
      sections.push('')
    }

    if (mermaidDiagrams.pipeline) {
      sections.push('### Pipeline Flow')
      sections.push('')
      sections.push('```mermaid')
      sections.push(mermaidDiagrams.pipeline)
      sections.push('```')
      sections.push('')
    }
  }

  // 6. Key Modules — top 10 most-connected entities
  sections.push('## Key Modules')
  sections.push('')

  // Compute connection counts from call edges
  const connectionCount = new Map<string, number>()
  for (const edge of result.calls) {
    connectionCount.set(edge.callerId, (connectionCount.get(edge.callerId) || 0) + 1)
    connectionCount.set(edge.calleeId, (connectionCount.get(edge.calleeId) || 0) + 1)
  }

  const topEntities = result.entities
    .map((e) => ({ entity: e, connections: connectionCount.get(e.id) || 0 }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10)

  if (topEntities.length > 0) {
    sections.push('| Name | Kind | File | Connections | Description |')
    sections.push('| --- | --- | --- | --- | --- |')
    for (const { entity, connections } of topEntities) {
      const summary = entity.summary ? entity.summary.slice(0, 80) : '-'
      sections.push(
        `| ${entity.name} | ${entity.kind} | ${entity.filePath}:${entity.line} | ${connections} | ${summary} |`
      )
    }
  } else {
    sections.push('No key modules identified from call graph analysis.')
  }
  sections.push('')

  // 7. Dependencies — entity kind breakdown
  sections.push('## Dependencies & Statistics')
  sections.push('')
  if (result.stats.entityCount.length > 0) {
    sections.push('### Entity Breakdown')
    sections.push('')
    sections.push('| Kind | Count |')
    sections.push('| --- | --- |')
    for (const ec of result.stats.entityCount) {
      sections.push(`| ${ec.kind} | ${ec.count} |`)
    }
    sections.push('')
  }
  sections.push(`- **Total Call Edges:** ${result.calls.length}`)
  sections.push(`- **Total Entities:** ${result.entities.length}`)
  sections.push('')

  // 8. Class Diagrams
  if (mermaidDiagrams.classDiagram) {
    sections.push('## Class Diagrams')
    sections.push('')
    sections.push('```mermaid')
    sections.push(mermaidDiagrams.classDiagram)
    sections.push('```')
    sections.push('')
  }

  return sections.join('\n')
}

function formatRepoType(type: string): string {
  switch (type) {
    case 'backend':
      return 'Backend'
    case 'frontend':
      return 'Frontend'
    case 'data-engineering':
      return 'Data Engineering'
    case 'fullstack':
      return 'Full Stack'
    default:
      return type
  }
}
