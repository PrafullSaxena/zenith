/**
 * mermaid-generator.ts — Generate Mermaid diagram syntax from analysis results.
 * Each function returns a string of Mermaid diagram syntax.
 * All labels are sanitized to avoid Mermaid parsing errors.
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
 * Sanitize a label for safe Mermaid rendering.
 * - Replace < with [, > with ] (generics break Mermaid)
 * - Replace " with '
 * - Replace | with -
 * - Truncate to 40 chars
 */
function sanitizeMermaidLabel(label: string): string {
  let clean = label
    .replace(/</g, '[')
    .replace(/>/g, ']')
    .replace(/"/g, "'")
    .replace(/\|/g, ' - ')
  if (clean.length > 40) {
    clean = clean.slice(0, 37) + '...'
  }
  return clean
}

/** Generate a safe node ID from a name */
function safeId(name: string, index?: number): string {
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_')
  return index !== undefined ? `${base}_${index}` : base
}

/**
 * Generate high-level architecture diagram grouping entities by kind into layers.
 */
export function generateArchitectureDiagram(result: AnalysisResult): string {
  const layers: Record<string, CodeEntity[]> = {}

  for (const entity of result.entities) {
    const layer = getLayerForKind(entity.kind)
    if (!layers[layer]) layers[layer] = []
    layers[layer].push(entity)
  }

  const lines: string[] = ['flowchart TB']

  const layerOrder = ['Presentation', 'Business', 'Data Access', 'Components', 'Pipelines', 'Other']

  for (const layerName of layerOrder) {
    const entities = layers[layerName]
    if (!entities || entities.length === 0) continue

    const subgraphId = safeId(layerName)
    lines.push(`  subgraph ${subgraphId}["${layerName} Layer"]`)

    // Limit to top 10 entities per layer to keep diagram readable
    const topEntities = entities.slice(0, 10)
    for (const entity of topEntities) {
      const nodeId = safeId(entity.name, entity.line)
      lines.push(`    ${nodeId}["${sanitizeMermaidLabel(entity.name)}"]`)
    }

    lines.push('  end')
  }

  // Connect layers in order
  const presentLayers = layerOrder.filter((l) => layers[l] && layers[l].length > 0)
  for (let i = 0; i < presentLayers.length - 1; i++) {
    lines.push(`  ${safeId(presentLayers[i])} --> ${safeId(presentLayers[i + 1])}`)
  }

  return lines.join('\n')
}

function getLayerForKind(kind: string): string {
  switch (kind) {
    case 'controller':
    case 'route':
    case 'middleware':
      return 'Presentation'
    case 'service':
    case 'function':
    case 'class':
    case 'method':
      return 'Business'
    case 'repository':
      return 'Data Access'
    case 'component':
      return 'Components'
    case 'dag':
    case 'task':
      return 'Pipelines'
    default:
      return 'Other'
  }
}

/**
 * Generate API flow diagram as a sequence diagram.
 * Shows up to 5 representative routes.
 */
export function generateAPIFlowDiagram(result: AnalysisResult): string {
  if (result.routes.length === 0) return ''

  const lines: string[] = ['sequenceDiagram']
  lines.push('  participant Client')
  lines.push('  participant Controller')
  lines.push('  participant Service')
  lines.push('  participant Repository')
  lines.push('  participant DB')

  // Show up to 5 routes
  const routes = result.routes.slice(0, 5)
  for (const route of routes) {
    const label = sanitizeMermaidLabel(`${route.method} ${route.fullPath}`)
    lines.push(`  Client->>Controller: ${label}`)
    lines.push(`  Controller->>Service: ${sanitizeMermaidLabel(route.handlerName)}()`)
    lines.push(`  Service->>Repository: query`)
    lines.push(`  Repository->>DB: SQL`)
    lines.push(`  DB-->>Repository: result`)
    lines.push(`  Repository-->>Service: data`)
    lines.push(`  Service-->>Controller: response`)
    lines.push(`  Controller-->>Client: JSON`)
  }

  return lines.join('\n')
}

/**
 * Generate component tree diagram for frontend repos.
 */
export function generateComponentTreeDiagram(result: AnalysisResult): string {
  if (result.components.length === 0) return ''

  const lines: string[] = ['flowchart TD']

  // Build parent-child relationships
  const componentNames = new Set(result.components.map((c) => c.name))

  // Limit to 30 components for readability
  const components = result.components.slice(0, 30)

  for (const comp of components) {
    const nodeId = safeId(comp.name)
    const label = sanitizeMermaidLabel(comp.name)
    lines.push(`  ${nodeId}["${label}"]`)
  }

  // Add edges from parent to children
  for (const comp of components) {
    const parentId = safeId(comp.name)
    for (const childName of comp.children) {
      if (componentNames.has(childName)) {
        const childId = safeId(childName)
        lines.push(`  ${parentId} --> ${childId}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate pipeline diagram for data engineering repos.
 */
export function generatePipelineDiagram(result: AnalysisResult): string {
  if (result.pipelines.length === 0) return ''

  const lines: string[] = ['flowchart LR']

  for (const pipeline of result.pipelines) {
    const subId = safeId(pipeline.name)
    const scheduleLabel = pipeline.schedule ? ` (${sanitizeMermaidLabel(pipeline.schedule)})` : ''
    lines.push(`  subgraph ${subId}["${sanitizeMermaidLabel(pipeline.name)}${scheduleLabel}"]`)

    // Add tasks
    for (const task of pipeline.tasks) {
      const taskId = safeId(`${pipeline.name}_${task.name}`)
      lines.push(`    ${taskId}["${sanitizeMermaidLabel(task.name)}"]`)
    }

    // Add task dependencies
    for (const dep of pipeline.dependencies) {
      const upId = safeId(`${pipeline.name}_${dep.upstream}`)
      const downId = safeId(`${pipeline.name}_${dep.downstream}`)
      lines.push(`    ${upId} --> ${downId}`)
    }

    lines.push('  end')
  }

  return lines.join('\n')
}

/**
 * Convert React Flow node/edge data to Mermaid flowchart syntax.
 * This is used by the export pipeline to embed flow diagrams in MD/TXT/PDF exports.
 */
export function flowDataToMermaid(
  nodes: { id: string; data: { label: string; kind: string } }[],
  edges: { source: string; target: string; data?: { label: string } }[],
  direction: 'TB' | 'LR' = 'TB'
): string {
  const lines = [`flowchart ${direction}`]
  for (const node of nodes) {
    // Sanitize label for Mermaid (remove special chars that break syntax)
    const label = node.data.label.replace(/["\[\](){}|]/g, '')
    const shape =
      node.data.kind === 'database' ||
      node.data.kind === 'repository' ||
      node.data.kind === 'db-adapter'
        ? `[(${label})]`
        : `[${label}]`
    lines.push(`  ${node.id}${shape}`)
  }
  for (const edge of edges) {
    const label = edge.data?.label ? `|${edge.data.label}|` : ''
    lines.push(`  ${edge.source} -->${label} ${edge.target}`)
  }
  return lines.join('\n')
}

/**
 * Generate class diagram showing class relationships.
 * Shows top classes/services with their methods.
 */
export function generateClassDiagram(result: AnalysisResult): string {
  const classes = result.entities.filter(
    (e) => e.kind === 'class' || e.kind === 'controller' || e.kind === 'service' || e.kind === 'repository'
  )

  if (classes.length === 0) return ''

  const lines: string[] = ['classDiagram']

  // Limit to top 15 classes
  const topClasses = classes.slice(0, 15)
  const classNames = new Set(topClasses.map((c) => c.name))

  for (const cls of topClasses) {
    const className = sanitizeMermaidLabel(cls.name).replace(/[^a-zA-Z0-9_]/g, '')
    lines.push(`  class ${className} {`)

    // Find methods belonging to this class
    const methods = result.entities.filter((e) => e.parentId === cls.id && e.kind === 'method')
    for (const method of methods.slice(0, 8)) {
      const params = method.parameters
        .map((p) => sanitizeMermaidLabel(p.type ? `${p.name}: ${p.type}` : p.name))
        .join(', ')
      const returnType = method.returnType ? sanitizeMermaidLabel(method.returnType) : 'void'
      lines.push(`    +${sanitizeMermaidLabel(method.name)}(${params}) ${returnType}`)
    }

    lines.push('  }')
  }

  // Add relationships from call edges
  for (const edge of result.calls) {
    const caller = result.entities.find((e) => e.id === edge.callerId)
    const callee = result.entities.find((e) => e.id === edge.calleeId)

    if (!caller || !callee) continue

    // Find parent classes
    const callerClass = caller.parentId
      ? result.entities.find((e) => e.id === caller.parentId)
      : caller.kind === 'class' || caller.kind === 'controller' || caller.kind === 'service' || caller.kind === 'repository'
        ? caller
        : null
    const calleeClass = callee.parentId
      ? result.entities.find((e) => e.id === callee.parentId)
      : callee.kind === 'class' || callee.kind === 'controller' || callee.kind === 'service' || callee.kind === 'repository'
        ? callee
        : null

    if (
      callerClass &&
      calleeClass &&
      callerClass.id !== calleeClass.id &&
      classNames.has(callerClass.name) &&
      classNames.has(calleeClass.name)
    ) {
      const from = callerClass.name.replace(/[^a-zA-Z0-9_]/g, '')
      const to = calleeClass.name.replace(/[^a-zA-Z0-9_]/g, '')
      lines.push(`  ${from} --> ${to}`)
    }
  }

  // Deduplicate relationship lines
  const seen = new Set<string>()
  const deduped = lines.filter((line) => {
    if (line.includes('-->')) {
      if (seen.has(line.trim())) return false
      seen.add(line.trim())
    }
    return true
  })

  return deduped.join('\n')
}
