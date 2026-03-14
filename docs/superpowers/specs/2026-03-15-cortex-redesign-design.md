# Cortex Plugin Redesign — Design Specification

**Date:** 2026-03-15
**Plugin:** Cortex (formerly CodebaseAnalyzer)
**Scope:** 15 bugs/improvements + rename + full UX overhaul

---

## 1. Rename: CodebaseAnalyzer → Cortex

| Property | Old | New |
|----------|-----|-----|
| PluginId | `codebase-analyzer` | `cortex` |
| Display Name | CodebaseAnalyzer | Cortex |
| Icon | `SearchCode` | `Brain` |
| Route | `/codebase-analyzer` | `/cortex` |
| Settings prefix | `plugins.codebase-analyzer.*` | `plugins.cortex.*` |
| IPC prefix | `cban:*` | `cortex:*` |
| Store file | `codebase-analyzer-store.ts` | `cortex-store.ts` |
| Component dir | `plugins/codebase-analyzer/` | `plugins/cortex/` |
| Main process dir | `main/codebase-analyzer/` | `main/cortex/` |
| Preload namespace | `window.api.cban.*` | `window.api.cortex.*` |
| SQLite DB file | `cban.db` (keep for backward compat) | `cban.db` (no rename) |

**Files to rename/update:**
- `src/renderer/src/plugins/codebase-analyzer/` → `cortex/`
- `src/renderer/src/stores/codebase-analyzer-store.ts` → `cortex-store.ts`
- `src/renderer/src/types/codebase-analyzer.ts` → `cortex.ts`
- `src/main/codebase-analyzer/` → `main/cortex/`
- Registry entry, PluginId union, preload bridge, electron.d.ts, ipc-handlers.ts

**Settings migration (one-time):**
On first launch after rename, run a migration in the main process:
1. Read any `plugins.codebase-analyzer.*` settings from electron-store
2. Copy each to `plugins.cortex.*`
3. Delete old `plugins.codebase-analyzer.*` keys
4. This preserves the user's configured default AI agent and any other settings

---

## 2. Persistence — Repos Lost on Restart

**Root cause:** Zustand store is in-memory. Repo list is never persisted. SQLite caches analysis results but not the repo list itself.

**Solution:**

Add a `repos` table to SQLite (`cache-db.ts`):
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

**New methods on AnalyzerDatabase:**
- `saveRepo(repo)` — upsert repo record
- `listRepos()` — return all saved repos
- `removeRepo(id)` — delete repo record
- `updateRepo(id, fields)` — partial update

**New IPC handler:** `cortex:listRepos`
- Reads repos from SQLite
- Verifies each repo's cloned directory exists on disk
- Returns repo list with status (`idle` if clone exists, `needs-clone` if missing)

**Store hydration:**
- `loadRepos()` action called on mount
- Calls `window.api.cortex.listRepos()`
- Populates store with persisted repos
- If a repo's clone directory is missing, shows "Re-clone needed" status

**Write-through:** Every `addRepo`, `updateRepo`, `removeRepo` action also calls the IPC to persist to SQLite.

---

## 3. Code Panel Resize Fix

**Problem:** File tree panel too narrow — file/folder names clipped to just icons.

**Fix:**
- Increase `minSize` from 15% to 20%
- Add `overflow-x: auto` with horizontal scroll on file tree container
- Wider resize handle hit area (8px instead of 4px) with `cursor: col-resize`
- Add visible drag affordance line on hover (`bg-accent/40`)

---

## 4. Language Breakdown Accuracy

**Problem:** XML, YAML, SQL, Dockerfile files dominate the breakdown, making source language percentages misleading.

**Fix — Two-tier breakdown:**

**Source Languages bar** (primary, prominent):
- Only: Java, Python, TypeScript, JavaScript, Go, Kotlin, Rust, Ruby, C#, C/C++, Swift, PHP
- Percentage based on line count among source files only

**Config & Other bar** (secondary, smaller):
- XML, YAML, JSON, SQL, Markdown, Dockerfile, Shell, Properties, TOML, CSS, HTML
- Shown as a footnote-style secondary bar below source languages

**Implementation:**
- Add `isSourceLanguage(lang)` utility function
- Split `stats.languages` into two arrays before rendering
- Separate color palettes for each tier

---

## 5. AI Agent Selection

