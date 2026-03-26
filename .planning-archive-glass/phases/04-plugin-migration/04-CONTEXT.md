# Phase 4: Plugin Migration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all 6 plugins (Cortex, CodeReviewBot, DbInspector, Launchpad, Nebula, TextCraft) to use shared glass components. This is NOT just a skin swap — it's a full UX polish pass: better information hierarchy, smoother interactions, cleaner layouts, consistent patterns. Redesign screens where needed. After this, every screen in Zenith uses the Obsidian Glass design system.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **Order**: TextCraft first (smallest, validates pattern), then remaining 5 in parallel waves
- **Granularity**: 1 plugin per PLAN.md. Clean isolation, easy to track.
- **Scope per plugin**: Full glass + UX polish — GlassCard/GlassTab/GlassButton everywhere, skeleton loaders for all loading states, EmptyState for all zero-data views, stagger entrances, hover states, smooth transitions
- **UX depth**: Redesign where needed. If a screen is awkward, rethink the layout. Not just applying glass skin over existing structure.
- **Validation**: A plugin is "migrated" when it uses all relevant glass components, has skeleton loaders, has EmptyState with context-specific CTAs, and passes visual QA

### Unified Patterns (apply to ALL plugins)

#### Plugin Headers
- Unified GlassSurface header bar for all 6 plugins
- Content: Icon + plugin name with gradient (like current Cortex gradient pattern), GlassTab sub-navigation, status indicators on right
- Same height, same padding across all plugins

#### Tables
- Glass table pattern: GlassCard wrapper, alternating row opacity (even rows slightly brighter), hover row highlight, sortable column headers
- Apply to: DbInspector query results, Launchpad estimates, Cortex overview tables

#### Status Indicators
- Animated GlassBadge with semantic colors: green=connected/ready, yellow=analyzing/processing, red=error/failed
- Pulsing animation when in-progress state
- Apply to: connection status, analysis progress, streaming status

#### Chat Interface (Shared GlassChat pattern)
- User messages: right-aligned in accent-tinted glass bubbles
- AI messages: left-aligned in neutral glass bubbles with markdown rendering inside
- Typing indicator: three dots with staggered pulse animation in glass bubble
- Citations: clickable GlassBadge pills at end of response (accent-colored)
- Input area: GlassInput text field + GlassButton send icon
- Apply to: Cortex QAPanel, DbInspector Ask AI, Launchpad AI Advisor

#### Loading States
- All spinners replaced with contextual GlassSkeleton (card shape for card views, text lines for content, table rows for tables)
- Streaming AI responses: pulsing dots in glass bubble, then streaming text appears

#### Empty States
- EmptyState component with context-specific CTAs:
  - Cortex Repos: "Add Repository" button
  - Cortex Insights: "Analyze a repository first"
  - CodeReviewBot PRs: "Connect to Bitbucket" or "No PRs found"
  - DbInspector: "Connect a Database"
  - Launchpad: "Select a Provider"
  - Nebula Notes: "Create your first note"
  - TextCraft: "Paste text to refine"

#### Resize Handles
- Glass resize handle: thin vertical bar with subtle glass styling, drag cursor, hover shows accent highlight
- Apply to: TextCraft panel resizing, Nebula drawing panel

### Per-Plugin Decisions

#### TextCraft
- 3-column layout (Input, Controls, Output) each in GlassCard with **resizable panels** (drag handles between columns)
- Controls panel: GlassCard with GlassSelect for tone/format, glass slider for length
- History: GlassCard entries with stagger entrance, click to reload
- Refine button: Large GlassButton primary, shimmer loading state
- Tab bar: GlassTab (Refine + History)

