# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Large Store Files - State Management Complexity:**
- Issue: `db-store.ts` (1,966 lines), `cortex-store.ts` (1,301 lines), and `review-store.ts` (943 lines) are significantly oversized and difficult to maintain
- Files: `src/renderer/src/stores/db-store.ts`, `src/renderer/src/stores/cortex-store.ts`, `src/renderer/src/stores/review-store.ts`
- Impact: Increased cognitive load, harder to debug state issues, risk of unintended side effects when modifying store methods, difficult test coverage
- Fix approach: Extract related actions into smaller composable modules. Consider splitting by domain (connection management, schema browsing, AI operations). Move pure utility functions (parsing, building prompts) outside stores.

**Undersized Parser Files - Monolithic Parsing Logic:**
- Issue: `ts-parser.ts` (510 lines), `java-parser.ts` (632 lines), `python-parser.ts` (629 lines) contain monolithic parsing logic for different languages
- Files: `src/main/cortex/parser/ts-parser.ts`, `src/main/cortex/parser/java-parser.ts`, `src/main/cortex/parser/python-parser.ts`
- Impact: Hard to test individual parsing phases, difficult to extend with new language support, potential for shared parsing bugs
- Fix approach: Extract common parsing patterns (tokenization, scope tracking, entity detection) into shared utilities. Create abstract base for language parsers. Add unit tests for each phase.

**Untested Large Components:**
- Issue: `ArchitectureDashboard.tsx` (855 lines), `QueryOptimizer.tsx` (769 lines), `QueryTab.tsx` (934 lines) have complex rendering logic without tests
- Files: `src/renderer/src/plugins/cortex/components/ArchitectureDashboard.tsx`, `src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx`, `src/renderer/src/plugins/db-inspector/QueryTab.tsx`
- Impact: Regressions in complex UI features go undetected, expensive to refactor, fragile to data model changes
- Fix approach: Add Vitest unit tests for component logic. Create Storybook stories for visual regression testing. Extract non-rendering logic into testable hooks.

## Known Bugs

**Potential Timer Cleanup Gap in Nebula Plugins:**
- Symptoms: Memory leaks from setInterval/setTimeout if component unmounts improperly
- Files: `src/renderer/src/plugins/nebula/VoiceRecorder.tsx`, `src/renderer/src/plugins/nebula/NoteEditor.tsx`, `src/renderer/src/plugins/nebula/LinkDialog.tsx`
- Trigger: Navigate away from Nebula while recording or during modal operations
- Current state: VoiceRecorder has proper cleanup with `clearInterval` in useEffect return. NoteEditor and LinkDialog use setTimeout but cleanup is less consistent. Only 20 clearTimeout/clearInterval calls vs 30+ timer creations indicating potential gaps.
- Workaround: Close modals/stop recording before leaving page
- Fix approach: Audit all useEffect hooks creating timers. Ensure return function clears all timers. Use custom useTimer hook to enforce cleanup.

**Stream Listener Accumulation Risk in cortex-store:**
- Symptoms: Memory usage increases if stream operations are interrupted or rapid operations occur without proper cleanup
- Files: `src/renderer/src/stores/cortex-store.ts` (lines 726-747, 831-854, 914-976)
- Trigger: Cancel or rapidly restart buildDigest, enrichEntities, or validateAnalysis operations
- Workaround: Full page refresh or plugin reload
- Fix approach: Implement a stream listener registry with automatic cleanup on duplicate sessionId. Add timeout mechanism to auto-cleanup orphaned listeners after 30 seconds.

**Error Handling in IPC Handlers Without User Feedback:**
- Symptoms: Silent failures when IPC calls reject
- Files: `src/main/ipc-handlers.ts` (lines 545, 560, 595) use `.catch(() => {/* non-critical */})`
- Trigger: Network errors, permission issues, or unexpected main process failures
- Workaround: Check logs in DevTools
- Fix approach: Log warnings for non-critical errors. Add error telemetry for critical paths. Provide user-facing notifications for failed operations in stores.

## Security Considerations

**Encrypted Credentials in electron-store:**
- Risk: Credentials stored in `credentialsStore` (safeStorage-encrypted) are not validated before use; if safeStorage fails, credentials could be exposed
- Files: `src/main/ipc-handlers.ts` (lines 110-115), `src/main/bitbucket/token-manager.ts`
- Current mitigation: Uses Electron's `safeStorage.encryptString()` for storage; credentials validated via `testCredentials()` on connect
- Recommendations: Add explicit check that encryption is available before accepting credentials. Implement credential rotation/expiry. Log all credential access attempts. Consider storing OAuth tokens with refresh logic instead of static credentials.

