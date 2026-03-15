# Cortex Plugin Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the CodebaseAnalyzer plugin into "Cortex" — fixing 15 bugs, adding AI-powered insights, multi-architecture parser support, interactive React Flow diagrams, and a polished animated UI.

**Architecture:** Rename all codebase-analyzer references to cortex. Add SQLite persistence for repos. Enhance Java/Python/React parsers for hexagonal, domain, PySpark, and FastAPI support. Replace Mermaid-rendered diagrams with interactive React Flow. Add TOON-format AI insights with optional RTK compression. Redesign the Design page into an Architecture Dashboard.

**Tech Stack:** Electron + Vite, React 19, TypeScript, Zustand, React Flow (@xyflow/react), Framer Motion, CodeMirror 6, better-sqlite3, simple-git, Vercel AI SDK, TOON format, RTK (optional)

**Spec:** `docs/superpowers/specs/2026-03-15-cortex-redesign-design.md`

---

## File Structure

### Renamed (codebase-analyzer → cortex)

| Old Path | New Path |
|----------|----------|
| `src/main/codebase-analyzer/` | `src/main/cortex/` |
| `src/renderer/src/plugins/codebase-analyzer/` | `src/renderer/src/plugins/cortex/` |
| `src/renderer/src/stores/codebase-analyzer-store.ts` | `src/renderer/src/stores/cortex-store.ts` |
| `src/renderer/src/types/codebase-analyzer.ts` | `src/renderer/src/types/cortex.ts` |

### New Files

| File | Responsibility |
|------|---------------|
| `src/main/cortex/toon-parser.ts` | Parse TOON-format AI responses into structured data |
| `src/main/cortex/test-detector.ts` | Detect test files, frameworks, and compute file-level coverage |
| `src/main/cortex/rtk-integration.ts` | Optional RTK compression for AI prompt context |
| `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx` | Redesigned Design page with interactive cards |
| `src/renderer/src/plugins/cortex/components/InsightCard.tsx` | Individual insight card (dependencies, security, patterns, etc.) |
| `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx` | Animated number counter using framer-motion |
| `src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx` | Test file coverage card with progress ring |

### Modified (key changes)

| File | Changes |
|------|---------|
| `src/renderer/src/plugins/registry.ts` | Plugin entry: id→cortex, icon→Brain, settingsSchema with defaultAgent |
| `src/renderer/src/types/plugin.ts` | PluginId union: replace codebase-analyzer with cortex |
| `src/preload/index.ts` | Rename cban namespace → cortex |
| `src/renderer/src/types/electron.d.ts` | Rename cban types → cortex |
| `src/main/ipc-handlers.ts` | Rename cban:* → cortex:*, add cortex:listRepos, cortex:generateInsights |
| `src/main/cortex/cache-db.ts` | Add repos table, ai_insights table, repo CRUD methods |
| `src/main/cortex/parser/java-parser.ts` | Hexagonal/domain/layered architecture detection |
| `src/main/cortex/parser/python-parser.ts` | PySpark support, FastAPI enhancements |
| `src/main/cortex/parser/fe-parser.ts` | Prop flow, hook detection, React Router support |
| `src/main/cortex/parser/index.ts` | Test file detection integration |
| `src/main/cortex/analyzer.ts` | Test stats, AI insights pass |
| `src/main/cortex/git-service.ts` | Re-analyze (fetch+reset), repo verification |
| `src/renderer/src/stores/cortex-store.ts` | Repo persistence, navigateToFile, scrollToLine |
| `src/renderer/src/plugins/cortex/components/OverviewTab.tsx` | Two-tier language breakdown, test card, animated counters |
| `src/renderer/src/plugins/cortex/components/CodePanel.tsx` | Resize fix (minSize, overflow) |
| `src/renderer/src/plugins/cortex/components/FlowNode.tsx` | Gradient backgrounds, kind-based icons, glow effect |
| `src/renderer/src/plugins/cortex/components/FlowEdge.tsx` | Gradient stroke, animated dash |
| `src/renderer/src/plugins/cortex/components/FlowsTab.tsx` | Framework-specific flow types |
| `src/renderer/src/plugins/cortex/components/QAPanel.tsx` | Use shared getCortexAgent() |
| `src/renderer/src/plugins/cortex/CortexView.tsx` | Renamed from CodebaseAnalyzerView |

---

## Chunk 1: Foundation — Rename + Persistence

### Task 1: Rename directories and files

**Files:**
- Rename: `src/main/codebase-analyzer/` → `src/main/cortex/`
- Rename: `src/renderer/src/plugins/codebase-analyzer/` → `src/renderer/src/plugins/cortex/`
- Rename: `src/renderer/src/stores/codebase-analyzer-store.ts` → `cortex-store.ts`
- Rename: `src/renderer/src/types/codebase-analyzer.ts` → `cortex.ts`
- Rename: `src/renderer/src/plugins/cortex/CodebaseAnalyzerView.tsx` → `CortexView.tsx`

- [ ] **Step 1: Rename main process directory**

```bash
git mv src/main/codebase-analyzer src/main/cortex
```

- [ ] **Step 2: Rename renderer plugin directory**

```bash
git mv src/renderer/src/plugins/codebase-analyzer src/renderer/src/plugins/cortex
```

- [ ] **Step 3: Rename store and type files**

```bash
git mv src/renderer/src/stores/codebase-analyzer-store.ts src/renderer/src/stores/cortex-store.ts
git mv src/renderer/src/types/codebase-analyzer.ts src/renderer/src/types/cortex.ts
git mv src/renderer/src/plugins/cortex/CodebaseAnalyzerView.tsx src/renderer/src/plugins/cortex/CortexView.tsx
```

- [ ] **Step 4: Commit renames**

```bash
git add -A
git commit -m "refactor: rename codebase-analyzer directories and files to cortex"
```

### Task 2: Update all internal references

**Files:**
- Modify: `src/renderer/src/plugins/registry.ts`
- Modify: `src/renderer/src/types/plugin.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/types/electron.d.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/renderer/src/plugins/cortex/CortexView.tsx`
- Modify: All cortex component files (import paths)
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Update PluginId union type**

