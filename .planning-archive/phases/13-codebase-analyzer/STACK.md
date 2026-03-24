# Phase 13: Codebase Analyzer - Stack Research

**Researched:** 2026-03-14
**Domain:** Code analysis, AST parsing, flow visualization, documentation generation
**Confidence:** HIGH

## Summary

This document covers the technology stack for building a Codebase Analyzer plugin inside Zenith, an Electron + React + TypeScript desktop app. The plugin must clone/fetch git repos, parse code to extract structure (controllers, APIs, routes, call graphs), visualize code flows as interactive diagrams, generate documentation, support AI-driven Q&A over codebases, and export docs in multiple formats.

The app runs with `sandbox: true` and `nodeIntegration: false` -- all Node.js / filesystem / child_process operations MUST happen in the main process, exposed to the renderer via IPC. This is an established pattern in Zenith (see: db operations, AI streaming, CLI spawning, PDF export). The codebase already has `mermaid@11`, `better-sqlite3`, `pdfmake`, `codemirror@6`, Vercel AI SDK streaming, and `react-force-graph-2d`.

**Primary recommendation:** Use `simple-git` in the main process via IPC for git operations, TypeScript Compiler API for TS/JS parsing (with `@babel/parser` as fallback for non-TS JS), `@xyflow/react` (React Flow v12) for interactive flow diagrams, existing `mermaid@11` for HLD diagrams, existing `codemirror@6` with additional language packages for code viewing, existing `pdfmake` for PDF export, and existing AI streaming infrastructure for code Q&A.

---

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `simple-git` | ^3.27 | Git clone, fetch, log, diff, branch ops | Battle-tested git wrapper (7.9M weekly downloads); spawns git binary which the main process can do freely; far more complete than isomorphic-git for real repo operations |
| `@xyflow/react` | ^12.10 | Interactive code flow diagrams (call graphs, API flows) | React-native node-based UI library; supports custom nodes, edges, minimap, zoom/pan; works with dagre/elkjs for auto-layout |
| `@dagrejs/dagre` | ^1.1 | Auto-layout for flow diagrams | Standard hierarchical graph layout; works directly with React Flow |
| `@codemirror/lang-javascript` | ^6.x | JS/TS syntax highlighting in code viewer | Already using CM6 for SQL; same ecosystem, just add language packs |
| `@codemirror/lang-java` | ^6.x | Java syntax highlighting | For backend repos |
| `@codemirror/lang-python` | ^6.x | Python syntax highlighting | For data engineering repos |

### Already Available (No Install Needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `mermaid` | ^11.12 | HLD diagram rendering | Already installed, MermaidRenderer component exists |
| `better-sqlite3` | ^12.6 | Cache analysis results per repo+branch | Already installed, NebulaDatabase pattern exists |
| `pdfmake` | ^0.3.5 | PDF export of documentation | Already installed, pdf-generator.ts pattern exists |
| `ai` (Vercel AI SDK) | ^6.0 | AI streaming for code Q&A | Already installed, streamAnalysis() function exists |
| `codemirror` | ^6.0 | Code editor/viewer base | Already installed for SQL |
| `react-force-graph-2d` | ^1.29 | Dependency graph visualization (optional) | Already installed for Nebula |
| `typescript` | ^5.9 | TypeScript Compiler API for AST parsing | Already a devDependency; move to dependencies for runtime use |
| `lucide-react` | ^0.475 | Icons | Already installed |
| `zustand` | ^5.0 | State management | Already installed |
| `framer-motion` | ^12.5 | Animations | Already installed |
| `react-resizable-panels` | ^4.7 | Panel layouts | Already installed |
| `zod` | ^3.25 | Schema validation | Already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `simple-git` | `isomorphic-git` | Pure JS (no git binary needed), but incomplete git support (no submodules, limited log, slower for large repos, maintainer left project). simple-git is better for a desktop app where git is almost certainly installed. |
| `simple-git` | `child_process` + raw git | More control but you'd hand-roll every git command, error handling, output parsing. simple-git does this already. |
| TypeScript Compiler API | `tree-sitter` | Tree-sitter is faster for incremental parsing and supports 100+ languages, but requires native WASM bindings, adds build complexity in Electron, and the TS Compiler API gives type-aware analysis for free. |
| TypeScript Compiler API | `@babel/parser` | Babel is faster for pure parsing but has no type checker -- you lose the ability to resolve imports, follow type references, and build accurate call graphs. Use Babel only as fallback for plain JS files. |
| `@xyflow/react` | `d3.js` | D3 gives lower-level control but requires building node rendering, interaction, layout from scratch. React Flow is purpose-built for this exact use case. |
| `@xyflow/react` | `mermaid` diagrams | Mermaid is already used for static HLD; it lacks interactivity (hover, click, expand). Use both: Mermaid for exportable HLD, React Flow for interactive exploration. |
| CodeMirror 6 | Shiki | Shiki produces beautiful static HTML (VS Code grammars), good for read-only. But CM6 is already in the app, supports the same languages, and adds selection, search, folding for free. No reason to add a second highlighting engine. |
| CodeMirror 6 | Prism.js | Prism is lightweight but less accurate than CM6's Lezer-based parsing. CM6 is already a dependency. |

