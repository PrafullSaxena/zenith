---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx
  - src/main/ipc-handlers.ts
  - src/renderer/src/stores/task-groomer-store.ts
autonomous: true
requirements: [QUICK-1]

must_haves:
  truths:
    - "After cmd+shift+d capture, user can manually reload the task list to see the new task"
    - "After re-grooming a task, its status changes to 'groomed' in both DB and UI"
  artifacts:
    - path: "src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx"
      provides: "Reload button in PageHeader statusIndicator"
    - path: "src/main/ipc-handlers.ts"
      provides: "regroom handler sets status: 'groomed' in db.updateTask fields"
    - path: "src/renderer/src/stores/task-groomer-store.ts"
      provides: "startReGroom optimistic update sets status: 'groomed'"
  key_links:
    - from: "TaskGroomerView.tsx reload button onClick"
      to: "useTaskGroomerStore.loadTasks"
      via: "direct call"
    - from: "ipc-handlers.ts db.updateTask fields"
      to: "tasks.db status column"
      via: "updateTask IPC"
    - from: "task-groomer-store.ts startReGroom set()"
      to: "tasks array in Zustand"
      via: "in-place map with status: 'groomed'"
---

<objective>
Fix two InTake bugs: add a manual reload button to the Dumpyard header so freshly captured tasks appear without plugin reload, and fix re-groom to mark the task status as 'groomed' on success (both in the DB and the Zustand store).

Purpose: Both bugs cause silent data inconsistency visible to the user — captured tasks go missing visually, and re-groomed tasks stay in incorrect status.
Output: Reload button in header + re-groom sets status: 'groomed' everywhere.
</objective>

<execution_context>
@/Users/prafullsaxena/.claude/get-shit-done/workflows/execute-plan.md
@/Users/prafullsaxena/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add manual reload button to TaskGroomerView header</name>
  <files>src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx</files>
  <action>
    Add a reload/refresh button to the `statusIndicator` prop of `PageHeader` in `TaskGroomerView.tsx`.

    Steps:
    1. Import `RefreshCw` from `lucide-react` (add to the existing import line).
    2. In the `statusIndicator` `<div>`, add the button as the FIRST child (before the Kanban/List toggle and Groom button):

    ```tsx
    <button
      type="button"
      onClick={loadTasks}
      disabled={loading}
      title="Reload tasks"
      aria-label="Reload tasks"
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-lg border border-white/8 bg-white/[0.03] transition-colors',
        loading
          ? 'text-muted-foreground opacity-50 cursor-not-allowed'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/8 cursor-pointer'
      )}
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
    </button>
    ```

    `loadTasks` is already destructured from the store at the top of the component (line 37). No new state needed.
  </action>
  <verify>
    <automated>cd /Users/prafullsaxena/Desktop/Development/zenith && npx tsc --noEmit --project tsconfig.web.json 2>&1 | head -30</automated>
    <manual>Open InTake, capture a task via cmd+shift+d, click the reload button — new task appears in Dumpyard without restarting the plugin.</manual>
  </verify>
  <done>Reload button renders in header; clicking it calls loadTasks() and re-fetches tasks from DB; button shows spinner while loading.</done>
</task>

<task type="auto">
  <name>Task 2: Fix re-groom to set task status to 'groomed' on success</name>
  <files>
    src/main/ipc-handlers.ts
    src/renderer/src/stores/task-groomer-store.ts
  </files>
  <action>
    Two changes required — both must be made together so DB and UI stay in sync.

    **Change 1 — ipc-handlers.ts (line ~1445):**
    In the `taskgroomer:regroom` handler, add `status: 'groomed'` to the `db.updateTask` fields object:

    ```ts
    db.updateTask({
      id: task.id,
      fields: {
        status: 'groomed',          // ADD THIS LINE
        priority: result.priority,
        priorityRationale: result.priorityRationale,
        suggestedAction: result.suggestedAction,
        evidenceSummary: result.evidenceSummary,
        jiraTicketKey: result.jiraTicketKey ?? existingJiraKey,
        jiraTicketUrl: result.jiraTicketUrl ?? existingJiraUrl,
        researchSummary: result.researchSummary,
        researchLinks: result.researchLinks,
        groomedAt: result.groomedAt
      }
    })
    ```

    The returned `result` object does NOT need `status` added — the renderer already handles the status update via the Zustand store update.

    **Change 2 — task-groomer-store.ts (line ~212):**
    In `startReGroom`, in the `set((state) => ...)` call that maps over `state.tasks`, add `status: 'groomed' as const` to the updated task object:

    ```ts
    t.id === taskId
      ? {
          ...t,
          status: 'groomed' as const,   // ADD THIS LINE
          priority: r.priority as Task['priority'],
          priorityRationale: r.priorityRationale,
          suggestedAction: r.suggestedAction as Task['suggestedAction'],
          evidenceSummary: r.evidenceSummary,
          jiraTicketKey: r.jiraTicketKey,
          jiraTicketUrl: r.jiraTicketUrl,
          researchSummary: r.researchSummary,
          researchLinks: r.researchLinks,
          groomedAt: r.groomedAt,
          updatedAt: Date.now()
        }
      : t
    ```

    Note: The Phase 19-01 decision ("Task status NOT changed during re-groom") is intentionally overridden by this fix. The product requirement is that re-grooming should promote the task to 'groomed'.
  </action>
  <verify>
    <automated>cd /Users/prafullsaxena/Desktop/Development/zenith && npx tsc --noEmit --project tsconfig.node.json 2>&1 | head -30 && npx tsc --noEmit --project tsconfig.web.json 2>&1 | head -30</automated>
    <manual>Open InTake Groomed tab, select a task, click Re-groom — after completion the task stays in Groomed status (not reverted to Dump). Reload the plugin; task remains in 'groomed' status in DB.</manual>
  </verify>
  <done>After re-groom succeeds: (1) DB row has status='groomed', (2) Zustand tasks array shows status='groomed' immediately without a reload, (3) TypeScript compiles clean for both node and web configs.</done>
</task>

</tasks>

<verification>
Run both TypeScript compilation checks:
```bash
cd /Users/prafullsaxena/Desktop/Development/zenith
npx tsc --noEmit --project tsconfig.node.json
npx tsc --noEmit --project tsconfig.web.json
```
Both must exit 0 with no errors.
</verification>

<success_criteria>
- RefreshCw reload button visible in InTake header (first item in statusIndicator); clicking it re-fetches tasks; spinner shown while loading.
- Re-grooming a task via TaskSidePanel sets status to 'groomed' in SQLite DB and in Zustand state immediately on success.
- Zero TypeScript errors in node and web configs.
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-intake-bugs-reload-button-after-capt/1-SUMMARY.md`
</output>
