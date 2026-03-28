# DB Inspector UI Revamp

**Status:** FINALIZED
**Date:** 2026-03-29

## Objective
Overhaul the DB Inspector plugin UI to provide a modern, highly usable, and performant developer experience. The UI should match Google's Stitch / Shadcn layout aesthetics, utilizing dark mode Tailwind tokens, fluid resizing, and virtualization for large data.

## Scope
- Central layout container (`DbInspectorView.tsx`)
- Sidebar schema tree (`SchemaExplorer.tsx`)
- Query editor / results layout (`QueryTab.tsx` / `ResultsGrid.tsx`)

## Technical Constraints
- Must use `react-resizable-panels` for window adjustments.
- Must use Shadcn components for forms, tabs, and commands.
- Must use `@tanstack/react-table` for `ResultsGrid` virtualization.
- Context isolation and existing DB operations (zustand stores) must not be broken or altered in their core business logic.

## Skills Used
- `frontend-ui-dark-ts` (Glassmorphism, dark themes)
- `shadcn` (Accessible, composable UI)
- `react-ui-patterns` (Loading states, optimistic UI)
- `react-best-practices` (Performance, virtualization)
