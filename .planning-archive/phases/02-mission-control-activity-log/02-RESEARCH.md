# Phase 2: Mission Control & Activity Log - Research

**Researched:** 2026-03-06
**Domain:** Dashboard UI, activity logging, Zustand state management, CSS Grid layout
**Confidence:** HIGH

## Summary

Phase 2 builds the Mission Control dashboard (the app's default landing view) and a centralized activity log system. The dashboard must show plugin summary cards, quick-action buttons, and a live activity feed -- all in a responsive CSS Grid layout. The activity log is a Zustand store that every plugin will eventually push entries into, storing plugin source, operation type, status, and duration.

This phase is pure renderer-side work. No new IPC channels or main-process changes are required -- the activity log lives entirely in a Zustand store persisted via the existing `window.api.settings` IPC pipeline. All technologies are already in the project (Zustand 5.0.11, Tailwind v4 with CSS-first @theme, React Router 7, lucide-react). No new npm dependencies are needed.

**Primary recommendation:** Build the activity store first (data layer), then the dashboard components (view layer), then wire routing so Mission Control is the default landing view.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Mission Control as default landing view when app launches | Change default route in App.tsx from `PLUGINS[0].route` to `/dashboard`; update `general.defaultView` setting to include `dashboard` option. Sidebar needs a new Home/LayoutDashboard icon at top. |
| DASH-02 | Dashboard shows summary cards for each active plugin | Map over `PLUGINS` array to render a card per plugin. Each card shows plugin name, icon, description, and recent activity count from the activity store. Use CSS Grid for card layout. |
| DASH-03 | Quick-action buttons to jump to common plugin tasks | Each plugin card includes a primary action button that navigates to the plugin route. Use `react-router-dom` `useNavigate()` for programmatic navigation. |
| DASH-04 | Activity feed showing recent operations across all plugins | Read from activity store, display most recent N entries in a scrollable feed component. Each entry shows plugin icon, operation name, status badge, timestamp, and duration. |
| DASH-05 | Dashboard layout uses CSS grid, responsive to window size | Tailwind v4 grid utilities: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Responsive breakpoints via standard Tailwind responsive prefixes. |
| ACTV-01 | Centralized activity log storing all plugin operations with timestamps | Zustand store with `ActivityEntry[]` array. Entries have `id`, `pluginId`, `operation`, `status`, `timestamp`, `duration`. Persisted to electron-store via `window.api.settings.set('activity.log', entries)`. |
| ACTV-02 | Activity entries include: plugin source, operation type, status (success/failure), duration | `ActivityEntry` type with fields: `pluginId: PluginId`, `operation: string`, `status: 'success' \| 'failure' \| 'pending'`, `durationMs: number \| null`, `timestamp: string` (ISO 8601). |
| ACTV-03 | Activity log viewable from dashboard feed and dedicated activity section | Dashboard shows truncated feed (last 10-20 entries). Dedicated `/activity` route shows full paginated log with filters. Sidebar gets an Activity icon or it is accessed via the dashboard. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.11 | Activity store state management | Already used for settings-store and agent-store; consistent pattern |
| React Router | 7.13.1 | Dashboard and activity log routing | Already used for all navigation; HashRouter established |
| Tailwind CSS | 4.0.12 | CSS Grid layout, responsive design | Already configured with @theme blocks and CSS-first approach |
| lucide-react | 0.475.0 | Dashboard icons (LayoutDashboard, Activity, Clock, etc.) | Already used for sidebar icons; static ICON_MAP pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | 12.5.0 | Card hover effects, feed entry transitions | Already installed; use for subtle micro-animations on dashboard cards |
| date-fns or built-in Intl | N/A | Relative timestamps ("2 minutes ago") | Intl.RelativeTimeFormat is built into modern V8; no library needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for activity log | TanStack Query | Activity log is local state, not server state. TanStack Query is overkill -- no caching/refetching needed. Zustand is the right choice. |
| Custom relative time | date-fns `formatDistanceToNow` | date-fns adds ~6KB but is more robust. Intl.RelativeTimeFormat is zero-dependency and sufficient for a personal tool. Use Intl. |
| Separate electron-store | Settings store namespacing | Activity data can live under `activity.log` key in existing zenith-settings store. No need for a separate store file. |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/renderer/src/
  types/
    activity.ts              # ActivityEntry, ActivityStatus types
  stores/
    activity-store.ts        # Zustand store for activity log
  components/
    dashboard/
      MissionControl.tsx     # Main dashboard view component
      PluginCard.tsx         # Individual plugin summary card
      ActivityFeed.tsx       # Recent activity feed (used on dashboard)
      QuickActions.tsx       # Quick-action buttons strip (or inline in PluginCard)
    activity/
      ActivityLog.tsx        # Full dedicated activity log view
      ActivityEntry.tsx      # Single activity entry row
      ActivityFilters.tsx    # Filter bar (by plugin, status, date)
  plugins/
    registry.ts             # Update ICON_MAP in Sidebar if needed
```

### Pattern 1: Activity Store (Zustand with Settings Persistence)

**What:** A Zustand store that mirrors the settings-store and agent-store patterns -- in-memory state with async persistence via `window.api.settings`.
**When to use:** For the centralized activity log that must survive app restarts.
**Example:**
```typescript
// Source: follows agent-store.ts pattern from Phase 1 codebase
import { create } from 'zustand'
import type { ActivityEntry } from '../types/activity'

interface ActivityStoreState {
  entries: ActivityEntry[]
  isLoading: boolean
  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => Promise<void>
  clearEntries: () => Promise<void>
  getRecentEntries: (limit?: number) => ActivityEntry[]
  getEntriesByPlugin: (pluginId: string) => ActivityEntry[]
}

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  entries: [],
  isLoading: true,

  loadEntries: async () => {
    set({ isLoading: true })
    const saved = await window.api.settings.get('activity.log') as ActivityEntry[] | null
    set({ entries: Array.isArray(saved) ? saved : [], isLoading: false })
  },

  addEntry: async (entry) => {
    const newEntry: ActivityEntry = {
      ...entry,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    }
    const updated = [newEntry, ...get().entries].slice(0, 500) // Cap at 500 entries
    set({ entries: updated })
    await window.api.settings.set('activity.log', updated)
  },

  clearEntries: async () => {
    set({ entries: [] })
    await window.api.settings.set('activity.log', [])
  },

  getRecentEntries: (limit = 20) => get().entries.slice(0, limit),

  getEntriesByPlugin: (pluginId) => get().entries.filter(e => e.pluginId === pluginId),
}))
```

### Pattern 2: Dashboard as Non-Plugin Route

**What:** Mission Control is NOT a plugin -- it is a top-level route like `/settings`. It does not appear in the `PLUGINS` array. It has its own sidebar icon and route.
**When to use:** For the `/dashboard` route.
**Why:** The PLUGINS array drives per-plugin settings, stub views, and agent dropdowns. The dashboard is app-level infrastructure, not a plugin. Putting it in PLUGINS would create a settings section for it and an agent dropdown -- neither makes sense.
**Example:**
```typescript
// In App.tsx -- add dashboard route alongside settings
<Route path="/dashboard" element={<MissionControl />} />
{/* Change default redirect */}
<Route path="/" element={<Navigate to="/dashboard" replace />} />
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

