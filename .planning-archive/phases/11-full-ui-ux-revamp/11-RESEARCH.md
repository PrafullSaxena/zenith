# Phase 11: Full UI/UX Revamp - Research

**Researched:** 2026-03-11
**Domain:** CSS design tokens, color contrast, micro-interactions, animation, purpose-driven color semantics
**Confidence:** HIGH

## Summary

This phase is a comprehensive visual-only overhaul of every screen in the Zenith application. The audit of 40+ component files reveals three major categories of issues: (1) inconsistent design token usage -- Launchpad plugin uses non-existent `bg-bg-primary` and `bg-bg-secondary` tokens (17 occurrences across 5 files) that need correction to the established `bg-background` and `bg-surface` tokens; (2) missing purpose-driven color semantics -- most screens rely solely on the cyan accent color, missing opportunities for green/red diff colors in CodeReviewBot, status-specific colors across all plugins, and severity-graded indicators in the QueryOptimizer; (3) absence of entrance animations and micro-interactions on all plugin views except Dashboard and Nebula (which already have `stagger-children`, `animate-page-enter`, and `hover-lift`).

The CSS theme file (`main.css`) already defines a solid foundation: 8 oklch color tokens, 3 animation keyframe sets (fade-in-up, page-enter, tab-enter), a hover-lift utility, and a focus-ring utility. The existing `stagger-children` CSS class supports up to 10 children with staggered delays. framer-motion v12.5 is already installed but only used in Nebula's VoiceRecorder FAB and ToastContainer. The core architecture decision is to leverage existing CSS utilities (no new libraries needed) and extend the `@theme` block with semantic color tokens for success, error, warning, and info states.

**Primary recommendation:** Add semantic color tokens to `main.css` @theme block, fix all `bg-bg-primary`/`bg-bg-secondary` references in Launchpad, apply `stagger-children`/`animate-page-enter`/`hover-lift` consistently across all views, and add purpose-driven colors to CodeReviewBot diffs, status badges, and severity indicators.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHELL-07 | Dark-only theme with neon cyan accents -- no light mode toggle (dark-only by design decision) | Full audit of current theme tokens, identification of broken token references, plan for semantic color extension while maintaining dark-only oklch theme |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.0.12 | Utility-first CSS with @theme blocks | Already installed; CSS-first config via `main.css` @theme |
| tw-animate-css | (installed) | CSS animation utilities | Already imported in main.css |
| framer-motion | 12.5.0 | Complex animations (FAB, toasts) | Already installed; used in Nebula VoiceRecorder and ToastContainer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Icon library | Already used across all components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS keyframes | framer-motion for all | Overkill for simple entrance animations; CSS keyframes already work |
| Custom color tokens | Tailwind arbitrary values | Tokens ensure consistency; arbitrary values cause drift |

**Installation:**
```bash
# No new dependencies needed -- all tools are already installed
```

## Architecture Patterns

### Pattern 1: Semantic Color Tokens in @theme Block
**What:** Extend the existing @theme block with semantic status colors so they work as first-class Tailwind utilities (`bg-success`, `text-error`, etc.)
**When to use:** Whenever a color carries meaning (success, error, warning, info)
**Example:**
```css
/* Source: Existing main.css @theme pattern */
@theme {
  /* Existing tokens... */
  --color-success: oklch(72% 0.17 142);      /* Green */
  --color-success-muted: oklch(72% 0.17 142 / 0.15);
  --color-error: oklch(65% 0.2 25);          /* Red */
  --color-error-muted: oklch(65% 0.2 25 / 0.15);
  --color-warning: oklch(75% 0.15 85);       /* Amber */
  --color-warning-muted: oklch(75% 0.15 85 / 0.15);
  --color-info: oklch(70% 0.15 250);         /* Blue */
  --color-info-muted: oklch(70% 0.15 250 / 0.15);
  --color-diff-add: oklch(72% 0.17 142 / 0.12);
  --color-diff-del: oklch(65% 0.2 25 / 0.12);
  --color-diff-add-text: oklch(78% 0.15 142);
  --color-diff-del-text: oklch(75% 0.18 25);
}
```

