# Codebase Analyzer Plugin -- Pitfalls & Edge Cases

**Researched:** 2026-03-14
**Domain:** Electron + React + TypeScript -- Git cloning, code parsing, AI Q&A, visualization
**Confidence:** HIGH (verified against project codebase, Electron docs, community reports)

---

## 1. Git Cloning in Electron

### 1.1 Sandbox Restrictions on Spawning Git

**Severity: HIGH -- Architecture-level decision**

The Zenith app uses `sandbox=true` with contextBridge IPC. The renderer process has zero access to `child_process`, `fs`, or any Node.js core modules. All git operations MUST run in the main process and communicate results via IPC.

**What goes wrong:**
- Attempting `spawn('git', ...)` from renderer silently fails or throws.
- Even preload scripts (sandboxed since Electron 20+) cannot access `child_process`.

**How the project already handles this:** The existing `cli-stream.ts` and `transcription.ts` modules both spawn child processes from the main process. Follow the same pattern -- IPC handler in main, preload API bridge, renderer calls `window.api.codeAnalyzer.*`.

**Recommendation:** Create a `src/main/codebase-analyzer/git-operations.ts` module that handles all git spawning. Register IPC handlers following the existing pattern in `ipc-handlers.ts`.

### 1.2 child_process.spawn Performance in Electron

**Severity: MEDIUM -- Known Electron regression**

Electron 12+ introduced a significant regression in `child_process.spawn` performance:
- spawn overhead went from ~10ms to ~500ms per invocation (50x slower)
- On macOS signed apps, spawn can lock up for 300-3000ms
- On Windows, `execFile` can take minutes for operations that complete in seconds on Node.js