#### Cortex
- **Delete cortex-theme.ts GLASS_CARD/GLASS_SURFACE constants entirely**. All components use shared ui/ imports.
- **Replace custom tab bar** with shared GlassTab. Delete custom tab styling.
- **Replace custom cardVariants** with shared staggerContainer/staggerItem from lib/motion.ts. Delete cortex-theme.ts card variants.
- **Keep entity-specific colors** (controller=green, service=purple, etc.) — these are functional, not decorative
- RepoCard: GlassCard interactive with stagger entrance
- InsightCard: GlassCard with shared motion variants
- QAPanel: Glass message bubbles (shared chat pattern), GlassBadge citations
- MindGraph toolbar: Replace custom toolbar with GlassSurface + GlassInput search + GlassButton controls
- ExportDialog: Replace custom modal with GlassModal. Fields become GlassInput/GlassSelect. Buttons become GlassButton.
- Code browser: GlassSurface for file tree, GlassCard for code viewer
- Status bar: GlassSurface with GlassBadge indicators

#### CodeReviewBot
- PR list: GlassCard per PR (compact) with author avatar, title, file count. Hover lifts. Selected has accent left bar.
- Review comments: Glass comment cards with severity GlassBadge AND inline diff annotations (both views)
- Diff viewer: GlassCard wrapper around diff. Keep diff internals (syntax highlighting, line numbers) unchanged.
- Header: GlassSurface with GlassSelect repo selector, connection GlassBadge, settings GlassButton
- Tab bar: GlassTab (Diff, Review, History)
- Settings panel: GlassCard sections with GlassInput/GlassSelect

#### DbInspector
- Schema explorer: GlassSurface container, tree items with hover highlight, indent lines, smooth expand animation
- Query console: GlassCard wrapper, glass table results (striped rows, hover highlight, sortable headers)
- Ask AI: Glass message bubbles (shared chat pattern)
- Query Optimizer: Stacked GlassCards per section (EXPLAIN, suggestions, tradeoffs, optimized query). Collapsible sections. Stagger entrance.
- ER Diagram: Glass split view — GlassCard for diagram viewer, GlassSurface for syntax editor. Zoom controls as GlassButtons. Table selector as GlassSelect.
- Tab bar: GlassTab with icons + labels (Console, Ask AI, Optimizer, ER Diagram, History)
- Connection manager: GlassSelect with status dot

#### Launchpad
- Provider selector: GlassCard interactive with provider brand accent color on hover glow (AWS=orange, GCP=blue, Azure=cyan)
- Resource configurator: GlassCard per form section, GlassInput/GlassSelect for fields
- Estimation summary: Sticky GlassCard sidebar with AnimatedCounter for total cost, per-service breakdown
- AI Advisor: Glass message bubbles (shared chat pattern)
- Compare view: Side-by-side GlassCards per provider, cheaper values green-highlighted, more expensive red
- Tab bar: GlassTab (Estimator, AI Advisor, History, Compare)

#### Nebula
- Note list sidebar: Glass note cards (compact GlassCard per note) with title, preview, last modified. Active note has accent left bar.
- Editor wrapper: GlassSurface around Tiptap editor. Don't touch editor internals.
- Drawing panel: GlassCard wrapping tldraw canvas. Resize handle between editor and drawing. Glass toggle button.
- Voice recorder FAB: Circular GlassButton with mic icon. Accent glow when recording. Equalizer animation unchanged.
- Search: GlassInput search bar + GlassCard per result with title, snippet highlight, relevance score GlassBadge
- Knowledge graph: Keep current (3D upgrade happens in Phase 6)
- Tab bar: GlassTab (Notes, Search, Knowledge)

### Claude's Discretion
- Exact internal component restructuring within each plugin
- Whether to create a shared GlassChat component or just apply the pattern consistently
- Whether to create a shared GlassTable component or apply glass table styles inline
- How to handle plugin-specific edge cases not covered above
- Exact skeleton shapes per loading context
- Whether collapsible optimizer sections use accordion or simply toggle

</decisions>

<specifics>
## Specific Ideas

- Plugin headers should have the icon + name gradient like Cortex currently does — extend this to all 6 plugins
- The chat interface should feel like a modern chat app (Slack/Discord level polish) with glass styling
- TextCraft resizable panels should feel like VS Code's panel resize — smooth, with a visible handle
- After migration, switching between any two plugins should feel seamless — no jarring style differences
- Cortex cleanup is the most important migration because it currently has the most inline glass patterns that need to be replaced with shared components

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-plugin-migration*
*Context gathered: 2026-03-25*