### Pattern 2: Reuse Existing Animation Utilities
**What:** Apply the existing CSS animation classes consistently across all views
**When to use:** Every view container, card grid, and tab content panel
**Existing utilities:**
- `stagger-children` -- on parent container to stagger children entrance (up to 10)
- `animate-page-enter` -- on route change wrapper (already in AppLayout)
- `animate-tab-enter` -- on tab content wrapper (already used by CodeReviewBot, DbInspector, Launchpad, Nebula)
- `animate-fade-in-up` -- on individual elements
- `hover-lift` -- on cards for hover lift + shadow effect
- `focus-ring` -- on interactive elements for accessible focus indicators

### Pattern 3: Consistent Empty State Design
**What:** Every "no data" state should follow the same visual pattern
**Current pattern (from ActivityFeed/PRList):**
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-surface-elevated/40 py-10">
  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/[0.06]">
    <IconComponent size={20} className="text-accent/30" />
  </div>
  <p className="text-sm font-medium text-text-secondary/50">Primary message</p>
  <p className="mt-1 text-[11px] text-text-secondary/30">Secondary message</p>
</div>
```

### Anti-Patterns to Avoid
- **Using non-existent tokens:** `bg-bg-primary` and `bg-bg-secondary` do NOT exist in the theme. Use `bg-background` and `bg-surface` instead.
- **Hardcoding colors:** Never use raw `bg-green-500`, `text-red-400` etc. in new code when a semantic token exists. Reference the semantic tokens (`bg-success`, `text-error`).
- **Mixing animation approaches:** Don't use framer-motion for simple entrance animations that CSS keyframes handle. Reserve framer-motion for complex state-driven animations (e.g., AnimatePresence, spring physics).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entrance animations | Custom JS animation logic | CSS `stagger-children`, `animate-page-enter`, `animate-tab-enter` | Already defined, tested, performant |
| Card hover effects | Custom mouse tracking | `hover-lift` CSS class | Already handles transform + shadow |
| Status colors | Per-component color objects | @theme semantic tokens | Single source of truth |
| Scroll-triggered animations | IntersectionObserver code | `animate-fade-in-up` with CSS `animation-delay` | Simple, no JS needed |
| Focus indicators | Custom outline styles | `focus-ring` CSS class | Already defined with accent color |

**Key insight:** The existing CSS utility classes in `main.css` cover 90% of the animation needs. The gap is not missing infrastructure but missing application of existing utilities.

## Common Pitfalls

### Pitfall 1: Broken Token References in Launchpad
**What goes wrong:** Launchpad plugin files use `bg-bg-primary`, `bg-bg-secondary`, `text-bg-primary` etc. -- these are NOT defined in the @theme block
**Why it happens:** Launchpad was likely developed with a different token naming convention that was never reconciled
**How to avoid:** Search-and-replace all occurrences: `bg-bg-primary` -> `bg-background`, `bg-bg-secondary` -> `bg-surface`, `bg-bg-secondary/50` -> `bg-surface/50` etc.
**Warning signs:** Any element using `bg-bg-*` will have transparent/missing backgrounds
**Files affected (17 occurrences):**
- `src/renderer/src/plugins/launchpad/ProviderSelector.tsx` (2)
- `src/renderer/src/plugins/launchpad/ServiceCatalog.tsx` (4)
- `src/renderer/src/plugins/launchpad/ResourceConfigurator.tsx` (3)
- `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` (7)
- `src/renderer/src/plugins/launchpad/LaunchpadView.tsx` (1)

### Pitfall 2: WCAG AA Contrast Violations
**What goes wrong:** Text becomes unreadable against dark backgrounds
**Why it happens:** Using low-opacity text classes like `text-text-secondary/30` or `text-text-secondary/40` reduces already-dim secondary text below readable thresholds
**How to avoid:**
- `text-text-primary` (oklch 90%) on `bg-background` (oklch 10%): contrast ratio ~9:1 -- PASSES AA
- `text-text-secondary` (oklch 55%) on `bg-background` (oklch 10%): contrast ratio ~4.5:1 -- PASSES AA (barely)
- `text-text-secondary/50` (effective oklch ~32%) on `bg-background` (oklch 10%): contrast ratio ~2:1 -- FAILS AA
- **Minimum safe opacity for secondary text:** `/60` or higher (never go below `/50` for body text)
- WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text (18px+/14px bold)
**Warning signs:** Audit all `text-text-secondary/30`, `text-text-secondary/40`, `text-text-secondary/50` occurrences

### Pitfall 3: Animation Performance on Large Lists
**What goes wrong:** Applying `stagger-children` to lists with 50+ items causes janky rendering
**Why it happens:** CSS nth-child delays stack linearly; the last item waits N*60ms
**How to avoid:** Only use `stagger-children` on grids/lists with <=10 items. For large lists, use a single `animate-fade-in-up` on the container or skip animation entirely.
**Warning signs:** PR lists, table lists, history entries -- don't stagger these

### Pitfall 4: Portfolio Theme Breaking Semantic Colors
**What goes wrong:** Adding semantic colors to the default theme but forgetting to add them to the `[data-theme="portfolio"]` override
**Why it happens:** The portfolio theme uses hex values and overrides the CSS custom properties
**How to avoid:** Every new `--color-*` token added to `@theme {}` MUST also be added to `[data-theme="portfolio"]` with appropriate hex values
**Warning signs:** Test with both themes after making changes

## Comprehensive Screen Audit

### Screen 1: Dashboard (MissionControl.tsx)
**Status:** GOOD -- already well-designed
**Current state:**
- Uses `stagger-children` on main container
- Hero header has subtle glow effects, gradient background
- QuickStat cards use per-stat color accents (blue, emerald, amber, purple)
- Plugin cards use `hover-lift` and per-plugin accent colors
- Activity feed has proper empty state
**Needs:**
- Add `hover-lift` to QuickStat cards (currently missing)
- TokenChart and HealthPanel already have good styling
- Reduce `text-text-secondary/50` in section headers to `/70` minimum

### Screen 2: Activity Log (ActivityLog.tsx)
**Status:** GOOD -- clean and consistent
**Current state:**
- Uses `stagger-children` on main container
- Filter dropdowns have proper focus styles
- Reuses ActivityFeed component (consistent)
- Good empty state pattern
**Needs:**
- Add `hover-lift` to filter bar container
- "Clear All" button needs a confirmation pattern or red emphasis

### Screen 3: About View (AboutView.tsx)
**Status:** GOOD -- well-crafted
**Current state:**
- Uses `stagger-children`
- Capability cards use `hover-lift`
- Social link buttons use `hover-lift`
- Getting started steps have clean layout
**Needs:**
- Logo could use a subtle entrance animation (scale-in)
- Version badge could pulse briefly on load
- Minor: some `text-text-secondary/50` contrast issues

### Screen 4: Sidebar (Sidebar.tsx)
**Status:** GOOD
**Current state:**
- Active indicator with accent bar
- Icon hover with scale and bg-surface-elevated
- Tooltip on hover with backdrop blur
- Accent glow shadow on active state
**Needs:**
- Minor: separator could use subtle opacity animation

### Screen 5: CodeReviewBot (CodeReviewBotView.tsx, PRList.tsx, PRDiffView.tsx, ReviewPanel.tsx, ReviewHistory.tsx)
**Status:** NEEDS WORK -- functional but missing polish
**Current state:**
- Tab bar uses accent border pattern (consistent with other plugins)
- PR list has basic hover states
- Diff view uses `bg-green-950/30` and `bg-red-950/30` for additions/deletions
- Review finding cards have severity-colored left borders
- Review history has status badges
**Needs:**
- PRDiffView: Use semantic `bg-diff-add`/`bg-diff-del` tokens instead of hardcoded green/red
- PRDiffView: Add line number highlighting on hover
- PRList: Missing `hover-lift` on PR cards
- PRList: No entrance animation on the list items
- ReviewPanel: Add `stagger-children` to the finding cards list (max 10 visible)
- ReviewPanel: Streaming indicator could use a pulsing glow ring instead of just text
- ReviewHistory: Add `hover-lift` to history entries
- CodeReviewBotView: Missing overall `animate-page-enter` on mount
- Empty states are consistent (good) -- keep as-is

### Screen 6: DbInspector (DbInspectorView.tsx, ConnectionManager.tsx, SchemaExplorer.tsx, AskAI.tsx, QueryOptimizer.tsx, ERDiagram.tsx, DbHistory.tsx)
**Status:** NEEDS WORK -- functional, several contrast issues
**Current state:**
- Tab bar consistent with other plugins
- Connection status dots (green/red/gray) exist
- Schema explorer has tree-view with selection highlight
- AskAI has question/answer layout with follow-up context
- QueryOptimizer has collapsible sections with severity badges
- ERDiagram has table selector, mode switcher, visual/code toggle
**Needs:**
- SchemaExplorer: Column type text `text-text-secondary` on dark bg is marginal contrast
- SchemaExplorer: FK indicator (blue-400), PK indicator (amber-400) -- use semantic tokens
- AskAI: Empty state uses `text-text-secondary/50` -- too low contrast, raise to `/70`
- AskAI: Recent questions list items need `hover-lift`
- QueryOptimizer: Empty state uses `text-text-secondary/50` -- raise contrast
- QueryOptimizer: TileCard header gradient could be more prominent
- DbHistory: TYPE_CONFIG badges are good (blue/orange/green) -- keep
- ConnectionManager: Add subtle animation to connection status dot (pulse for connecting)
- DbInspectorView: Add `stagger-children` to left panel sections

### Screen 7: Launchpad (LaunchpadView.tsx, ProviderSelector.tsx, ServiceCatalog.tsx, ResourceConfigurator.tsx, EstimationSummary.tsx, AiAdvisor.tsx, EstimationHistory.tsx, ComparisonView.tsx)
**Status:** CRITICAL -- broken token references throughout
**Current state:**
- Uses `bg-bg-primary`, `bg-bg-secondary` tokens that DO NOT EXIST in @theme
- Tab bar is consistent with other plugins
- ProviderSelector has nice hover effects with provider-specific colors
- ServiceCatalog has checkbox visual with accent highlight
- EstimationSummary has monthly/yearly toggle
- EstimationHistory has provider-colored badges (amber/blue/cyan)
**Needs:**
- **CRITICAL:** Fix all 17 `bg-bg-primary`/`bg-bg-secondary` references:
  - `bg-bg-primary` -> `bg-background`
  - `bg-bg-secondary` -> `bg-surface`
  - `bg-bg-secondary/50` -> `bg-surface/50`
  - `bg-bg-secondary/60` -> `bg-surface/60`
  - `bg-bg-secondary/80` -> `bg-surface/80`
  - `bg-bg-secondary/40` -> `bg-surface/40`
  - `text-bg-primary` -> `text-background` (or check context)
  - `ring-offset-bg-primary` -> `ring-offset-background`
- ProviderSelector: Add `hover-lift` to provider cards
- ProviderSelector: Add `stagger-children` to card grid
- ResourceConfigurator: Empty state is good but uses wrong tokens
- EstimationSummary: Grand total could use accent color for emphasis
- AiAdvisor: Example prompt buttons could have subtle hover animation
- ComparisonView: Cost comparison table needs alternating row shading

### Screen 8: Nebula (NebulaView.tsx, NoteList.tsx, NoteEditor.tsx, SearchView.tsx, KnowledgeGraph.tsx, DrawingCanvas.tsx, VoiceRecorder.tsx)
**Status:** GOOD -- most polished section (Phase 9 focused on this)
**Current state:**
- Uses gradient background on NebulaView container
- Tab bar consistent with other plugins
- NoteList has hover states, pin indicators, context menus
- NoteEditor has floating toolbar (BubbleMenu), auto-save dots, tag pills
- SearchView has FTS5 highlighted results with mark tags
- KnowledgeGraph has custom node rendering with oklch colors
- VoiceRecorder uses framer-motion AnimatePresence with states
- ToastContainer uses framer-motion spring animations
**Needs:**
- NoteList: Could add subtle scale-up on hover for note cards
- SearchView: Search result items could use `hover-lift`
- KnowledgeGraph: Empty state text contrast could be improved
- Overall: Already the most polished view -- minimal changes needed

### Screen 9: Settings (SettingsLayout.tsx, GeneralSettings.tsx, AIAgentsSettings.tsx, MCPSettings.tsx, PluginSettings.tsx)
**Status:** GOOD -- Phase 10 already unified tokens
**Current state:**
- Left sidebar with accent border indicator on active category
- Tab-enter animation on content switch
- stagger-children on settings forms
- Unified input/toggle/button styles from Phase 10
**Needs:**
- Sidebar items could use subtle hover background transition (already has `hover:bg-surface-elevated/50`)
- Minor: Loading spinner is consistent (good)

### Screen 10: Stub Plugins (AstroPatchView.tsx, PromptBuilderView.tsx)
**Status:** ADEQUATE but plain
**Current state:**
- Centered layout with icon, title, "Coming Soon" badge
- Amber construction icon
**Needs:**
- Add subtle entrance animation (scale-in on the icon)
- Add `hover-lift` to the "Coming Soon" badge
- Add a pulsing glow effect on the main icon to hint at future availability

### Screen 11: AppLayout (AppLayout.tsx)
**Status:** GOOD
**Current state:**
- `animate-page-enter` on route transitions (keyed by pathname)
- Drag region for custom titlebar
**Needs:**
- No changes needed -- already handles page transitions

## Code Examples

### Adding Semantic Color Tokens
```css
/* Source: Extending existing main.css @theme block */
@theme {
  /* ... existing tokens ... */

  /* Semantic status colors */
  --color-success: oklch(72% 0.17 142);
  --color-success-muted: oklch(72% 0.17 142 / 0.15);
  --color-error: oklch(65% 0.2 25);
  --color-error-muted: oklch(65% 0.2 25 / 0.15);
  --color-warning: oklch(75% 0.15 85);
  --color-warning-muted: oklch(75% 0.15 85 / 0.15);
  --color-info: oklch(70% 0.15 250);
  --color-info-muted: oklch(70% 0.15 250 / 0.15);

  /* Code diff colors */
  --color-diff-add: oklch(72% 0.17 142 / 0.12);
  --color-diff-del: oklch(65% 0.2 25 / 0.12);
  --color-diff-add-text: oklch(78% 0.15 142);
  --color-diff-del-text: oklch(75% 0.18 25);
}

