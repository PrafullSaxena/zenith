# Zenith Full UI Revamp

## What This Is

A complete UI migration of the Zenith desktop developer toolkit from a custom Glass Design System to shadcn/ui + Animate-UI. Covers all 6 plugins (Cortex, DB Inspector, Nebula, TextCraft, Code Review Bot, Launchpad) and 4 system screens (Dashboard, Settings, Activity, About). Targets a modern SaaS aesthetic (Linear/Vercel/Raycast) with a violet accent palette, dark-only theme, and 9 shared cross-plugin components.

## Core Value

**Every plugin must use the same shared component library.** A ChatInterface in Cortex must be identical to one in DB Inspector. A ContentRenderer in TextCraft must work the same in Launchpad. Consistency through reuse, not duplication.

## Requirements

### Validated

<!-- Existing capabilities that must be preserved -->

- ✓ 6 plugins functional: Cortex, CodeReviewBot, DbInspector, Launchpad, Nebula, TextCraft — existing
- ✓ 4 core pages: Dashboard, Activity Log, About, Settings — existing
- ✓ Sidebar with drag-reorder and icon navigation — existing
- ✓ Real-time theme switching via data-theme attribute — existing
- ✓ 13 Zustand stores managing all plugin + system state — existing
- ✓ ~80 IPC channels for main process communication — existing
- ✓ AI streaming via Vercel AI SDK + CLI providers — existing
- ✓ Bitbucket OAuth integration — existing
- ✓ PostgreSQL + MySQL database inspection — existing
- ✓ Tiptap rich text editor in Nebula — existing
- ✓ CodeMirror 6 SQL editor in DB Inspector — existing
- ✓ React Flow diagrams in Cortex — existing
- ✓ Mermaid diagram rendering — existing

### Active

<!-- Current scope — building toward these -->

- [ ] Replace all 15 Glass components with shadcn/ui + Animate-UI equivalents
- [ ] Build 9 shared cross-plugin components (RichTextEditor, ContentRenderer, ChatInterface, DataTable, HistoryList, PdfExporter, SearchInput, CodeEditor, FileTree)
- [ ] Implement collapsible sidebar (56px icon rail ↔ 240px expanded, Cmd+B toggle)
- [ ] Add command palette (Cmd+K) for global search
- [ ] Replace all 5 Three.js 3D views with 2D alternatives
- [ ] Apply violet accent palette with CSS custom property theming
- [ ] Migrate all 10 screens/plugins to use shared components
- [ ] Inter + JetBrains Mono font system
- [ ] Animate-UI micro-interactions on all interactive elements
- [ ] Empty states for every plugin

### Out of Scope

- Light mode — dark-only for this milestone
- Multiple themes — single polished theme, architecture supports future addition
- New plugin features — UI-only revamp, no new functionality
- Store/IPC changes — visual layer only, all business logic untouched
- Mobile/responsive — desktop app, existing responsive patterns sufficient

## Context

- **Branch:** feature/ui-revamp
- **Approved spec:** docs/superpowers/specs/2026-03-27-full-ui-revamp-design.md
- **Design system:** design-system/zenith/MASTER.md
- **Stitch mockups:** Stitch project 6340038692039928729 (8 screens)
- **Reference palette:** violet hsl(263 70% 58%) with radial gradient, 28px rounded cards, backdrop blur on sidebar/header, glowing status dots, 3-tier depth
- **Current stack:** React 19, Tailwind v4, Framer Motion 12, Zustand 5, React Router 7 (HashRouter), Electron 39
- **~100 component files** across 15 Glass UI components, 6 plugins, 4 system screens

## Constraints

- **Tech stack:** Must use shadcn/ui + Animate-UI (user requirement)
- **No store changes:** All Zustand stores and IPC channels must remain untouched
- **No logic changes:** Business logic, AI streaming, database queries — all unchanged
- **Backward compatible:** Plugin registry, route structure, settings persistence unchanged
- **Bundle size:** Should decrease (removing Three.js ~500KB+)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| shadcn/ui + Animate-UI over keeping Glass | User wants modern SaaS aesthetic, better community support, future-proof | — Pending |
| Dark only, single theme | Reduces scope, architecture supports future themes via CSS vars | — Pending |
| Replace all 3D with 2D | Reduces bundle size, improves accessibility, less maintenance | — Pending |
| 9 shared components | Eliminates ~15 duplicate implementations across plugins | — Pending |
| Violet accent hsl(263 70% 58%) | User approved after visual reference review | — Pending |
| Inter + JetBrains Mono | Better readability at small sizes, standard SaaS/dev tool fonts | — Pending |
| Bottom-up migration (Approach A) | Foundation → tokens → shared → screens. Low risk, max parallelism | — Pending |

---
*Last updated: 2026-03-27 after initialization*