In `src/renderer/src/types/plugin.ts`, replace `'codebase-analyzer'` with `'cortex'` in the PluginId union.

- [ ] **Step 2: Update registry entry**

In `src/renderer/src/plugins/registry.ts`:
- Change `id: 'codebase-analyzer'` → `id: 'cortex'`
- Change `name: 'CodebaseAnalyzer'` → `name: 'Cortex'`
- Change icon from `'SearchCode'` → `'Brain'`
- Change `path: '/codebase-analyzer'` → `path: '/cortex'`
- Update the lazy import path to `./cortex/CortexView`
- Add `settingsSchema` with `defaultAgent` agent-select field:
```typescript
settingsSchema: [
  { key: 'defaultAgent', label: 'Default AI Agent', type: 'agent-select', default: null }
]
```

- [ ] **Step 3: Update preload bridge**

In `src/preload/index.ts`, rename the `cban` namespace to `cortex`. Replace all `cban:` IPC channel names with `cortex:`. Keep the same method signatures.

- [ ] **Step 4: Update electron.d.ts types**

In `src/renderer/src/types/electron.d.ts`, rename the `cban` property to `cortex` in the ElectronAPI interface. Update all method references.

- [ ] **Step 5: Update IPC handlers**

In `src/main/ipc-handlers.ts`:
- Replace all `'cban:` channel names with `'cortex:`
- Update import paths from `./codebase-analyzer/` to `./cortex/`
- Rename `getCbanInstances` → `getCortexInstances`
- Rename `cbanGit`/`cbanAnalyzer` → `cortexGit`/`cortexAnalyzer`

- [ ] **Step 6: Update store imports and references**

In `src/renderer/src/stores/cortex-store.ts`:
- Update import path for types from `../types/codebase-analyzer` to `../types/cortex`
- Rename store hook from `useCodebaseAnalyzerStore` to `useCortexStore`

- [ ] **Step 7: Update all component imports**

In every file under `src/renderer/src/plugins/cortex/`:
- Update store import from `useCodebaseAnalyzerStore` to `useCortexStore`
- Update store import path from `../../../stores/codebase-analyzer-store` to `../../../stores/cortex-store`
- Update type imports from `../../../types/codebase-analyzer` to `../../../types/cortex`
- Update `window.api.cban.*` calls to `window.api.cortex.*`

- [ ] **Step 8: Add settings migration**

In `src/main/ipc-handlers.ts` (or a new `src/main/cortex/migration.ts`), add a one-time migration that runs on app start:
```typescript
function migrateCortexSettings(store: Store): void {
  const oldPrefix = 'plugins.codebase-analyzer'
  const newPrefix = 'plugins.cortex'
  const oldSettings = store.get(oldPrefix)
  if (oldSettings && typeof oldSettings === 'object') {
    for (const [key, value] of Object.entries(oldSettings)) {
      store.set(`${newPrefix}.${key}`, value)
    }
    store.delete(oldPrefix)
  }
}
```
Call this in the main process initialization (before IPC handlers register).

- [ ] **Step 9: Build and verify**

```bash
npm run dev
```
Expected: App builds successfully, Cortex plugin loads with Brain icon and "Cortex" name in sidebar.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: update all internal references from codebase-analyzer to cortex"
```

### Task 3: Add repo persistence to SQLite

**Files:**
- Modify: `src/main/cortex/cache-db.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/types/electron.d.ts`
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Add repos table to cache-db.ts**

In `src/main/cortex/cache-db.ts`, add table creation in the constructor:
```sql
CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  repoPath TEXT NOT NULL,
  repoType TEXT DEFAULT 'unknown',
  framework TEXT DEFAULT '',
  language TEXT DEFAULT '',
  commitSha TEXT DEFAULT '',
  lastAnalyzed TEXT,
  fileCount INTEGER DEFAULT 0
)
```

Add methods:
```typescript
saveRepo(repo: { id: string; url: string; name: string; branch: string; repoPath: string; repoType?: string; framework?: string; language?: string; commitSha?: string; lastAnalyzed?: string | null; fileCount?: number }): void

listRepos(): Array<{ id: string; url: string; name: string; branch: string; repoPath: string; repoType: string; framework: string; language: string; commitSha: string; lastAnalyzed: string | null; fileCount: number }>

removeRepo(id: string): void

updateRepo(id: string, fields: Record<string, unknown>): void
```

- [ ] **Step 2: Add ai_insights table**

In the same constructor:
```sql
CREATE TABLE IF NOT EXISTS ai_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repoUrl TEXT NOT NULL,
  branch TEXT NOT NULL,
  commitSha TEXT NOT NULL,
  agentId TEXT NOT NULL,
  toonData TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(repoUrl, branch, commitSha, agentId)
)
```

Add methods:
```typescript
saveInsights(repoUrl: string, branch: string, commitSha: string, agentId: string, toonData: string): void
getInsights(repoUrl: string, branch: string, commitSha: string): string | null
clearInsights(repoUrl: string, branch: string): void
```

- [ ] **Step 3: Add cortex:listRepos IPC handler**

In `src/main/ipc-handlers.ts`:
```typescript
ipcMain.handle('cortex:listRepos', async () => {
  const { analyzer, git } = getCortexInstances()
  const repos = analyzer.cache.listRepos()
  // Verify each repo's clone directory exists
  return repos.map(repo => ({
    ...repo,
    status: existsSync(repo.repoPath) ? 'idle' : 'needs-clone',
    error: null
  }))
})
```

Also add `cortex:saveRepo`, `cortex:removeRepo`, `cortex:updateRepo` handlers that delegate to `analyzer.cache`.

- [ ] **Step 4: Add to preload bridge and electron.d.ts**

In `src/preload/index.ts`, add methods:
```typescript
listRepos: () => ipcRenderer.invoke('cortex:listRepos'),
saveRepo: (repo) => ipcRenderer.invoke('cortex:saveRepo', repo),
removeRepo: (id) => ipcRenderer.invoke('cortex:removeRepo', id),
updateRepo: (id, fields) => ipcRenderer.invoke('cortex:updateRepo', id, fields),
```

Add matching types in `electron.d.ts`.

- [ ] **Step 5: Update cortex-store.ts for persistence**

Add `loadRepos()` action that calls `window.api.cortex.listRepos()` on mount.

Update `addRepo` to also call `window.api.cortex.saveRepo(repo)`.
Update `updateRepo` to also call `window.api.cortex.updateRepo(id, fields)`.
Update `removeRepo` to also call `window.api.cortex.removeRepo(id)`.

In `CortexView.tsx`, call `loadRepos()` in a `useEffect` on mount.

- [ ] **Step 6: Build and verify**

```bash
npm run dev
```
Expected: App builds. Add a repo, close app, reopen — repo should still appear in the list.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(cortex): persist repos to SQLite, hydrate on app start"
```

