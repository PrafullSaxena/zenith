# Phase 4: Plugin Migration - Research

**Researched:** 2026-03-25
**Domain:** React component migration — replacing inline styling with shared glass design system components
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Order**: TextCraft first (smallest, validates pattern), then remaining 5 in parallel waves
- **Granularity**: 1 plugin per PLAN.md. Clean isolation, easy to track.
- **Scope per plugin**: Full glass + UX polish — GlassCard/GlassTab/GlassButton everywhere, skeleton loaders for all loading states, EmptyState for all zero-data views, stagger entrances, hover states, smooth transitions
- **UX depth**: Redesign where needed. If a screen is awkward, rethink the layout. Not just applying glass skin over existing structure.
- **Validation**: A plugin is "migrated" when it uses all relevant glass components, has skeleton loaders, has EmptyState with context-specific CTAs, and passes visual QA
- **Unified Plugin Headers**: GlassSurface header bar for all 6 plugins — icon + plugin name with gradient, GlassTab sub-navigation, status indicators on right, same height/padding
- **Unified Tables**: Glass table pattern — GlassCard wrapper, alternating row opacity, hover row highlight, sortable column headers
- **Unified Status Indicators**: Animated GlassBadge with semantic colors (green/yellow/red), pulsing animation for in-progress
- **Unified Chat Interface**: Shared GlassChat pattern — right-aligned user bubbles (accent-tinted), left-aligned AI bubbles (neutral), typing indicator (3 dots staggered pulse), citation GlassBadge pills, GlassInput + GlassButton input area. Applies to: Cortex QAPanel, DbInspector Ask AI, Launchpad AI Advisor
- **Unified Loading States**: All spinners replaced with contextual GlassSkeleton (card/text/table shapes). Streaming AI uses pulsing dots then streaming text.
- **Unified Empty States**: EmptyState with context-specific CTAs per plugin view
- **Unified Resize Handles**: Glass resize handle — thin vertical bar, drag cursor, hover accent highlight. Applies to: TextCraft panels, Nebula drawing panel
- **Cortex**: Delete GLASS_CARD/GLASS_SURFACE/cardVariants/useCardVariants from cortex-theme.ts. Replace with shared ui/ imports. Replace custom tab bar with GlassTab. Keep entity-specific KIND_COLORS.
- **CodeReviewBot**: PR list as GlassCards, review comments as GlassCards, GlassTab bar, GlassSelect repo selector, GlassBadge for connection/severity
- **DbInspector**: GlassSurface schema explorer, glass tree items, glass-wrapped console, GlassTab with icons+labels, GlassSelect connection manager
- **Launchpad**: GlassCard provider selector (brand accent on hover), GlassInput/GlassSelect forms, GlassTab bar, AnimatedCounter for cost
- **Nebula**: GlassCard note list, GlassSurface editor wrapper, GlassBadge tags, GlassTab bar. Don't touch editor/tldraw internals. Knowledge graph unchanged (Phase 6).
- **TextCraft**: GlassCard panels with resizable drag handles, GlassSelect for controls, GlassTab bar, GlassButton refine action

