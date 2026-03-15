// Duplicated types from renderer to avoid cross-process imports
interface CodeEntity {
  id: string
  name: string
  kind:
    | 'function'
    | 'class'
    | 'method'
    | 'route'
    | 'component'
    | 'controller'
    | 'service'
    | 'repository'
    | 'middleware'
    | 'decorator'
    | 'dag'
    | 'task'
    | 'configuration'
    | 'aspect'
    | 'filter'
    | 'port-in'
    | 'port-out'
    | 'web-adapter'
    | 'db-adapter'
    | 'http-adapter'
    | 'error-handler'
    | 'client-impl'
    | 'shared'
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
  type: 'call' | 'import' | 'inject' | 'route' | 'inferred'
}

export interface CallGraph {
  nodes: Map<string, CodeEntity>
  edges: CallEdge[]
}

/**
 * Build a call graph from entities and call edges.
 * Validates edges, and infers class-to-class edges from method-level calls.
 */
export function buildCallGraph(entities: CodeEntity[], calls: CallEdge[]): CallGraph {
  const nodes = new Map<string, CodeEntity>()

  for (const entity of entities) {
    nodes.set(entity.id, entity)
  }

  // Validate edges: remove edges referencing non-existent entities
  const validEdges = calls.filter((edge) => {
    return nodes.has(edge.callerId) && nodes.has(edge.calleeId)
  })

  // Infer class-to-class edges from method-level calls.
  // If method A (parent ClassX) calls method B (parent ClassY), add ClassX -> ClassY edge.
  const inferredEdges: CallEdge[] = []
  const seenInferred = new Set<string>()

  for (const edge of validEdges) {
    const caller = nodes.get(edge.callerId)
    const callee = nodes.get(edge.calleeId)
    if (!caller || !callee) continue

    const callerParentId = caller.kind === 'method' && caller.parentId ? caller.parentId : null
    const calleeParentId = callee.kind === 'method' && callee.parentId ? callee.parentId : null

    if (callerParentId && calleeParentId && callerParentId !== calleeParentId) {
      const key = `${callerParentId}->${calleeParentId}`
      if (!seenInferred.has(key) && nodes.has(callerParentId) && nodes.has(calleeParentId)) {
        seenInferred.add(key)
        inferredEdges.push({
          id: `inferred:${key}`,
          callerId: callerParentId,
          calleeId: calleeParentId,
          filePath: '',
          line: 0,
          type: 'inferred'
        })
      }
    }
  }

  return { nodes, edges: [...validEdges, ...inferredEdges] }
}

/**
 * Get the flow (reachable subgraph) starting from a given endpoint entity ID.
 * Uses BFS traversal with depth limit to prevent runaway expansion.
 * Produces the "API flow" chain: Controller -> Service -> Repository -> Database.
 *
 * @param graph - The full call graph
 * @param routeEntityId - The entity ID to start traversal from
 * @returns Subgraph of reachable entities and edges
 */
export function getFlowForEndpoint(
  graph: CallGraph,
  routeEntityId: string
): { entities: CodeEntity[]; edges: CallEdge[] } {
  const MAX_DEPTH = 10
  const visited = new Set<string>()
  const resultEntities: CodeEntity[] = []
  const resultEdges: CallEdge[] = []

  // Build adjacency list for efficient traversal
  const adjacency = new Map<string, { edge: CallEdge; targetId: string }[]>()
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.callerId) || []
    list.push({ edge, targetId: edge.calleeId })
    adjacency.set(edge.callerId, list)
  }

  // BFS with depth tracking
  const queue: { entityId: string; depth: number }[] = [
    { entityId: routeEntityId, depth: 0 }
  ]

  while (queue.length > 0) {
    const { entityId, depth } = queue.shift()!

    if (visited.has(entityId)) continue
    if (depth > MAX_DEPTH) continue

    visited.add(entityId)

    const entity = graph.nodes.get(entityId)
    if (entity) {
      resultEntities.push(entity)
    }

    // Follow outgoing edges
    const neighbors = adjacency.get(entityId) || []
    for (const { edge, targetId } of neighbors) {
      if (!visited.has(targetId)) {
        resultEdges.push(edge)
        queue.push({ entityId: targetId, depth: depth + 1 })
      }
    }
  }

  return { entities: resultEntities, edges: resultEdges }
}