---

## Chunk 2: Parser & Analysis Improvements

### Task 4: Java parser — multi-architecture support

**Files:**
- Modify: `src/main/cortex/parser/java-parser.ts`

- [ ] **Step 1: Add architecture detection function**

At the top of `java-parser.ts`, add:
```typescript
type JavaArchitecture = 'hexagonal' | 'domain' | 'layered'

function detectJavaArchitecture(filePaths: string[]): JavaArchitecture {
  const hasAdapters = filePaths.some(f => /\/adapters\//.test(f))
  const hasPorts = filePaths.some(f => /\/port\/(in|out)\//.test(f))
  if (hasAdapters && hasPorts) return 'hexagonal'

  // Domain: multiple sibling packages each with controller+service
  const domainPackages = new Map<string, Set<string>>()
  for (const f of filePaths) {
    const match = f.match(/\/([^/]+)\/(controller|service|repository)\//)
    if (match) {
      const domain = match[1]
      if (!domainPackages.has(domain)) domainPackages.set(domain, new Set())
      domainPackages.get(domain)!.add(match[2])
    }
  }
  const domainCount = [...domainPackages.values()].filter(s => s.size >= 2).length
  if (domainCount >= 2) return 'domain'

  return 'layered'
}
```

- [ ] **Step 2: Add path-based entity classification for hexagonal**

Add a function that classifies entities by directory path:
```typescript
function classifyByPath(filePath: string, arch: JavaArchitecture): string | null {
  if (arch !== 'hexagonal') return null
  if (/\/application\/.*\/port\/in\//.test(filePath)) return 'port-in'
  if (/\/application\/.*\/port\/out\//.test(filePath)) return 'port-out'
  if (/\/adapters\/(web|rest)\//.test(filePath)) return 'web-adapter'
  if (/\/adapters\/(db|persistence)\//.test(filePath)) return 'db-adapter'
  if (/\/adapters\/http\//.test(filePath)) return 'http-adapter'
  if (/\/application\//.test(filePath)) return 'service'
  if (/\/config\//.test(filePath)) return 'configuration'
  if (/\/clients\//.test(filePath)) return 'client-impl'
  if (/\/common\//.test(filePath)) return 'shared'
  if (/\/errors\//.test(filePath)) return 'error-handler'
  return null
}
```

- [ ] **Step 3: Enhance annotation detection**

In the class parsing section, add detection for:
- `@Configuration` → kind: `configuration`
- `@Component` → kind: `component`
- `@Aspect` → kind: `aspect`
- `@Filter` → kind: `filter`
- `@Bean` → add to decorators list
- `@Transactional`, `@Async` → add to decorators list
- `@ConditionalOnProperty`, `@Profile` → add to decorators list

Update the entity kind assignment to use `classifyByPath()` first (if hexagonal), then fall back to annotation-based detection.

- [ ] **Step 4: Detect constructor injection for call graph edges**

After parsing a class, scan for constructor parameters that match other parsed class names. For each match, create a call edge of type `'inject'`:
```typescript
// After parsing all classes
for (const entity of entities) {
  if (entity.kind === 'class' || entity.kind === 'service' || entity.kind === 'web-adapter') {
    for (const param of entity.parameters) {
      const target = entities.find(e => e.name === param.type)
      if (target) {
        // Add inject edge: entity → target
      }
    }
  }
}
```

- [ ] **Step 5: Pass architecture to parseJavaFiles return value**

Update `JavaParseResult` to include `architecture: JavaArchitecture`. Pass file paths list into `parseJavaFiles` and call `detectJavaArchitecture`.

- [ ] **Step 6: Build and verify**

```bash
npm run dev
```
Expected: Builds cleanly. Adding a hexagonal Java repo should detect architecture correctly and show port/adapter entities.

- [ ] **Step 7: Commit**

```bash
git add src/main/cortex/parser/java-parser.ts
git commit -m "feat(cortex): Java parser supports hexagonal, domain, and layered architectures"
```

### Task 5: Python parser — PySpark + FastAPI enhancements

**Files:**
- Modify: `src/main/cortex/parser/python-parser.ts`

- [ ] **Step 1: Add PySpark detection and parsing**

Add a `parsePySparkJob` function that:
- Detects files with `SparkSession`, `pyspark` imports
- Extracts `spark.read.*` as source entities (kind: `spark-source`)
- Extracts DataFrame transformations (`.filter`, `.groupBy`, `.join`, `.withColumn`, `.select`) as transform entities (kind: `spark-transform`)
- Extracts `.write.*` / `.saveAsTable` as sink entities (kind: `spark-sink`)
- Extracts `spark.sql(...)` as `spark-sql` entities
- Builds a pipeline: source → transforms → sink

- [ ] **Step 2: Add FastAPI Depends() detection**

In the existing route parsing logic, when detecting `@app.get/post/etc`, also scan for `Depends(...)` in function parameters. For each `Depends(func_name)`, create a call edge of type `'inject'` from the endpoint to the dependency function.

- [ ] **Step 3: Add Pydantic BaseModel detection**