### Claude's Discretion
- Exact internal component restructuring within each plugin
- Whether to create a shared GlassChat component or just apply the pattern consistently
- Whether to create a shared GlassTable component or apply glass table styles inline
- How to handle plugin-specific edge cases not covered above
- Exact skeleton shapes per loading context
- Whether collapsible optimizer sections use accordion or simply toggle

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-01 | Cortex migrated — shared GlassCard/GlassTab replacing inline glass classes, shared motion variants | 16 Cortex component files import from cortex-theme.ts. GLASS_CARD, GLASS_SURFACE, cardVariants, useCardVariants must be deleted and replaced. KIND_COLORS/METHOD_COLORS/REPO_TYPE_GRADIENTS remain. |
| PLUG-02 | CodeReviewBot migrated — PR list GlassCards, review comments GlassCards, GlassTab bar, skeleton loaders | 6 component files (View, PRList, PRDiffView, ReviewPanel, ReviewHistory, SettingsPanel). Custom tab bar and plain divs need glass replacement. |
| PLUG-03 | DbInspector migrated — GlassSelect connection manager, glass tree explorer, glass-wrapped console, GlassTab bar | 15 component files. Most complex plugin by sub-component count. ConnectionManager, SchemaExplorer, QueryConsole, AskAI, QueryOptimizer, ERDiagram, DbHistory all need migration. |
| PLUG-04 | Launchpad migrated — GlassCard provider selector, GlassInput/GlassSelect forms, GlassTab bar, AnimatedCounter | 8 component files. ProviderSelector needs brand-colored hover glows. EstimationSummary needs AnimatedCounter. |
| PLUG-05 | Nebula migrated — GlassCard note list, GlassSurface editor wrapper, GlassBadge tags, GlassTab bar | 16 component files. Must NOT touch Tiptap editor or tldraw canvas internals. VoiceRecorder FAB becomes circular GlassButton. |
| PLUG-06 | TextCraft migrated — GlassCard panels, GlassSelect controls, GlassTab bar, GlassButton actions | 5 component files (smallest plugin). Resizable 3-column layout with drag handles between GlassCard columns. |
</phase_requirements>

## Summary

Phase 4 migrates all 6 Zenith plugins to the shared Obsidian Glass design system established in Phases 1-2 and validated in Phase 3 core pages. The shared component library (`src/renderer/src/components/ui/`) provides 11 glass components plus utilities. The migration is primarily a find-and-replace operation per plugin — swapping inline Tailwind classes and custom constants with shared Glass components — combined with UX improvements: skeleton loading states, empty states with CTAs, staggered entrances, and unified patterns for headers, tabs, tables, and chat interfaces.

The biggest risk factor is **Cortex**, which has 27+ component files and extensive usage of inline glass constants (`GLASS_CARD`, `GLASS_SURFACE`, `cardVariants`, `useCardVariants`) from `cortex-theme.ts`. These constants must be deleted and all 16+ importing files updated. However, Cortex's functional color mappings (`KIND_COLORS`, `METHOD_COLORS`, `REPO_TYPE_GRADIENTS`) must be preserved since they serve a semantic purpose (entity type differentiation), not decorative styling.

The user has decided on TextCraft first (smallest at 5 files, validates the migration pattern), then the remaining 5 plugins. Three cross-cutting patterns appear in multiple plugins and should be built as shared patterns: (1) a chat interface pattern (Cortex QA, DbInspector Ask AI, Launchpad AI Advisor), (2) a glass table pattern (DbInspector results, Launchpad estimates), and (3) a unified plugin header pattern (all 6). Whether these become shared components or documented inline patterns is at Claude's discretion.

**Primary recommendation:** Create 6 PLAN.md files (one per plugin). Start with TextCraft to validate the pattern. Build shared GlassChat component for the 3 chat interfaces. Apply consistent plugin header pattern across all 6 using GlassSurface + gradient title + GlassTab.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already installed, renders all plugin views |
| framer-motion | 11.x | Animation (stagger, page transitions, hover) | Already installed, used in all Glass components |
| lucide-react | latest | Icon library | Already installed, used across all plugins |
| Tailwind CSS | v4 | Utility styling | Already installed, Glass components built on it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @renderer/components/ui | local | Glass component library (11 components) | Every visual element replacement |
| @renderer/lib/motion | local | Shared motion variants (stagger, page, hover) | All entrance animations and interactions |

### Alternatives Considered
None — all libraries are already installed and in use. No new npm dependencies needed (per REQUIREMENTS.md out-of-scope).

## Architecture Patterns

### Plugin Migration Structure
Each plugin migration follows the same top-down pattern:
```
PluginView.tsx (main view)
├── Header: GlassSurface with icon + gradient title + GlassTab
├── Tab content: AnimatePresence with pageTransition variants
├── Loading states: GlassSkeleton (contextual shapes)
├── Empty states: EmptyState with plugin-specific CTAs
└── Sub-components: GlassCard/GlassButton/GlassInput/etc.
```