**Pattern:** Follow CodeReviewBot, TextCraft, Launchpad pattern exactly.

**Settings schema** (in registry.ts):
```typescript
settingsSchema: [
  {
    key: 'defaultAgent',
    label: 'Default AI Agent',
    type: 'agent-select',
    default: null
  }
]
```

**Agent resolution** (shared `getCortexAgent()` function):
```typescript
function getCortexAgent() {
  const defaultAgentId = getSetting('plugins.cortex.defaultAgent')
  const providers = useAgentStore.getState().providers
  const agent = defaultAgentId
    ? providers.find(p => p.id === defaultAgentId)
    : providers.find(p => p.status === 'connected' || p.hasApiKey)
  if (!agent) return null
  return { providerId: agent.id, model: agent.model || agent.id, command: agent.command }
}
```

**Used by:** QAPanel, OverviewTab (AI docs), DesignDocTab (architecture analysis), test assessment.

**No agent configured:** Show a subtle banner: "Configure an AI Agent in Settings to unlock AI-powered insights" with Settings link.

---

## 6. Java Parser — Multi-Architecture Support

### Architecture Detection Heuristic

```
if (has adapters/ AND application/**/port/) → HEXAGONAL
else if (multiple sibling packages each with controller+service dirs) → DOMAIN
else → LAYERED (default)
```

### Hexagonal Architecture Support

**Path-based entity classification:**

| Directory Pattern | Entity Kind |
|-------------------|-------------|
| `application/**/port/in/**` | `port-in` |
| `application/**/port/out/**` | `port-out` |
| `adapters/web/**` or `adapters/rest/**` | `web-adapter` |
| `adapters/db/**` or `adapters/persistence/**` | `db-adapter` |
| `adapters/http/**` | `http-adapter` |
| `application/**/` (non-port) | `service` |
| `config/**` | `configuration` |
| `clients/**` | `client-impl` |
| `common/**` | `shared` |
| `errors/**` | `error-handler` |

**Additional Spring annotations to detect:**
- `@Configuration`, `@Bean` → configuration entity
- `@Component`, `@Aspect` → aspect/component entity
- `@Filter` → filter entity
- `@Transactional`, `@Async` → metadata on entities
- `@ConditionalOnProperty`, `@Profile` → conditional bean metadata
- Constructor injection: `@Autowired` or constructor with injected params → call graph edges

### Domain-Level Segregation

Detect: Multiple packages at same depth each containing `controller/`, `service/`, `repository/` subdirectories.

Group entities by domain package name. Show domain as a grouping label in UI.

### Layered Segregation

Already partially supported. Enhanced with:
- Better `@RequestMapping` base path detection
- `@PathVariable`, `@RequestBody`, `@RequestParam` parameter annotations
- Service-to-repository call graph edges from constructor injection

---

## 7. Python Parser — PySpark & FastAPI Enhancements

### PySpark Support (new)

**Detection:** Files containing `SparkSession`, `spark.read`, `spark.sql`, `pyspark` imports.

**Entity extraction:**
- `SparkSession.builder...getOrCreate()` → `spark-session` entity
- `spark.read.format(...)` / `spark.read.csv(...)` → `spark-source` entity
- DataFrame transformations (`.filter`, `.groupBy`, `.join`, `.withColumn`) → `spark-transform` entities
- `.write.format(...)` / `.write.saveAsTable(...)` → `spark-sink` entity
- `spark.sql("...")` → `spark-sql` entity with extracted SQL

**Pipeline construction:**
- Chain: source → transforms → sink
- Each job file produces one pipeline of type `spark-job`

### FastAPI Enhancements

- `APIRouter(prefix=...)` detection for route prefix
- `Depends(...)` → call graph edges (dependency injection)
- Pydantic `BaseModel` subclasses → `model` entities with field extraction
- `@app.on_event("startup")` / `@app.on_event("shutdown")` → lifecycle entities

---

## 7.5 React/TS Parser — Component Tree Enhancements

The existing `fe-parser.ts` detects React components and builds a basic component tree. Enhancements needed:

**Prop flow detection:**
- Parse JSX attributes to extract passed props: `<Child name={value} onClick={handler} />`
- Show prop names on edges between parent → child components
- Detect spread props `{...props}` as "pass-through" indicator

**React Router support:**
- Detect `<Route path="..." element={<Component />} />` patterns
- Build route tree alongside component tree
- Show route paths on component nodes that are route targets

