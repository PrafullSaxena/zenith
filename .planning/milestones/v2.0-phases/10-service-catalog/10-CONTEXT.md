# Phase 10: Service Catalog - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Display ~100 cloud services across 8 categories (AWS/Azure/GCP) served from the DB, with filter chips for category navigation, instant text search, virtualized rendering for smooth scrolling, and cross-provider equivalence mapping in ComparisonView. Service selection behavior (adding to estimation) is already wired — this phase upgrades the presentation and data source.

</domain>

<decisions>
## Implementation Decisions

### Service list layout
- Compact list rows — not cards or grid
- Each row shows: service icon/logo, service name, category tag (small badge like "Compute", "Storage")
- No price hint on the service row
- Selection affordance: full row tinted background + checkmark on the right (not a checkbox on the left)
- Selected services stay in their original list position — no floating to top

### Category navigation
- Horizontal filter chips above the list (e.g., All · Compute · Storage · Database · Networking ...)
- Default state is "All" — shows all services for the selected provider
- When a category chip is active, list is flat (no section headers — chip provides the context)
- No count badges on category chips — clean chips without numbers

### Search behavior
- Search box sits above the category chips (topmost element in the catalog panel)
- Active search overrides any active category chip — results are provider-scoped, flat list, no category grouping
- Empty state: plain text message — e.g., `No services match "xyz"`
- Search operates within the currently-selected provider only (not cross-provider)

### Cross-provider equivalences (ComparisonView)
- Table layout — one row per service family (e.g., "Virtual Machines | EC2 | Compute Engine | Azure VMs")
- Show partial matches (2 of 3 providers) — leave third provider cell as "—" or "N/A"
- Table is read-only — no navigation on click, purely informational
- Sorted alphabetically by service family name

### Claude's Discretion
- Exact icon assets / fallback for services without icons
- Animation/transition when switching categories or clearing search
- Sticky header behavior (search + chips) while scrolling the list
- Virtualization implementation details (@tanstack/react-virtual already in project)

</decisions>

<specifics>
## Specific Ideas

- The catalog should feel like a clean service picker — scannable, not a feature showcase
- Row highlight selection (no checkbox) keeps the list looking less form-like and more like a modern list UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-service-catalog*
*Context gathered: 2026-03-31*
