// === Repository Types ===

export type RepoType = 'backend' | 'frontend' | 'data-engineering' | 'fullstack' | 'unknown'

export type RepoStatus = 'idle' | 'cloning' | 'analyzing' | 'ready' | 'error'

export interface Repository {
  id: string // crypto.randomUUID() on add
  url: string // git clone URL (HTTPS or SSH)
  name: string // derived from URL (last path segment minus .git)
  branch: string // selected branch
  repoPath: string // local clone path under userData
  repoType: RepoType
  framework: string // e.g., 'spring-boot', 'react', 'airflow'
  language: string // primary language
  status: RepoStatus
  commitSha: string // HEAD commit SHA at analysis time
  lastAnalyzed: string | null // ISO date
  error: string | null
  fileCount: number
}

export interface CloneProgress {
  stage: 'counting' | 'compressing' | 'receiving' | 'resolving' | 'done'
  progress: number // 0-100
  detail: string
}

export interface BranchInfo {
  name: string
  current: boolean
}

// === Analysis Result Types ===

export interface AnalysisResult {
  repoId: string
  repoType: RepoType
  framework: string
  language: string
  commitSha: string
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
  components: ComponentInfo[] // FE repos
  pipelines: PipelineInfo[] // DE repos
  fileTree: FileNode[]
  stats: AnalysisStats
  documentation: string // AI-generated markdown overview
}

export interface CodeEntity {
  id: string // `${filePath}:${name}:${line}`
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
  filePath: string
  line: number
  endLine: number
  decorators: string[]
  parameters: { name: string; type: string }[]
  returnType: string
  summary: string // AI-generated or extracted docstring
  parentId: string | null // for methods within classes
}

export interface CallEdge {
  id: string
  callerId: string // CodeEntity.id
  calleeId: string // CodeEntity.id
  filePath: string
  line: number
  type: 'call' | 'import' | 'inject' | 'route' | 'inferred'
}

export interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  path: string
  handlerName: string
  controllerName: string
  filePath: string
  line: number
  fullPath: string // controller base path + method path
}

export interface ComponentInfo {
  name: string
  filePath: string
  children: string[] // child component names rendered in JSX
  props: string[]
  hooks: string[]
  isRoute: boolean
  routePath: string | null
  imports: string[]
}

export interface PipelineInfo {
  id: string
  name: string // DAG ID or script name
  type: 'airflow-dag' | 'dbt-model' | 'spark-job' | 'trigger-script'
  filePath: string
  schedule: string | null
  tasks: PipelineTask[]
  dependencies: { upstream: string; downstream: string }[]
}

export interface PipelineTask {
  id: string
  name: string
  operator: string // PythonOperator, BashOperator, etc.
  filePath: string
  line: number
}

// === File Tree Types ===

export interface FileNode {
  name: string
  path: string // relative to repo root
  type: 'file' | 'directory'
  language: string | null // detected from extension
  children: FileNode[] // only for directories
  size: number // bytes
}

export interface FileContent {
  content: string
  language: string
  path: string
  lineCount: number
}

// === Flow Visualization Types ===

export type FlowNodeType =
  | 'controller'
  | 'service'
  | 'repository'
  | 'database'
  | 'middleware'
  | 'component'
  | 'route'
  | 'dag'
  | 'task'
  | 'model'

export interface FlowNodeData {
  label: string
  type: FlowNodeType
  entityId: string
  filePath: string
  line: number
  summary: string
  icon: string // lucide icon name
}

export interface FlowEdgeData {
  label: string
  type: CallEdge['type']
  animated: boolean
}

// === Q&A Types ===

export interface QAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: QASource[]
  timestamp: string
}

export interface QASource {
  path: string
  line: number
  snippet: string
}

// === Export Types ===

export type ExportFormat = 'markdown' | 'pdf' | 'plaintext'

export interface ExportOptions {
  format: ExportFormat
  sections: string[] // section IDs to include
  includeFlowDiagrams: boolean
  includeMermaid: boolean
}

// === Stats Types ===

export interface AnalysisStats {
  totalFiles: number
  totalLines: number
  languages: { language: string; fileCount: number; lineCount: number }[]
  entityCount: { kind: string; count: number }[]
  routeCount: number
  componentCount: number
  pipelineCount: number
}

// === Analysis Progress ===

export interface AnalysisProgress {
  phase: 'cloning' | 'scanning' | 'parsing' | 'indexing' | 'documenting' | 'done'
  progress: number // 0-100
  detail: string
  filesProcessed: number
  totalFiles: number
}

// === Repo Detection ===

export interface RepoClassification {
  type: RepoType
  framework: string
  language: string
  confidence: number // 0-1
  entryPoints: string[]
  signals: string[] // human-readable reasons
}