/* Portfolio theme must also define these */
[data-theme="portfolio"] {
  /* ... existing overrides ... */
  --color-success: #22c55e;
  --color-success-muted: rgba(34, 197, 94, 0.15);
  --color-error: #ef4444;
  --color-error-muted: rgba(239, 68, 68, 0.15);
  --color-warning: #f59e0b;
  --color-warning-muted: rgba(245, 158, 11, 0.15);
  --color-info: #3b82f6;
  --color-info-muted: rgba(59, 130, 246, 0.15);
  --color-diff-add: rgba(34, 197, 94, 0.12);
  --color-diff-del: rgba(239, 68, 68, 0.12);
  --color-diff-add-text: #4ade80;
  --color-diff-del-text: #f87171;
}
```

### Fixing Launchpad Token References
```tsx
// BEFORE (broken):
className="bg-bg-primary"
className="bg-bg-secondary"
className="bg-bg-secondary/50"

// AFTER (correct):
className="bg-background"
className="bg-surface"
className="bg-surface/50"
```

### Applying stagger-children to Plugin Cards
```tsx
// Already working in MissionControl.tsx:
<div className="stagger-children space-y-6 pb-4">
  {/* Children get staggered entrance animation */}
</div>

// Apply same pattern to DbInspectorView, CodeReviewBotView:
<div className="stagger-children flex h-full flex-col">
  {/* Header, tabs, content get staggered entrance */}
