# Phase 13: Codebase Analyzer - Architecture Research

**Researched:** 2026-03-14
**Domain:** Multi-language static code analysis, AST parsing, documentation generation
**Confidence:** MEDIUM-HIGH

## Summary

The Codebase Analyzer plugin needs to analyze git repositories across three domains (Backend, Frontend, Data Engineering), extract structural information (controllers, components, pipelines), build call graphs, and generate documentation. The key architectural decision is **choosing between regex-based pattern matching and AST-based parsing** for code analysis.

The recommended approach is a **two-tier strategy**: use regex/glob-based heuristics for repo type detection (fast, no dependencies), and use `@babel/parser` + `@babel/traverse` for JS/TS/JSX/TSX deep analysis (component trees, call graphs) since Babel is already an implicit dependency via the Vite/electron-vite build toolchain. For Java/Python/Go, use regex-based annotation/pattern extraction rather than full AST parsing to avoid the complexity of native module compilation (tree-sitter) or WASM distribution (web-tree-sitter).

**Primary recommendation:** Regex for detection + Babel AST for JS/TS deep analysis + regex patterns for Java/Python/Go annotation extraction. Cache results in better-sqlite3 keyed by `repo+branch+commitHash`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@babel/parser` | ^7.x | Parse JS/TS/JSX/TSX into AST | Already in build toolchain, best JS/TS parser, full TypeScript + JSX support |
| `@babel/traverse` | ^7.x | Walk AST nodes with visitor pattern | Pairs with @babel/parser, battle-tested |
| `better-sqlite3` | ^12.6.2 | Cache analysis results | Already used by project (Nebula plugin) |
| `simple-git` | ^3.x | Git operations (branch, log, diff, file listing) | Most popular Node.js git wrapper, no native deps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `glob` / `fast-glob` | latest | File discovery by pattern | Finding source files in repo structure |
| `mermaid` | ^11.12.3 | Render call graphs and component trees | Already in project deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex for Java/Python/Go | tree-sitter (native) | Accurate AST but requires native module rebuild for Electron, adds build complexity |
| Regex for Java/Python/Go | web-tree-sitter (WASM) | No native deps but ~10MB WASM files per language, slower parsing |
| @babel/parser | TypeScript compiler API | More accurate types but significantly slower, heavier API |
| simple-git | isomorphic-git | Pure JS but less feature-complete, worse performance on large repos |

**Installation:**
```bash
npm install @babel/parser @babel/traverse simple-git fast-glob
npm install -D @types/babel__traverse
```

## Architecture Patterns

### Recommended Project Structure

Following the established Zenith plugin pattern (see Nebula, DbInspector):

```
src/
  main/
    codebase-analyzer/
      analyzer.ts           # Core analysis orchestrator (main process)
      detectors/
        repo-detector.ts    # BE/FE/DE classification
        be-detector.ts      # Backend framework detection
        fe-detector.ts      # Frontend framework detection
        de-detector.ts      # Data engineering detection
      extractors/
        java-extractor.ts   # Spring controller/service extraction
        node-extractor.ts   # Express/NestJS route extraction
        python-extractor.ts # Flask/Django/FastAPI extraction
        go-extractor.ts     # Go HTTP handler extraction
        react-extractor.ts  # Component tree + routes (Babel AST)
        airflow-extractor.ts# DAG/task extraction
        dbt-extractor.ts    # dbt model lineage
      graph/
        call-graph.ts       # Function call graph builder
        component-tree.ts   # React component hierarchy
      cache/
        analysis-cache.ts   # SQLite cache layer (better-sqlite3)
      git/
        git-ops.ts          # Git operations wrapper (simple-git)
  preload/
    index.ts                # Add codebaseAnalyzer namespace
  renderer/
    src/
      plugins/
        codebase-analyzer/
          CodebaseAnalyzerView.tsx  # Main view
          RepoSelector.tsx          # Directory picker + repo info
          AnalysisResults.tsx       # Results display
          CallGraphView.tsx         # Mermaid-based call graph
          ComponentTreeView.tsx     # Component hierarchy
          PipelineView.tsx          # DAG/pipeline visualization
      stores/
        codebase-analyzer-store.ts  # Zustand store
      types/
        codebase-analyzer.ts        # Type definitions