Add parsing for `class MyModel(BaseModel):` patterns:
- Extract class name, fields (with type hints), and validators
- Create entities of kind `model`

- [ ] **Step 4: Add APIRouter prefix detection**

Detect `router = APIRouter(prefix="/api/v1/items")` and use the prefix when computing full route paths for endpoints on that router.

- [ ] **Step 5: Build and verify**

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add src/main/cortex/parser/python-parser.ts
git commit -m "feat(cortex): Python parser adds PySpark pipelines and FastAPI enhancements"
```

### Task 6: Test detection and coverage estimation

**Files:**
- Create: `src/main/cortex/test-detector.ts`
- Modify: `src/main/cortex/parser/index.ts`
- Modify: `src/main/cortex/analyzer.ts`

- [ ] **Step 1: Create test-detector.ts**

```typescript
export interface TestStats {
  testFiles: string[]
  testCount: number
  frameworks: string[]
  filesCovered: string[]       // source files that have a matching test
  filesUncovered: string[]     // source files with no matching test
  fileCoveragePercent: number  // filesCovered.length / total source files * 100
}

export function detectTests(
  filePaths: string[],
  fileContents: Map<string, string>
): TestStats
```

Implementation:
- Identify test files by pattern: `*Test.java`, `*Tests.java`, `*IT.java`, `*.test.ts`, `*.spec.ts`, `test_*.py`, `*_test.py`, `*_test.go`
- For each test file, scan content for framework indicators: `@Test` (JUnit), `describe(`/`it(` (Jest), `def test_` (pytest), `func Test` (Go)
- Count test methods/functions
- Match test files to source files by naming convention (e.g., `UserService.java` ↔ `UserServiceTest.java`)
- Compute file coverage percentage

- [ ] **Step 2: Integrate into parser/index.ts**

In `parseRepository()`, after parsing completes, call `detectTests()` with the file paths and a map of test file contents. Add `testStats: TestStats` to the `ParseResult` interface.

- [ ] **Step 3: Update analyzer.ts to include test stats**

In the analysis pipeline, pass the test stats through to the analysis result. Store in cache alongside other stats.

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add src/main/cortex/test-detector.ts src/main/cortex/parser/index.ts src/main/cortex/analyzer.ts
git commit -m "feat(cortex): add test file detection and coverage estimation"
```

### Task 7: AI agent selection integration

**Files:**
- Modify: `src/renderer/src/plugins/registry.ts` (already in Task 2, but confirm settingsSchema)
- Modify: `src/renderer/src/plugins/cortex/components/QAPanel.tsx`
- Modify: `src/renderer/src/plugins/cortex/CortexView.tsx`

- [ ] **Step 1: Create shared getCortexAgent utility**

In `src/renderer/src/stores/cortex-store.ts`, add:
```typescript
export function getCortexAgent(): { providerId: string; model: string; command?: string } | null {
  const defaultAgentId = useSettingsStore.getState()
    .resolvePath('plugins.cortex.defaultAgent')
  const providers = useAgentStore.getState().providers
  const agent = defaultAgentId
    ? providers.find(p => p.id === defaultAgentId)
    : providers.find(p => p.status === 'connected' || p.hasApiKey)
  if (!agent) return null
  return { providerId: agent.id, model: agent.model || agent.id, command: agent.command || undefined }
}
```

- [ ] **Step 2: Update QAPanel to use shared function**

Replace the existing inline `getCbanAgent()` in `QAPanel.tsx` with the imported `getCortexAgent()`.

- [ ] **Step 3: Add "no agent" banner to CortexView**

When no agent is configured, show a subtle info banner at the top:
```tsx
{!getCortexAgent() && (
  <div className="mx-4 mt-2 rounded-lg bg-accent/10 px-3 py-2 text-[11px] text-accent">
    Configure an AI Agent in Settings to unlock AI-powered insights
  </div>
)}
```

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: AI agent dropdown appears in Settings → Cortex. QAPanel uses the selected agent.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): shared AI agent selection with settings integration"
```

---

## Chunk 3: UI/UX Overhaul

### Task 8: Code panel resize fix

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/CodePanel.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/FileTree.tsx`

- [ ] **Step 1: Fix panel sizing**

In `CodePanel.tsx`:
- Change file tree panel `minSize` from 15 to 20
- Change `defaultSize` from 20 to 25
- Add `overflow-x: auto` className to the file tree container div

- [ ] **Step 2: Improve resize handle**

Update the `PanelResizeHandle` to have a wider hit area and visible affordance:
```tsx
<PanelResizeHandle className="group w-2 cursor-col-resize flex items-center justify-center">
  <div className="h-full w-px bg-border/40 transition-colors group-hover:w-0.5 group-hover:bg-accent/40" />
</PanelResizeHandle>
```

- [ ] **Step 3: Fix FileTree overflow**

In `FileTree.tsx`, add `overflow-x: auto` and `min-w-0` to the root container to handle long file names.

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: File tree panel starts wider, can be resized smoothly, long file names scroll horizontally.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(cortex): code panel resize — wider default, visible handle, horizontal scroll"
```

### Task 9: Language breakdown accuracy (two-tier)

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx`

- [ ] **Step 1: Add source language utility**

```typescript
const SOURCE_LANGUAGES = new Set([
  'java', 'python', 'typescript', 'javascript', 'go', 'kotlin',
  'rust', 'ruby', 'csharp', 'c', 'cpp', 'swift', 'php', 'scala'
])

function isSourceLanguage(lang: string): boolean {
  return SOURCE_LANGUAGES.has(lang.toLowerCase())
}
```

- [ ] **Step 2: Split languages into two tiers**

Before rendering, split `stats.languages` into:
```typescript
const sourceLanguages = stats.languages.filter(l => isSourceLanguage(l.language))
const configLanguages = stats.languages.filter(l => !isSourceLanguage(l.language))
```

- [ ] **Step 3: Render two separate bars**

Render "Source Languages" as the primary bar (prominent, with percentage labels).
Render "Config & Other" as a secondary smaller bar below it with muted colors.

Each bar computes percentages relative to its own total (not the overall total), so source languages always add up to 100% within their bar.

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: Java shows prominently in source bar; XML/YAML shown separately in config bar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(cortex): two-tier language breakdown separating source from config files"
```

### Task 10: File click navigation (shared navigateToFile)

**Files:**
- Modify: `src/renderer/src/stores/cortex-store.ts`
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/APIListTab.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/FlowNode.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/CodeViewer.tsx`

- [ ] **Step 1: Add navigateToFile and scrollToLine to store**

In `cortex-store.ts`:
```typescript
scrollToLine: number | null,
setScrollToLine: (line: number | null) => void,
navigateToFile: (filePath: string, line?: number) => void,
```

`navigateToFile` implementation:
1. Set `activeTab = 'code'`
2. Detect language from file extension
3. Call `openFile(filePath, language)`
4. Fetch file content via `window.api.cortex.getFileContent(repoPath, filePath)`
5. Set `fileContent`
6. If `line` provided, set `scrollToLine(line)`

- [ ] **Step 2: Add scroll-to-line in CodeViewer**

In `CodeViewer.tsx`, add a `useEffect` that watches `scrollToLine`:
```typescript
const scrollToLine = useCortexStore(s => s.scrollToLine)
const setScrollToLine = useCortexStore(s => s.setScrollToLine)

useEffect(() => {
  if (scrollToLine && editorViewRef.current) {
    const line = editorViewRef.current.state.doc.line(Math.min(scrollToLine, editorViewRef.current.state.doc.lines))
    editorViewRef.current.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' })
    })
    setScrollToLine(null)
  }
}, [scrollToLine])
```

- [ ] **Step 3: Wire up OverviewTab entity clicks**

In `OverviewTab.tsx`, make each entity breakdown item clickable. On click, find the first entity of that kind from the analysis result and call `navigateToFile(entity.filePath, entity.line)`.

- [ ] **Step 4: Wire up APIListTab row clicks**

In `APIListTab.tsx`, wrap each endpoint row in a clickable element that calls `navigateToFile(route.filePath, route.line)`.

- [ ] **Step 5: Verify FlowNode already navigates**

FlowNode.tsx already calls `openFile` and `setActiveTab('code')` on click. Update it to use the shared `navigateToFile` instead for consistency.

- [ ] **Step 6: Build and verify**

```bash
npm run dev
```
Expected: Clicking entities, API endpoints, and flow nodes all navigate to the Code tab at the correct file and line.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(cortex): unified navigateToFile with scroll-to-line across all tabs"
```

### Task 11: Animated counters and staggered card animations

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx`

- [ ] **Step 1: Create AnimatedCounter component**

```tsx
import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  className?: string
}

export default function AnimatedCounter({ value, duration = 0.8, className }: Props) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString())
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1] // easeOutExpo
    })
    return controls.stop
  }, [value, duration, motionValue])

  return <motion.span ref={ref} className={className}>{rounded}</motion.span>
}
```

- [ ] **Step 2: Replace static numbers in OverviewTab**

Replace all `{stats.totalFiles}`, `{stats.totalLines}`, etc. with `<AnimatedCounter value={stats.totalFiles} />`.

- [ ] **Step 3: Add staggered card entrance**

Wrap the stats cards and entity breakdown cards in framer-motion with staggered animations:
```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05, duration: 0.3 }}
>
```

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: Numbers animate up from 0 on page load. Cards fade in sequentially.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): animated counters and staggered card entrance animations"
```

### Task 12: FlowNode redesign — gradients, icons, glow

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowNode.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/flow-styles.css`

