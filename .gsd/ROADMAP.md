# Roadmap

## Phase 1: DB Inspector Revamp Layout Skeleton
- Install core Shadcn capabilities and dependencies (`tabs`, `command`, `scroll-area`, `table`, etc.).
- Refactor `DbInspectorView` layout to incorporate the `react-resizable-panels`.
- Overhaul `SchemaExplorer` with Shadcn `Command` pallet fuzzy search and `Accordion` for trees.

## Phase 2: Query Engine & Action Tooling
- Consolidate `QueryTab.tsx` toolbar into clean Radix/Shadcn icons with grouped contexts.
- Upgrade `ResultsGrid.tsx` to handle large row sets using `@tanstack/react-table` virtualized rows.

## Phase 3: AI Agent Interactive Canvases
- Update `AskAI.tsx`, `QueryOptimizer.tsx`, and `ERDiagram.tsx` to use more conversational, fluid chat boundaries.
- Add streaming loading skeletons.
