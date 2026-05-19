---
phase: 16-dumpyard-view
plan: "02"
status: complete
completed: 2026-05-20
commits: [c452055, 0fd69c7]
---

## What Was Built

1. **src/renderer/src/plugins/task-groomer/StatusDropdown.tsx** — Status badge + dropdown:
   - Colored badge per status (blue=dump, violet=groomed, green=done, amber=delegated, red=aborted)
   - DropdownMenu opens on badge click (stopPropagation prevents card click-through)
   - Context-aware ordering per STATUS_ORDER map (current status grayed out + "current" label)
   - No confirmation / no toast on change (per CONTEXT.md locked decision)

2. **src/renderer/src/plugins/task-groomer/TaskCard.tsx** — Compact task row:
   - StatusDropdown embedded (click isolated from card click)
   - Task text truncated with `min-w-0 truncate`, Tooltip shows full text on hover (600ms delay)
   - Priority badge (P1/P2/P3) with color coding — renders only when `task.priority !== null`
   - Suggested action chip — renders only when `task.suggestedAction !== null`
   - Amber "Stale Xd" badge via `isTaskStale()` / `staleDays()` from store
   - Relative time via local `formatRelativeTime()` utility
   - `isSelected` prop adds `bg-white/6 border-white/8` highlight

## Deviations

None. All decisions from CONTEXT.md honored.

## Key Decisions

- `@renderer/stores/task-groomer-store` alias used for store import path
- `TooltipProvider` wraps each card (rather than globally) — keeps tooltip scoped to card
- `role="button"` + `tabIndex={0}` + `onKeyDown` for keyboard accessibility
- `formatRelativeTime` defined locally (no shared utils equivalent found)

## Self-Check: PASSED

Files created:
- FOUND: src/renderer/src/plugins/task-groomer/StatusDropdown.tsx
- FOUND: src/renderer/src/plugins/task-groomer/TaskCard.tsx

TypeScript: zero errors
Commits: c452055, 0fd69c7