**SQL Query Execution - Read-Only Validation:**
- Risk: `validateQuery()` attempts to prevent DML/DDL but regex-based validation can be bypassed with comments or whitespace tricks
- Files: `src/main/db/postgres.ts` (lines 58-75)
- Current mitigation: Strips comments before validation; rejects non-SELECT/EXPLAIN/WITH statements; read-only connections use `default_transaction_read_only = true` at DB level
- Recommendations: Consider using a SQL parser library (e.g., sql-parser-cst) for robust AST-based validation. Add logging of rejected queries. Test against common SQL injection patterns.

**Database Password Transmission Over IPC:**
- Risk: Passwords transmitted over IPC to decrypt from electron-store
- Files: `src/renderer/src/stores/db-store.ts` (line 504), `src/main/ipc-handlers.ts`
- Current mitigation: Passwords encrypted at rest in electron-store; IPC happens in single process; preload sandbox prevents renderer access to credentials
- Recommendations: Use token-based auth (PostgreSQL SCRAM) where possible. Add rate limiting on failed connection attempts. Implement password aging/rotation prompts.

**API Keys in Settings Store:**
- Risk: AI provider API keys and Ollama URLs stored in settings without encryption
- Files: `src/main/settings-store.ts`
- Current mitigation: None currently visible; settings stored as plaintext JSON
- Recommendations: Encrypt sensitive settings like `apiKey`, `webhookUrl` using safeStorage. Implement selective encryption for specific keys. Add audit logging for credential access.

## Performance Bottlenecks

**PostgreSQL Metadata Queries on Large Databases:**
- Problem: Schema browsing on databases with 1000+ tables causes noticeable UI lag
- Files: `src/main/db/postgres.ts` (introspection methods), `src/renderer/src/stores/db-store.ts` (loadSchemas, loadTables, loadAllColumnsForAutocomplete)
- Cause: `loadAllColumnsForAutocomplete()` loads ALL columns from ALL tables in parallel (line 698, db-store.ts); pg_catalog queries work directly but large result sets cause parsing delays
- Improvement path: Paginate column loading. Cache columns by table lazily. Debounce autocomplete queries. Consider limiting initial load to 500 columns with virtual scrolling.

**Graph Rendering in MindGraphTab - 3D Fallback Cost:**
- Problem: MindGraph3D (lazy-loaded) fails to load on some systems, forcing fallback to 2D which causes brief freeze
- Files: `src/renderer/src/plugins/cortex/components/MindGraphTab.tsx` (lines 13-43), `src/renderer/src/plugins/cortex/components/MindGraph3D.tsx`
- Cause: three.js/react-three-fiber adds ~1.5MB bundle, OOM errors on systems <4GB RAM, WebGL not supported
- Improvement path: Reduce node count threshold before switching to 2D (e.g., >500 nodes → 2D). Implement progressive loading of 3D. Cache 3D canvas between tab switches. Consider using a lighter 3D library.

**Entity Enrichment Batch Processing - Sequential Bottleneck:**
- Problem: enrichEntities processes batches sequentially (cortex-store.ts line 826), blocking UI for large codebases
- Files: `src/renderer/src/stores/cortex-store.ts` (lines 825-865)
- Cause: `for (const batch of batches)` waits for each batch to complete before starting next; if 10 batches × 30 seconds each = 5+ minutes total
- Improvement path: Implement concurrent batch processing (Promise.all with max concurrency of 2-3). Add progress updates per entity. Implement cancellation mechanism.

**CodebaseAnalyzer Cache Invalidation on Parser Version Change:**
- Problem: Entire cache invalidated (line 88-100, analyzer.ts) even if only one language parser changed
- Files: `src/main/cortex/analyzer.ts` (PARSER_VERSION = 3)
- Cause: Single version number for all parsers; if Java parser updates, all cached TS/Python analyses also invalidate
- Improvement path: Use per-language version numbers. Implement differential cache invalidation. Store parser versions in cache metadata.

## Fragile Areas

**IPC Event Listener Registration - Multiple Subscriptions Risk:**
- Files: `src/renderer/src/stores/db-store.ts`, `src/renderer/src/stores/cortex-store.ts`, `src/renderer/src/stores/review-store.ts`
- Why fragile: `window.api.ai.onStreamChunk/onStreamDone/onStreamError` called multiple times without checking if listeners already exist; rapidly switching operations or multiple tabs could register duplicate listeners
- Safe modification: Implement listener deduplication in preload. Add test for listener registration lifecycle. Document listener cleanup requirements.
- Test coverage: No unit tests for stream listener behavior or cleanup.