### Installation

```bash
npm install simple-git @xyflow/react @dagrejs/dagre @codemirror/lang-javascript @codemirror/lang-java @codemirror/lang-python
```

Note: `typescript` is already installed as devDependency. For runtime AST parsing in the main process, it needs to be accessible at runtime -- since electron-vite uses `externalizeDepsPlugin()` for the main process build, devDependencies listed in package.json ARE available at runtime in Electron's main process (they're not bundled, they're required from node_modules). No change needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
  main/
    codebase-analyzer/
      git-service.ts          # simple-git operations (clone, fetch, log, diff, branches)
      parser/
        index.ts              # Parser orchestrator (detects language, dispatches)
        ts-parser.ts          # TypeScript Compiler API: extract classes, functions, routes, call graph
        java-parser.ts        # Regex/heuristic parser for Java controllers, endpoints
        python-parser.ts      # Regex/heuristic parser for Python routes, functions
        common-types.ts       # Shared AST output types (CodeEntity, CallEdge, Route, etc.)
      analyzer.ts             # Orchestrates: parse all files -> build code graph -> cache results
      cache-db.ts             # better-sqlite3 cache for analysis results per repo+branch+commit
      doc-generator.ts        # Generate markdown documentation from analysis
      mermaid-generator.ts    # Generate Mermaid syntax for HLD diagrams
      ipc-handlers.ts         # IPC handlers: codebase:* channels
  renderer/
    src/
      plugins/
        codebase-analyzer/
          CodebaseAnalyzerView.tsx    # Main plugin view (routed)
          RepoSetup.tsx               # Clone URL input, branch selector, repo type detection
          CodeExplorer.tsx            # File tree + code viewer (CodeMirror 6)
          FlowDiagram.tsx             # React Flow interactive diagram
          HLDDiagram.tsx              # Mermaid HLD renderer (reuse MermaidRenderer)
          DocViewer.tsx               # Generated documentation viewer
          CodeQA.tsx                  # AI Q&A chat over codebase
          ExportPanel.tsx             # Export as MD/PDF/Plain Text
          components/
            FlowNode.tsx              # Custom React Flow node (function/class/route)
            FlowEdge.tsx              # Custom React Flow edge (call/import/route)
            FileTree.tsx              # Collapsible file tree
          stores/
            codebase-store.ts         # Zustand store for analyzer state
```

### Pattern 1: Main Process Service via IPC (Established)

**What:** All heavy operations (git, file I/O, AST parsing, SQLite caching) run in the main process. Renderer communicates via IPC invoke/send.

**When to use:** Always -- this is mandated by `sandbox: true`.

**Example:**
```typescript
// src/main/codebase-analyzer/ipc-handlers.ts
import { ipcMain } from 'electron'
import { GitService } from './git-service'
import { analyzeRepository } from './analyzer'