### Pattern 3: CSS Grid Dashboard Layout

**What:** Responsive card grid that adapts to window size using Tailwind v4 grid utilities.
**When to use:** For DASH-05 responsive layout.
**Example:**
```tsx
// Tailwind v4 CSS-first -- responsive grid utilities work via standard breakpoints
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {PLUGINS.map(plugin => (
    <PluginCard key={plugin.id} plugin={plugin} />
  ))}
</div>
```

### Pattern 4: Relative Timestamps with Intl.RelativeTimeFormat

**What:** Zero-dependency relative time formatting for activity entries.
**When to use:** For displaying "2m ago", "1h ago" in the activity feed.
**Example:**
```typescript
function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now()
  const then = new Date(isoTimestamp).getTime()
  const diffSeconds = Math.round((then - now) / 1000)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [Infinity, 'week'],
  ]

  for (const [threshold, unit] of thresholds) {
    if (Math.abs(diffSeconds) < threshold) {
      const divisor = unit === 'second' ? 1 : unit === 'minute' ? 60 : unit === 'hour' ? 3600 : unit === 'day' ? 86400 : 604800
      return rtf.format(Math.round(diffSeconds / divisor), unit)
    }
  }
  return rtf.format(Math.round(diffSeconds / 604800), 'week')
}
```