### Pattern 1: Unified Plugin Header
**What:** All 6 plugins share the same header structure — GlassSurface containing icon + gradient plugin name + GlassTab navigation + optional status indicators
**When to use:** Every plugin main view
**Example:**
```typescript
// Pattern established by Cortex (gradient title) extended to all plugins
<GlassSurface className="flex items-center justify-between px-6 py-3 rounded-none border-x-0 border-t-0">
  <div className="flex items-center gap-2">
    <PluginIcon size={18} className="text-accent" />
    <h1 className="bg-gradient-to-r from-text-primary to-accent bg-clip-text text-lg font-semibold text-transparent">
      Plugin Name
    </h1>
  </div>
  {/* Status indicators on right */}
</GlassSurface>
<GlassTab tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="rounded-none border-0" />
```

### Pattern 2: GlassTab layoutId Conflicts
**What:** GlassTab uses `layoutId="activeTab"` for the sliding underline. Multiple GlassTab instances on the same page will conflict.
**When to use:** Any plugin with multiple GlassTab instances (e.g., sidebar already uses GlassTab with vertical orientation in Settings)
**Resolution:** The GlassTab component needs a `layoutId` prop or uses the parent as scope. Currently it hardcodes `layoutId="activeTab"`. For Phase 4, each plugin's GlassTab will be the only instance on its page, so this works. But if a plugin has nested tabs, a `LayoutGroup` wrapper or unique layoutId per instance is needed.
**Key decision from Phase 3:** Sidebar uses `layoutId='sidebarActiveBar'` (not 'activeTab') to avoid conflict.

### Pattern 3: Cortex Theme Cleanup
**What:** Delete GLASS_CARD, GLASS_SURFACE, cardVariants, useCardVariants from cortex-theme.ts. Retain KIND_COLORS, METHOD_COLORS, REPO_TYPE_GRADIENTS, getKindColor, getMethodColor.
**When to use:** Cortex migration only
**Detail:** 16 component files import from cortex-theme.ts:
- `GLASS_CARD` users (9 files): AnalysisProgress, AddRepoDialog, ArchitectureDashboard, DesignDocTab, ExportDialog, MindGraphTab, TestCoverageCard, APIListTab, OverviewTab, QAPanel, RepoCard
- `GLASS_SURFACE` users (8 files): CortexView, ValidationPanel, DiagramsTab, FlowsTab, InsightsPanel, MindGraphTab, DesignDocTab, QAPanel, APIListTab
- `cardVariants/useCardVariants` users (2 files): RepoManager, OverviewTab
- `KIND_COLORS/getKindColor` users (keep): MindGraph3D, MindGraphTab, OverviewTab, ArchitectureDashboard, DiagramsTab
- `METHOD_COLORS/getMethodColor` users (keep): ArchitectureDashboard, APIListTab
- `REPO_TYPE_GRADIENTS` users (keep): RepoCard

After cleanup, cortex-theme.ts should only export: KindColorSet, KIND_COLORS, getKindColor, MethodColorSet, METHOD_COLORS, getMethodColor, REPO_TYPE_GRADIENTS.

### Pattern 4: Chat Interface (GlassChat)
**What:** Shared chat pattern used by 3 plugins (Cortex QA, DbInspector Ask AI, Launchpad AI Advisor)
**When to use:** Any AI chat interface
**Structure:**
```
GlassChat container
├── Message list (scrollable)
│   ├── User message: right-aligned, accent-tinted GlassCard
│   ├── AI message: left-aligned, neutral GlassCard with markdown rendering
│   ├── Typing indicator: 3 dots staggered pulse in glass bubble
│   └── Citations: GlassBadge pills at end of response
└── Input area: GlassInput + GlassButton send icon
```
**Recommendation:** Create a shared GlassChat component (or at minimum a shared pattern file) since this exact structure repeats in 3 plugins. This is Claude's discretion per CONTEXT.md.