**Zustand Store State Mutations During Async Operations:**
- Files: All stores using `set()` and `get()` in async functions (db-store, cortex-store, review-store)
- Why fragile: State read via `get()` then written after async operation may be stale; concurrent operations can interleave causing lost updates (race condition)
- Example: `loadTableDetails()` in db-store.ts (lines 704-726) reads `activeConnectionId` then later sets columns; if user switches connection mid-load, operation completes for wrong connection
- Safe modification: Use state snapshots. Implement operation deduplication by connection ID. Add concurrent operation guard.
- Test coverage: No tests for concurrent operations or state consistency.

**Renderer IPC API Availability Race:**
- Files: `src/renderer/src/main.tsx` (line 12), all stores assuming `window.api` exists
- Why fragile: Components render and call `window.api` methods before preload fully loads; race condition on app startup
- Safe modification: Implement IPC availability check with retry mechanism. Show loading spinner until API ready. Add TypeScript assertion for `window.api`.
- Test coverage: No tests for preload/renderer race conditions.

**Parse Error Handling in Store - Silent Failures:**
- Files: `src/renderer/src/stores/db-store.ts` (parseOptimizerOutput), `src/renderer/src/stores/cortex-store.ts` (parseToonResponseRenderer)
- Why fragile: Parsing functions return partial/empty objects on malformed input without logging failures; AI output variations break parsing
- Example: `parseOptimizerOutput()` returns empty suggestions if regex doesn't match (line 126, db-store.ts)
- Safe modification: Add debug logging for parse failures. Implement fallback rendering. Add integration tests for parser with real AI outputs.
- Test coverage: No tests for parser robustness with malformed AI outputs.

## Scaling Limits

**Database Connection Pool - Hardcoded Limits:**
- Current capacity: Default pg.Pool max=10 connections per manager
- Limit: With 5+ simultaneous users or queries, connection pool exhausted causing queued requests
- Files: `src/main/db/postgres.ts`, `src/main/db/mysql.ts`
- Scaling path: Make pool size configurable. Implement connection pool monitoring. Add queue length warnings. Consider connection pooler (pgBouncer) for production.

**Cortex Analysis Cache - Unbounded Growth:**
- Current capacity: AnalyzerDatabase stores all analyses in SQLite; no enforced size limit
- Limit: On systems with <5GB disk, cache database grows uncontrollably; next analysis triggers OOM when loading cache
- Files: `src/main/cortex/cache-db.ts`
- Scaling path: Implement cache size limit (max 500MB). Add LRU eviction. Compress old cache entries. Add cache cleanup task.

**QueryTab Results Grid - Virtual Scrolling Missing:**
- Current capacity: ResultsGrid renders all rows at once for queries returning 10k+ rows
- Limit: >50k rows causes UI freeze, memory usage spikes to 500MB+
- Files: `src/renderer/src/plugins/db-inspector/ResultsGrid.tsx` (592 lines)
- Scaling path: Implement react-window virtual scrolling (already in dependencies). Add row pagination. Implement streaming result updates.

**Mermaid Diagram Generation - Large Codebases:**
- Current capacity: generateArchitectureDiagram renders all routes/entities; codebases with 500+ routes timeout
- Limit: Mermaid render timeout at 30 seconds; very large diagrams crash
- Files: `src/main/cortex/mermaid-generator.ts`
- Scaling path: Implement diagram filtering (by module/layer). Add progressive rendering. Fallback to summary diagram. Increase timeout for large diagrams.

## Dependencies at Risk

**pdfmake - Unmaintained, Potential CVEs:**
- Risk: pdfmake (0.3.5) last major release in 2020; no active security updates
- Impact: PDF export feature vulnerable to embedded attacks
- Files: `src/main/lib/pdf-generator.ts`, `package.json` (line 76)
- Migration plan: Monitor for CVEs. Consider migrating to PDFKit or reportlab for critical deployments. Add PDF content sanitization.

**react-force-graph-2d - D3 Dependency Chain:**
- Risk: Brings in large d3 dependency tree (~500KB bundled); potential for breaking changes in minor versions
- Impact: MindGraphTab performance issues, bundle size bloat
- Files: `src/renderer/src/plugins/cortex/components/MindGraphTab.tsx`
- Migration plan: Consider visx or lightweight 2D graph library. Test bundle size impact of replacement.