export function registerCodebaseHandlers(): void {
  const gitService = new GitService()

  ipcMain.handle('codebase:clone', async (_event, url: string, targetDir: string) => {
    return gitService.clone(url, targetDir)
  })

  ipcMain.handle('codebase:analyze', async (_event, repoPath: string, branch: string) => {
    return analyzeRepository(repoPath, branch)
  })

  ipcMain.handle('codebase:getFileContent', async (_event, repoPath: string, filePath: string) => {
    // Read file, return content + detected language
    const content = await fs.readFile(path.join(repoPath, filePath), 'utf-8')
    const lang = detectLanguage(filePath)
    return { content, language: lang }
  })
}

// src/preload/index.ts -- add to existing api object
codebase: {
  clone: (url: string, targetDir: string): Promise<CloneResult> =>
    ipcRenderer.invoke('codebase:clone', url, targetDir),
  analyze: (repoPath: string, branch: string): Promise<AnalysisResult> =>
    ipcRenderer.invoke('codebase:analyze', repoPath, branch),
  getFileContent: (repoPath: string, filePath: string): Promise<FileContent> =>
    ipcRenderer.invoke('codebase:getFileContent', repoPath, filePath),
}
```

### Pattern 2: TypeScript Compiler API for Code Analysis

**What:** Use `ts.createProgram()` to parse TS/JS files, walk the AST to extract functions, classes, call relationships, decorators (routes/controllers), and build a code graph.

**When to use:** For TypeScript and JavaScript codebases (most common target).

**Example:**
```typescript
// src/main/codebase-analyzer/parser/ts-parser.ts
import * as ts from 'typescript'

interface CodeEntity {
  id: string
  name: string
  kind: 'function' | 'class' | 'method' | 'route' | 'component'
  filePath: string
  line: number
  endLine: number
  decorators?: string[]
  parameters?: { name: string; type: string }[]
  returnType?: string
}

interface CallEdge {
  callerId: string
  calleeId: string
  filePath: string
  line: number
}

export function analyzeTypeScriptProject(rootDir: string, filesPaths: string[]): {
  entities: CodeEntity[]
  calls: CallEdge[]
} {
  const program = ts.createProgram(filesPaths, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: rootDir,
  })

  const checker = program.getTypeChecker()
  const entities: CodeEntity[] = []
  const calls: CallEdge[] = []

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue
    if (sourceFile.fileName.includes('node_modules')) continue

    visitNode(sourceFile, sourceFile, checker, entities, calls)
  }

  return { entities, calls }
}

function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  entities: CodeEntity[],
  calls: CallEdge[]
): void {
  // Extract function declarations
  if (ts.isFunctionDeclaration(node) && node.name) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    entities.push({
      id: `${sourceFile.fileName}:${node.name.text}`,
      name: node.name.text,
      kind: 'function',
      filePath: sourceFile.fileName,
      line: line + 1,
      endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
    })
  }

  // Extract call expressions
  if (ts.isCallExpression(node)) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const symbol = checker.getSymbolAtLocation(node.expression)
    if (symbol) {
      calls.push({
        callerId: '', // resolved by parent context
        calleeId: symbol.getName(),
        filePath: sourceFile.fileName,
        line: line + 1,
      })
    }
  }

  ts.forEachChild(node, child => visitNode(child, sourceFile, checker, entities, calls))
}
```

### Pattern 3: React Flow for Interactive Code Visualization

**What:** Render code entities as custom nodes, call relationships as edges. Support click-to-navigate, hover details, expand/collapse.

**When to use:** For the interactive flow diagram view.

**Example:**
```typescript
// src/renderer/src/plugins/codebase-analyzer/FlowDiagram.tsx
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'

const nodeTypes = { codeEntity: CodeEntityNode }

function layoutGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  nodes.forEach(n => g.setNode(n.id, { width: 220, height: 60 }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)

  return {
    nodes: nodes.map(n => {
      const pos = g.node(n.id)
      return { ...n, position: { x: pos.x - 110, y: pos.y - 30 } }
    }),
    edges,
  }
}