</div>
```

### Applying hover-lift to Cards
```tsx
// Already working in PluginCard.tsx:
<button className="hover-lift group relative flex flex-col rounded-xl border ...">

// Apply to PR list items, history entries, QuickStat cards:
<div className="hover-lift flex items-center gap-3 rounded-lg border ...">
```

### Adding Subtle Pulse to Status Dots
```css
/* Add to main.css */
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-status-pulse {
  animation: status-pulse 2s ease-in-out infinite;
}
```

### Improving Contrast on Low-Opacity Text
```tsx
// BEFORE (failing WCAG AA):
<p className="text-text-secondary/30">Operations from plugins will appear here</p>

// AFTER (passing WCAG AA):
<p className="text-text-secondary/60">Operations from plugins will appear here</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline Tailwind arbitrary colors | @theme CSS custom properties | Tailwind v4 (2024) | All colors from single source |
| `dark:` prefix conditionals | Dark-only unconditional | Project design decision | No class toggling needed |
| JavaScript animation libraries | CSS @keyframes + `animation-*` | Stable | Performant, no JS bundle cost |
| Per-component color definitions | Shared SEVERITY_CONFIG/STATUS_STYLES objects | Phase 3/10 | Consistent badge coloring |

**Deprecated/outdated:**
- `bg-bg-primary` / `bg-bg-secondary`: These tokens do not exist in the theme. They are holdovers from an inconsistent naming convention.

