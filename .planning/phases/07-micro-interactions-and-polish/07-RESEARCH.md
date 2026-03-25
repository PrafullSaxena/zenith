# Phase 7: Micro-Interactions and Polish - Research

**Researched:** 2026-03-25
**Domain:** Framer Motion micro-interactions, scroll indicators, cross-theme QA
**Confidence:** HIGH

## Summary

Phase 7 is the final polish phase. The audit reveals that several MICRO requirements are **already partially or fully implemented** from earlier phases, while others need new work. The project already has `framer-motion` with `AnimatePresence`, shared motion variants in `lib/motion.ts`, a `usePrefersReducedMotion` hook, and a `GlassSkeleton` component — so no new dependencies are needed.

The main work areas are: (1) auditing and fixing gaps in stagger/button/tab animations, (2) building an `AnimatedIcon` wrapper for icon morph transitions, (3) replacing remaining `Loader2` + `animate-spin` instances with `GlassSkeleton`, (4) adding scroll progress bars and scroll shadows to scrollable containers, and (5) cross-theme visual QA across all 18 themes.

**Primary recommendation:** Treat this as an audit-fix-polish phase. For each requirement, grep the codebase to find gaps, fix them, then verify across themes. No new libraries needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Scroll progress bar**: 2px tall, accent-colored, fixed at top of scrollable container. Width = scroll percentage.
- **Scroll shadows**: Subtle 20px gradient fade from background to transparent at top and bottom when content overflows.
- **Scope**: All scrollable panels with overflow-y get both progress bar and shadows.
- **Button press**: scale(0.97) on press for all GlassButtons. 100ms press, spring release. Audit all clickable elements.
- **Icon morphs**: ALL state-change icons get animated transitions (Copy->Check spring revert 2s, Eye->EyeOff crossfade, Play->Pause crossfade, Expand->Collapse rotate 180deg). Use framer-motion AnimatePresence with mode="wait".
- **Staggered card entrances**: All card grids must use shared staggerContainer/staggerItem from lib/motion.ts.
- **Tab sliding underline**: All GlassTab instances should already have layoutId. Audit for consistency.
- **Skeleton loaders**: All remaining Loader2 animate-spin replaced with contextual GlassSkeleton.
- **Sidebar micro-interactions**: Already implemented in Phase 3 (hover glow, sliding active bar, glass tooltips with 400ms delay). Polish only.
- **Settings page**: Extra attention for spacing, GlassCard grouping, consistency. Theme grid as centerpiece.
- **Cross-theme QA**: All 18 themes, key screens. Fix ALL found issues.

### Claude's Discretion
- Exact spring tension/damping values for icon morphs
- Whether to create a shared AnimatedIcon wrapper component or apply transitions inline
- Which specific Loader2 instances to convert to which GlassSkeleton variant
- How to implement scroll progress bar (IntersectionObserver vs scroll event)
- Order of micro-interaction implementation
- Whether Settings needs layout changes or just spacing/consistency fixes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MICRO-01 | Button press feedback -- scale(0.97) on press for all GlassButtons | **ALREADY DONE** in GlassButton.tsx: `whileTap={disabled ? undefined : { scale: 0.97 }}`. Audit needed for non-GlassButton clickable elements. |
| MICRO-02 | Icon morph -- Copy to Check spring animation on copy actions, revert after 2s | Pattern exists (conditional icon swap) in 11 files but NO animation. Need AnimatePresence wrapper. |
| MICRO-03 | Staggered card entrances -- all card grids use shared staggerItem variant | Partially done (17 files use stagger). Gaps found: GeneralSettings theme grid, ArchitectureDashboard, StatsCards. |
| MICRO-04 | Tab sliding underline -- active underline slides to new tab with layout animation | **ALREADY DONE** in GlassTab.tsx via `layoutId="activeTab"`. Audit to confirm all tab bars use GlassTab. |
| MICRO-05 | Skeleton loaders -- all loading states replaced with contextual shimmer | GlassSkeleton component exists. ~40+ Loader2/animate-spin instances remain across the app. |
| MICRO-06 | Scroll progress bar -- thin accent bar at top of scrollable containers | **NOT IMPLEMENTED**. New feature needed. |
| MICRO-07 | Scroll shadows -- top/bottom fade shadows when content overflows | **NOT IMPLEMENTED**. New feature needed. |
| MICRO-08 | Sidebar hover glow -- scale(1.08) + accent glow ring on icon hover | **ALREADY DONE** in Sidebar.tsx: `hover:scale-[1.08] hover:shadow-[0_0_12px_var(--color-accent-glow)]`. |
| MICRO-09 | Sidebar active bar -- left accent bar slides in with height animation on active icon | **ALREADY DONE** in Sidebar.tsx via `layoutId="sidebarActiveBar"` with spring animation. |
| MICRO-10 | Tooltip animation -- 400ms delay, then fade + translateX(4px) from left | **ALREADY DONE** in Sidebar.tsx: `delay-[400ms] group-hover:translate-x-1 group-hover:opacity-100`. |
</phase_requirements>