export function FlowDiagram({ entities, calls }: FlowDiagramProps) {
  const nodes: Node[] = entities.map(e => ({
    id: e.id,
    type: 'codeEntity',
    data: { label: e.name, kind: e.kind, filePath: e.filePath, line: e.line },
    position: { x: 0, y: 0 },
  }))

  const edges: Edge[] = calls.map((c, i) => ({
    id: `edge-${i}`,
    source: c.callerId,
    target: c.calleeId,
    animated: true,
  }))

  const laid = layoutGraph(nodes, edges)

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow nodes={laid.nodes} edges={laid.edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

### Pattern 4: AI Q&A via Existing streamAnalysis()

**What:** Reuse the existing `streamAnalysis()` function in the main process. Build a system prompt with code context (file contents, analysis results), send user questions, stream responses.

**When to use:** For the Code Q&A feature.

**Example:**
```typescript
// Build context from analysis cache + relevant file contents
const systemPrompt = `You are a codebase expert. You have access to the following code analysis:

Repository: ${repoName} (${repoType})
Branch: ${branch}

## Code Structure
${JSON.stringify(analysisResult.entities.slice(0, 100), null, 2)}

## Relevant Files
${relevantFiles.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}

Answer questions about this codebase accurately. Reference specific files, functions, and line numbers.`

// Use existing ai:startAnalysis IPC channel
window.api.ai.startAnalysis(providerId, modelName, systemPrompt, userQuestion, sessionId)
```

### Pattern 5: Caching with better-sqlite3

**What:** Cache analysis results in a SQLite database keyed by repo URL + branch + HEAD commit SHA. Invalidate when HEAD changes.

**When to use:** Always -- re-parsing entire repos is expensive.

**Example:**
```typescript
// src/main/codebase-analyzer/cache-db.ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

export class AnalysisCacheDB {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'codebase-analyzer.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        repo_url TEXT NOT NULL,
        branch TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        analysis_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (repo_url, branch)
      )
    `)
  }

  get(repoUrl: string, branch: string, currentSha: string): AnalysisResult | null {
    const row = this.db.prepare(
      'SELECT analysis_json FROM analysis_cache WHERE repo_url = ? AND branch = ? AND commit_sha = ?'
    ).get(repoUrl, branch, currentSha) as { analysis_json: string } | undefined

    return row ? JSON.parse(row.analysis_json) : null
  }

  set(repoUrl: string, branch: string, commitSha: string, result: AnalysisResult): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO analysis_cache (repo_url, branch, commit_sha, analysis_json)
      VALUES (?, ?, ?, ?)
    `).run(repoUrl, branch, commitSha, JSON.stringify(result))
  }
}
```

### Anti-Patterns to Avoid

- **Running git/fs in renderer:** Breaks with `sandbox: true`. Always go through IPC to main process.
- **Parsing node_modules:** Exclude `node_modules`, `.git`, `dist`, `build` from analysis. Filter early.
- **Loading entire repo into memory:** Parse files incrementally, stream results. Large repos (10K+ files) will OOM if you load everything.
- **Blocking main process during analysis:** Run analysis in chunks with `setImmediate()` between batches to keep the main process responsive.
- **Using TypeScript Compiler API for non-JS languages:** It only handles TS/JS. Use regex/heuristic parsers for Java, Python, etc.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git operations | Custom child_process git wrapper | `simple-git` | Handles auth, errors, output parsing, Windows path issues |
| Graph layout | Custom node positioning algorithm | `@dagrejs/dagre` | Hierarchical layout is a solved problem; hand-rolled looks bad |
| Mermaid rendering | Custom SVG generation | Existing `MermaidRenderer` component | Already built, tested, has zoom/pan |
| PDF export | Custom PDF builder | Existing `pdfmake` + pdf-generator.ts patterns | Already handles markdown-to-PDF, mermaid images |
| AI streaming | Custom fetch + SSE parsing | Existing `streamAnalysis()` via Vercel AI SDK | Already handles multiple providers, cancellation, token counting |
| Syntax highlighting | Custom tokenizer | CodeMirror 6 language packages | Grammar-accurate, already in the app |
| File type detection | Custom extension mapping | Simple extension map + `path.extname()` | Don't need a library for this; 10-line function |

**Key insight:** Zenith already has 70%+ of the infrastructure needed. The main new work is the TypeScript AST analysis, the React Flow visualization, and the glue code connecting everything.

---

## Common Pitfalls