```

### Pattern 1: Repo Type Detection (Glob + Heuristic)

**What:** Classify a repo as BE/FE/DE by checking for signature files and patterns.
**When to use:** First step after user selects a repo directory.

```typescript
// src/main/codebase-analyzer/detectors/repo-detector.ts

interface RepoClassification {
  type: 'backend' | 'frontend' | 'data-engineering' | 'fullstack' | 'unknown'
  framework: string       // e.g., 'spring-boot', 'react', 'airflow'
  language: string         // e.g., 'java', 'typescript', 'python'
  confidence: number       // 0-1
  entryPoints: string[]    // Key files found
}

const FE_SIGNALS = [
  { glob: '**/App.{tsx,jsx,ts,js}', weight: 0.3 },
  { glob: '**/package.json', content: /"react"/, weight: 0.4 },
  { glob: '**/angular.json', weight: 0.5 },
  { glob: '**/vue.config.{js,ts}', weight: 0.5 },
  { glob: '**/next.config.{js,ts,mjs}', weight: 0.5 },
]

const BE_SIGNALS = [
  { glob: '**/pom.xml', content: /spring-boot/, weight: 0.5 },
  { glob: '**/build.gradle', content: /spring/, weight: 0.5 },
  { glob: '**/app.{py}', content: /Flask|FastAPI/, weight: 0.5 },
  { glob: '**/manage.py', weight: 0.4 },        // Django
  { glob: '**/go.mod', weight: 0.3 },
  { glob: '**/server.{ts,js}', content: /express/, weight: 0.4 },
]

const DE_SIGNALS = [
  { glob: '**/dags/**/*.py', weight: 0.5 },
  { glob: '**/airflow.cfg', weight: 0.6 },
  { glob: '**/dbt_project.yml', weight: 0.6 },
  { glob: '**/models/**/*.sql', weight: 0.3 },   // dbt models
  { glob: '**/*_dag.py', weight: 0.4 },
  { glob: '**/spark-submit*', weight: 0.3 },
]
```

### Pattern 2: Controller/API Extraction (Regex-Based)

**What:** Extract API endpoints from backend source files using language-specific regex patterns.
**When to use:** After repo is classified as backend.

```typescript
// src/main/codebase-analyzer/extractors/java-extractor.ts

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  handlerName: string
  filePath: string
  lineNumber: number
  className?: string
}

// Java Spring patterns
const JAVA_PATTERNS = {
  classMapping: /@RequestMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g,
  getMapping:   /@GetMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g,
  postMapping:  /@PostMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g,
  putMapping:   /@PutMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g,
  deleteMapping:/@DeleteMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/g,
  controller:   /@(Rest)?Controller/g,
  methodName:   /(?:public|private|protected)\s+\w+(?:<[^>]+>)?\s+(\w+)\s*\(/g,
}

// Python Flask/FastAPI patterns
const PYTHON_PATTERNS = {
  flaskRoute:    /@app\.route\s*\(\s*['"]([^'"]+)['"]/g,
  fastapiGet:    /@(?:app|router)\.get\s*\(\s*['"]([^'"]+)['"]/g,
  fastapiPost:   /@(?:app|router)\.post\s*\(\s*['"]([^'"]+)['"]/g,
  djangoPath:    /path\s*\(\s*['"]([^'"]+)['"]/g,
  functionDef:   /def\s+(\w+)\s*\(/g,
}

// Node.js Express/NestJS patterns
const NODE_PATTERNS = {
  expressRoute:  /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
  nestDecorator: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"]?([^'")\s]*)/g,
  nestController:/@Controller\s*\(\s*['"]([^'"]+)['"]/g,
}

// Go patterns
const GO_PATTERNS = {
  httpHandle:    /http\.HandleFunc\s*\(\s*"([^"]+)"/g,
  ginRoute:      /\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*"([^"]+)"/g,
  chiRoute:      /r\.(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/g,
  funcDef:       /func\s+(\w+)\s*\(/g,
}
```

### Pattern 3: React Component Tree Extraction (Babel AST)

**What:** Parse JSX/TSX to build component hierarchy and extract routes.
**When to use:** For React/Next.js frontend repos.

```typescript
// src/main/codebase-analyzer/extractors/react-extractor.ts
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'

interface ComponentNode {
  name: string
  filePath: string
  children: string[]        // Component names rendered in JSX
  props: string[]           // Prop names received
  imports: string[]         // Imported component names
  hooks: string[]           // React hooks used (useState, useEffect, etc.)
  isRoute?: boolean
  routePath?: string
}

function parseComponentFile(code: string, filePath: string): ComponentNode {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx', 'decorators-legacy'],
  })

  const component: ComponentNode = {
    name: '',
    filePath,
    children: [],
    props: [],
    imports: [],
    hooks: [],
  }

  traverse(ast, {
    // Extract default export function name
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration
      if (decl.type === 'FunctionDeclaration' && decl.id) {
        component.name = decl.id.name
      }
    },

    // Extract JSX children (component references)
    JSXOpeningElement(path) {
      const name = path.node.name
      if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
        component.children.push(name.name)
      }
    },

    // Extract imports
    ImportDeclaration(path) {
      path.node.specifiers.forEach((spec) => {
        if (spec.local.name && /^[A-Z]/.test(spec.local.name)) {
          component.imports.push(spec.local.name)
        }
      })
    },

    // Extract React hooks usage
    CallExpression(path) {
      const callee = path.node.callee
      if (callee.type === 'Identifier' && callee.name.startsWith('use')) {
        component.hooks.push(callee.name)
      }
    },
  })

  return component
}

