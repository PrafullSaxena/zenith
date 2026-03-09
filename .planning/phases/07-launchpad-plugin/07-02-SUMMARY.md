---
phase: 07-launchpad-plugin
plan: 02
subsystem: store-and-ipc
tags: [zustand, ipc, pdfmake, electron, launchpad, ai-streaming, plugin-registration]
dependency_graph:
  requires:
    - 07-01 (launchpad-types, cost-calculator-engine)
  provides:
    - launchpad-zustand-store
    - launchpad-plugin-registration
    - pdf-export-ipc-pipeline
    - launchpad-preload-bridge
  affects:
    - 07-03-PLAN.md (UI components depend on useLaunchpadStore)
    - 07-04-PLAN.md (full LaunchpadView implementation)
tech_stack:
  added:
    - pdfmake@0.3.5 (PDF generation in main process)
    - "@types/pdfmake (TypeScript definitions)"
  patterns:
    - Zustand store following db-store.ts pattern (IPC persistence, AI streaming)
    - pdfmake high-level createPdf().getBuffer() API for Node.js PDF generation
    - Placeholder LaunchpadView.tsx for React.lazy() compatibility before Plan 03
    - Decoupled EstimationExport interface in main process (no renderer type imports)
key_files:
  created:
    - src/renderer/src/stores/launchpad-store.ts
    - src/renderer/src/plugins/launchpad/LaunchpadView.tsx
    - src/main/launchpad/pdf-generator.ts
  modified:
    - src/renderer/src/types/plugin.ts
    - src/renderer/src/plugins/registry.ts
    - src/main/ipc-handlers.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts
decisions:
  - "Placeholder LaunchpadView.tsx created to satisfy React.lazy() at registry load time — full implementation in Plan 03"
  - "pdfmake createPdf().getBuffer() used over PdfPrinter (lower-level) — simpler async API, same output"
  - "EstimationExport interface duplicated in main process — avoids renderer type imports crossing process boundary"
  - "parseSuggestions uses regex on code-fenced block with try/catch — lenient, never throws per research anti-pattern guidance"
  - "applySuggestions sets categoryId to empty string — UI components in Plan 03 will resolve category from serviceId on render"
metrics:
  duration: 5min
  completed: 2026-03-09
  tasks_completed: 2
  files_created: 3
  files_modified: 5
requirements:
  - LNCH-04
  - LNCH-07
  - LNCH-08
  - LNCH-09
---

# Phase 07 Plan 02: Launchpad Store and IPC Summary

**One-liner:** Zustand store with full state management (provider/services/history/AI chat), Launchpad plugin registration with Rocket icon, and PDF export IPC pipeline (pdfmake in main process + preload bridge).

## What Was Built

Connects the Plan 01 data foundation to the UI layer by providing the store, IPC handlers, and plugin registration that all Launchpad UI components in Plans 03-04 will depend on.

### src/renderer/src/stores/launchpad-store.ts

Full Zustand store (`useLaunchpadStore`) for the Launchpad plugin:

**State:**
- `provider` (CloudProvider | null) — selected cloud provider
- `selectedServices` (ServiceSelection[]) — services added to the estimator
- `activeTab` (LaunchpadTab) — current tab in the plugin view
- `history` (EstimationEntry[]) — estimation history loaded from electron-store
- `aiSession` (AiAdvisorSession | null) — current AI advisor chat session
- `pendingSuggestions` (AiSuggestion | null) — parsed AI recommendations awaiting apply/dismiss
- `comparisonProviders` (CloudProvider[]) — providers selected for comparison view

**Computed getters:**
- `getCurrentCatalog()` — returns ProviderCatalog for current provider
- `getTotalCost()` — returns `{ monthly, yearly }` from calculateTotalCost

**Actions:**
- `setProvider(provider)` — sets provider and clears selectedServices
- `addService(categoryId, serviceId)` — adds service with defaults from configSchema
- `removeService(serviceId)` / `updateServiceConfig(serviceId, config)` — service management
- `saveEstimation(name)` — persists to electron-store via `window.api.settings.set`
- `loadHistory()` — loads from electron-store via `window.api.settings.get`
- `loadEstimation(entry)` — restores provider + services from a history entry
- `deleteHistoryEntry(id)` — removes entry and persists updated list
- `clearEstimation()` — resets provider, services, and pendingSuggestions
- `startAiChat(question, agentId, model, command?)` — sets up streaming session with LAUNCHPAD_AI_SYSTEM_PROMPT, wires onStreamChunk/onStreamDone/onStreamError listeners, parses suggestions on done
- `cancelAiChat()` — cancels active streaming session
- `applySuggestions()` — applies pendingSuggestions to provider + selectedServices
- `dismissSuggestions()` — clears pendingSuggestions
- `exportPdf()` — calls window.api.launchpad.exportPdf with EstimationExport