**Source:** [electron/electron#28683](https://github.com/electron/electron/issues/28683), [electron/electron#26143](https://github.com/electron/electron/issues/26143)

**How to avoid:**
- Batch git operations rather than spawning per-file
- Use `git clone` once, then parse files with Node.js `fs` (no further git spawns needed for analysis)
- For git log/blame, consider `simple-git` which reuses a single child process where possible
- Run long git operations with `{ stdio: 'pipe' }` and stream progress via IPC events (the project already does this for AI streaming)

### 1.3 Large Repo Handling

**Severity: HIGH -- Can freeze or crash the app**

A full clone of a large monorepo (e.g., torvalds/linux = 7+ GB, typical enterprise monorepo = 2-5 GB) will:
- Block the main process if awaited synchronously
- Consume gigabytes of disk in `app.getPath('userData')`
- Take 10+ minutes on slow connections with no user feedback

**How to avoid:**
- **Use shallow clone by default:** `git clone --depth 1 --single-branch` reduces linux kernel from 7GB to <1GB, clones 4x faster
- **Set a size limit:** Before cloning, run `git ls-remote` to verify the repo exists, then set a configurable max disk budget (e.g., 2GB default)
- **Stream progress to renderer:** Parse git's stderr for progress messages (`Receiving objects: 45%`) and forward via IPC events, exactly like the AI streaming pattern (`onStreamChunk`)
- **Use AbortController / kill:** Store the spawned child process reference so the user can cancel mid-clone

**Trade-off -- shallow vs full clone:**
| Aspect | `--depth 1` | Full clone |
|--------|-------------|------------|
| Disk space | 68-87% savings | Full history |
| Clone speed | 4x faster | Slow |
| `git log` | Not available | Available |
| `git blame` | Not available | Available |
| File content analysis | Works fine | Works fine |

**Recommendation:** Default to `--depth 1` since codebase analysis primarily needs current file contents, not history. Offer "deep clone" as an opt-in for blame/history features.

### 1.4 Private Repo Authentication

**Severity: MEDIUM -- UX and security concern**

Users may want to analyze private repos. Authentication methods:
- **SSH keys:** Work if the user has `~/.ssh` configured. `git clone git@github...` will use the system SSH agent. No app-level credential storage needed.
- **HTTPS with token:** Requires embedding token in URL (`https://token@github.com/...`) or git credential helper. The URL approach leaks credentials to process arguments visible in `ps`.
- **HTTPS with username/password:** Prompts for credentials, which causes `child_process.exec` to hang waiting for stdin input ([nodejs/node#9146](https://github.com/nodejs/node/issues/9146)).

**How to avoid:**
- Support SSH URLs as-is (zero config if user has SSH set up)
- For HTTPS, use git's `GIT_ASKPASS` environment variable or credential helper to inject tokens without embedding in the URL
- Store tokens using Electron's `safeStorage` (the project already does this for Bitbucket credentials via `credentialsStore`)
- **Never** use `execSync` for clone -- an auth prompt will freeze the entire main process
- Set `GIT_TERMINAL_PROMPT=0` env var to prevent git from waiting for interactive input; fail fast and report to user instead

### 1.5 Disk Space Management

**Severity: MEDIUM -- Gradual resource exhaustion**

Users will analyze multiple repos over time. Without cleanup, cloned repos accumulate in `userData`.

**How to avoid:**
- Store clones in a dedicated subdirectory: `app.getPath('userData') + '/codebase-analyzer/repos/'`
- Track each clone with metadata (repo URL, clone date, size, last accessed)
- Provide a "Manage Repos" UI showing disk usage per repo with delete buttons
- Implement LRU eviction: warn when total clone storage exceeds a configurable threshold (e.g., 5GB)
- On app quit, do NOT auto-delete -- users expect data persistence. But offer a "Clear all caches" option.

---

## 2. Code Parsing Edge Cases

### 2.1 Mixed Language Repos

**Severity: HIGH -- Most real codebases are polyglot**

A typical backend repo contains Java/Python/Go source alongside SQL migrations, YAML configs, Dockerfiles, shell scripts, and documentation. A parser that only handles one language misses critical context.

**How to avoid:**
- Use file extension mapping to determine language, not content sniffing
- Support a tiered parsing strategy:
  - **Tier 1 (AST-parsed):** JS/TS, Python, Java, Go, Rust -- use tree-sitter grammars
  - **Tier 2 (regex-parsed):** SQL, YAML, TOML, Dockerfile -- extract structure with simple patterns
  - **Tier 3 (text-indexed):** Markdown, text, config files -- index for FTS search only, no AST
  - **Tier 4 (skipped):** Binary files, images, compiled output, `node_modules/`, `.git/`
- Build a language detection module early -- it is foundational to every other feature

### 2.2 Monorepo Detection and Handling

**Severity: MEDIUM -- Affects analysis scope**

Monorepos (Nx, Turborepo, Lerna, Bazel, Pants) contain multiple logical projects. Analyzing the whole repo as one project produces meaningless results -- e.g., a shared utility library's call graph has no connection to the frontend app.

**How to avoid:**
- Detect monorepo indicators: `nx.json`, `turbo.json`, `lerna.json`, `pnpm-workspace.yaml`, `BUILD` files, `WORKSPACE` (Bazel)
- When detected, present the user with a project picker: "This repo contains 5 packages. Select which to analyze."
- Scope analysis to selected project(s) rather than the entire repo
- Store workspace root and per-project paths separately

### 2.3 Generated Code

**Severity: LOW-MEDIUM -- Pollutes analysis results**

Generated files (protobuf stubs, Swagger codegen, compiled CSS, auto-generated types) inflate metrics and add noise to documentation.

**How to avoid:**
- Auto-detect common generated patterns:
  - Header comments: `// Code generated by`, `// DO NOT EDIT`, `@generated`
  - Known directories: `generated/`, `__generated__/`, `dist/`, `build/`, `out/`, `.next/`
  - Known files: `*.pb.go`, `*.pb.ts`, `*.generated.ts`, `*.auto.ts`
- Default to excluding generated code from analysis
- Allow users to override exclusions via a `.codeanalyzer.yml` or settings UI
- **Important:** Still index generated files in FTS (users may want to search them) but exclude from metrics/documentation

### 2.4 Dynamic Routing and Decorator Patterns

**Severity: MEDIUM -- Static analysis blind spots**

Many frameworks use patterns that static analysis cannot resolve:
- Express: `app.use(middleware)` chains are not statically analyzable
- NestJS/Spring decorators: `@Controller('/users')` + `@Get('/:id')` -- need decorator-aware parsing
- Django URL patterns: `urlpatterns = [path('users/', views.user_list)]`
- Dynamic imports: `import(variable)` -- target unknown at parse time

**How to avoid:**
- Accept that 100% call graph accuracy is impossible for dynamic languages
- For common frameworks, build framework-specific heuristic extractors (e.g., scan for Express `.get()/.post()/.use()` patterns via regex)
- Mark dynamically-resolved edges in the call graph as "inferred" vs "static"
- Document this limitation clearly in the UI: "Some connections may be missing due to dynamic dispatch"

### 2.5 Circular Dependencies in Call Graphs

**Severity: MEDIUM -- Can crash graph rendering and analysis**

Real codebases frequently have circular imports (A imports B, B imports C, C imports A). Naive graph traversal will infinite-loop.

**How to avoid:**
- Use a visited-set during graph traversal -- standard cycle detection
- When rendering with React Flow or react-force-graph-2d (already in the project), circular edges are fine -- graph libraries handle cycles naturally
- For documentation generation, detect cycles and break them with a note: "Circular dependency detected between A, B, C"
- For AI context building, track visited modules to prevent infinite expansion

---

## 3. Performance Concerns

### 3.1 Parsing Large Codebases (10k+ files)

**Severity: HIGH -- Can freeze the app for minutes**

better-sqlite3 is synchronous and runs on the main thread. Parsing 10k+ files with AST construction, indexing into SQLite, and building graphs can block the main process for 30+ seconds, freezing the entire Electron UI.

**How to avoid:**
- **Batch processing with yielding:** Process files in batches of 50-100, using `setImmediate()` or `setTimeout(0)` between batches to let the event loop breathe
- **Worker threads:** For CPU-intensive AST parsing, use `worker_threads` (NOT used elsewhere in the project yet, but the correct tool here). Parse files in a worker, send results back to main for SQLite insertion
- **Use web-tree-sitter (WASM) instead of node-tree-sitter (native):** Avoids the native module rebuild nightmare with Electron. The Pulsar editor project migrated to web-tree-sitter specifically for Electron compatibility. Performance penalty is small in practice.
  - **Source:** [tree-sitter/node-tree-sitter#126](https://github.com/tree-sitter/node-tree-sitter/issues/126)
  - node-tree-sitter requires `@electron/rebuild` for every Electron version upgrade and frequently hits NODE_MODULE_VERSION mismatches
  - web-tree-sitter .wasm files are architecture-independent -- no rebuild needed
- **Progress reporting:** Emit progress events (files parsed / total files) via IPC so the renderer can show a progress bar
- **Incremental analysis:** On re-analysis, only re-parse files with changed mtimes (store file hash/mtime in SQLite)

### 3.2 tree-sitter Native Module vs WASM in Electron

**Severity: HIGH -- Build/distribution blocker**

node-tree-sitter is a native C++ addon. In Electron:
- Must be rebuilt for Electron's specific Node ABI version using `@electron/rebuild`
- Breaks on every Electron major version upgrade
- Prebuilt binaries may not exist for the target Electron version
- Different binaries needed per platform (macOS arm64/x64, Windows, Linux)

**Source:** [tree-sitter/node-tree-sitter#126](https://github.com/tree-sitter/node-tree-sitter/issues/126), [tree-sitter/tree-sitter#335](https://github.com/tree-sitter/tree-sitter/issues/335)

**Recommendation: Use web-tree-sitter exclusively.**
- Install: `npm install web-tree-sitter`
- Load grammars as `.wasm` files (available from [Menci/tree-sitter-wasm-prebuilt](https://github.com/Menci/tree-sitter-wasm-prebuilt))
- No native compilation, no rebuild, no platform-specific binaries
- Slightly slower than native but dramatically simpler to distribute
- The project already has electron-builder configured -- adding `.wasm` files to the build is straightforward

### 3.3 React Flow / Graph Performance with 100+ Nodes

**Severity: MEDIUM -- Degrades UX for large codebases**

The project already uses `react-force-graph-2d` for Nebula's knowledge graph. For codebase visualization (call graphs, dependency trees), node counts can easily reach 200-500+.

**Key performance findings from React Flow docs:**
- Custom node/edge components MUST be memoized with `React.memo()` or defined outside the parent component -- otherwise every node re-renders on any state change
- Do NOT store node/edge state in `useState` or Context -- use Zustand (already in the project)
- Enable `onlyRenderVisibleElements` to skip rendering off-screen nodes
- Node drag triggers state updates per pixel -- enable grid snapping to reduce update frequency
- Complex CSS (shadows, gradients, animations) on nodes kills performance

**Source:** [reactflow.dev/learn/advanced-use/performance](https://reactflow.dev/learn/advanced-use/performance)

**How to avoid:**
- For call graphs with 100+ nodes, implement hierarchical collapsing (expand/collapse module groups)
- Default to showing module-level view (20-50 nodes), drill down to function-level on click
- Consider using `react-force-graph-2d` (already a dependency) instead of React Flow for large graphs -- canvas-based rendering handles thousands of nodes better than DOM-based
- Set a hard limit: if a graph exceeds 500 nodes, show a filtered/summarized view with a warning

### 3.4 SQLite FTS5 Performance for Code Q&A

**Severity: LOW -- FTS5 is fast, but indexing strategy matters**

The project already uses better-sqlite3 with FTS5 for Nebula (see `src/main/nebula/database.ts`). For codebase search, the same pattern works but with caveats:

- FTS5 indexing is ~40% faster than FTS3 and retrieval is ~30% faster
- For a 10k-file codebase, initial FTS indexing takes a few seconds (acceptable)
- BM25 ranking works well for natural language queries over code comments/docstrings
- BM25 is less effective for searching code identifiers (camelCase, snake_case need tokenization)

**How to avoid pitfalls:**
- Use a custom FTS5 tokenizer or pre-process code: split `getUserById` into `get user by id` before indexing
- Index multiple columns with different weights: function names (high weight), comments (medium), body (low)
- Follow the Nebula pattern: standalone FTS table (no `content=` directive), manual sync via transactions
- Use the same stop-word filtering approach already in `NebulaDatabase.searchNotes()`

---

## 4. AI Context Window Limitations

### 4.1 Large Codebases Exceed Context Window

**Severity: HIGH -- Fundamental constraint**

Even with 200k-token context windows, a 10k-file codebase easily produces millions of tokens of source code. Naively stuffing all code into a prompt will fail.

**How to avoid:**
- **AST-based chunking:** Parse files into functions/classes, chunk at semantic boundaries (not arbitrary character counts). This preserves code meaning within each chunk.
  - Source: [RAG for LLM Code Generation using AST-Based chunking](https://medium.com/@vishnudhat/rag-for-llm-code-generation-using-ast-based-chunking-for-codebase-c55bbd60836e)
- **Two-stage retrieval for Q&A:**
  1. FTS5/BM25 retrieves top-N relevant files/functions (fast, runs locally)
  2. Send only those chunks to the LLM with the user's question
- **Chunk size:** 256-512 tokens per chunk with 10-20% overlap is the current best practice
- **Context budget:** Reserve ~50% of context window for the question + system prompt + response, use the other ~50% for retrieved code
- **Hierarchical summarization:** For documentation generation, summarize file-by-file (cheap per-file calls), then summarize summaries into module-level docs

### 4.2 Selecting Relevant Code for Q&A Answers

**Severity: MEDIUM -- Poor retrieval = poor answers**

BM25 alone misses semantic similarity. "How does authentication work?" won't match code that uses `jwt.verify()` without the word "authentication" anywhere.

**How to avoid:**
- **Hybrid retrieval:** Combine BM25 (keyword) with a lightweight embedding similarity search
  - Option A: Use the LLM provider's embedding API (OpenAI, Anthropic) to embed chunks, store vectors in SQLite as BLOBs, compute cosine similarity
  - Option B: Stick with BM25 but enrich index with AI-generated summaries per function (include semantic terms like "authentication" in the summary of the `verifyToken()` function)
- **Include structural context:** When retrieving a function, also include its imports and the file's module-level docstring -- provides surrounding context
- **Re-ranking:** After initial retrieval of 20 candidates, use a second LLM call to re-rank by relevance (cheap with a small model)

### 4.3 Rate Limiting for Documentation Generation

**Severity: MEDIUM -- Can hit API limits and cost significant money**

Generating documentation for every file in a large codebase means hundreds of LLM calls. At $3/M input tokens and $15/M output tokens (Claude Sonnet), documenting a 10k-file repo could cost $50+.

**How to avoid:**
- Show an estimated cost before starting: count total tokens, multiply by model pricing
- Implement concurrency limits: max 3-5 parallel LLM calls (the project's AI module already handles single-session streaming)
- Use exponential backoff on rate limit errors (429 responses)
- Implement a cancel mechanism (the project already has `cancelReview` and `cancelAnalysis` patterns)
- Cache generated documentation -- don't regenerate for unchanged files
- Consider using cheaper/faster models for bulk documentation (e.g., Haiku/GPT-4o-mini for individual file docs, Sonnet/GPT-4o for module summaries)

---

## 5. Cross-Platform Issues

### 5.1 File Path Handling

**Severity: HIGH -- Silent bugs that only appear on Windows**

Windows uses `\` path separators; macOS/Linux use `/`. String concatenation like `dir + '/' + file` breaks on Windows.

**How to avoid:**
- **Always use `path.join()`** -- the project already does this consistently (see `database.ts` line 132-133)
- **Always use `path.normalize()`** when comparing paths
- Git URLs use `/` universally -- do not `path.join()` git-internal paths
- When storing paths in SQLite, normalize to forward slashes for portability, convert back on read
- Use `app.getPath()` for all system directories -- never hardcode paths

### 5.2 Git Binary Availability

**Severity: MEDIUM -- Git may not be installed**

Windows machines often don't have git in PATH (especially if Git was installed to a non-standard location or via Git for Windows Portable).

**How to avoid:**
- On app startup (or first use of codebase analyzer), probe for git: `git --version`
- The project already has `app:probeCli` IPC handler for this exact pattern
- If git is not found:
  - On macOS: Prompt user to install Xcode Command Line Tools (`xcode-select --install`)
  - On Windows: Check common paths (`C:\Program Files\Git\bin\git.exe`, `C:\Program Files (x86)\Git\bin\git.exe`)
  - On Linux: Suggest `apt install git` / `yum install git`
- Show a clear error message with installation instructions, not a cryptic spawn error
- Consider bundling `isomorphic-git` as a fallback for basic clone operations (no native git required), but note it is significantly slower for large repos

### 5.3 Temp Directory Management

**Severity: LOW -- But can cause subtle issues**

`os.tmpdir()` returns different paths per platform. Temp files may be cleaned by the OS unpredictably.

**How to avoid:**
- Do NOT use `os.tmpdir()` for cloned repos -- they need to persist across sessions
- Use `app.getPath('userData')` + `/codebase-analyzer/` for all persistent storage
- Use `os.tmpdir()` only for truly temporary files (e.g., intermediate parsing artifacts)
- Clean up temp files on process exit with a cleanup handler

---

## 6. Security Concerns

### 6.1 Cloning Arbitrary Repos

**Severity: LOW -- Read-only analysis is inherently safe**

The analyzer only reads files; it does not execute them. The main risk is:
- `.gitattributes` or git hooks in the cloned repo could be triggered during clone (e.g., `post-checkout` hooks)
- Maliciously crafted filenames could cause path traversal if not sanitized

**How to avoid:**
- Clone with `GIT_CONFIG_NOSYSTEM=1` and `-c core.hooksPath=/dev/null` to disable hooks
- Sanitize all filenames before using in file paths -- reject or escape `..`, absolute paths, null bytes
- Run git clone with `--no-checkout` first, inspect the repo, then checkout -- allows validating before extracting files
- The analysis never requires code execution, so the attack surface is limited to file parsing bugs

### 6.2 Storing Repo Credentials

**Severity: MEDIUM -- Credential leakage risk**

**How to avoid:**
- Use Electron's `safeStorage.encryptString()` / `safeStorage.decryptString()` -- the project already uses this pattern for Bitbucket credentials and DB passwords
- Never store credentials in `electron-store` without encryption
- Never embed tokens in git clone URLs -- visible in process arguments (`ps aux`)
- Use `GIT_ASKPASS` with a helper script that reads from safeStorage

### 6.3 File System Access Scope

**Severity: LOW -- Electron's sandbox limits renderer access**

The renderer has no direct filesystem access (sandbox=true). All file access goes through IPC to the main process.

**How to avoid:**
- Validate all file paths received via IPC -- ensure they are within the expected clone directory
- Use `path.resolve()` and check that the resolved path starts with the expected base directory
- Never pass user-controlled paths directly to `fs.readFileSync()` without validation

---

## 7. UX Pitfalls

### 7.1 Long Analysis Times with No Feedback

**Severity: HIGH -- Users will think the app is frozen**

A full analysis pipeline (clone + parse + index + AI documentation) for a medium repo could take 5-15 minutes.

**How to avoid:**
- Break the pipeline into visible stages with progress indicators:
  1. "Cloning repository..." (show git progress %)
  2. "Scanning files..." (X of Y files discovered)
  3. "Parsing code..." (X of Y files parsed, with progress bar)
  4. "Building search index..." (quick -- seconds)
  5. "Generating documentation..." (X of Y files documented, with estimated time remaining)
- Allow each stage to be independently cancellable
- Show partial results as they become available -- don't wait for 100% completion
- Use the project's existing streaming pattern (IPC events) for real-time progress updates

### 7.2 Stale Cache When Branch Has New Commits

**Severity: MEDIUM -- Causes confusion**

If a user analyzes a repo, then the repo gets new commits, the cached analysis is stale but the user may not realize it.

**How to avoid:**
- Store the commit SHA at analysis time
- On re-opening an analyzed repo, run `git ls-remote` to check the remote HEAD
- If HEAD has changed, show a banner: "Repository has new commits. Re-analyze?"
- For local repos (not cloned), watch the `.git/HEAD` file for changes using `fs.watch`
- Implement incremental re-analysis: only re-parse changed files (compare file hashes)

### 7.3 Overwhelming Documentation Volume

**Severity: MEDIUM -- Information overload**

Generating documentation for every function in a 10k-file repo produces thousands of pages that nobody will read.

**How to avoid:**
- Generate hierarchical documentation: project overview -> module summaries -> file details -> function docs
- Default to module-level summaries; expand to file/function level on demand
- Implement a "smart summary" that highlights the most important/central modules (based on dependency graph centrality)
- Allow filtering by directory, language, or search query
- Export options: Markdown, PDF (the project already has PDF generation via pdfmake)

### 7.4 Flow Diagrams That Are Too Complex

**Severity: MEDIUM -- A graph with 500 unlabeled nodes is useless**

Full call graphs or dependency trees for real codebases are visual noise, not insight.

**How to avoid:**
- **Layered views:** Start with module-level view (boxes = directories/packages), drill into file-level, then function-level
- **Filtering:** Let users filter by entry point ("show me everything reachable from `main()`")
- **Layout algorithms:** Use hierarchical/dagre layout for call graphs (top-to-bottom flow), force-directed for dependency graphs
- **Limit visible nodes:** Show top 50 most-connected nodes by default, with "show more" controls
- **Color coding:** Use colors to indicate module boundaries, languages, or complexity metrics
- **Search in graph:** Highlight specific nodes/paths when user searches

---

## 8. Project-Specific Considerations

### 8.1 Existing Patterns to Follow

Based on analysis of the Zenith codebase:

| Pattern | Existing Example | Apply To Codebase Analyzer |
|---------|-----------------|---------------------------|
| IPC registration | `ipc-handlers.ts` + `preload/index.ts` | Add `codeAnalyzer:*` namespace |
| SQLite + FTS5 | `nebula/database.ts` | Create `codebase-analyzer/database.ts` |
| Streaming progress | `ai/stream.ts` + `onStreamChunk` | Clone progress, parse progress |
| Credential storage | `safeStorage` in `ipc-handlers.ts` | Git tokens |
| CLI probing | `app:probeCli` handler | Git availability check |
| File storage | `nebula/file-storage.ts` | Cloned repo management |
| Graph visualization | `react-force-graph-2d` (Nebula) | Dependency/call graphs |
| PDF export | `lib/pdf-generator.ts` | Documentation export |

### 8.2 Dependencies Already Available

These are already in `package.json` and should be reused, not duplicated:

- `better-sqlite3` -- SQLite database (FTS5 for code search)
- `ai` + `@ai-sdk/*` -- AI SDK for documentation generation and Q&A
- `react-force-graph-2d` -- Graph visualization (consider for dependency graphs)
- `zustand` -- State management (required for React Flow performance)
- `react-resizable-panels` -- Panel layouts
- `codemirror` -- Code display/highlighting
- `electron-store` -- Settings persistence
- `zod` -- Schema validation for IPC payloads

### 8.3 New Dependencies Likely Needed

| Package | Purpose | Why Not Hand-Roll |
|---------|---------|-------------------|
| `web-tree-sitter` | WASM-based AST parsing | Multi-language support, no native rebuild |
| `simple-git` | Git operations wrapper | Handles edge cases in git CLI interaction |
| `@xyflow/react` (React Flow) | Flow diagrams for call graphs | react-force-graph-2d is better for force-directed graphs, but call graphs need hierarchical layout |
| `ignore` | Parse `.gitignore` patterns | Edge cases in glob matching are deceptively complex |

---

## Summary Checklist

Before implementing, verify handling of:

- [ ] Git binary not found on user's machine
- [ ] Private repo auth without hanging on stdin prompt
- [ ] Repo exceeds disk space budget
- [ ] Clone cancelled mid-stream
- [ ] Mixed-language repo (at least JS/TS + Python + Java)
- [ ] Generated code excluded from analysis
- [ ] Monorepo detected and scoped
- [ ] 10k+ files parsed without freezing main process
- [ ] web-tree-sitter WASM loads correctly in Electron main process
- [ ] React Flow/graph stays responsive at 100+ nodes
- [ ] FTS5 tokenizes camelCase/snake_case identifiers
- [ ] AI context window not exceeded (chunking works)
- [ ] Cost estimation shown before bulk AI operations
- [ ] Progress bars for every long operation
- [ ] Stale analysis detected and flagged
- [ ] File paths work on Windows (tested with backslashes)
- [ ] Cloned repo hooks disabled for security
- [ ] Credentials stored with safeStorage, never in plaintext