// Extract React Router routes from App.tsx or routes file
function extractRoutes(code: string): { path: string; component: string }[] {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })

  const routes: { path: string; component: string }[] = []

  traverse(ast, {
    JSXOpeningElement(path) {
      const name = path.node.name
      if (name.type === 'JSXIdentifier' && name.name === 'Route') {
        let routePath = ''
        let element = ''
        path.node.attributes.forEach((attr) => {
          if (attr.type === 'JSXAttribute') {
            if (attr.name.name === 'path' && attr.value?.type === 'StringLiteral') {
              routePath = attr.value.value
            }
          }
        })
        if (routePath) {
          routes.push({ path: routePath, component: element })
        }
      }
    },
  })

  return routes
}
```

### Pattern 4: Call Graph Construction (Cross-File Reference Resolution)

**What:** Trace call chains from controller -> service -> repository.
**When to use:** After extracting controllers/endpoints.

```typescript
// src/main/codebase-analyzer/graph/call-graph.ts

interface CallGraphNode {
  id: string
  name: string
  type: 'controller' | 'service' | 'repository' | 'utility' | 'unknown'
  filePath: string
  calls: string[]  // IDs of nodes this node calls
}

interface CallGraph {
  nodes: Map<string, CallGraphNode>
  edges: { source: string; target: string; label?: string }[]
}

/**
 * Strategy: For JS/TS use Babel AST to resolve imports and trace calls.
 * For Java/Python/Go use regex to find class instantiation / injection patterns.
 *
 * Java: @Autowired, constructor injection, field injection
 * Python: function calls matching imported names
 * Node: require/import statements + function calls
 */

// Java: detect Spring dependency injection
const JAVA_INJECTION_PATTERNS = {
  autowired:     /@Autowired\s+(?:private\s+)?(\w+)\s+(\w+)/g,
  constructor:   /(?:private|final)\s+(\w+)\s+(\w+)/g,  // In constructor params
  serviceAnnot:  /@Service|@Repository|@Component/g,
}

// For JS/TS: Babel-based import resolution
function resolveImportedSymbols(ast: any): Map<string, string> {
  const symbolToFile = new Map<string, string>()
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value
      path.node.specifiers.forEach((spec) => {
        symbolToFile.set(spec.local.name, source)
      })
    },
  })
  return symbolToFile
}
```

### Pattern 5: IPC Bridge (Following Zenith Conventions)

**What:** Wire main-process analysis to renderer via IPC.
**When to use:** Standard pattern for all plugin functionality.

```typescript
// In preload/index.ts - add codebaseAnalyzer namespace
codebaseAnalyzer: {
  selectRepo: (): Promise<{ canceled: boolean; path: string }> =>
    ipcRenderer.invoke('codebaseAnalyzer:selectRepo'),
  analyzeRepo: (repoPath: string, branch?: string): Promise<AnalysisResult> =>
    ipcRenderer.invoke('codebaseAnalyzer:analyzeRepo', repoPath, branch),
  getAnalysisStatus: (repoPath: string): Promise<AnalysisStatus> =>
    ipcRenderer.invoke('codebaseAnalyzer:getAnalysisStatus', repoPath),
  getCachedAnalysis: (repoPath: string, commitHash: string): Promise<AnalysisResult | null> =>
    ipcRenderer.invoke('codebaseAnalyzer:getCachedAnalysis', repoPath, commitHash),
  clearCache: (repoPath: string): Promise<void> =>
    ipcRenderer.invoke('codebaseAnalyzer:clearCache', repoPath),
  // Progress streaming
  onAnalysisProgress: (cb: (data: { phase: string; progress: number; detail: string }) => void): void => {
    ipcRenderer.on('codebaseAnalyzer:progress', (_e, data) => cb(data))
  },
  removeProgressListeners: (): void => {
    ipcRenderer.removeAllListeners('codebaseAnalyzer:progress')
  },
  exportDocs: (repoPath: string, format: 'markdown' | 'pdf'): Promise<{ filePath: string | null }> =>
    ipcRenderer.invoke('codebaseAnalyzer:exportDocs', repoPath, format),
}
```

### Pattern 6: Caching Architecture (SQLite)

**What:** Cache analysis results to avoid re-parsing unchanged repos.
**When to use:** Every analysis operation should check cache first.

```typescript
// src/main/codebase-analyzer/cache/analysis-cache.ts
import Database from 'better-sqlite3'