- [ ] **Step 1: Define kind-to-style mapping**

```typescript
const KIND_STYLES: Record<string, { gradient: string; glow: string; icon: string }> = {
  controller: { gradient: 'from-teal-500/20 to-teal-600/10', glow: 'shadow-teal-500/20', icon: 'Globe' },
  'web-adapter': { gradient: 'from-teal-500/20 to-teal-600/10', glow: 'shadow-teal-500/20', icon: 'Globe' },
  service: { gradient: 'from-blue-500/20 to-blue-600/10', glow: 'shadow-blue-500/20', icon: 'Cog' },
  repository: { gradient: 'from-amber-500/20 to-amber-600/10', glow: 'shadow-amber-500/20', icon: 'Database' },
  'db-adapter': { gradient: 'from-amber-500/20 to-amber-600/10', glow: 'shadow-amber-500/20', icon: 'Database' },
  'port-in': { gradient: 'from-purple-500/20 to-purple-600/10', glow: 'shadow-purple-500/20', icon: 'Plug' },
  'port-out': { gradient: 'from-purple-500/20 to-purple-600/10', glow: 'shadow-purple-500/20', icon: 'Unplug' },
  component: { gradient: 'from-green-500/20 to-green-600/10', glow: 'shadow-green-500/20', icon: 'Boxes' },
  'spark-transform': { gradient: 'from-orange-500/20 to-orange-600/10', glow: 'shadow-orange-500/20', icon: 'Flame' },
  'spark-source': { gradient: 'from-cyan-500/20 to-cyan-600/10', glow: 'shadow-cyan-500/20', icon: 'Download' },
  'spark-sink': { gradient: 'from-rose-500/20 to-rose-600/10', glow: 'shadow-rose-500/20', icon: 'Upload' },
  dag: { gradient: 'from-indigo-500/20 to-indigo-600/10', glow: 'shadow-indigo-500/20', icon: 'GitBranch' },
  task: { gradient: 'from-slate-500/20 to-slate-600/10', glow: 'shadow-slate-500/20', icon: 'ListChecks' },
  default: { gradient: 'from-gray-500/20 to-gray-600/10', glow: 'shadow-gray-500/20', icon: 'Circle' },
}
```

- [ ] **Step 2: Update FlowNode rendering**