## Open Questions

1. **Portfolio theme maintenance**
   - What we know: A `[data-theme="portfolio"]` theme override exists with amber accents on slate-navy
   - What's unclear: How well-tested is this theme? Are all views checked against it?
   - Recommendation: Add portfolio theme overrides for all new semantic tokens; manually verify at least Dashboard + Settings with the portfolio theme

2. **Large list animation performance**
   - What we know: CSS stagger-children works well for <=10 items
   - What's unclear: How PR lists (potentially 50+ items) and schema tables (100+ tables) will perform
   - Recommendation: Do NOT apply stagger-children to large dynamic lists. Only use it on top-level view sections and small static grids.

## Comprehensive File Change List

### Wave 1: Foundation (Theme + Broken Tokens)
| File | Changes |
|------|---------|
| `src/renderer/src/assets/main.css` | Add semantic color tokens (success, error, warning, info, diff-add, diff-del) to @theme + portfolio theme; add `animate-status-pulse` keyframes |
| `src/renderer/src/plugins/launchpad/ProviderSelector.tsx` | Replace `bg-bg-primary` -> `bg-background`, `bg-bg-secondary` -> `bg-surface`, `ring-offset-bg-primary` -> `ring-offset-background` |
| `src/renderer/src/plugins/launchpad/ServiceCatalog.tsx` | Replace `bg-bg-primary` -> `bg-background`, `bg-bg-secondary/*` -> `bg-surface/*` |
| `src/renderer/src/plugins/launchpad/ResourceConfigurator.tsx` | Replace `bg-bg-primary` -> `bg-background`, `bg-bg-secondary` -> `bg-surface` |
| `src/renderer/src/plugins/launchpad/EstimationSummary.tsx` | Replace all `bg-bg-primary`/`bg-bg-secondary` references |
| `src/renderer/src/plugins/launchpad/LaunchpadView.tsx` | Replace `bg-bg-secondary` -> `bg-surface` |