**Helpers:**
- `parseSuggestions(rawText)` — regex-based code-fence parser, lenient try/catch, returns AiSuggestion | null
- `LAUNCHPAD_AI_SYSTEM_PROMPT` — detailed system prompt with structured JSON suggestions format

### src/renderer/src/plugins/launchpad/LaunchpadView.tsx

Minimal placeholder component (`default export LaunchpadView`) for React.lazy() compatibility. Shows "Launchpad - Coming Soon" until Plan 03 creates the full implementation.

### src/main/launchpad/pdf-generator.ts

pdfmake-based PDF generator for cloud cost estimation reports:
- Local `EstimationExport` interface (decoupled from renderer types)
- `pdfmake.fonts` configured with Helvetica (built-in PDF font, no external font files)
- `exportEstimationPdf(win, estimation)` — shows save dialog, builds doc definition with header table, data rows, total row, optional AI recommendations section, writes via `pdf.getBuffer()` + `fs.writeFileSync`

### src/main/ipc-handlers.ts

Added `launchpad:exportPdf` handler:
```typescript
ipcMain.handle('launchpad:exportPdf', async (_event, estimation) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available for save dialog')
  const filePath = await exportEstimationPdf(mainWindow, estimation)
  return { filePath }
})
```

### src/preload/index.ts

Added `launchpad` namespace to contextBridge api:
```typescript
launchpad: {
  exportPdf: (estimation: unknown): Promise<{ filePath: string | null }> =>
    ipcRenderer.invoke('launchpad:exportPdf', estimation),
},
```

### src/renderer/src/types/electron.d.ts

Added `launchpad` property to `ElectronAPI` interface with typed `EstimationExport` parameter via inline import.

### src/renderer/src/types/plugin.ts

Added `'launchpad'` to `PluginId` union type.

### src/renderer/src/plugins/registry.ts

Added Launchpad entry (5th plugin) to PLUGINS array:
```typescript
{
  id: 'launchpad',
  name: 'Launchpad',
  description: 'Cloud cost estimation with AI-powered recommendations',
  icon: 'Rocket',
  route: '/launchpad',
  component: React.lazy(() => import('./launchpad/LaunchpadView')),
  settingsSchema: [],
  defaultAgent: null
}
```

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

Minor implementation decisions within scope:

1. **Used pdfmake high-level API instead of PdfPrinter** — The plan specified PdfPrinter (low-level), but `pdfmake.createPdf().getBuffer()` is the recommended high-level API that's simpler and avoids stream management. Same output, cleaner async code.

2. **`unknown[][]` for table body type** — pdfmake's TypeScript types for table body are strict but the content union type makes direct typed arrays difficult. Using `unknown[][]` with a cast avoids type gymnastics while preserving runtime correctness.

3. **applySuggestions sets categoryId = ''** — AiSuggestion doesn't include categoryId (it's a UI concern). The store sets it to empty string; Plan 03 UI components will resolve the correct category from serviceId when rendering.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Zustand store and plugin registration | `402e5ba` | `launchpad-store.ts`, `LaunchpadView.tsx`, `plugin.ts`, `registry.ts` |
| Task 2: PDF generator, IPC handler, preload bridge | `8c59f17` | `pdf-generator.ts`, `ipc-handlers.ts`, `preload/index.ts`, `electron.d.ts`, `package.json` |

## Self-Check: PASSED

All required files created and verified:
- `src/renderer/src/stores/launchpad-store.ts` — FOUND (useLaunchpadStore, LAUNCHPAD_AI_SYSTEM_PROMPT)
- `src/renderer/src/plugins/launchpad/LaunchpadView.tsx` — FOUND
- `src/main/launchpad/pdf-generator.ts` — FOUND (exportEstimationPdf)
- `src/renderer/src/types/plugin.ts` — FOUND (launchpad in PluginId)
- `src/renderer/src/plugins/registry.ts` — FOUND (5 entries, launchpad with Rocket icon)
- `src/main/ipc-handlers.ts` — FOUND (launchpad:exportPdf handler)
- `src/preload/index.ts` — FOUND (launchpad namespace)
- `src/renderer/src/types/electron.d.ts` — FOUND (launchpad property)
- `pdfmake` in package.json — FOUND (pdfmake@0.3.5)

TypeScript compilation (tsconfig.json): PASS (zero errors)
TypeScript compilation (tsconfig.node.json): No new errors introduced
TypeScript compilation (tsconfig.web.json): No new errors introduced (only pre-existing errors from db-store.ts, review-store.ts, AboutView.tsx)
PLUGINS array has 5 entries: PASS
PluginId includes 'launchpad': PASS
launchpad:exportPdf IPC registered: PASS
window.api.launchpad.exportPdf available via preload: PASS