### Pattern 5: Empty State with CTA
**What:** Replace all inline "no data" views with the shared EmptyState component
**Example current (Cortex):**
```typescript
// BEFORE: inline empty state
<div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
  <LayoutDashboard size={32} className="opacity-30" />
  <p className="text-sm">Analyze a repository to see insights</p>
  <button ...>Go to Repos</button>
</div>

// AFTER: shared EmptyState
<EmptyState
  icon={LayoutDashboard}
  title="No insights yet"
  description="Analyze a repository to see insights"
  actionLabel="Go to Repos"
  onAction={() => setActiveTab('repos')}
/>
```

### Anti-Patterns to Avoid
- **Touching editor internals:** Nebula's Tiptap editor and tldraw canvas must NOT be modified. Only wrap their containers with GlassSurface/GlassCard.
- **Touching diff viewer internals:** CodeReviewBot's diff syntax highlighting and line numbers must stay unchanged. Only wrap the diff container.
- **Replacing functional colors:** Cortex's KIND_COLORS are semantic (controller=green, service=purple) — do NOT replace with generic glass styling.
- **Nested backdrop-blur:** Per the two-tier blur strategy (Phase 1), nested Glass components should use `translucent` tier (GlassSurface), not `blur` tier (GlassCard). Don't stack backdrop-blur inside backdrop-blur.
- **Multiple GlassTab with same layoutId:** Each page should have at most one GlassTab, or use LayoutGroup to scope layout animations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glass card styling | Inline `bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl` | `<GlassCard>` from ui/ | 6 props handle all variants (default, interactive, selected) |
| Glass surface/toolbar | Inline `bg-surface-elevated/50 backdrop-blur-xl border-b border-border/40` | `<GlassSurface>` from ui/ | Polymorphic `as` prop, proper translucent tier |
| Tab navigation | Custom `<button>` with `border-b-2 border-accent` | `<GlassTab>` from ui/ | Sliding underline animation, a11y roles, icon support |
| Loading skeletons | Custom spinners or loading text | `<GlassSkeleton variant="card|text|table">` | Shimmer animation, contextual shapes |
| Empty states | Inline centered div with icon and text | `<EmptyState icon={...} title={...} actionLabel={...}>` | Parallax mouse effect, CTA button, consistent spacing |
| Modals/dialogs | Custom overlay + positioned div | `<GlassModal>` from ui/ | Backdrop blur, scale entrance/exit, AnimatePresence |
| Stagger animations | Custom `cardVariants` with delay math | `staggerContainer` + `staggerItem` from motion.ts | Reduced-motion aware, consistent 60ms delay |
| Badge/status pills | Custom styled spans | `<GlassBadge variant="success|error|warning">` | Semantic colors, consistent sizing |