Replace the current flat background with gradient:
```tsx
const style = KIND_STYLES[data.kind] || KIND_STYLES.default
const Icon = Icons[style.icon] || Icons.Circle

<motion.div
  className={`bg-gradient-to-br ${style.gradient} border border-border/60 rounded-lg px-3 py-2 shadow-lg ${style.glow} backdrop-blur-sm`}
  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.15)' }}
  transition={{ duration: 0.15 }}
  onClick={() => navigateToFile(data.filePath, data.line)}
>
  <div className="flex items-center gap-1.5">
    <Icon size={12} className="text-text-secondary" />
    <span className="text-[11px] font-medium text-text-primary truncate">{data.label}</span>
  </div>
  {data.summary && (
    <p className="mt-1 text-[9px] text-text-secondary line-clamp-2">{data.summary}</p>
  )}
</motion.div>
```

- [ ] **Step 3: Build and verify**

```bash
npm run dev
```
Expected: Flow nodes show gradients, kind-appropriate icons, and glow on hover.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(cortex): FlowNode redesign with gradient backgrounds and kind-based icons"
```

### Task 13: Animated flow edges

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FlowEdge.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/flow-styles.css`

- [ ] **Step 1: Add animated dash CSS**

In `flow-styles.css`:
```css
@keyframes flow-dash {
  to {
    stroke-dashoffset: -20;
  }
}
.animated-edge-path {
  stroke-dasharray: 5 5;
  animation: flow-dash 1s linear infinite;
}
```

- [ ] **Step 2: Update FlowEdge component**

Replace the current edge rendering with gradient stroke and animated dash:
```tsx
<path
  d={edgePath}
  className="animated-edge-path"
  stroke="url(#edge-gradient)"
  strokeWidth={1.5}
  fill="none"
  markerEnd="url(#arrow)"
/>
```

Add SVG `<defs>` for the gradient and arrow marker.

- [ ] **Step 3: Add edge labels**

If the edge has a `type` label (calls, imports, injects), show it at the midpoint:
```tsx
{data?.label && (
  <text x={labelX} y={labelY} className="text-[8px] fill-text-secondary" textAnchor="middle">
    {data.label}
  </text>
)}
```

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): animated flow edges with gradient stroke and labels"
```

### Task 14: Test coverage card in Overview

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/OverviewTab.tsx`

- [ ] **Step 1: Create TestCoverageCard**

Component that renders:
- Test count with framework badges (pill-shaped)
- Animated SVG progress ring showing file coverage %
- Tooltip on the ring: "Percentage of source files that have a corresponding test file. Not execution-based coverage."
- Color: >70% teal, 40-70% amber, <40% rose
- "Files without tests" expandable section (max 10 items, clickable → navigateToFile)

Use framer-motion for the ring animation (animate `strokeDashoffset` from full circumference to target).

- [ ] **Step 2: Add to OverviewTab**

After the Entity Breakdown section, add:
```tsx
{analysisResult?.testStats && (
  <TestCoverageCard stats={analysisResult.testStats} />
)}
```

- [ ] **Step 3: Build and verify**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(cortex): test file coverage card with animated progress ring"
```

---

## Chunk 4: Architecture Dashboard & AI

### Task 15: Architecture Dashboard (Design page redesign)

**Files:**
- Create: `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx`
- Create: `src/renderer/src/plugins/cortex/components/InsightCard.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/InsightsPanel.tsx`
- Delete (contents replaced): `src/renderer/src/plugins/cortex/components/DesignDocTab.tsx`

- [ ] **Step 1: Create InsightCard component**

A reusable card component:
```tsx
interface InsightCardProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  delay?: number  // stagger animation delay
}
```

Renders with gradient border, staggered entrance animation (scale 0.95→1 + fade), and consistent styling.

- [ ] **Step 2: Create ArchitectureDashboard**

Three sections:

**Section A — Architecture Overview** (full width):
- Architecture badge (pill: "Hexagonal Architecture" / "Layered" etc.)
- Tech stack badges (colored pills from AI insights)
- AI-generated summary (2-3 sentences)
- Interactive React Flow module graph (draggable, zoomable)

**Section B — Insight Cards** (responsive grid, 2-3 columns):
- Dependencies card (grouped by category with version badges)
- Security card (auth patterns detected)
- Patterns card (design patterns)
- Config card (config sources)
- Async card (async patterns, schedulers)

**Section C — Architecture Diagrams** (tabbed, bottom):
- Module dependency graph (React Flow)
- Layer interaction diagram (React Flow)
- Data flow diagram (React Flow)

All data comes from the store's `aiInsights` field (populated by Task 16).

If no AI insights yet, show a "Generate Architecture Insights" button that triggers the AI analysis.

- [ ] **Step 3: Replace DesignDocTab with ArchitectureDashboard**

In `InsightsPanel.tsx`, replace the `DesignDocTab` import with `ArchitectureDashboard` for the "Design" sub-tab.

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: Design tab shows the new Architecture Dashboard. Without AI insights, shows the "Generate" button. Cards render with animations.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): Architecture Dashboard replaces Design page with interactive cards"
```

### Task 16: TOON prompt construction & parsing

**Files:**
- Create: `src/main/cortex/toon-parser.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/types/electron.d.ts`

- [ ] **Step 1: Create toon-parser.ts**

```typescript
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

export function parseToonResponse(toonText: string): ToonInsights
```

Implementation:
- Split by newlines
- For each line, split by `|`
- First field is the record type
- Switch on record type, populate the corresponding array/field
- Skip empty lines and lines not matching `TYPE|...`
- Log warning for unknown types but don't crash

- [ ] **Step 2: Build the TOON system prompt**

```typescript
export function buildInsightsPrompt(analysis: AnalysisResult): { system: string; user: string }
```

System prompt includes:
- "You are a code analysis expert. Respond ONLY in TOON format (pipe-delimited, one record per line)."
- TOON schema definition (all record types and field positions)
- Example output

User prompt includes:
- Repo type, framework, language
- Top 100 entities (sorted by call graph centrality)
- All routes/endpoints
- File tree structure (abbreviated)
- Test stats

- [ ] **Step 3: Add cortex:generateInsights IPC handler**