### Pattern 5: Sidebar Icon Addition

**What:** Add a dashboard/home icon to the sidebar above the plugin icons.
**When to use:** For navigating to Mission Control.
**Example:**
```typescript
// In Sidebar.tsx -- add LayoutDashboard to ICON_MAP and render before PLUGINS.map
import { LayoutDashboard, Activity } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Activity,
  // ... existing icons
}

// Before the PLUGINS.map loop:
<SidebarIcon iconName="LayoutDashboard" label="Mission Control" to="/dashboard" />
```

### Anti-Patterns to Avoid

- **Dashboard as a plugin:** Do NOT add Mission Control to the PLUGINS array. It would get an unwanted settings schema section, agent dropdown, and stub view. It is app-level infrastructure.
- **Activity log in localStorage:** Do NOT use localStorage. The established pattern is `window.api.settings` -> electron-store via IPC. Stay consistent.
- **Unbounded activity log:** Do NOT store unlimited entries. Cap at a reasonable number (500) and prune on each write.
- **Date library for relative time:** Do NOT install date-fns or moment.js just for relative timestamps. `Intl.RelativeTimeFormat` is built into Electron's V8 engine.
- **Inline styles or custom CSS for grid:** Do NOT write custom CSS for the grid layout. Tailwind v4 grid utilities handle this cleanly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom diffing + string building | `Intl.RelativeTimeFormat` | Built into V8, handles i18n edge cases, zero bundle cost |
| Responsive grid | Custom CSS media queries | Tailwind `grid-cols-*` + responsive prefixes | Already configured, consistent with project patterns |
| Activity persistence | Custom file I/O or new store | `window.api.settings.set('activity.log', data)` | Reuses established electron-store pipeline |
| Unique IDs for entries | uuid library | `Date.now()` + random suffix | Personal tool, no collision risk at this scale |
| Status badge colors | Custom color system | Theme tokens from `main.css` @theme block | Green for success, red for failure, yellow for pending -- use oklch tokens |

**Key insight:** Phase 2 has zero new infrastructure needs. Every building block exists from Phase 1 -- Zustand stores, IPC settings pipeline, Tailwind theme tokens, React Router, lucide icons. The work is purely composition of existing patterns into new components.

## Common Pitfalls

### Pitfall 1: Default Route Change Breaking Existing Navigation

**What goes wrong:** Changing the default `<Navigate to=...>` in App.tsx can break the back button or cause redirect loops if the dashboard route is not properly registered.
**Why it happens:** HashRouter with `<Navigate replace>` replaces history entries. If the dashboard route is missing or misconfigured, every navigation falls through to the catch-all.
**How to avoid:** Register the `/dashboard` route BEFORE the catch-all `*` route. Test that clicking a sidebar icon, then pressing back, goes to the dashboard (not an infinite redirect).
**Warning signs:** Browser history length doesn't increase when navigating. Console shows React Router warnings about no matching routes.

### Pitfall 2: Activity Store Loading Race Condition

**What goes wrong:** The dashboard mounts and calls `getRecentEntries()` before `loadEntries()` has completed, showing an empty feed.
**Why it happens:** Zustand stores start with initial state (`entries: []`). The async `loadEntries()` hasn't resolved yet when the component first renders.
**How to avoid:** Call `loadEntries()` in a `useEffect` in `MissionControl.tsx` (or at app startup in `App.tsx`). Show a loading skeleton while `isLoading` is true.
**Warning signs:** Dashboard shows "No recent activity" flash before entries appear.

### Pitfall 3: Electron-Store Write Frequency

**What goes wrong:** Writing the full activity log to electron-store on every `addEntry()` call causes disk thrashing if activities come in rapid bursts (e.g., during a batch operation).
**Why it happens:** `electron-store.set()` does synchronous disk write in the main process.
**How to avoid:** Debounce the persist call. Update Zustand state immediately (optimistic), but debounce the `window.api.settings.set()` call by 1-2 seconds. The agent store already uses immediate writes, but the activity store will have higher write frequency.
**Warning signs:** Slow app performance during rapid operations in later phases.