## Current State Audit

### MICRO-01: Button Press Feedback -- VERIFY ONLY
GlassButton already has `whileTap={{ scale: 0.97 }}` with 100ms transition and disabled guard. The `hoverLift` export in `motion.ts` also includes `whileTap: { scale: 0.97 }`.

**Gap to check:** Are there interactive elements (icon buttons, custom clickable divs) that should have press feedback but bypass GlassButton? The planner should include a grep for `onClick` on non-GlassButton elements to identify candidates.

### MICRO-02: Icon Morphs -- NEW WORK NEEDED
Current pattern across 11+ files: icons are conditionally rendered (`copied ? <Check /> : <Copy />`), but with no animation — just an instant swap. Files with copy-to-clipboard:
- `OutputPanel.tsx` (TextCraft)
- `CodeBlockNodeView.tsx` (Nebula)
- `CodeBlockControls.tsx` (Nebula)
- `NoteEditor.tsx` (Nebula)
- `ResultsGrid.tsx` (DbInspector)
- `QueryOptimizer.tsx` (DbInspector)
- `AskAI.tsx` (DbInspector)
- `ERDiagram.tsx` (DbInspector)
- `CellModal.tsx` (DbInspector)
- `MermaidRenderer.tsx` (DbInspector)
- `SqlEditor.tsx` (DbInspector)

Other toggle icons found: Eye/EyeOff in `NoteEditor.tsx`, ChevronDown/ChevronUp in multiple files, Play/Pause patterns in MarkdownRenderer.

### MICRO-03: Staggered Card Entrances -- PARTIAL, NEEDS AUDIT
**Files already using stagger** (17 files): MissionControl, ActivityLog, ActivityFeed, AboutView, NoteList, PRList, ReviewHistory, ReviewPanel, OverviewTab, RepoManager, ProviderSelector, EstimationHistory, SearchView, HistoryPanel, DbHistory, QueryOptimizer.

**Card grids NOT using stagger** (gaps found):
- `GeneralSettings.tsx` -- theme grid (grid-cols-3) has no stagger
- `ArchitectureDashboard.tsx` -- card grid (grid-cols-1/2/3) has no stagger
- `StatsCards.tsx` -- stat cards grid (grid-cols-2/4) has no stagger

### MICRO-04: Tab Sliding Underline -- VERIFY ONLY
GlassTab uses `layoutId="activeTab"` with `spring, stiffness: 400, damping: 30`. The sidebar uses `layoutId="sidebarActiveBar"` (separate to avoid conflict).

**Potential issue:** All GlassTab instances share the same `layoutId="activeTab"`. If multiple GlassTab components are rendered simultaneously on the same screen, the shared layoutId will cause cross-tab animation glitches. Each GlassTab group may need a unique layoutId prefix. The planner should audit whether multiple GlassTab instances coexist.

