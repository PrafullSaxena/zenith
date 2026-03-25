# Phase 7: Micro-Interactions and Polish - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply micro-interactions, scroll indicators, icon morphs, and final polish across the entire app. Then run cross-theme visual QA on all 18 themes to catch and fix any remaining issues. This is the final phase — after this, the Obsidian Glass UI revamp is complete.

Requirements: MICRO-01 through MICRO-10.

</domain>

<decisions>
## Implementation Decisions

### Scroll Indicators
- **Progress bar**: 2px tall, accent-colored, fixed at top of scrollable container. Width = scroll percentage.
- **Scroll shadows**: Subtle 20px gradient fade from background to transparent at top and bottom when content overflows.
- **Scope**: All scrollable panels with overflow-y get both progress bar and shadows. Consistent across every plugin and core page.

### Button Press Feedback
- **Scale**: scale(0.97) on press for all GlassButtons — already implemented in GlassButton's whileTap. Audit to ensure all clickable elements use GlassButton (or apply whileTap directly if custom).
- **Duration**: 100ms press, spring release.

### Icon Morphs (State-Change Icons)
- **Scope**: ALL state-change icons get animated transitions, not just Copy→Check:
  - Copy → Check (spring, revert after 2s)
  - Eye → EyeOff (crossfade)
  - Play → Pause (crossfade)
  - Expand → Collapse (rotate 180°)
  - Any other toggle icons found during audit
- **Animation**: Spring for binary state changes, crossfade for toggle states. Use framer-motion AnimatePresence with mode="wait" for icon swaps.

### Staggered Card Entrances
- **Scope**: All card grids across the entire app must use shared staggerContainer/staggerItem from lib/motion.ts.
- **Audit**: Check every plugin and core page for card lists that aren't yet using stagger. Fix any missed ones.

### Tab Sliding Underline
- **Scope**: All GlassTab instances across the app should already have the sliding underline (layoutId). Audit to ensure none were missed.
- **Consistency**: Same animation speed and style everywhere.

### Skeleton Loaders
- **Scope**: All remaining loading spinners (Loader2 with animate-spin) replaced with contextual GlassSkeleton.
- **Audit**: grep for `animate-spin` and `Loader2` across all plugin files. Replace each with appropriate GlassSkeleton variant.

### Sidebar Micro-Interactions
- **Already implemented in Phase 3**: Hover glow, sliding active bar, glass tooltips with 400ms delay.
- **Polish**: Verify animations feel smooth. Adjust spring tension if needed.

### Settings Extra Polish
- **Settings page** identified as needing extra attention — most form-heavy page.
- **Polish**: Ensure all form sections have proper spacing, GlassCard grouping, GlassInput/GlassSelect consistency. Theme grid should feel premium.

### Cross-Theme Visual QA
- **Coverage**: All 18 themes, key screens (Dashboard, one plugin view, Settings).
- **Method**: Automated CSS variable/contrast checks first, then manual visual inspection.
- **Fix scope**: Fix ALL found issues — ship clean. No known visual breakage left.
- **Checks per theme**:
  - Glass cards visible and readable
  - Accent glow visible but not overpowering
  - Text contrast sufficient for extended reading
  - Status badges (success/error/warning/info) distinguishable
  - GlassSkeleton shimmer visible
  - 3D scenes render (if applicable on that screen)

### Claude's Discretion
- Exact spring tension/damping values for icon morphs
- Whether to create a shared `AnimatedIcon` wrapper component or apply transitions inline
- Which specific Loader2 instances to convert to which GlassSkeleton variant
- How to implement scroll progress bar (IntersectionObserver vs scroll event)
- Order of micro-interaction implementation (can be parallelized)
- Whether Settings needs layout changes or just spacing/consistency fixes

</decisions>

<specifics>
## Specific Ideas

- The final app should feel like every interaction has been considered — nothing feels "unfinished" or "default"
- Icon morphs should be subtle and fast — not distracting, just satisfying
- The scroll progress bar should be so thin (2px) that it's barely noticed consciously but subconsciously communicates scroll position
- Settings is the one page where users spend time configuring — it should feel especially polished with the theme grid as the centerpiece

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-micro-interactions-and-polish*
*Context gathered: 2026-03-25*