**mermaid - Build Artifacts in Output:**
- Risk: Mermaid rendering can fail silently in certain environments; no fallback for failed renders
- Impact: Missing diagrams in exports/reports without user notification
- Files: `src/renderer/src/lib/mermaid-to-png.ts` (line 97 has try/catch but logs warning only)
- Migration plan: Implement MermaidRenderer with explicit error boundary. Add diagram preview before export. Consider server-side rendering for reliability.

**better-sqlite3 - Native Binding Brittleness:**
- Risk: Native binding can break across Node versions or systems lacking C compiler
- Impact: Cortex cache database (AnalyzerDatabase) becomes inaccessible; analysis features fail
- Files: `src/main/cortex/cache-db.ts`
- Migration plan: Consider SQL.js (pure JS SQLite) for fallback. Add detection for missing native binding with graceful degradation. Add cache rebuild on corruption.

## Missing Critical Features

**No Concurrent Operation Limiting:**
- Problem: Multiple users/tabs can trigger concurrent analysis, enrichment, or export operations without queuing/limiting
- Blocks: High-load scenarios, resource contention, unpredictable performance
- Impact: On shared systems or Electron windows, users experience random hangs
- Solution: Implement operation queue with max concurrency. Add job status tracking. Implement request deduplication.

**No Offline Mode or Fallback:**
- Problem: App fails completely if AI provider unreachable or API quota exceeded
- Blocks: Using app on flights, at conferences, during provider outages
- Solution: Implement local LLM fallback (Ollama integration partially exists but incomplete). Cache AI responses. Queue requests for batch processing.

**No Rate Limiting or Quota Enforcement:**
- Problem: Users can spam analysis/enrichment requests, exhausting API credits quickly
- Blocks: Cost control, predictable resource usage
- Solution: Add per-user rate limits. Implement daily/monthly quota. Add cost estimation before operations.

**No Audit Logging for Sensitive Operations:**
- Problem: No record of who accessed which database connections, ran which queries, exported which reports
- Blocks: Compliance requirements, debugging user issues, security investigations
- Solution: Add structured logging (date, user, operation, connection, query) to SQLite audit table. Implement log export/retention policies.

## Test Coverage Gaps

**Store Actions - No Unit Tests:**
- Untested area: All store actions (connect, loadSchemas, startQA, buildDigest, etc.)
- Files: `src/renderer/src/stores/db-store.ts`, `src/renderer/src/stores/cortex-store.ts`, `src/renderer/src/stores/review-store.ts`
- Risk: Refactoring causes undetected regressions in critical features; state mutations not validated
- Priority: **High** - affects core functionality across all plugins

**IPC Handler Error Paths - No Tests:**
- Untested area: Error handling in all IPC handlers (connection failures, network timeouts, malformed responses)
- Files: `src/main/ipc-handlers.ts`
- Risk: Unhandled edge cases crash main process; no graceful degradation
- Priority: **High** - affects app stability and user experience

**Parser Robustness - No Tests:**
- Untested area: Language parsers (ts-parser, java-parser, python-parser, fe-parser) with invalid/malformed code
- Files: `src/main/cortex/parser/*.ts`
- Risk: Parser crashes on edge cases (unterminated strings, deeply nested structures); analysis fails for certain codebases
- Priority: **High** - core analysis feature

**Component Rendering with Large Data - No Tests:**
- Untested area: Components rendering 10k+ items (QueryTab results, large entity lists)
- Files: `src/renderer/src/plugins/db-inspector/QueryTab.tsx`, `src/renderer/src/plugins/cortex/components/FileTree.tsx`
- Risk: Performance regressions, memory leaks in virtual scrolling, incomplete rendering
- Priority: **Medium** - affects UX on large databases/codebases

**Stream Operation Lifecycle - No Tests:**
- Untested area: AI stream operations (start, chunk, done, error, cancellation, rapid restarts)
- Files: `src/renderer/src/stores/cortex-store.ts`, `src/renderer/src/stores/db-store.ts` (stream setup/cleanup)
- Risk: Listener accumulation, race conditions, orphaned promises
- Priority: **Medium** - affects reliability of AI features

**Database Connection Lifecycle - No Tests:**
- Untested area: Connection establishment, switch, disconnect, error recovery
- Files: `src/main/db/postgres.ts`, `src/main/db/mysql.ts`, `src/renderer/src/stores/db-store.ts`
- Risk: Connection leaks, pool exhaustion, stale connections
- Priority: **Medium** - affects long-running app stability

---

*Concerns audit: 2026-03-24*