### Pitfall 1: simple-git Hanging on Auth Prompts
**What goes wrong:** Cloning a private repo without credentials causes git to wait for password input, hanging the main process.
**Why it happens:** simple-git spawns git which opens a TTY prompt.
**How to avoid:** Set `GIT_TERMINAL_PROMPT=0` in the environment. Catch errors and surface "authentication required" to the UI. Support HTTPS URLs with tokens or SSH keys.
**Warning signs:** Clone operation never resolves.

### Pitfall 2: TypeScript Program Creation is Slow for Large Repos
**What goes wrong:** `ts.createProgram()` with 5000+ files takes 10-30 seconds and blocks the main process.
**Why it happens:** TypeScript resolves all imports, reads all files, builds the full type graph.
**How to avoid:** Parse in batches. Use `skipLibCheck: true`. Exclude test files, generated files, type declaration files from initial analysis. Show progress via IPC events. Consider using `ts.createSourceFile()` for quick single-file parsing when full type resolution isn't needed.
**Warning signs:** UI freezes during "Analyzing..." step.

### Pitfall 3: React Flow Performance with 500+ Nodes
**What goes wrong:** Rendering hundreds of nodes causes lag on pan/zoom.
**Why it happens:** Each node is a React component; too many cause re-render storms.
**How to avoid:** Implement hierarchical grouping (collapse a class's methods into one node). Paginate/filter the graph. Use React Flow's `nodeExtent` to limit visible area. Show max 100-200 nodes at once with expand-on-click.
**Warning signs:** Janky scrolling on the flow diagram.

### Pitfall 4: Mermaid Syntax Errors from Generated Diagrams
**What goes wrong:** Programmatically generated Mermaid syntax has special characters that break rendering.
**Why it happens:** Function names with generics (`<T>`), pipes, quotes, parentheses are Mermaid syntax characters.
**How to avoid:** Sanitize all labels. Replace `<>` with `[]`, escape quotes, use the existing `preprocessMermaid()` function. Wrap labels in quotes. Test generated syntax against mermaid.parse() before rendering.
**Warning signs:** MermaidRenderer shows "Diagram render error."

### Pitfall 5: AI Context Window Overflow for Large Codebases
**What goes wrong:** Sending the entire codebase analysis to AI exceeds token limits, gets truncated or errors.
**Why it happens:** A repo with 1000 files produces analysis JSON that's 100K+ tokens.
**How to avoid:** Send only relevant context. Use the user's question to select relevant files (filename/entity name matching). Limit to 10-20 most relevant files. Include analysis summary, not raw entity list. Consider chunking strategy: analysis metadata + targeted file contents.
**Warning signs:** AI responses are truncated or say "I don't have enough context."

### Pitfall 6: Cloned Repos Filling Disk
**What goes wrong:** Users clone large repos repeatedly, consuming gigabytes of disk space.
**Why it happens:** No cleanup strategy for old clones.
**How to avoid:** Store clones in a managed directory under `app.getPath('userData')`. Track cloned repos in SQLite. Implement "Remove Repository" that deletes the clone. Show disk usage. Use shallow clones (`--depth 1`) by default for analysis (full history not needed for code structure).
**Warning signs:** Disk usage complaints from users.

---

## Code Examples

### Git Service (Main Process)

```typescript
// src/main/codebase-analyzer/git-service.ts
import simpleGit, { SimpleGit } from 'simple-git'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export class GitService {
  private baseDir: string

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'codebase-repos')
  }

  async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
  }

  async clone(url: string, name: string): Promise<{ repoPath: string }> {
    await this.ensureBaseDir()
    const repoPath = path.join(this.baseDir, name)

    const git = simpleGit({
      baseDir: this.baseDir,
      maxConcurrentProcesses: 2,
    })

    // Shallow clone for analysis (faster, less disk)
    await git.clone(url, name, ['--depth', '100', '--single-branch'])
    return { repoPath }
  }

  async getBranches(repoPath: string): Promise<string[]> {
    const git = simpleGit(repoPath)
    const branches = await git.branch()
    return branches.all
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath)
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash ?? ''
  }

  async getFileTree(repoPath: string): Promise<string[]> {
    const git = simpleGit(repoPath)
    // ls-tree lists all tracked files
    const result = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD'])
    return result.split('\n').filter(Boolean)
  }
}
```

### Mermaid HLD Generation from Analysis

```typescript
// src/main/codebase-analyzer/mermaid-generator.ts

interface AnalysisResult {
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
}

export function generateHLDMermaid(analysis: AnalysisResult, repoType: string): string {
  const lines: string[] = ['flowchart TD']

  if (repoType === 'BE') {
    // Group by layer: Controllers -> Services -> Repositories
    const controllers = analysis.entities.filter(e => e.kind === 'route' || e.decorators?.some(d => d.includes('Controller')))
    const services = analysis.entities.filter(e => e.name.includes('Service') || e.name.includes('service'))

    lines.push('  subgraph Controllers')
    controllers.forEach(c => {
      const label = sanitizeMermaidLabel(c.name)
      lines.push(`    ${c.id}["${label}"]`)
    })
    lines.push('  end')

    lines.push('  subgraph Services')
    services.forEach(s => {
      const label = sanitizeMermaidLabel(s.name)
      lines.push(`    ${s.id}["${label}"]`)
    })
    lines.push('  end')

    // Add edges
    analysis.calls
      .filter(c => controllers.some(ctrl => ctrl.id === c.callerId) && services.some(svc => svc.id === c.calleeId))
      .forEach(c => lines.push(`  ${c.callerId} --> ${c.calleeId}`))
  }

  return lines.join('\n')
}

function sanitizeMermaidLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/</g, '[')
    .replace(/>/g, ']')
    .replace(/\|/g, ' - ')
}
```

### CodeMirror 6 Multi-Language Code Viewer

```typescript
// src/renderer/src/plugins/codebase-analyzer/CodeExplorer.tsx
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'

// Lazy-load language support to avoid large initial bundle
async function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'typescript':
    case 'javascript':
    case 'tsx':
    case 'jsx': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ typescript: lang.startsWith('t'), jsx: lang.endsWith('x') })
    }
    case 'java': {
      const { java } = await import('@codemirror/lang-java')
      return java()
    }
    case 'python': {
      const { python } = await import('@codemirror/lang-python')
      return python()
    }
    case 'sql': {
      const { sql } = await import('@codemirror/lang-sql')
      return sql()
    }
    case 'json': {
      const { json } = await import('@codemirror/lang-json')
      return json()
    }
    default:
      return [] // Plain text fallback
  }
}

// Usage: create a read-only editor view
async function createCodeViewer(container: HTMLElement, code: string, language: string) {
  const langExt = await getLanguageExtension(language)
  const state = EditorState.create({
    doc: code,
    extensions: [
      basicSetup,
      oneDark,
      langExt,
      EditorView.editable.of(false),           // Read-only
      EditorState.readOnly.of(true),
    ],
  })
  return new EditorView({ state, parent: container })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` (npm) | `@xyflow/react` (npm) | 2024 (v12) | Package renamed; old `reactflow` package still works but new features are on `@xyflow/react` |
| Mermaid 10 | Mermaid 11 | 2024 | New diagram types, better error handling; already on v11 in Zenith |
| `nodegit` (native bindings) | `simple-git` (spawns git) | Ongoing | nodegit has been effectively abandoned; simple-git is the standard |
| Custom PDF | `pdfmake` | Stable | Already in use in Zenith |
| Shiki (v0.x) | Shiki (v1+, `shiki`) | 2024 | Major rewrite, but not needed since CM6 is already in the app |

**Deprecated/outdated:**
- `nodegit`: Native git bindings, abandoned, doesn't work with modern Node/Electron versions
- `reactflow` (old package name): Redirects to `@xyflow/react`, still works but won't get updates
- `isomorphic-git`: Original maintainer left; two volunteers maintain it; incomplete feature set

---

## Repo Type Detection Strategy

The plugin needs to detect whether a repo is Backend (BE), Frontend (FE), or Data Engineering (DE). Use heuristic analysis of file patterns:

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` with react/angular/vue deps | FE | HIGH |
| `pom.xml` or `build.gradle` with Spring Boot | BE (Java) | HIGH |
| `requirements.txt` with flask/django/fastapi | BE (Python) | HIGH |
| `package.json` with express/nestjs/fastify | BE (Node) | HIGH |
| `dags/` folder + airflow imports | DE | HIGH |
| `*.sql` migration files + `dbt_project.yml` | DE | HIGH |
| `tsconfig.json` without react | BE (Node/TS) | MEDIUM |
| `Dockerfile` + `docker-compose.yml` | Any (supplemental signal) | LOW |

Implementation: Read key config files (`package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml`) in the main process, check for framework-specific dependencies, return detected type with confidence.

---

## AI Q&A Strategy: Context Window Approach (Not Embeddings)

For the code Q&A feature, use a **simple context-window approach** rather than embeddings/RAG:

**Why not embeddings:**
- Adds significant complexity (vector store, embedding model, chunking strategy)
- Overkill for a desktop tool analyzing one repo at a time
- The AI providers (OpenAI, Anthropic, Google) now have 100K-200K context windows
- Analysis metadata + targeted file contents fit comfortably in context

**Approach:**
1. Always include: repo type, file tree, entity summary (names + kinds + files)
2. On question: fuzzy-match question terms against entity names and file paths
3. Load top 10-20 matching files' content into the prompt
4. Send via existing `streamAnalysis()` infrastructure

**Token budget (example for 128K context):**
- System prompt + instructions: ~2K tokens
- Analysis summary (entities, routes): ~5-10K tokens
- Relevant file contents (10-20 files): ~20-50K tokens
- Leaves 66-100K for model reasoning + response

---

## Open Questions

1. **Java/Python parsing depth**
   - What we know: TypeScript Compiler API only works for TS/JS. Java and Python need different parsers.
   - What's unclear: How deep should Java/Python analysis go? Full AST, or regex-based extraction of controllers/routes/functions?
   - Recommendation: Start with regex/heuristic parsers for Java (Spring annotations) and Python (Flask/Django decorators). Upgrade to tree-sitter later if deeper analysis is needed. This avoids adding native WASM dependencies initially.

2. **Large monorepo performance**
   - What we know: TypeScript Compiler API can be slow for 5000+ files.
   - What's unclear: Exact performance characteristics in Electron's main process.
   - Recommendation: Implement file count limits (warn at 2000+, hard cap at 10000). Parse incrementally with progress events. Cache aggressively.

3. **Git authentication for private repos**
   - What we know: simple-git uses the system's git, which respects credential helpers, SSH keys, etc.
   - What's unclear: How to handle auth failures gracefully in the UI.
   - Recommendation: Set `GIT_TERMINAL_PROMPT=0`. Catch auth errors. Show a helpful message suggesting users configure git credentials via terminal first. Don't build a custom auth UI initially.

---

## Sources

### Primary (HIGH confidence)
- Zenith codebase analysis (direct code reading) -- project structure, existing patterns, dependencies
- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) -- AST analysis patterns
- [React Flow / @xyflow/react docs](https://reactflow.dev) -- node-based UI library
- [simple-git npm](https://www.npmjs.com/package/simple-git) -- 7.9M weekly downloads
- [Electron Sandboxing docs](https://www.electronjs.org/docs/latest/tutorial/sandbox) -- security model

### Secondary (MEDIUM confidence)
- [npm trends: isomorphic-git vs simple-git](https://npmtrends.com/isomorphic-git-vs-nodegit-vs-simple-git) -- adoption comparison
- [CodeMirror language discussion](https://discuss.codemirror.net/t/elegant-way-to-support-a-ton-of-languages/3600) -- multi-language support patterns
- [Mermaid Core API docs](https://deepwiki.com/mermaid-js/mermaid/2-core-api) -- programmatic rendering

### Tertiary (LOW confidence)
- [react-shiki](https://github.com/AVGVSTVS96/react-shiki) -- evaluated but not recommended (CM6 already in app)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- based on direct codebase analysis + established library choices
- Architecture: HIGH -- follows existing Zenith patterns (IPC, main process services, Zustand stores)
- Code parsing: MEDIUM -- TypeScript Compiler API is well-documented but performance at scale needs validation
- Flow visualization: HIGH -- React Flow is the standard for this use case in React
- AI Q&A: MEDIUM -- context-window approach is simpler but effectiveness depends on context selection quality
- Pitfalls: HIGH -- based on known issues with each library and Electron constraints

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days -- stable ecosystem)