In `ipc-handlers.ts`:
```typescript
ipcMain.handle('cortex:generateInsights', async (_event, repoUrl: string, branch: string) => {
  const { analyzer } = getCortexInstances()
  const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
  if (!analysis) throw new Error('No analysis found. Analyze first.')

  const { system, user } = buildInsightsPrompt(analysis)
  return { systemPrompt: system, userPrompt: user }
})
```

The renderer will use `window.api.ai.startAnalysis()` with these prompts, stream the response, and parse it with `parseToonResponse()`.

- [ ] **Step 4: Add cortex:saveInsights and cortex:getInsights IPC handlers**

For caching parsed TOON data:
```typescript
ipcMain.handle('cortex:saveInsights', async (_event, repoUrl, branch, commitSha, agentId, toonData) => {
  const { analyzer } = getCortexInstances()
  analyzer.cache.saveInsights(repoUrl, branch, commitSha, agentId, toonData)
})

ipcMain.handle('cortex:getInsights', async (_event, repoUrl, branch, commitSha) => {
  const { analyzer } = getCortexInstances()
  return analyzer.cache.getInsights(repoUrl, branch, commitSha)
})
```

- [ ] **Step 5: Add to preload and electron.d.ts**

Add `generateInsights`, `saveInsights`, `getInsights` to the cortex namespace.

- [ ] **Step 6: Build and verify**

```bash
npm run dev
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(cortex): TOON format prompt construction, parsing, and caching"
```

### Task 17: AI-powered insights with streaming UX

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx`
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Add AI insights state to store**

```typescript
aiInsights: ToonInsights | null
isGeneratingInsights: boolean
setAiInsights: (insights: ToonInsights | null) => void
setGeneratingInsights: (generating: boolean) => void
```

- [ ] **Step 2: Add generateInsights action to store**

```typescript
async generateInsights(): Promise<void> {
  const agent = getCortexAgent()
  if (!agent) return

  this.setGeneratingInsights(true)
  const sessionId = crypto.randomUUID()
  let accumulated = ''

  // Check cache first
  const cached = await window.api.cortex.getInsights(repo.url, repo.branch, repo.commitSha)
  if (cached) {
    this.setAiInsights(parseToonResponse(cached))
    this.setGeneratingInsights(false)
    return
  }

  // Get prompts from main process
  const { systemPrompt, userPrompt } = await window.api.cortex.generateInsights(repo.url, repo.branch)

  // Stream
  window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
    if (sid !== sessionId) return
    accumulated += chunk
    // Progressive parsing: try to parse what we have so far
    const partial = parseToonResponse(accumulated)
    this.setAiInsights(partial)
  })

  window.api.ai.onStreamDone(({ sessionId: sid }) => {
    if (sid !== sessionId) return
    const final = parseToonResponse(accumulated)
    this.setAiInsights(final)
    // Cache
    window.api.cortex.saveInsights(repo.url, repo.branch, repo.commitSha, agent.providerId, accumulated)
    this.setGeneratingInsights(false)
    window.api.ai.removeStreamListeners()
  })

  window.api.ai.onStreamError(({ sessionId: sid, error }) => {
    if (sid !== sessionId) return
    this.setGeneratingInsights(false)
    window.api.ai.removeStreamListeners()
  })

  await window.api.ai.startAnalysis(agent.providerId, agent.model, systemPrompt, userPrompt, sessionId, agent.command)
}
```

- [ ] **Step 3: Wire up ArchitectureDashboard**

- On mount, check if `aiInsights` is null. If so, try loading from cache.
- "Generate Architecture Insights" button calls `generateInsights()`
- "Refresh" button calls `generateInsights()` (bypasses cache)
- While generating, show animated Brain icon with "Cortex is thinking..." overlay
- Cards populate progressively as `aiInsights` updates during streaming

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```
Expected: Click "Generate", see streaming animation, cards fill in progressively, data cached for next visit.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): AI-powered architecture insights with streaming and progressive rendering"
```

### Task 18: RTK integration (optional)

**Files:**
- Create: `src/main/cortex/rtk-integration.ts`
- Modify: `src/main/cortex/toon-parser.ts` (prompt construction)
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Create rtk-integration.ts**

```typescript
import { execSync, execFileSync } from 'child_process'

let rtkAvailable: boolean | null = null
let rtkFailCount = 0
const MAX_FAILURES = 3

export function isRtkAvailable(): boolean {
  if (rtkAvailable !== null) return rtkAvailable && rtkFailCount < MAX_FAILURES
  try {
    execSync('rtk --version', { encoding: 'utf-8', timeout: 5000 })
    rtkAvailable = true
  } catch {
    rtkAvailable = false
  }
  return rtkAvailable
}

export function compressFileContent(filePath: string): string | null {
  if (!isRtkAvailable()) return null
  try {
    return execFileSync('rtk', ['read', filePath], { encoding: 'utf-8', timeout: 10000 })
  } catch {
    rtkFailCount++
    return null // caller falls back to raw read
  }
}

export function compressGitLog(repoPath: string, count: number = 20): string | null {
  if (!isRtkAvailable()) return null
  try {
    return execFileSync('rtk', ['git', 'log', `--oneline`, `-${count}`], {
      encoding: 'utf-8',
      cwd: repoPath,
      timeout: 10000
    })
  } catch {
    rtkFailCount++
    return null
  }
}
```

- [ ] **Step 2: Use RTK in prompt construction**

In `toon-parser.ts`'s `buildInsightsPrompt()`, when building file tree context:
```typescript
import { compressFileContent, isRtkAvailable } from './rtk-integration'

// When reading file content for AI context:
const content = compressFileContent(fullPath) ?? await fs.readFile(fullPath, 'utf-8')
```

- [ ] **Step 3: Add RTK probe IPC handler**

```typescript
ipcMain.handle('cortex:probeRtk', async () => {
  return isRtkAvailable()
})
```

- [ ] **Step 4: Build and verify**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cortex): optional RTK integration for AI prompt compression"
```

---

## Chunk 5: Polish

### Task 19: Re-analyze flow