### MICRO-05: Skeleton Loaders -- SIGNIFICANT WORK
~40+ instances of `Loader2` with `animate-spin` found across 25+ files. Each needs assessment for the right GlassSkeleton variant:
- Full-page loading states (App.tsx, GeneralSettings, MCPSettings, etc.) -> GlassSkeleton variant="card"
- Inline button spinners (RepoCard, AgentRow, etc.) -> keep as-is (inline spinners are appropriate for button loading states)
- Panel loading states (InsightsPanel, DesignDocTab, etc.) -> GlassSkeleton variant="text" or "card"
- Table/list loading (QueryTab, ConnectionManager) -> GlassSkeleton variant="table"

**Key distinction:** Not all Loader2 instances should be replaced. Inline button loading indicators (where the spinner appears inside a button during an action) are a legitimate UX pattern and should remain. Only standalone loading states (where the spinner IS the content) should become GlassSkeleton.

### MICRO-06 & MICRO-07: Scroll Progress Bar and Scroll Shadows -- NEW WORK

**Recommendation: Create a `ScrollContainer` wrapper component** that provides:
1. A 2px accent-colored progress bar at the top (width tracks scroll percentage)
2. Top/bottom gradient shadows (20px fade) that appear when content overflows

**Implementation approach -- scroll event listener (not IntersectionObserver):**
- `onScroll` handler reads `scrollTop`, `scrollHeight`, `clientHeight`
- Progress = `scrollTop / (scrollHeight - clientHeight)`
- Show top shadow when `scrollTop > 0`
- Show bottom shadow when `scrollTop < scrollHeight - clientHeight - 1`
- Use `useRef` for the container, avoid state updates per frame -- write directly to DOM via ref for the progress bar width

**Why scroll event over IntersectionObserver:** IO is designed for element visibility detection, not continuous scroll tracking. Scroll events with direct DOM manipulation (no React state) are lightweight and standard for progress bars.

**Reduced motion:** Progress bar and shadows are purely visual (no transforms or animation), so they naturally respect reduced-motion without changes.

### MICRO-08, 09, 10: Sidebar -- ALREADY DONE
All three sidebar micro-interactions are fully implemented in `Sidebar.tsx`:
- **MICRO-08**: `hover:scale-[1.08] hover:shadow-[0_0_12px_var(--color-accent-glow)]`
- **MICRO-09**: `layoutId="sidebarActiveBar"` with spring transition
- **MICRO-10**: Tooltip with `delay-[400ms]`, fade, and `translate-x-1` entrance

**Polish only:** Verify the spring values feel good. Current: stiffness 500, damping 30.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | (already installed) | AnimatePresence, layoutId, whileTap, spring animations | Already the project animation library |
| React | (already installed) | useRef, useState, useEffect, useCallback | Core framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (already installed) | Icon components for morphs | All icon rendering |

### Alternatives Considered
None -- no new libraries needed. All requirements achievable with existing stack.

## Architecture Patterns

### Pattern 1: AnimatedIcon Wrapper
**What:** A shared component that wraps icon swaps with AnimatePresence for smooth transitions.
**When to use:** Any place where an icon changes based on state (copied, toggled, expanded).

```typescript
// Recommended: src/renderer/src/components/ui/AnimatedIcon.tsx
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface AnimatedIconProps {
  icon: LucideIcon
  /** Unique key that changes when icon changes — drives AnimatePresence */
  iconKey: string
  size?: number
  className?: string
}

export function AnimatedIcon({ icon: Icon, iconKey, size = 14, className }: AnimatedIconProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={iconKey}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.15 }}
        className={className}
      >
        <Icon size={size} />
      </motion.span>
    </AnimatePresence>
  )
}
```

**Recommendation:** Create the shared component. It reduces duplication across 11+ copy-icon locations and keeps animation parameters consistent.