### Pitfall 4: Activity Log Size Bloat

**What goes wrong:** Over weeks of use, the activity log grows to thousands of entries, making the settings store slow and the feed sluggish.
**Why it happens:** No cap on entries, no cleanup policy.
**How to avoid:** Cap at 500 entries in `addEntry()`. Trim from the end (oldest first). Consider adding a `clearOlderThan(days)` utility.
**Warning signs:** App startup becomes noticeably slower; `settings:getAll` returns a large payload.

### Pitfall 5: Sidebar Icon Ordering -- Dashboard vs Plugins

**What goes wrong:** The dashboard icon blends in with plugin icons, or disrupts the established icon rail layout.
**Why it happens:** No visual separator between the app-level dashboard icon and the plugin icons.
**How to avoid:** Place the dashboard icon at the very top (above plugins) with a subtle divider (thin border-b line) between it and the plugin icons. This mirrors how the settings gear is separated at the bottom.
**Warning signs:** User confusion about what is a plugin vs. what is app infrastructure.

### Pitfall 6: ACTV-03 Dual View Requirement

**What goes wrong:** Building activity feed only on the dashboard and forgetting the dedicated activity section.
**Why it happens:** ACTV-03 explicitly requires BOTH: "dashboard feed AND dedicated activity section."
**How to avoid:** Build the `ActivityFeed` as a reusable component. Embed it on the dashboard (truncated, last ~10-20). Create a separate `/activity` route or integrate it as a sidebar item for the full view with filters.
**Warning signs:** ACTV-03 fails verification because there is no way to see the full activity log.

## Code Examples

### ActivityEntry Type Definition

```typescript
// Source: derived from ACTV-02 requirements + project PluginId type
import type { PluginId } from './plugin'

export type ActivityStatus = 'success' | 'failure' | 'pending'

export interface ActivityEntry {
  id: string                    // Unique ID: 'act-{timestamp}-{random}'
  pluginId: PluginId            // Which plugin generated this entry
  operation: string             // Human-readable operation name (e.g., 'PR Review', 'Query Executed')
  status: ActivityStatus        // success, failure, or pending
  durationMs: number | null     // Duration in milliseconds, null if not measured
  timestamp: string             // ISO 8601 timestamp
  detail?: string               // Optional detail message (e.g., error message on failure)
}
```

### Plugin Summary Card

```tsx
// Source: derived from DASH-02 + DASH-03 requirements + existing project patterns
import { useNavigate } from 'react-router-dom'
import type { PluginDefinition } from '../../types/plugin'
import { useActivityStore } from '../../stores/activity-store'

function PluginCard({ plugin }: { plugin: PluginDefinition }): React.JSX.Element {
  const navigate = useNavigate()
  const entries = useActivityStore(s => s.getEntriesByPlugin(plugin.id))
  const recentCount = entries.filter(
    e => Date.now() - new Date(e.timestamp).getTime() < 86400000
  ).length
  const Icon = ICON_MAP[plugin.icon]

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon size={20} className="text-accent" />}
        <h3 className="text-sm font-semibold text-text-primary">{plugin.name}</h3>
      </div>
      <p className="text-xs text-text-secondary mb-4">{plugin.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{recentCount} ops today</span>
        <button
          onClick={() => navigate(plugin.route)}
          className="rounded bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition"
        >
          Open
        </button>
      </div>
    </div>
  )
}
```

### Dashboard Grid Layout

```tsx
// Source: DASH-05 requirement + Tailwind v4 responsive grid
function MissionControl(): React.JSX.Element {
  const { entries, isLoading, loadEntries } = useActivityStore()

  useEffect(() => { loadEntries() }, [loadEntries])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">Mission Control</h1>

      {/* Plugin summary cards -- responsive CSS grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLUGINS.map(plugin => (
          <PluginCard key={plugin.id} plugin={plugin} />
        ))}
      </div>

      {/* Activity feed */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Recent Activity
        </h2>
        <ActivityFeed entries={entries.slice(0, 20)} />
      </div>
    </div>
  )
}
```

### Status Badge Colors Using Theme Tokens