**Hook detection improvements:**
- Detect custom hooks (`use*` functions) and show as utility nodes
- Show `useContext` connections (which components share context)
- Detect `useEffect` with dependency arrays (side effect mapping)

**State management:**
- Detect Zustand/Redux store usage (`useStore`, `useSelector`, `useDispatch`)
- Show which components connect to which stores

---

## 8. Flow Visualization — Framework-Specific Graphs

### Flow Types by Framework

| Framework | Flow Name | Node Chain |
|-----------|-----------|------------|
| Spring Boot (Layered) | API Flow | Controller → Service → Repository → DB |
| Spring Boot (Hexagonal) | API Flow | WebAdapter → InboundPort → AppService → OutboundPort → DbAdapter |
| Spring Boot (Domain) | API Flow | DomainController → DomainService → DomainRepo → DB |
| ReactJS | Component Tree | App → Router → Pages → Components (with prop flow) |
| FastAPI | API Flow | Router → Endpoint → Depends → Service → DB |
| PySpark | Data Pipeline | Source → Transform₁ → ... → Transformₙ → Sink |
| Airflow | DAG Pipeline | Task₁ → Task₂ → ... (with operator labels) |
| dbt | Model Pipeline | Model → ref() deps → downstream models |

### Node Styling by Kind

Each entity kind gets a distinct gradient + icon:
- Controllers/Adapters: teal gradient, `Globe` icon
- Services: blue gradient, `Cog` icon
- Repositories/DB: amber gradient, `Database` icon
- Ports: purple gradient, `Plug` icon
- Components: green gradient, `Boxes` icon
- Spark transforms: orange gradient, `Flame` icon
- Tasks: slate gradient, `ListChecks` icon

---

## 9. Design Page Redesign → "Architecture Dashboard"

**Current:** Wall of markdown HLD with static Mermaid diagrams. Not engaging.

**Redesigned as interactive Architecture Dashboard with 3 sections:**

### Section A: Architecture Overview (top, full width card)

- **Architecture badge**: "Hexagonal Architecture" / "Layered" / "Domain-Driven"
- **Tech stack badges**: Colored pills showing framework, language, DB, cache, etc.
- **AI-generated summary**: 2-3 sentences describing what this codebase does
- **Interactive module graph**: React Flow diagram showing top-level module relationships (draggable)

### Section B: Insight Cards (middle, responsive grid)

Cards with animated entrance (staggered fade-up):

1. **Dependencies** — External deps grouped by category (web, db, testing, utils) with version badges
2. **Security** — Auth patterns (JWT, OAuth, RBAC), security annotations found
3. **Patterns** — Design patterns detected (DI, Repository, Factory, Observer, etc.)
4. **Configuration** — Config sources (application.yml, env vars, profiles, secrets)
5. **Async & Jobs** — Async patterns, schedulers, message queues
6. **Tests** — Test count, framework, estimated coverage, files without tests

### Section C: Architecture Diagrams (bottom, tabbed)

Interactive React Flow diagrams (not Mermaid):
- **Module Dependency Graph** — Package/module relationships
- **Layer Interaction** — Controller → Service → Repository flow
- **Data Flow** — How data moves through the system

Each node clickable → navigates to Code tab at that file.

### AI-Powered Content Generation

- On first analysis, AI generates all card content using TOON format
- Cached in SQLite per `repoUrl+branch+commitSha`
- "Refresh with AI" button to regenerate
- Streaming UX: cards fill in progressively as AI responds

---

## 10. Interactive Diagrams — React Flow Everywhere

### In-App: All React Flow

**Every** diagram in Cortex uses React Flow with:
- Dagre auto-layout (initial positioning)
- Draggable nodes (users can rearrange)
- Zoom/pan controls + minimap
- Fit-to-view button
- Direction toggle (TB ↔ LR)
- Fullscreen toggle

**FlowNode redesign:**
- Gradient background by entity kind (see Section 8 color table)
- Subtle box-shadow glow matching gradient color
- Hover: scale 1.02, shadow intensifies, tooltip with full details
- Click: navigate to Code tab at file:line
- Icon in header matching entity kind

**Animated edges:**
- Gradient stroke (source color → target color)
- Animated dash pattern via CSS `stroke-dashoffset`
- Directional arrow markers
- Label on edge showing relationship type (calls, imports, depends, injects)

