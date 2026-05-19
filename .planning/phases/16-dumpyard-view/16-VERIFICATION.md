---
phase: 16-dumpyard-view
status: human_needed
created: 2026-05-20
---

# Phase 16: Dumpyard View — Verification Report

**Phase Goal:** The Task Groomer plugin screen shows all tasks (ungroomed and groomed) with status controls and stale indicators; users can move tasks through their lifecycle

---

## Automated Checks

### Artifact Existence

| Artifact | Status | Notes |
|----------|--------|-------|
| `src/renderer/src/stores/task-groomer-store.ts` | ✓ Found | 3.6K |
| `src/renderer/src/plugins/task-groomer/StatusDropdown.tsx` | ✓ Found | 4.1K |
| `src/renderer/src/plugins/task-groomer/TaskCard.tsx` | ✓ Found | 4.7K |
| `src/renderer/src/plugins/task-groomer/TaskSidePanel.tsx` | ✓ Found | 7.7K |
| `src/renderer/src/plugins/task-groomer/TaskGroomerView.tsx` | ✓ Found | 5.5K (replaced) |

### TypeScript Compilation

```
npx tsc --noEmit: 0 errors
```

All Phase 16 files compile cleanly with zero errors.

### Key Links Verified

| Link | Pattern Found | Status |
|------|---------------|--------|
| Store → IPC `listTasks` | `window.api.taskgroomer.listTasks()` line 73 | ✓ |
| Store → IPC `updateTask` | `window.api.taskgroomer.updateTask(` line 96 | ✓ |
| StatusDropdown → onStatusChange | `onStatusChange(task.id, status)` line 116 | ✓ |
| TaskCard → isTaskStale | `isTaskStale(task)` + amber badge | ✓ |
| TaskGroomerView → useTaskGroomerStore | line 28 onward | ✓ |
| TaskGroomerView → TaskCard | renders in map | ✓ |
| TaskGroomerView → TaskSidePanel | bottom of return | ✓ |
| TaskGroomerView → setActiveTab | tab onChange handler | ✓ |

### Must-Haves Check

| Must-Have | Verified |
|-----------|---------|
| listTasks IPC called on mount | ✓ useEffect calls loadTasks() on [] |
| updateTask IPC on status change | ✓ optimistic update + IPC in store |
| Tasks split: dump vs others | ✓ dumpTasks/groomedTasks filter inline |
| Stale detection: ≥3 days | ✓ isTaskStale checks updatedAt, THREE_DAYS_MS |
| Two tabs: Dumpyard + Groomed | ✓ TABS array + onTabChange in PageHeader |
| Status dropdown context-aware | ✓ STATUS_ORDER per current status |
| Stale badge amber "Stale Xd" | ✓ amber-400 classes + staleDays(task) |
| Side panel opens on card click | ✓ setSelectedTaskId + TaskSidePanel open prop |
| Side panel closes on X/outside | ✓ Sheet onOpenChange → onClose |
| Groom button disabled | ✓ disabled attr + cursor-not-allowed |

### Requirements Coverage

| Req ID | Covered By | Status |
|--------|-----------|--------|
| DUMP-01 | TaskGroomerView: two-tab plugin screen | ✓ |
| DUMP-02 | TaskCard: text, badge, time, stale badge | ✓ |
| DUMP-03 | StatusDropdown + updateTaskStatus IPC | ✓ |
| DUMP-04 | isTaskStale() + amber "Stale Xd" badge in TaskCard | ✓ |

---

## Human Verification Required

The following items require visual/interactive verification in the running Zenith app:

1. **Tab layout:** Task Groomer sidebar icon navigates to the view with two tabs (Dumpyard, Groomed)
2. **Capture → Dumpyard flow:** Cmd+Shift+D captures a task → appears as a card in Dumpyard tab
3. **Status badge dropdown:** Clicking the colored status badge opens a dropdown with 5 options, current grayed out
4. **Status change:** Selecting a new status moves the card to the correct tab (e.g., "Done" moves from Dumpyard to Groomed)
5. **Side panel:** Clicking a card opens the TaskSidePanel from the right; X or click-outside closes it
6. **Empty states:** When Dumpyard is empty, shows "Your dumpyard is clear. Press ⌘⇧D to capture your first task."
7. **Groomed empty state:** When Groomed tab has no tasks, shows appropriate message
8. **Groom button:** Button is visible in toolbar, disabled, shows tooltip "Grooming coming in Phase 18"
9. **Stale badge:** A dump task with updatedAt > 3 days shows amber "Stale Xd" badge

---

## Score

**Automated:** 10/10 must-haves verified ✓
**Human verification:** 9 items pending

Status: `human_needed` — automated checks all passed, visual verification pending.