**Files:**
- Modify: `src/main/cortex/git-service.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/renderer/src/plugins/cortex/components/RepoCard.tsx`
- Modify: `src/renderer/src/stores/cortex-store.ts`

- [ ] **Step 1: Add fetchAndReset to GitService**

```typescript
async fetchAndReset(repoPath: string, branch: string): Promise<string> {
  const git = this.createGit(repoPath)
  await git.fetch('origin')
  await git.reset(['--hard', `origin/${branch}`])
  const log = await git.log({ maxCount: 1 })
  return log.latest?.hash ?? ''
}
```

- [ ] **Step 2: Add cortex:reanalyze IPC handler**

```typescript
ipcMain.handle('cortex:reanalyze', async (event, repoId: string) => {
  const { git, analyzer } = getCortexInstances()
  const repo = analyzer.cache.getRepoById(repoId)
  if (!repo) throw new Error('Repo not found')

  // Fetch and reset
  const newSha = await git.fetchAndReset(repo.repoPath, repo.branch)
  if (newSha === repo.commitSha) return { changed: false }

  // Clear old cache
  analyzer.cache.clearAnalysis(repo.url, repo.branch)
  analyzer.cache.clearInsights(repo.url, repo.branch)

  // Re-analyze
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await analyzer.analyzeRepository(repo.repoPath, repo.branch, repo.url, (progress) => {
    win?.webContents.send('cortex:analysisProgress', progress)
  })

  // Update repo record
  analyzer.cache.updateRepo(repoId, { commitSha: newSha, lastAnalyzed: new Date().toISOString() })

  return { changed: true, result }
})
```

- [ ] **Step 3: Add Re-analyze button to RepoCard**

Add a refresh icon button that calls the store's `reanalyze(repoId)` action. Show "Already up to date" toast if no changes.

- [ ] **Step 4: Show relative time in RepoCard**

Display "Last analyzed: 2h ago" using a simple relative time formatter:
```typescript
function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
```

- [ ] **Step 5: Build and verify**

```bash
npm run dev
```
Expected: Re-analyze button fetches latest, shows progress, updates analysis.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cortex): re-analyze flow with git fetch+reset and cache invalidation"
```

### Task 20: Performance guardrails

**Files:**
- Modify: `src/renderer/src/plugins/cortex/components/FileTree.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/FlowDiagram.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/FlowNode.tsx`
- Modify: `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx`

- [ ] **Step 1: Add reduced motion support**

Create a shared hook:
```typescript
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
```

Use it in AnimatedCounter (skip animation, show value directly), FlowNode (disable hover scale), and staggered card animations (instant render).

- [ ] **Step 2: Virtualize FileTree for large repos**

If the file tree has >500 nodes, use `react-window` `FixedSizeList` for the flattened visible node list instead of rendering all items. Install `react-window` if not already present:
```bash
npm install react-window @types/react-window
```

- [ ] **Step 3: React.memo on FlowNode**

Ensure `FlowNode` is wrapped in `React.memo` to prevent re-renders when other nodes change. The component is already memoized but verify the memo comparison is correct.

- [ ] **Step 4: Add node count cap to FlowDiagram**

In `FlowDiagram.tsx`, if nodes > 200, show only the first 200 with a banner: "Showing 200 of {total} nodes. Use filters to narrow the view."

- [ ] **Step 5: Build and verify**

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cortex): performance guardrails — reduced motion, virtualized tree, node cap"
```

### Task 21: Export — React Flow to Mermaid conversion

**Files:**
- Modify: `src/main/cortex/mermaid-generator.ts`
- Modify: `src/renderer/src/plugins/cortex/components/ExportDialog.tsx`

- [ ] **Step 1: Add flowToMermaid conversion function**

In `mermaid-generator.ts`, add a function that converts React Flow node/edge data to Mermaid flowchart syntax:
```typescript
export function flowDataToMermaid(
  nodes: { id: string; data: { label: string; kind: string } }[],
  edges: { source: string; target: string; data?: { label: string } }[],
  direction: 'TB' | 'LR' = 'TB'
): string {
  const lines = [`flowchart ${direction}`]
  for (const node of nodes) {
    const shape = node.data.kind === 'database' ? `[(${node.data.label})]` : `[${node.data.label}]`
    lines.push(`  ${node.id}${shape}`)
  }
  for (const edge of edges) {
    const label = edge.data?.label ? `|${edge.data.label}|` : ''
    lines.push(`  ${edge.source} -->${label} ${edge.target}`)
  }
  return lines.join('\n')
}
```

- [ ] **Step 2: Use in ExportDialog**

When exporting, include the Mermaid diagram in the markdown/text output. For PDF, render the Mermaid to SVG server-side (already supported by mermaid-generator).

- [ ] **Step 3: Build and verify**

```bash
npm run dev
```
Expected: Exported MD/PDF includes Mermaid diagrams generated from the React Flow data.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(cortex): export converts React Flow diagrams to Mermaid for PDF/MD/TXT"
```

---

## Final Verification

After all chunks are complete:

- [ ] **Full build test**: `npm run dev` — app builds and launches
- [ ] **Rename verification**: Sidebar shows "Cortex" with Brain icon
- [ ] **Persistence**: Add repo → close app → reopen → repo still there
- [ ] **Language breakdown**: Java repo shows Java prominently, XML/YAML separate
- [ ] **Code panel**: File tree resizable, long names scroll
- [ ] **Architecture detection**: Hexagonal Java repo detects correctly
- [ ] **Flows**: Spring Boot API flow shows correct Controller → Service → Repository chain
- [ ] **File navigation**: Click entity/endpoint/flow node → Code tab opens at correct line
- [ ] **AI insights**: Generate → cards fill progressively → cached on revisit
- [ ] **Test card**: Shows test count, framework badges, coverage ring
- [ ] **Re-analyze**: Button fetches latest, re-analyzes, updates cache
- [ ] **Export**: PDF/MD includes Mermaid diagrams
- [ ] **Animations**: Counters animate, cards stagger, reduced motion respected