/**
 * Cache key: repoPath + branch + commitHash
 * This ensures cache invalidation on any commit.
 *
 * SQLite schema following Nebula's patterns (WAL mode, prepared statements).
 */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS analysis_cache (
    id          TEXT PRIMARY KEY,          -- sha256(repoPath + branch + commitHash)
    repo_path   TEXT NOT NULL,
    branch      TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    repo_type   TEXT NOT NULL,             -- 'backend' | 'frontend' | 'data-engineering' | 'fullstack'
    framework   TEXT NOT NULL,             -- 'spring-boot' | 'react' | 'airflow' etc.
    language    TEXT NOT NULL,
    result_json TEXT NOT NULL,             -- Full serialized AnalysisResult
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT,                      -- Optional TTL
    UNIQUE(repo_path, branch, commit_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_cache_repo ON analysis_cache(repo_path);
  CREATE INDEX IF NOT EXISTS idx_cache_commit ON analysis_cache(commit_hash);

  -- Separate table for individual file analysis (granular cache)
  CREATE TABLE IF NOT EXISTS file_analysis_cache (
    id          TEXT PRIMARY KEY,
    cache_id    TEXT NOT NULL REFERENCES analysis_cache(id) ON DELETE CASCADE,
    file_path   TEXT NOT NULL,
    file_hash   TEXT NOT NULL,             -- sha256 of file content
    analysis    TEXT NOT NULL,             -- Serialized per-file analysis
    UNIQUE(cache_id, file_path)
  );

  CREATE INDEX IF NOT EXISTS idx_file_cache ON file_analysis_cache(cache_id);
`;

class AnalysisCache {
  private db: Database.Database

  constructor(storagePath: string) {
    this.db = new Database(path.join(storagePath, 'codebase-analyzer.db'))
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA)
  }

  get(repoPath: string, branch: string, commitHash: string): AnalysisResult | null {
    const row = this.db.prepare(
      'SELECT result_json FROM analysis_cache WHERE repo_path = ? AND branch = ? AND commit_hash = ?'
    ).get(repoPath, branch, commitHash)
    return row ? JSON.parse(row.result_json) : null
  }

  set(repoPath: string, branch: string, commitHash: string, result: AnalysisResult): void {
    const id = createHash('sha256').update(`${repoPath}:${branch}:${commitHash}`).digest('hex')
    this.db.prepare(`
      INSERT OR REPLACE INTO analysis_cache (id, repo_path, branch, commit_hash, repo_type, framework, language, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, repoPath, branch, commitHash, result.repoType, result.framework, result.language, JSON.stringify(result))
  }

  // Evict old entries (keep last 10 per repo)
  evict(repoPath: string): void {
    this.db.prepare(`
      DELETE FROM analysis_cache
      WHERE repo_path = ? AND id NOT IN (
        SELECT id FROM analysis_cache WHERE repo_path = ? ORDER BY created_at DESC LIMIT 10
      )
    `).run(repoPath, repoPath)
  }
}
```

### Pattern 7: Data Engineering Detection

**What:** Detect and parse Airflow DAGs, dbt models, and Spark pipelines.
**When to use:** After repo is classified as data-engineering.

```typescript
// src/main/codebase-analyzer/extractors/airflow-extractor.ts