### Pattern 2: ScrollContainer Wrapper
**What:** A reusable component that wraps scrollable content with progress bar and scroll shadows.
**When to use:** Any panel with `overflow-y: auto/scroll`.

```typescript
// Recommended: src/renderer/src/components/ui/ScrollContainer.tsx
// - Ref-based scroll tracking (no state per frame)
// - 2px accent progress bar at top
// - 20px gradient shadows at top/bottom
// - Shows/hides shadows based on scroll position
```

### Pattern 3: Stagger Audit-and-Fix
**What:** Find all card grids, wrap container in `motion.div variants={staggerContainer}`, wrap each card in `motion.div variants={staggerItem}`.
**When to use:** Every `grid-cols-*` that renders a list of cards.

### Anti-Patterns to Avoid
- **AnimatePresence without mode="wait":** Icons will overlap during transition. Always use `mode="wait"`.
- **layoutId conflicts:** Multiple GlassTab instances with the same `layoutId="activeTab"` on screen simultaneously will cause animation jumping. Wrap each tab group in a `LayoutGroup` with a unique `id`.
- **State-driven scroll progress:** Using `useState` for scroll position triggers 60fps re-renders. Use `useRef` + direct DOM mutation.
- **Replacing ALL Loader2 instances:** Inline button spinners (inside a button during an action) should stay as spinners. Only standalone loading states become skeletons.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon swap animation | Manual opacity/scale transitions per file | Shared AnimatedIcon with AnimatePresence | 11+ locations need the same pattern |
| Scroll progress tracking | Custom IntersectionObserver setup | Simple onScroll + ref-based DOM update | IO is wrong abstraction for continuous tracking |
| Stagger animations | Per-component timing logic | staggerContainer/staggerItem from motion.ts | Already centralized, just need to apply |
| Reduced motion | Per-component media query checks | getReducedMotionVariants() from motion.ts | Already centralized |

**Key insight:** This phase is about applying existing infrastructure consistently, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: layoutId Collisions
**What goes wrong:** Two GlassTab components on the same page share `layoutId="activeTab"`, causing the underline to jump between unrelated tab bars.
**Why it happens:** layoutId is global within a LayoutGroup scope. Default GlassTab hardcodes `"activeTab"`.
**How to avoid:** Accept a `layoutId` prop on GlassTab (defaulting to "activeTab") or wrap each GlassTab in a `LayoutGroup id="unique"`.
**Warning signs:** Tab underline flying across the screen to a different tab bar.

### Pitfall 2: Over-replacing Loader2
**What goes wrong:** Replacing a button's inline loading spinner with a skeleton that takes up completely different space, breaking button layout.
**Why it happens:** Not distinguishing between "content loading" (skeleton appropriate) and "action in progress" (spinner appropriate).
**How to avoid:** Only replace Loader2 when it represents a full-content loading state, not an inline action indicator.
**Warning signs:** Buttons that change size/shape when loading starts.

### Pitfall 3: Scroll Event Performance
**What goes wrong:** Using React state for scroll position causes 60fps re-renders of the entire component tree.
**Why it happens:** `setScrollProgress(...)` in onScroll triggers reconciliation.
**How to avoid:** Store scroll ref, mutate progress bar width via `ref.current.style.width` directly.
**Warning signs:** Janky scrolling, high CPU during scroll.

### Pitfall 4: AnimatePresence Without key
**What goes wrong:** Icon morph doesn't animate — it just snaps.
**Why it happens:** AnimatePresence requires a changing `key` to detect enter/exit.
**How to avoid:** Always pass a unique key derived from the current state (e.g., `key={copied ? 'check' : 'copy'}`).
**Warning signs:** No animation on state change.