**Key insight:** Every visual pattern needed for plugin migration already exists in the shared library. Phase 4 is purely about adoption, not creation. The only potential new component is GlassChat (Claude's discretion).

## Common Pitfalls

### Pitfall 1: GlassTab layoutId Collision
**What goes wrong:** Multiple `<GlassTab>` instances on the same page cause the sliding underline to jump between unrelated tab bars because they share `layoutId="activeTab"`.
**Why it happens:** GlassTab hardcodes the layoutId.
**How to avoid:** Each plugin view should have only one GlassTab instance. If nested tabs are needed, wrap in `<LayoutGroup id="unique-scope">` or pass a custom layoutId prop (would require a minor GlassTab enhancement).
**Warning signs:** Underline animates to wrong position, or jumps across distant tab bars.

### Pitfall 2: Cortex Theme Imports Breaking After Cleanup
**What goes wrong:** Deleting GLASS_CARD/GLASS_SURFACE/cardVariants from cortex-theme.ts causes TypeScript compilation errors in 16+ files that import them.
**Why it happens:** Removing exports without updating all importers.
**How to avoid:** Update all importers FIRST to use shared ui/ components, THEN delete the constants from cortex-theme.ts. Run TypeScript compilation check after.
**Warning signs:** `Module '"../cortex-theme"' has no exported member 'GLASS_CARD'` errors.

### Pitfall 3: Stacking Backdrop Blur
**What goes wrong:** Wrapping a GlassCard (which has backdrop-blur) inside another GlassCard creates a double-blur effect that looks washed out and causes GPU overhead.
**Why it happens:** Not following the two-tier blur strategy.
**How to avoid:** Use GlassSurface (translucent, no blur) for container panels and GlassCard (blur) for content cards inside them. Never nest GlassCard inside GlassCard.
**Warning signs:** Unusually bright/washed areas, visual "halo" effect.

### Pitfall 4: Forgetting Loading States
**What goes wrong:** Plugin shows a blank screen or spinner during data fetching, breaking the "every state has glass" requirement.
**Why it happens:** Only migrating the "data present" view, forgetting `isLoading` branches.
**How to avoid:** For every `isLoading` / `isConnecting` / `isLoadingPRs` / etc. state in each plugin, add a GlassSkeleton with appropriate variant.
**Warning signs:** Flash of empty content, old spinner still visible.

### Pitfall 5: Losing Existing Functionality During Redesign
**What goes wrong:** While redesigning layouts for better UX, existing event handlers, keyboard shortcuts, or edge-case logic gets dropped.
**Why it happens:** Copy-pasting new JSX without preserving all the `onClick`, `onKeyDown`, `onBlur`, callback props.
**How to avoid:** Preserve all handler wiring. The migration is visual, not behavioral. Every `useCallback`, `useEffect`, and event handler must survive the migration.
**Warning signs:** Buttons that don't respond, missing keyboard navigation, broken streaming.

### Pitfall 6: GlassSurface Rounded Corners in Full-Width Headers
**What goes wrong:** GlassSurface defaults to `rounded-xl`, but plugin headers span full width and shouldn't have rounded corners on left/right/top edges.
**Why it happens:** Using GlassSurface without overriding border-radius.
**How to avoid:** Pass `className="rounded-none border-x-0 border-t-0"` (or similar) to GlassSurface when used as a full-width header bar.
**Warning signs:** Visible rounded corners at top of plugin views.

## Code Examples

### Replacing Cortex GLASS_CARD with GlassCard
```typescript
// BEFORE (cortex-theme inline constant)
import { GLASS_CARD } from '../cortex-theme'
<div className={`${GLASS_CARD} p-4`}>content</div>

// AFTER (shared component)
import { GlassCard } from '@renderer/components/ui'
<GlassCard className="p-4">content</GlassCard>
// Note: GlassCard already includes p-4 by default, so may not need className
```

### Replacing Cortex GLASS_SURFACE with GlassSurface
```typescript
// BEFORE
import { GLASS_SURFACE } from './cortex-theme'
<div className={`${GLASS_SURFACE} flex items-center justify-between px-6 py-3`}>

// AFTER
import { GlassSurface } from '@renderer/components/ui'
<GlassSurface className="flex items-center justify-between px-6 py-3 rounded-none border-x-0 border-t-0">
```

### Replacing Custom Tab Bar with GlassTab
```typescript
// BEFORE (all plugins have similar custom tab bars)
<div className="flex border-b border-border">
  {TABS.map((tab) => (
    <button className={`... ${isActive ? 'border-b-2 border-accent text-accent' : '...'}`}>
      <Icon size={13} /> {tab.label}
    </button>
  ))}
</div>

// AFTER
import { GlassTab } from '@renderer/components/ui'
const GLASS_TABS = TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon }))
<GlassTab tabs={GLASS_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
```

### Replacing Cortex cardVariants with shared stagger
```typescript
// BEFORE (cortex-theme custom variants)
import { cardVariants, useCardVariants } from '../cortex-theme'
const variants = useCardVariants(reducedMotion)
<motion.div variants={variants} custom={i} initial="hidden" animate="visible">

// AFTER (shared motion.ts variants)
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
```

### Adding GlassSkeleton Loading State
```typescript
// For card-based views (repos, PR list, notes)
if (isLoading) return <GlassSkeleton variant="card" className="m-4" />

// For table-based views (query results, estimates)
if (isLoading) return <GlassSkeleton variant="table" className="m-4" />

// For text content (AI responses, descriptions)
if (isLoading) return <GlassSkeleton variant="text" lines={4} className="m-4" />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline glass class strings (GLASS_CARD constant) | GlassCard component with variants | Phase 2 (2026-03-24) | Semantic props instead of CSS strings |
| Custom per-plugin tab bars with border-b-2 | GlassTab with sliding underline (layoutId animation) | Phase 2 (2026-03-24) | Consistent animated tab switching |
| No loading states or basic spinners | GlassSkeleton with shimmer animation | Phase 2 (2026-03-24) | Contextual loading placeholders |
| Per-plugin custom motion variants | Centralized motion.ts variants | Phase 1 (2026-03-24) | Reduced-motion aware, consistent timing |

**Deprecated/outdated:**
- `cortex-theme.ts` GLASS_CARD/GLASS_SURFACE constants: Replaced by GlassCard/GlassSurface components
- `cortex-theme.ts` cardVariants/useCardVariants: Replaced by staggerContainer/staggerItem from motion.ts
- `animate-tab-enter` CSS class: Found in CRB, DbInspector, Launchpad, Nebula — should be replaced with framer-motion AnimatePresence page transitions

## Per-Plugin Complexity Assessment

| Plugin | Files | Complexity | Key Challenges |
|--------|-------|------------|----------------|
| TextCraft | 5 | LOW | Resizable panels (drag handles), 3-column layout |
| CodeReviewBot | 6 | MEDIUM | PR list cards, diff viewer wrapping (don't touch internals), streaming review status |
| Launchpad | 8 | MEDIUM | Provider brand colors on hover, AnimatedCounter, 3-column estimator layout |
| Nebula | 16 | MEDIUM-HIGH | Don't touch Tiptap/tldraw internals, VoiceRecorder FAB, drawing panel resize, sidebar collapse |
| Cortex | 27+ | HIGH | 16 files importing from cortex-theme.ts, theme file cleanup, most sub-components, MindGraph3D |
| DbInspector | 15 | HIGH | Most tabs (5), collapsible left panel, CodeMirror SqlEditor (don't touch), QueryConsole multi-tab |

## Open Questions

1. **GlassTab layoutId scoping**
   - What we know: GlassTab hardcodes `layoutId="activeTab"`. Sidebar already uses a different layoutId.
   - What's unclear: If any plugin needs nested GlassTab instances, this will conflict.
   - Recommendation: For Phase 4, each plugin uses exactly one GlassTab. If nested tabs are needed later, add a `layoutId` prop to GlassTab. LOW priority — no plugin currently needs nested tabs.

2. **GlassChat as shared component vs. inline pattern**
   - What we know: 3 plugins (Cortex QA, DbInspector Ask AI, Launchpad AI Advisor) all need the same chat pattern.
   - What's unclear: How different the 3 implementations currently are in detail (message structure, citation handling, streaming).
   - Recommendation: Create a shared GlassChat component in ui/. The pattern is identical enough across all 3 that duplication would be wasteful. If differences are too large, fall back to a documented pattern applied consistently.

3. **GlassTable as shared component vs. inline pattern**
   - What we know: DbInspector query results and Launchpad estimates need glass table styling.
   - What's unclear: Whether the table structures are similar enough to warrant a component.
   - Recommendation: Start with inline glass table styles (GlassCard wrapper + striped rows). If the pattern proves identical, extract to a shared component in a later task.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all 6 plugin main views and sub-components
- `src/renderer/src/components/ui/` — all 11 Glass component implementations verified
- `src/renderer/src/plugins/cortex/cortex-theme.ts` — full inline constant inventory
- `src/renderer/src/lib/motion.ts` — shared motion variant APIs
- Phase 3 migration patterns from `components/dashboard/`, `components/activity/`, `components/settings/`, `components/about/`

### Secondary (MEDIUM confidence)
- STATE.md decisions log (established patterns from Phases 1-3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and proven in Phases 1-3
- Architecture: HIGH — migration patterns directly verified from Phase 3 core page migrations and codebase analysis
- Pitfalls: HIGH — identified from actual code analysis (layoutId conflicts, nested blur, cortex-theme import chains)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — internal codebase, no external dependency changes)