### On Export: Mermaid Only

When user clicks Export (PDF/MD/TXT):
- Convert React Flow node/edge data → Mermaid syntax in main process
- Mermaid used only for generating static diagrams in export files
- Existing `mermaid-generator.ts` handles conversion

---

## 11. AI-Powered Insights

### Analysis Pipeline (Enhanced)

After static analysis completes, run an AI pass:

1. Build a TOON-format prompt with:
   - Repo type, framework, language, architecture pattern
   - Top 100 entities (ranked by call graph centrality)
   - All routes/endpoints
   - File tree structure (compressed via RTK if available)
   - Test file list and counts

2. Send via `window.api.ai.startAnalysis()` using configured agent

3. AI responds in TOON format:
```
SUMMARY|Multi-tenant healthcare API using hexagonal architecture
ARCH|hexagonal|Spring Boot 3.3|Java 17|jOOQ|Caffeine|PostgreSQL
PATTERN|hexagonal-ports|Inbound ports define service contracts
PATTERN|conditional-beans|Runtime client-specific service injection
PATTERN|composite-decorator|Async context propagation across threads
SECURITY|jwt|JwtAuthenticationFilter validates tokens
SECURITY|rbac|@RequireRoles annotation with RequireRolesAspect
CONFIG|application.yml|Spring profiles|environment variables
CONFIG|secrets|Multi-cloud secrets management (AWS/Azure/GCP)
ASYNC|@Async|CompletableFuture|CompositeTaskDecorator
TEST|junit5|testcontainers|restassured|integration-tests
INSIGHT|strength|Clean port isolation — domain logic never imports adapters
INSIGHT|concern|No rate limiting on public API endpoints
ENTITY|ProviderController|web-adapter|adapters/web/ProviderController.java:15|Provider CRUD operations
DEP|web|spring-boot-starter-web|3.3.0
DEP|db|jooq|3.19.0
DEP|cache|caffeine|3.1.0
DEP|test|testcontainers|1.19.0
```

4. Parse TOON response → populate Architecture Dashboard cards

5. Cache in SQLite: `INSERT INTO ai_insights (repoUrl, branch, commitSha, agentId, toonData, createdAt)`

### Streaming UX

- Show "Cortex is thinking..." with animated Brain icon (pulse + rotate)
- Cards appear progressively as TOON lines are parsed from the stream
- Each card has a subtle fade-in animation when its data arrives

---

## 12. Token Optimization

### TOON Format

All AI interactions use TOON (pipe-delimited, one record per line) instead of JSON.

**TOON schema (record types):**

| Record Type | Fields | Required |
|-------------|--------|----------|
| `SUMMARY` | description | Yes |
| `ARCH` | pattern, framework, language, ...libs | Yes |
| `PATTERN` | name, description | No |
| `SECURITY` | type, description | No |
| `CONFIG` | source, description | No |
| `ASYNC` | type, description | No |
| `TEST` | framework, ...details | No |
| `INSIGHT` | severity(strength/concern), description | No |
| `ENTITY` | name, kind, file:line, summary | No |
| `DEP` | category, name, version | No |

**Validation:** `toon-parser.ts` validates each line:
- Skip empty lines and lines not matching `TYPE|...` format
- Log warning for unknown record types but don't crash
- If AI returns non-TOON output (JSON, markdown), attempt best-effort extraction of key info and show "AI response format unexpected" toast
- Retry once with a more explicit "Respond ONLY in TOON format" system prompt suffix if first attempt fails
- ~70-80% fewer tokens than equivalent JSON
- Parsed client-side with simple `line.split('|')` logic
- Same pattern already used by CodeReviewBot for review comments

### RTK Integration (Optional)

RTK compresses command outputs by 60-90%. Integrate as optional optimization:

**Detection:** `probeCli('rtk')` on app start → store availability flag

**Usage in prompt construction:**
- When building AI context, compress file content via `rtk read <file>` (spawned via child_process)
- Compress git log/diff via `rtk git log` / `rtk git diff`
- Falls back to raw content if RTK not installed

**Error handling:**
- If `rtk read` fails on a specific file, log warning and fall back to raw `fs.readFile` for that file only
- If `probeCli('rtk')` succeeds but RTK consistently fails (3+ errors in one session), disable RTK for the session and show a toast: "RTK disabled due to errors — using raw content"
- Version check: run `rtk --version` on probe, warn if version is unsupported