### Pitfall 5: Missing Reduced Motion
**What goes wrong:** New micro-interactions don't respect `prefers-reduced-motion`.
**Why it happens:** Adding new animations without checking the preference.
**How to avoid:** Icon morphs: use instant opacity fade instead of spring. Scroll progress: no animation needed (it's driven by scroll position, not time). Stagger: already handled in `getReducedMotionVariants`.
**Warning signs:** Animations playing with OS reduced-motion enabled.

## Code Examples

### Copy-to-Check Icon Morph (current -> target pattern)
```typescript
// CURRENT (no animation):
{copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}

// TARGET (with AnimatedIcon):
<AnimatedIcon
  icon={copied ? Check : Copy}
  iconKey={copied ? 'check' : 'copy'}
  size={13}
  className={copied ? 'text-success' : undefined}
/>
```

### Scroll Progress Bar (ref-based, no state)
```typescript
const containerRef = useRef<HTMLDivElement>(null)
const progressRef = useRef<HTMLDivElement>(null)
const topShadowRef = useRef<HTMLDivElement>(null)
const bottomShadowRef = useRef<HTMLDivElement>(null)

const handleScroll = useCallback(() => {
  const el = containerRef.current
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  const maxScroll = scrollHeight - clientHeight

  if (progressRef.current) {
    progressRef.current.style.width = maxScroll > 0 ? `${(scrollTop / maxScroll) * 100}%` : '0%'
  }
  if (topShadowRef.current) {
    topShadowRef.current.style.opacity = scrollTop > 0 ? '1' : '0'
  }
  if (bottomShadowRef.current) {
    bottomShadowRef.current.style.opacity = scrollTop < maxScroll - 1 ? '1' : '0'
  }
}, [])
```

### Stagger Application Pattern
```typescript
// Wrap a card grid:
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-3 gap-3"
>
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
      <GlassCard>...</GlassCard>
    </motion.div>
  ))}
</motion.div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS transitions for icon swaps | framer-motion AnimatePresence | Already in project | Enables exit animations |
| React state for scroll tracking | Ref-based DOM mutation | Best practice | 60fps without re-renders |
| Per-component animation values | Centralized motion.ts variants | Phase 1 | Consistency |

## Open Questions

1. **GlassTab layoutId uniqueness**
   - What we know: All GlassTab instances use `layoutId="activeTab"`. Sidebar uses separate `"sidebarActiveBar"`.
   - What's unclear: Whether any page renders multiple GlassTab bars simultaneously.
   - Recommendation: During implementation, grep for pages with multiple GlassTab instances. If found, add a `layoutId` prop or wrap in scoped LayoutGroup.

2. **Which Loader2 instances to keep vs replace**
   - What we know: ~40+ instances exist. Some are inline button indicators, some are full-page loading.
   - What's unclear: Exact classification of each instance.
   - Recommendation: During implementation, classify each as "button spinner" (keep) or "content loader" (replace). Rule of thumb: if it's inside a `<button>` or `<GlassButton>`, keep it.

3. **ScrollContainer scope**
   - What we know: "All scrollable panels with overflow-y" should get both features.
   - What's unclear: How many scrollable containers exist and whether some already have custom scroll handling.
   - Recommendation: Grep for `overflow-y` and `overflow-auto` to identify all targets during implementation.

## Sources

### Primary (HIGH confidence)
- **Codebase audit** -- direct grep of all source files for current implementation state
- `src/renderer/src/components/ui/GlassButton.tsx` -- confirmed whileTap implementation
- `src/renderer/src/components/ui/GlassTab.tsx` -- confirmed layoutId implementation
- `src/renderer/src/components/Sidebar.tsx` -- confirmed all three sidebar micro-interactions
- `src/renderer/src/lib/motion.ts` -- confirmed stagger/reduced-motion infrastructure

### Secondary (MEDIUM confidence)
- framer-motion AnimatePresence mode="wait" pattern -- standard documented usage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all tools already in place
- Architecture: HIGH -- patterns are straightforward framer-motion usage with existing infrastructure
- Pitfalls: HIGH -- identified from direct codebase audit showing real current patterns

**Research date:** 2026-03-25
**Valid until:** 2026-04-24 (30 days -- stable domain, no moving targets)