### Wave 2: Contrast + Semantic Colors
| File | Changes |
|------|---------|
| `src/renderer/src/components/dashboard/ActivityFeed.tsx` | Raise `text-text-secondary/30` -> `/60`, `text-text-secondary/50` -> `/70` |
| `src/renderer/src/components/dashboard/StatusBadge.tsx` | Migrate to semantic tokens: `bg-green-500/10 text-green-400` -> `bg-success-muted text-success` etc. |
| `src/renderer/src/components/activity/ActivityLog.tsx` | Raise `text-text-secondary/40` -> `/60`, `text-text-secondary/60` -> `/70` |
| `src/renderer/src/plugins/code-review-bot/PRDiffView.tsx` | Replace `bg-green-950/30` -> `bg-diff-add`, `bg-red-950/30` -> `bg-diff-del`; use `text-diff-add-text`/`text-diff-del-text` for +/- symbols |
| `src/renderer/src/plugins/code-review-bot/PRList.tsx` | Raise low-contrast text; add hover-lift to PR cards |
| `src/renderer/src/plugins/code-review-bot/ReviewHistory.tsx` | Migrate status styles to semantic tokens |
| `src/renderer/src/plugins/db-inspector/AskAI.tsx` | Raise empty state text contrast from `/50` to `/70` |
| `src/renderer/src/plugins/db-inspector/QueryOptimizer.tsx` | Raise empty state text contrast; strengthen TileCard header gradient |
| `src/renderer/src/plugins/db-inspector/DbHistory.tsx` | Add hover-lift to history entries |
| `src/renderer/src/plugins/db-inspector/ConnectionManager.tsx` | Add pulse animation to connecting status dot |
| `src/renderer/src/plugins/nebula/SearchView.tsx` | Add hover-lift to search result items |
| `src/renderer/src/plugins/nebula/KnowledgeGraph.tsx` | Raise empty state text contrast |
| `src/renderer/src/components/about/AboutView.tsx` | Raise `text-text-secondary/50` occurrences |

