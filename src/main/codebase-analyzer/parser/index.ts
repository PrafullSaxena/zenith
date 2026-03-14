import { parseTypeScriptProject, type TSParseResult } from './ts-parser'
import { parseJavaFiles, type JavaParseResult } from './java-parser'
import { parsePythonFiles, type PythonParseResult } from './python-parser'
import { parseFrontendProject, type FEParseResult } from './fe-parser'
import { parseDEProject, type DEParseResult } from './de-parser'
import { buildCallGraph } from './call-graph-builder'
import fs from 'fs/promises'
import path from 'path'

// Duplicated types from renderer to avoid cross-process imports
type RepoType = 'backend' | 'frontend' | 'data-engineering' | 'fullstack' | 'unknown'

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
  type: 'call' | 'import' | 'inject' | 'route' | 'inferred'
}

interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
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
  type: 'airflow-dag' | 'dbt-model' | 'spark-job' | 'trigger-script'
  filePath: string
  schedule: string | null
  tasks: { id: string; name: string; operator: string; filePath: string; line: number }[]
  dependencies: { upstream: string; downstream: string }[]
}

export interface ParseResult {
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
  components: ComponentInfo[]
  pipelines: PipelineInfo[]
}

/** Paths to exclude from parsing */
const EXCLUDED_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'out/',
  '.next/',
  '__pycache__/',
  '.tox/',
  '.venv/',
  'venv/',
  '.mypy_cache/'
]

const EXCLUDED_EXTENSIONS = ['.min.js', '.map', '.d.ts']

function isExcluded(filePath: string): boolean {
  for (const pattern of EXCLUDED_PATTERNS) {
    if (filePath.includes(pattern)) return true
  }
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (filePath.endsWith(ext)) return true
  }
  return false
}

async function readFilesSafe(
  repoPath: string,
  filePaths: string[],
  extensions: string[]
): Promise<{ path: string; content: string }[]> {
  const result: { path: string; content: string }[] = []
  for (const fp of filePaths) {
    if (!extensions.some((ext) => fp.endsWith(ext))) continue
    if (isExcluded(fp)) continue
    try {
      const content = await fs.readFile(path.join(repoPath, fp), 'utf-8')
      result.push({ path: fp, content })
    } catch {
      // Skip unreadable files
    }
  }
  return result
}

export async function parseRepository(
  repoPath: string,
  repoType: RepoType,
  framework: string,
  language: string,
  filePaths: string[],
  onProgress?: (filesProcessed: number, totalFiles: number) => void
): Promise<ParseResult> {
  // Filter excluded paths
  const validPaths = filePaths.filter((fp) => !isExcluded(fp))
  const totalFiles = validPaths.length

  let entities: CodeEntity[] = []
  let calls: CallEdge[] = []
  let routes: RouteInfo[] = []
  let components: ComponentInfo[] = []
  let pipelines: PipelineInfo[] = []

  let processed = 0
  const reportProgress = (count: number): void => {
    processed += count
    onProgress?.(Math.min(processed, totalFiles), totalFiles)
  }

  // Run appropriate parser(s) based on repo type and language
  if (repoType === 'backend' || repoType === 'fullstack') {
    if (language === 'typescript' || language === 'javascript') {
      const tsResult: TSParseResult = parseTypeScriptProject(repoPath, validPaths.map((fp) => path.join(repoPath, fp)))
      entities.push(...(tsResult.entities as CodeEntity[]))
      calls.push(...(tsResult.calls as CallEdge[]))
      routes.push(...(tsResult.routes as RouteInfo[]))
      reportProgress(validPaths.filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')).length)
    } else if (language === 'java') {
      const javaFiles = await readFilesSafe(repoPath, validPaths, ['.java'])
      const javaResult: JavaParseResult = parseJavaFiles(javaFiles)
      entities.push(...(javaResult.entities as CodeEntity[]))
      routes.push(...(javaResult.routes as RouteInfo[]))
      reportProgress(javaFiles.length)
    } else if (language === 'python') {
      const pyFiles = await readFilesSafe(repoPath, validPaths, ['.py'])
      const pyResult: PythonParseResult = parsePythonFiles(pyFiles)
      entities.push(...(pyResult.entities as CodeEntity[]))
      routes.push(...(pyResult.routes as RouteInfo[]))
      reportProgress(pyFiles.length)
    }
  }

  if (repoType === 'frontend' || repoType === 'fullstack') {
    const feResult: FEParseResult = parseFrontendProject(repoPath, validPaths.map((fp) => path.join(repoPath, fp)))
    components.push(...(feResult.components as ComponentInfo[]))
    // Add frontend routes to routes array
    for (const r of feResult.routes) {
      routes.push({
        method: 'GET',
        path: r.path,
        handlerName: r.component,
        controllerName: '',
        filePath: '',
        line: 0,
        fullPath: r.path
      })
    }
    reportProgress(validPaths.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx')).length)
  }

  if (repoType === 'data-engineering') {
    const deFiles = await readFilesSafe(repoPath, validPaths, ['.py', '.sql', '.sh'])
    const deResult: DEParseResult = parseDEProject(deFiles)
    entities.push(...(deResult.entities as CodeEntity[]))
    pipelines.push(...deResult.pipelines)
    reportProgress(deFiles.length)
  }

  // For unknown repos, try TS parser as fallback
  if (repoType === 'unknown') {
    const tsFiles = validPaths.filter(
      (f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
    )
    if (tsFiles.length > 0) {
      const tsResult = parseTypeScriptProject(repoPath, tsFiles.map((fp) => path.join(repoPath, fp)))
      entities.push(...(tsResult.entities as CodeEntity[]))
      calls.push(...(tsResult.calls as CallEdge[]))
      routes.push(...(tsResult.routes as RouteInfo[]))
    }
    reportProgress(tsFiles.length)
  }

  // Build the call graph to validate edges
  const graph = buildCallGraph(entities, calls)
  calls = graph.edges // Use validated edges only

  // Report final progress
  onProgress?.(totalFiles, totalFiles)

  return { entities, calls, routes, components, pipelines }
}

// Re-export for use by analyzer
export { buildCallGraph, getFlowForEndpoint } from './call-graph-builder'