**Settings UI:**
- Show RTK status in Cortex settings: "Installed ✓" or "Not installed — [Install guide](https://github.com/rtk-ai/rtk)"
- Token savings display in status bar (from `rtk gain` if available)

### Smart Context Management

- **Entity ranking**: Sort by call graph centrality, send top N to AI
- **Incremental re-analysis**: On re-analyze, `git diff` since last commit SHA — send only changed files
- **Prompt budgeting**: Cap context at ~60% of model window size
- **Chunked analysis**: For repos with >500 entities, analyze in domain chunks and merge

---

## 13. File Click → Code Tab Navigation

### Shared Navigation Function

```typescript
// In cortex-store.ts
navigateToFile(filePath: string, line?: number): void {
  this.setActiveTab('code')
  this.openFile(filePath, detectLanguage(filePath))
  window.api.cortex.getFileContent(repoPath, filePath)
    .then(content => {
      this.setFileContent(content)
      if (line) this.setScrollToLine(line)
    })
}
```

### Integration Points

| Location | Clickable Element | Action |
|----------|-------------------|--------|
| Overview → Entity Breakdown | Entity name/count | Navigate to first entity of that kind |
| APIs tab | Endpoint row | Navigate to controller file:line |
| Flows tab | Flow node | Navigate to entity file:line (already works) |
| Architecture Dashboard | Diagram node | Navigate to file |
| Architecture Dashboard | File references in cards | Navigate to file |
| Ask tab | Source citations `[file:line]` | Parse and navigate |
| File Tree | File click | Already works |

### CodeMirror Scroll-to-Line

Add `scrollToLine` state to store. CodeMirror effect:
```typescript
useEffect(() => {
  if (scrollToLine && editorView) {
    const line = editorView.state.doc.line(scrollToLine)
    editorView.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' })
    })
    setScrollToLine(null) // clear after scrolling
  }
}, [scrollToLine, editorView])
```

---

## 14. Test Cases & Coverage in Overview

### Test Detection (Static Analysis)