```tsx
// Source: main.css @theme tokens + ACTV-02 status requirement
function StatusBadge({ status }: { status: ActivityStatus }): React.JSX.Element {
  const styles: Record<ActivityStatus, string> = {
    success: 'bg-green-500/10 text-green-400',
    failure: 'bg-red-500/10 text-red-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 with `create<T>()` | Zustand v5 with same `create<T>()` API | v5.0 (2024) | API is identical for basic stores; middleware import paths changed but we don't use middleware |
| Tailwind v3 config-based grid | Tailwind v4 CSS-first grid | v4.0 (2025) | Responsive grid utilities (`grid-cols-*`, `sm:`, `lg:`) work the same; configured via CSS @theme not JS config |
| react-router-dom v6 | react-router-dom v7 | v7.0 (2025) | `<Navigate>`, `<Route>`, `useNavigate()` API unchanged for our use case |

**Deprecated/outdated:**
- Tailwind v3 `tailwind.config.js` -- project already uses v4 CSS-first approach. No config file.
- Zustand middleware (persist, devtools) -- project stores persist manually via IPC. No Zustand persist middleware needed.

## Open Questions

1. **Activity Log Sidebar Icon vs. Sub-Route**
   - What we know: ACTV-03 requires activity viewable from "dashboard feed AND dedicated activity section."
   - What's unclear: Should the dedicated activity section be a separate sidebar icon or a sub-route of the dashboard (e.g., a "View All" link that scrolls/navigates within the dashboard)?
   - Recommendation: Add a dedicated `/activity` route accessible from the dashboard via a "View All" link. Optionally add an `Activity` icon in the sidebar between the dashboard icon and plugin icons. This satisfies ACTV-03 cleanly. The planner can decide the exact approach.

2. **Activity Store Load Timing**
   - What we know: The activity store must be loaded before the dashboard renders entries.
   - What's unclear: Should `loadEntries()` be called in App.tsx (once, at app startup) or in each consuming component?
   - Recommendation: Load in App.tsx alongside settings store initialization -- activity data is small and used across views. This avoids loading flashes on every navigation.

3. **Dashboard Icon in GeneralSettings Default View Dropdown**
   - What we know: GeneralSettings has a "Default View" dropdown populated from PLUGINS. DASH-01 requires Mission Control as default landing.
   - What's unclear: The dropdown currently only shows plugins. It needs to include "Mission Control" as an option.
   - Recommendation: Add a hardcoded "Mission Control" option with value `'dashboard'` before the PLUGINS map in the dropdown options. Update the main-process DEFAULTS to set `general.defaultView: 'dashboard'` instead of `'code-review-bot'`.

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase: `src/renderer/src/stores/agent-store.ts` -- Zustand store pattern with IPC persistence
- Phase 1 codebase: `src/renderer/src/stores/settings-store.ts` -- Settings pipeline pattern
- Phase 1 codebase: `src/renderer/src/App.tsx` -- Existing routing structure
- Phase 1 codebase: `src/renderer/src/components/Sidebar.tsx` -- Icon rail pattern + ICON_MAP
- Phase 1 codebase: `src/renderer/src/assets/main.css` -- Theme tokens for status colors
- Phase 1 codebase: `src/main/settings-store.ts` -- DEFAULTS structure and electron-store usage
- Phase 1 codebase: `package.json` -- All dependencies already installed (zustand 5.0.11, tailwindcss 4.0.12, framer-motion 12.5.0, lucide-react 0.475.0, react-router-dom 7.13.1)

### Secondary (MEDIUM confidence)
- Tailwind CSS v4 docs: Grid utilities (`grid-cols-*`, responsive prefixes) function identically to v3 for layout purposes
- MDN: `Intl.RelativeTimeFormat` -- available in all modern browsers and Electron's V8 engine
- Zustand v5 release notes: No breaking changes to `create()` API for basic stores without middleware

### Tertiary (LOW confidence)
- None. All findings are verified against the existing codebase or well-established web platform APIs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- every library already installed and used in Phase 1; no new dependencies
- Architecture: HIGH -- all patterns directly derived from existing codebase (agent-store, settings-store, App.tsx routing, Sidebar.tsx icons)
- Pitfalls: HIGH -- based on concrete analysis of existing code patterns and known behaviors of electron-store, Zustand, and React Router

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable domain, no fast-moving dependencies)