interface DAGInfo {
  dagId: string
  filePath: string
  schedule: string | null
  tasks: TaskInfo[]
  dependencies: { upstream: string; downstream: string }[]
}

interface TaskInfo {
  taskId: string
  operator: string      // e.g., 'PythonOperator', 'BashOperator'
  pythonCallable?: string
  bashCommand?: string
}

// Regex patterns for Airflow DAG extraction (Python files)
const AIRFLOW_PATTERNS = {
  dagDef:        /DAG\s*\(\s*['"]([^'"]+)['"]/g,
  dagDecorator:  /@dag\s*(?:\(([^)]*)\))?/g,
  taskDef:       /(\w+)\s*=\s*(\w+Operator)\s*\(\s*task_id\s*=\s*['"]([^'"]+)['"]/g,
  taskDecorator: /@task\s*(?:\(([^)]*)\))?/g,
  dependency:    /(\w+)\s*>>\s*(\w+)/g,               // task1 >> task2
  dependencyList:/(\w+)\s*>>\s*\[([^\]]+)\]/g,         // task1 >> [task2, task3]
  schedule:      /schedule(?:_interval)?\s*=\s*['"]([^'"]+)['"]/g,
}

// dbt model lineage
const DBT_PATTERNS = {
  ref:           /\{\{\s*ref\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g,    // {{ ref('model_name') }}
  source:        /\{\{\s*source\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g,
  config:        /\{\{\s*config\s*\(\s*([^)]+)\s*\)\s*\}\}/g,
}
```

### Anti-Patterns to Avoid

- **Full AST for all languages in Electron:** Do NOT try to use tree-sitter native bindings. They require C++ compilation against Electron's Node headers and will break on every Electron version update. Use regex for non-JS/TS languages.
- **Synchronous file reading in renderer:** All file I/O MUST happen in main process via IPC. Never use `fs` in renderer (sandbox=true enforced).
- **Parsing entire repo at once:** Large repos (10k+ files) will freeze the main process. Use chunked async processing with progress reporting.
- **Caching without commit hash:** Branch name alone is insufficient. Always include commitHash to ensure cache freshness.
- **Storing analysis results in electron-store:** Use SQLite (better-sqlite3) for structured data. electron-store is for simple key-value settings only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git operations | Shell exec `git` commands | `simple-git` | Cross-platform, handles edge cases, proper error types |
| JS/TS AST parsing | Custom tokenizer/regex | `@babel/parser` + `@babel/traverse` | Complete language support including JSX, TS, decorators |
| Diagram rendering | Canvas-based graph renderer | `mermaid` (already in deps) | Declarative, exportable, already integrated |
| File glob matching | Recursive `fs.readdir` | `fast-glob` | Handles gitignore, symlinks, performance on large trees |
| Caching layer | JSON files on disk | `better-sqlite3` | ACID, queryable, already proven in project |
| Crypto hashing | Custom hash | Node.js `crypto.createHash` | Built-in, no dependencies |

## Common Pitfalls

### Pitfall 1: Electron Native Module Hell
**What goes wrong:** Adding tree-sitter (native C++ module) alongside better-sqlite3 creates double rebuild pain on every Electron update.
**Why it happens:** Each native module must be compiled against Electron's specific Node ABI version.
**How to avoid:** Use regex for Java/Python/Go extraction. Only use Babel (pure JS) for JS/TS.
**Warning signs:** `npm rebuild` failures, `MODULE_NOT_FOUND` errors after Electron upgrade.

### Pitfall 2: Main Process Blocking
**What goes wrong:** Parsing a large repo (Spring monolith with 5000+ Java files) blocks the main process for 30+ seconds, freezing the entire Electron UI.
**Why it happens:** better-sqlite3 is synchronous, and file reading + regex matching is CPU-bound.
**How to avoid:** Process files in batches of 50-100, yield to event loop between batches using `setImmediate()`, send progress events to renderer.
**Warning signs:** UI becomes unresponsive during analysis.

### Pitfall 3: Regex False Positives
**What goes wrong:** Regex patterns match inside comments, strings, or test files.
**Why it happens:** Regex can't distinguish code context from comments/strings.
**How to avoid:** Strip comments before regex matching (simple line-based comment removal). Exclude `test/`, `__tests__/`, `*_test.go`, `*Test.java` directories by default. Allow user to configure exclusion patterns.
**Warning signs:** Duplicate or phantom endpoints in results.

### Pitfall 4: Monorepo Structure
**What goes wrong:** A monorepo contains both FE and BE, but detection picks only one type.
**Why it happens:** Single-pass detection stops at first strong signal.
**How to avoid:** Score ALL signal types independently. If both BE and FE scores exceed threshold, classify as `fullstack` and analyze each subtree separately.
**Warning signs:** Missing frontend components in a Spring + React monorepo.

### Pitfall 5: Relative Import Resolution
**What goes wrong:** Call graph has broken edges because imports like `../../services/UserService` can't be resolved.
**Why it happens:** No tsconfig/jsconfig path alias resolution.
**How to avoid:** Read `tsconfig.json` / `jsconfig.json` paths and baseUrl. Use Node's resolution algorithm for relative imports. For Java, map package declarations to file paths.
**Warning signs:** Orphan nodes in call graph.

### Pitfall 6: IPC Payload Size
**What goes wrong:** Analysis result for a large repo exceeds Electron's IPC serialization limits or causes OOM.
**Why it happens:** Full analysis result with source code snippets can be 50MB+.
**How to avoid:** Store results in SQLite, return only summary via IPC. Load details on-demand (lazy loading per file/component).
**Warning signs:** `ERR_IPC_CHANNEL_CLOSED`, renderer crash.

## Code Examples

### Git Operations with simple-git

```typescript
// src/main/codebase-analyzer/git/git-ops.ts
import simpleGit, { SimpleGit } from 'simple-git'

async function getRepoInfo(repoPath: string) {
  const git: SimpleGit = simpleGit(repoPath)

  const [branch, log, status] = await Promise.all([
    git.branch(),
    git.log({ maxCount: 1 }),
    git.status(),
  ])

  return {
    currentBranch: branch.current,
    latestCommitHash: log.latest?.hash ?? '',
    latestCommitMessage: log.latest?.message ?? '',
    isDirty: !status.isClean(),
  }
}

// List all tracked source files (respects .gitignore)
async function listSourceFiles(repoPath: string, extensions: string[]): Promise<string[]> {
  const git = simpleGit(repoPath)
  const result = await git.raw(['ls-files', '--cached', '--others', '--exclude-standard'])
  return result
    .split('\n')
    .filter(Boolean)
    .filter((f) => extensions.some((ext) => f.endsWith(ext)))
}
```

### Chunked File Processing (Non-Blocking)

```typescript
// Process files in batches to avoid blocking main process
async function processFilesInBatches<T>(
  files: string[],
  processor: (file: string) => T,
  batchSize: number = 50,
  onProgress?: (processed: number, total: number) => void
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const batchResults = batch.map(processor)
    results.push(...batchResults)

    onProgress?.(Math.min(i + batchSize, files.length), files.length)

    // Yield to event loop between batches
    await new Promise((resolve) => setImmediate(resolve))
  }

  return results
}
```

### Zustand Store Pattern (Following Nebula Pattern)

```typescript
// src/renderer/src/stores/codebase-analyzer-store.ts
import { create } from 'zustand'

interface CodebaseAnalyzerState {
  // State
  repoPath: string | null
  repoInfo: RepoInfo | null
  analysisResult: AnalysisResult | null
  isAnalyzing: boolean
  progress: { phase: string; progress: number; detail: string } | null
  error: string | null

  // Actions
  selectRepo: () => Promise<void>
  analyzeRepo: () => Promise<void>
  cancelAnalysis: () => void
}

export const useCodebaseAnalyzerStore = create<CodebaseAnalyzerState>((set, get) => ({
  repoPath: null,
  repoInfo: null,
  analysisResult: null,
  isAnalyzing: false,
  progress: null,
  error: null,

  selectRepo: async () => {
    const result = await window.api.codebaseAnalyzer.selectRepo()
    if (!result.canceled) {
      set({ repoPath: result.path, analysisResult: null, error: null })
    }
  },

  analyzeRepo: async () => {
    const { repoPath } = get()
    if (!repoPath) return

    set({ isAnalyzing: true, error: null, progress: null })

    // Set up progress listener
    window.api.codebaseAnalyzer.onAnalysisProgress((data) => {
      set({ progress: data })
    })

    try {
      const result = await window.api.codebaseAnalyzer.analyzeRepo(repoPath)
      set({ analysisResult: result, isAnalyzing: false })
    } catch (err) {
      set({ error: (err as Error).message, isAnalyzing: false })
    } finally {
      window.api.codebaseAnalyzer.removeProgressListeners()
    }
  },

  cancelAnalysis: () => {
    // Cancel via IPC if needed
    set({ isAnalyzing: false })
  },
}))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tree-sitter native in Electron | web-tree-sitter WASM or regex | 2024+ | Avoids native module rebuild hell |
| Full repo parse | Incremental / cached analysis | Standard | Performance on large repos |
| Custom diagram rendering | Mermaid declarative syntax | 2022+ | Consistent, exportable diagrams |
| JSON file caching | SQLite (better-sqlite3) | Project standard | ACID, queryable, no corruption |

## Analysis Approach Decision Matrix

| Language | Detection | Extraction Method | Depth | Confidence |
|----------|-----------|-------------------|-------|------------|
| Java (Spring) | `pom.xml` + `@RestController` | Regex on annotations | Controller + Service layer | HIGH |
| TypeScript/JS (React) | `package.json` + `App.tsx` | Babel AST | Full component tree + call graph | HIGH |
| TypeScript/JS (Express/NestJS) | `package.json` + route patterns | Babel AST | Routes + middleware chain | HIGH |
| Python (Flask/FastAPI/Django) | `requirements.txt` + decorators | Regex on decorators | Routes + handler names | MEDIUM |
| Go (net/http, gin, chi) | `go.mod` + handler patterns | Regex on handler registration | Routes + handler functions | MEDIUM |
| Python (Airflow) | `dags/` dir + DAG class | Regex on operators + `>>` | DAG structure + task deps | MEDIUM |
| SQL (dbt) | `dbt_project.yml` + `{{ ref() }}` | Regex on Jinja macros | Model lineage graph | HIGH |

## Open Questions

1. **Large Monorepo Performance**
   - What we know: Batched processing + setImmediate prevents UI freeze
   - What's unclear: At what repo size (files) does analysis become impractically slow? Need to benchmark.
   - Recommendation: Add a file count warning at 10k+ files, offer to limit analysis to specific subdirectories

2. **Cross-Language Call Graph**
   - What we know: Within a single language (especially JS/TS via Babel), call graphs are reliable
   - What's unclear: How to trace calls across language boundaries (e.g., React frontend calling Spring REST API)
   - Recommendation: Match FE fetch/axios URLs to BE endpoint paths by string comparison. Flag as "inferred" connections.

3. **Dynamic Route Registration**
   - What we know: Static regex catches annotation-based and declarative routes
   - What's unclear: Dynamic routes (e.g., `routes.forEach(r => app.get(r.path, r.handler))`) are invisible to static analysis
   - Recommendation: Flag dynamic route patterns with a warning. Don't try to resolve them -- accept the limitation.

## Sources

### Primary (HIGH confidence)
- Zenith project source code -- plugin architecture patterns (Nebula, DbInspector)
- [@babel/parser official docs](https://babeljs.io/docs/babel-parser) -- JSX/TSX parsing capabilities
- [tree-sitter Node.js bindings](https://github.com/tree-sitter/node-tree-sitter) -- native vs WASM tradeoffs
- [Electron native modules docs](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules) -- rebuild requirements

### Secondary (MEDIUM confidence)
- [web-tree-sitter npm](https://www.npmjs.com/package/web-tree-sitter) -- WASM performance characteristics
- [Airflow DAG AST parsing](https://medium.com/apache-airflow/mastering-airflow-dag-standardization-with-pythons-ast-a-deep-dive-into-linting-at-scale-1396771a9b90) -- Python AST for DAG analysis
- [React component tree parsing with Babel](https://www.kevinpeters.net/visualizing-react-components-by-parsing-jsx-with-babel) -- JSX traversal patterns

### Tertiary (LOW confidence)
- Performance benchmarks for regex vs AST on large codebases (no formal benchmarks found, estimates based on general knowledge)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- @babel/parser is proven, simple-git is stable, better-sqlite3 is already in use
- Architecture: HIGH -- follows established Zenith plugin patterns exactly
- Detection patterns: MEDIUM -- regex patterns cover common cases but won't catch all variations
- Call graph depth: MEDIUM -- JS/TS via Babel is reliable, Java/Python/Go via regex is shallow
- Pitfalls: HIGH -- based on real Electron + native module experience in this project

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, 30-day validity)