### Wave 3: Animations + Micro-Interactions
| File | Changes |
|------|---------|
| `src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx` | Add `stagger-children` to top-level container sections |
| `src/renderer/src/plugins/code-review-bot/ReviewPanel.tsx` | Add `stagger-children` to finding cards list (clamp to first 10) |
| `src/renderer/src/plugins/db-inspector/DbInspectorView.tsx` | Add `stagger-children` to left panel sections |
| `src/renderer/src/plugins/launchpad/ProviderSelector.tsx` | Add `stagger-children` to provider cards grid, `hover-lift` to cards |
| `src/renderer/src/plugins/launchpad/AiAdvisor.tsx` | Add hover animation to example prompt buttons |
| `src/renderer/src/plugins/launchpad/EstimationHistory.tsx` | Add `hover-lift` to history entry cards |
| `src/renderer/src/plugins/launchpad/ComparisonView.tsx` | Add alternating row shading to comparison table |
| `src/renderer/src/components/dashboard/MissionControl.tsx` | Add `hover-lift` to QuickStat cards |
| `src/renderer/src/plugins/stubs/AstroPatchView.tsx` | Add entrance animation on icon (scale-in), subtle glow effect |
| `src/renderer/src/plugins/stubs/PromptBuilderView.tsx` | Add entrance animation on icon (scale-in), subtle glow effect |

### Summary Count
- **Total files to modify:** ~28
- **Critical fixes (Wave 1):** 6 files (theme + Launchpad tokens)
- **Contrast + semantic colors (Wave 2):** 13 files
- **Animations (Wave 3):** 10 files
- **No changes needed:** Sidebar.tsx, AppLayout.tsx, App.tsx, SettingsLayout.tsx, GeneralSettings.tsx, most settings/* files (Phase 10 already handled)

## Sources

### Primary (HIGH confidence)
- Direct file audit of all 40+ component files in src/renderer/src/ -- verified current styling
- `src/renderer/src/assets/main.css` -- verified all existing tokens, animations, utilities
- `package.json` -- verified installed dependency versions

### Secondary (MEDIUM confidence)
- WCAG AA contrast ratio guidelines: 4.5:1 for normal text, 3:1 for large text -- well-established standard
- oklch color space contrast calculations -- approximated from lightness values (exact ratios require rendering)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already installed and verified in codebase
- Architecture: HIGH - extending existing patterns, not introducing new ones
- Pitfalls: HIGH - verified broken tokens by grep, contrast issues by lightness analysis
- File change list: HIGH - derived from direct reading of every component file

**Research date:** 2026-03-11
**Valid until:** 60 days (stable -- CSS/design tokens rarely change)