**Test file patterns:**
| Language | Patterns |
|----------|----------|
| Java | `*Test.java`, `*Tests.java`, `*Spec.java`, `*IT.java` |
| TypeScript/JS | `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `__tests__/**` |
| Python | `test_*.py`, `*_test.py`, `tests/**/*.py` |
| Go | `*_test.go` |

**Test framework detection:**
| Framework | Detection |
|-----------|-----------|
| JUnit 5 | `@Test`, `@ParameterizedTest`, `org.junit.jupiter` |
| TestContainers | `@Testcontainers`, `org.testcontainers` |
| Jest/Mocha | `describe(`, `it(`, `test(` |
| pytest | `def test_`, `@pytest.fixture` |
| Go testing | `func Test`, `testing.T` |

**Metrics computed:**
- Total test files count
- Total test methods/functions count
- **Test file coverage** estimate: (source files with matching test file) / (total source files) × 100
  - Note: This is file-presence coverage, NOT execution-based line/branch coverage. UI labels it "Test File Coverage" with a tooltip explaining the distinction.
- Test frameworks used (badges)

**AI enhancement:** Ask AI to assess test quality and coverage gaps.

### Overview Card UI

"Tests & Coverage" card:
- Test count with framework badges
- Animated progress ring showing "Test File Coverage" %
- Tooltip: "Percentage of source files that have a corresponding test file. Not execution-based coverage."
- "Files without tests" expandable list (clickable → navigate to file)
- Color coding: >70% green, 40-70% yellow, <40% red

---

## 15. Caching & Re-analyze

### Cache Structure

**Existing** `analysis_cache` table: stores full analysis results per `repoUrl+branch+commitSha`.

**New** `ai_insights` table:
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

### Re-analyze Flow

1. User clicks "Re-analyze" on repo card
2. `git fetch origin && git reset --hard origin/<branch>` (safe for app-managed clones, avoids merge conflicts from force-pushes)
3. Check if commit SHA changed
4. If changed: clear old cache entries, run full analysis + AI pass
5. If unchanged: show "Already up to date" toast
6. Update `lastAnalyzed` timestamp

### UI Indicators

- Repo card shows "Last analyzed: 2h ago" with relative time
- "Cached" badge when viewing cached results
- "Re-analyze" button (refresh icon) on repo card and in status bar
- Analysis progress overlay with percentage and stage description

---

## 16. UI/UX Polish & Animations

### Framer Motion Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Tab transition | Slide + fade (direction-aware) | 200ms |
| Overview cards | Staggered fade-up | 300ms + 50ms stagger |
| Stats numbers | CountUp animation (0 → value) | 800ms ease-out |
| Loading states | Skeleton shimmer (pulse) | Continuous |
| Flow diagram nodes | Staggered fade-in by graph depth | 200ms + 30ms stagger |
| Architecture Dashboard cards | Scale 0.95→1 + fade | 300ms + 80ms stagger |
| Toast notifications | Slide-in from bottom-right | 200ms |

### Animated Number Counter

Custom `AnimatedCounter` component:
- Animates from 0 to target value over 800ms
- Uses `requestAnimationFrame` for smooth 60fps
- Easing: `easeOutExpo`
- Triggers on element entering viewport (Intersection Observer)

### Performance Guardrails

- `will-change: transform` only on actively animating elements
- Respect `prefers-reduced-motion` — disable all animations
- `React.memo` on FlowNode, FileTreeNode to prevent unnecessary re-renders
- `React.lazy` for heavy components: React Flow, CodeMirror
- Virtualized file tree for repos >1000 files (react-window `FixedSizeList`)
- Debounce file tree search input (300ms)
- React Flow: cap visible nodes at 200, show "Showing 200 of N nodes" with filter

---

## Implementation Order

### Wave 1: Foundation (no visual changes yet)
1. Rename to Cortex (all files, IPC, types, store, registry)
2. Repo persistence (SQLite repos table, IPC, store hydration)
3. Cache AI insights table

### Wave 2: Parser & Analysis Improvements
4. Java parser — hexagonal/domain/layered architecture support
5. Python parser — PySpark, FastAPI enhancements
6. Test detection & coverage estimation
7. AI agent selection (settings schema, shared getCortexAgent)

### Wave 3: UI/UX Overhaul
8. Code panel resize fix
9. Language breakdown accuracy (two-tier)
10. File click navigation (shared navigateToFile)
11. AnimatedCounter, staggered card animations
12. FlowNode redesign (gradients, icons, animations)
13. Animated edges
14. Test card in Overview (pairs with Wave 2 test detection backend)

### Wave 4: Architecture Dashboard & AI
15. Design page → Architecture Dashboard (3 sections)
16. TOON prompt construction & parsing
17. AI-powered insights with streaming UX
18. RTK integration (optional)

### Wave 5: Polish
19. Re-analyze flow (git fetch + reset, cache clear, re-run)
20. Performance guardrails (virtualization, lazy loading, reduced motion)
21. Export: React Flow → Mermaid conversion for PDF/MD/TXT

---

## Files Affected (Summary)

### Renamed
- `src/renderer/src/plugins/codebase-analyzer/` → `plugins/cortex/`
- `src/renderer/src/stores/codebase-analyzer-store.ts` → `cortex-store.ts`
- `src/renderer/src/types/codebase-analyzer.ts` → `cortex.ts`
- `src/main/codebase-analyzer/` → `main/cortex/`

### Modified
- `src/renderer/src/plugins/registry.ts` — plugin entry
- `src/renderer/src/types/plugin.ts` — PluginId union
- `src/preload/index.ts` — preload bridge namespace
- `src/renderer/src/types/electron.d.ts` — API types
- `src/main/ipc-handlers.ts` — IPC handler names
- `src/main/cortex/cache-db.ts` — repos table, ai_insights table
- `src/main/cortex/parser/java-parser.ts` — hexagonal/domain support
- `src/main/cortex/parser/python-parser.ts` — PySpark, FastAPI
- `src/main/cortex/parser/index.ts` — test detection
- `src/main/cortex/analyzer.ts` — test stats, AI pass
- `electron.vite.config.ts` — already has typescript externalized

### New
- `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx`
- `src/renderer/src/plugins/cortex/components/InsightCard.tsx`
- `src/renderer/src/plugins/cortex/components/AnimatedCounter.tsx`
- `src/renderer/src/plugins/cortex/components/TestCoverageCard.tsx`
- `src/main/cortex/toon-parser.ts` — TOON format parsing
- `src/main/cortex/rtk-integration.ts` — optional RTK compression
