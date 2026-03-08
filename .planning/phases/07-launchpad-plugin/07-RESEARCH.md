# Phase 7: Launchpad Plugin - Research

**Researched:** 2026-03-09
**Domain:** Cloud cost estimation, pricing data, PDF generation, AI chat, Electron plugin architecture
**Confidence:** HIGH

---

## Summary

The Launchpad plugin is a self-contained cloud cost estimator inside the existing Zenith Electron app. It requires no external API connections — pricing data will be curated and embedded as static TypeScript modules (the AWS bulk pricing JSON files are hundreds of megabytes unparsed; extracting a curated subset for the most common ~30 services per provider is the only viable offline approach). The calculation engine is pure TypeScript arithmetic with no exotic dependencies.

The AI chat assistant reuses the existing `ai:startAnalysis` IPC channel and `streamAnalysis` infrastructure already proven in DbInspector's AskAI tab. The channel accepts a `systemPrompt` + `userPrompt` pair and streams tokens via `ai:stream:chunk` / `ai:stream:done` / `ai:stream:error` — no new IPC infrastructure needed.

PDF export will use **pdfmake** in the Electron main process (Node.js side) via a new `launchpad:exportPdf` IPC handler. pdfmake supports declarative table-based layouts, works in Node.js natively, and produces a `Buffer` that is written to disk via `dialog.showSaveDialog`.

**Primary recommendation:** Curate static pricing data as TypeScript modules, reuse `ai:startAnalysis` for AI chat, add pdfmake for PDF export in main process, and follow the DbInspector tab-navigation + Zustand store pattern.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LNCH-01 | Provider selection — choose from AWS, GCP, Azure | UI component: ProviderSelector with 3 cards; drives which service catalog is shown |
| LNCH-02 | Service catalog — browse and select services per provider | Static curated catalog per provider; categories: compute, storage, database, networking, serverless |
| LNCH-03 | Resource configurator — instance types, storage sizes, regions, quantities, usage hours | Form-driven per service; config shape differs per service type (compute vs storage vs database) |
| LNCH-04 | Cost calculation engine — monthly and yearly estimates | Pure TS arithmetic: unitPrice * quantity * usageHours * hoursPerMonth; yearly = monthly * 12 |
| LNCH-05 | Estimation summary — itemized breakdown, subtotals, grand total, monthly/yearly toggle | Summary panel with grouped rows, toggle switch, calculated totals |
| LNCH-06 | AI chat assistant — describe needs, AI suggests services/config | Reuses existing `ai:startAnalysis` IPC; AskAI pattern from DbInspector |
| LNCH-07 | AI-driven recalculation — AI suggestions auto-populate estimator | AI returns structured JSON suggestions; planner parses and merges into store |
| LNCH-08 | Report export — PDF with provider, services, configs, costs, AI recommendations | pdfmake in main process; `launchpad:exportPdf` IPC handler + `dialog.showSaveDialog` |
| LNCH-09 | Estimation history — save and reload past estimations | electron-store via `settings:set/get` IPC; max 50 entries; follows review-store pattern |
| LNCH-10 | Multi-provider comparison — side-by-side AWS/GCP/Azure for equivalent services | Comparison tab builds parallel estimates; table layout shows provider columns |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.3 | Launchpad plugin state | Already in project; used by all plugins |
| electron-store (via IPC) | ^10.0.0 | Estimation history persistence | Already in project; proven pattern |
| pdfmake | ^0.3.5 | PDF report generation in main process | Declarative, pure Node.js, no browser required, active development |
| ai (Vercel AI SDK) | ^6.x | AI chat via `streamAnalysis` | Already in project; `ai:startAnalysis` channel proven |
| lucide-react | ^0.475.0 | Icons | Already in project |
| tailwindcss v4 | ^4.x | Styling with @theme tokens | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Static pricing data (TS modules) | N/A | Embedded curated prices | Avoids runtime API calls, works offline, user is audience-of-one |
| @types/pdfmake | latest | TypeScript types for pdfmake | Companion type package for pdfmake |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfmake (main process) | jsPDF (renderer process) | jsPDF has known contextBridge incompatibilities (GitHub issue #743 on jspdf-autotable). pdfmake in main process avoids the bridge entirely |
| pdfmake (main process) | Electron webContents.printToPDF() | printToPDF renders a full HTML page; requires a hidden BrowserWindow; more complex setup for a report with known tabular structure |
| Static pricing data | Infracost Cloud Pricing API | API requires registration + API key; network dependency; overkill for personal tool |
| Static pricing data | AWS Bulk Pricing JSON | Files are 100MB+ per service; impractical to bundle or fetch at runtime |
| Static pricing data | GCP Cloud Billing API | Requires GCP API key; paginated SKU-level data requires normalization work |

**Installation:**
```bash
npm install pdfmake
npm install --save-dev @types/pdfmake
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   └── launchpad/
│       └── pdf-generator.ts       # pdfmake PDF generation, called from IPC handler
├── renderer/src/
│   ├── plugins/
│   │   └── launchpad/
│   │       ├── LaunchpadView.tsx          # Main view, default export for React.lazy()
│   │       ├── ProviderSelector.tsx       # LNCH-01: AWS/GCP/Azure card selector
│   │       ├── ServiceCatalog.tsx         # LNCH-02: browseable service list with categories
│   │       ├── ResourceConfigurator.tsx   # LNCH-03: form for resource-specific config
│   │       ├── EstimationSummary.tsx      # LNCH-05: itemized breakdown, monthly/yearly toggle
│   │       ├── AiAdvisor.tsx             # LNCH-06/07: AI chat panel (reuses AskAI pattern)
│   │       ├── ComparisonView.tsx         # LNCH-10: side-by-side provider comparison
│   │       └── EstimationHistory.tsx      # LNCH-09: saved estimations list
│   ├── data/
│   │   └── cloud-pricing/
│   │       ├── index.ts                   # Re-exports all provider catalogs
│   │       ├── aws.ts                     # AWS curated service catalog + pricing
│   │       ├── gcp.ts                     # GCP curated service catalog + pricing
│   │       └── azure.ts                   # Azure curated service catalog + pricing
│   ├── stores/
│   │   └── launchpad-store.ts             # Zustand store for all Launchpad state
│   └── types/
│       └── launchpad.ts                   # TypeScript types for the plugin
```

### Pattern 1: Zustand Store for Launchpad State
**What:** Central Zustand store manages provider selection, service catalog selections, resource configurations, estimation history, and AI chat session.
**When to use:** All plugin state; follows `db-store.ts` and `review-store.ts` patterns.
**Example:**
```typescript
// Source: project pattern from src/renderer/src/stores/db-store.ts
import { create } from 'zustand'
import type { CloudProvider, ServiceSelection, ResourceConfig, EstimationEntry } from '../types/launchpad'

interface LaunchpadStore {
  provider: CloudProvider | null
  selectedServices: ServiceSelection[]
  resourceConfigs: Record<string, ResourceConfig>
  history: EstimationEntry[]
  aiSession: AiAdvisorSession | null

  setProvider: (provider: CloudProvider) => void
  addService: (service: ServiceSelection) => void
  removeService: (serviceId: string) => void
  updateResourceConfig: (serviceId: string, config: ResourceConfig) => void
  saveEstimation: (name: string) => Promise<void>
  loadHistory: () => Promise<void>
  startAiChat: (question: string) => void
  cancelAiChat: () => void
}

export const useLaunchpadStore = create<LaunchpadStore>()((set, get) => ({
  provider: null,
  selectedServices: [],
  resourceConfigs: {},
  history: [],
  aiSession: null,
  // ... actions
}))
```

### Pattern 2: Static Curated Pricing Data
**What:** TypeScript modules embedding representative pricing for the most commonly estimated services per provider. Data is typed, tree-shakable, and requires zero network calls.
**When to use:** All cost calculations; pricing from AWS/GCP/Azure public pricing pages as of early 2026.
**Example:**
```typescript
// Source: curated from https://aws.amazon.com/ec2/pricing/on-demand/ (2025 us-east-1)
// src/renderer/src/data/cloud-pricing/aws.ts

export const AWS_CATALOG: ProviderCatalog = {
  provider: 'aws',
  categories: [
    {
      id: 'compute',
      name: 'Compute',
      services: [
        {
          id: 'ec2',
          name: 'EC2',
          description: 'Virtual machines',
          configSchema: {
            instanceType: {
              type: 'select',
              options: [
                { label: 't3.micro  (2 vCPU, 1 GB RAM)',  value: 't3.micro',  pricePerHour: 0.0104  },
                { label: 't3.small  (2 vCPU, 2 GB RAM)',  value: 't3.small',  pricePerHour: 0.0208  },
                { label: 't3.medium (2 vCPU, 4 GB RAM)',  value: 't3.medium', pricePerHour: 0.0416  },
                { label: 't3.large  (2 vCPU, 8 GB RAM)',  value: 't3.large',  pricePerHour: 0.0832  },
                { label: 'm5.large  (2 vCPU, 8 GB RAM)',  value: 'm5.large',  pricePerHour: 0.096   },
                { label: 'm5.xlarge (4 vCPU, 16 GB RAM)', value: 'm5.xlarge', pricePerHour: 0.192   },
                { label: 'c5.large  (2 vCPU, 4 GB RAM)',  value: 'c5.large',  pricePerHour: 0.085   },
                { label: 'c5.xlarge (4 vCPU, 8 GB RAM)',  value: 'c5.xlarge', pricePerHour: 0.17    },
              ]
            },
            quantity: { type: 'number', default: 1, min: 1 },
            usageHoursPerMonth: { type: 'number', default: 730, min: 1, max: 744 },
            region: { type: 'select', options: AWS_REGIONS }
          }
        },
        {
          id: 'lambda',
          name: 'Lambda',
          description: 'Serverless functions',
          configSchema: {
            requests: { type: 'number', label: 'Requests per month (millions)', default: 1 },
            durationGbSeconds: { type: 'number', label: 'Avg GB-seconds per request', default: 0.2 },
            // Lambda pricing: $0.20 per 1M requests + $0.00005001 per GB-second
          }
        }
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      services: [
        {
          id: 's3',
          name: 'S3',
          description: 'Object storage',
          configSchema: {
            storageGb: { type: 'number', label: 'Storage (GB)', default: 100 },
            transferOutGb: { type: 'number', label: 'Data transfer out (GB/month)', default: 10 }
            // S3 Standard: $0.023/GB storage, $0.09/GB transfer out (first 10 TB)
          }
        }
      ]
    }
  ]
}
```

### Pattern 3: Cost Calculation Engine
**What:** Pure TypeScript functions that take a `ResourceConfig` and return monthly/yearly cost estimates. No library — just arithmetic.
**When to use:** LNCH-04; called reactively as user modifies configuration.
**Example:**
```typescript
// src/renderer/src/data/cloud-pricing/calculator.ts

export function calculateServiceCost(
  serviceId: string,
  config: ResourceConfig,
  catalog: ProviderCatalog
): ServiceCostResult {
  const service = findService(catalog, serviceId)
  if (!service) return { monthly: 0, yearly: 0, breakdown: [] }

  switch (serviceId) {
    case 'ec2': {
      const pricePerHour = config.instanceType.pricePerHour
      const monthly = pricePerHour * config.usageHoursPerMonth * config.quantity
      return { monthly, yearly: monthly * 12, breakdown: [
        { label: `${config.quantity}x ${config.instanceType.value}`, unitPrice: pricePerHour, monthly }
      ]}
    }
    case 's3': {
      const storageCost = config.storageGb * 0.023
      const transferCost = config.transferOutGb * 0.09
      const monthly = storageCost + transferCost
      return { monthly, yearly: monthly * 12, breakdown: [
        { label: 'Storage', unitPrice: 0.023, monthly: storageCost },
        { label: 'Transfer out', unitPrice: 0.09, monthly: transferCost }
      ]}
    }
    // ... other services
  }
}
```

### Pattern 4: AI Chat with Structured Suggestion Response
**What:** AI advisor uses `ai:startAnalysis` channel with a system prompt that instructs the AI to output structured JSON configuration suggestions alongside human-readable text. The store parses the JSON block and merges it into `resourceConfigs`.
**When to use:** LNCH-06 and LNCH-07.
**Example:**
```typescript
// Reuses existing IPC channel — no new main process code needed
// Source: src/main/ipc-handlers.ts  ai:startAnalysis handler

const LAUNCHPAD_AI_SYSTEM_PROMPT = `You are a cloud infrastructure cost advisor.
When asked about infrastructure needs, suggest specific services and configurations.

When you have concrete suggestions, include a JSON block:
\`\`\`suggestions
{
  "provider": "aws",
  "services": [
    { "serviceId": "ec2", "config": { "instanceType": "t3.medium", "quantity": 2, "usageHoursPerMonth": 730 } },
    { "serviceId": "s3", "config": { "storageGb": 500, "transferOutGb": 100 } }
  ]
}
\`\`\`

Always explain your reasoning before the JSON block.`

// In the store's startAiChat action:
const sessionId = crypto.randomUUID()
await window.api.ai.startAnalysis(
  agent.id,
  agent.model,
  LAUNCHPAD_AI_SYSTEM_PROMPT,
  userQuestion,
  sessionId,
  agent.command
)
// Stream listeners update aiSession.rawText; on done, parse suggestions block
```

### Pattern 5: PDF Generation in Main Process
**What:** pdfmake generates a declarative PDF buffer in the Electron main process. A new IPC handler `launchpad:exportPdf` accepts the estimation data, builds the doc definition, and calls `dialog.showSaveDialog` to write the file.
**When to use:** LNCH-08.
**Example:**
```typescript
// Source: pdfmake docs https://pdfmake.github.io/docs/0.1/ + Electron dialog API
// src/main/launchpad/pdf-generator.ts

import PdfPrinter from 'pdfmake'
import { dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
}

export async function exportEstimationPdf(
  win: BrowserWindow,
  estimation: EstimationExport
): Promise<string | null> {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Estimation Report',
    defaultPath: path.join(app.getPath('downloads'), `${estimation.name}-estimate.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (!filePath) return null

  const printer = new PdfPrinter(fonts)
  const docDefinition = buildDocDefinition(estimation)
  const pdfDoc = printer.createPdfKitDocument(docDefinition)

  await new Promise<void>((resolve, reject) => {
    pdfDoc.pipe(fs.createWriteStream(filePath))
    pdfDoc.on('end', resolve)
    pdfDoc.on('error', reject)
    pdfDoc.end()
  })
  return filePath
}

function buildDocDefinition(est: EstimationExport): object {
  return {
    defaultStyle: { font: 'Helvetica' },
    content: [
      { text: 'Cloud Cost Estimation Report', style: 'title' },
      { text: `Provider: ${est.provider.toUpperCase()}`, style: 'subtitle' },
      { text: `Generated: ${new Date().toLocaleDateString()}` },
      '\n',
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            ['Service', 'Configuration', 'Monthly', 'Yearly'],
            ...est.lineItems.map(item => [
              item.serviceName,
              item.configSummary,
              `$${item.monthly.toFixed(2)}`,
              `$${item.yearly.toFixed(2)}`
            ]),
            [{ text: 'TOTAL', bold: true }, '', `$${est.totalMonthly.toFixed(2)}`, `$${est.totalYearly.toFixed(2)}`]
          ]
        },
        layout: 'lightHorizontalLines'
      },
      '\n',
      // AI recommendations section (if any)
      ...(est.aiRecommendations ? [
        { text: 'AI Recommendations', style: 'subtitle' },
        { text: est.aiRecommendations }
      ] : [])
    ],
    styles: {
      title: { fontSize: 20, bold: true, margin: [0, 0, 0, 8] },
      subtitle: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] }
    }
  }
}
```

### Pattern 6: Estimation History (following review-store pattern)
**What:** Save/reload estimations via `settings:set/get` IPC. Max 50 entries, capped like review history.
**When to use:** LNCH-09.
```typescript
// Source: pattern from src/renderer/src/stores/review-store.ts (history persistence)
const HISTORY_STORAGE_KEY = 'launchpad.estimationHistory'
const MAX_HISTORY_ENTRIES = 50

// In store saveEstimation action:
const history = get().history
const entry: EstimationEntry = {
  id: crypto.randomUUID(),
  name,
  provider: get().provider!,
  savedAt: new Date().toISOString(),
  snapshot: buildSnapshot(get().selectedServices, get().resourceConfigs)
}
const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES)
set({ history: updated })
await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
```

### Pattern 7: Tab Navigation (following CodeReviewBot pattern)
**What:** Local `useState<Tab>` for tab switching. Tabs: Estimator | AI Advisor | History | Compare.
**When to use:** LNCH-01 through LNCH-10 are all within the same plugin view.
```typescript
// Source: pattern from src/renderer/src/plugins/code-review-bot/CodeReviewBotView.tsx
type Tab = 'estimator' | 'ai-advisor' | 'history' | 'compare'
const [activeTab, setActiveTab] = useState<Tab>('estimator')
```

### Anti-Patterns to Avoid
- **Live pricing API calls at runtime:** AWS bulk pricing JSON is hundreds of megabytes; GCP/Azure APIs require auth keys. Use curated static data instead.
- **jsPDF in renderer with contextBridge:** Known incompatibility with jspdf-autotable (GitHub issue #743). Use pdfmake in main process.
- **Parsing AI suggestions in the streaming chunk handler:** Wait for `ai:stream:done` before parsing the full `rawText` for the JSON suggestions block, not per-chunk.
- **Storing full pricing catalogs in electron-store:** Catalog data is code (TypeScript modules), not user data. Only store user estimations in electron-store.
- **Embedding region pricing multipliers as hardcoded magic numbers:** Put them in the catalog module as named constants for clarity.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table layout | Custom HTML-to-PDF or canvas drawing | pdfmake declarative tables | Handles column widths, header repeat on page break, borders, totals row |
| Save file dialog | Custom HTML file picker | `dialog.showSaveDialog` (Electron built-in) | Native OS dialog; handles overwite confirmation, extension filtering |
| AI streaming | New streaming infrastructure | `ai:startAnalysis` + existing IPC channels | Proven in DbInspector; handles SDK + CLI agents, abort, token counting |
| State management | Local React useState for all plugin state | Zustand `useLaunchpadStore` | Enables tab-independent state persistence, history loading on mount |
| Settings persistence | localStorage / IndexedDB | `settings:set/get` IPC via electron-store | Project pattern; consistent with all other plugins |

**Key insight:** This plugin is primarily a UI/data problem (forms + calculations + display). The hard parts (AI streaming, PDF dialogs, persistence) are all already solved in the project infrastructure.

---

## Common Pitfalls

### Pitfall 1: AWS Bulk Pricing JSON Size
**What goes wrong:** Attempting to fetch `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json` at runtime — the file is ~300-600MB uncompressed.
**Why it happens:** Developer assumes live pricing = accurate pricing. For a personal estimator tool, curated approximate pricing is far more practical.
**How to avoid:** Embed curated pricing as TypeScript constants. Mark price constants with a comment `// As of 2026-01, source: aws.amazon.com/ec2/pricing/on-demand/` so it's clear when to update.
**Warning signs:** `fetch()` calls to AWS pricing endpoints in the renderer or main process.

### Pitfall 2: pdfmake contextBridge Incompatibility
**What goes wrong:** If pdfmake is imported in the renderer process and the PDF download is attempted via contextBridge, the library tries to access the DOM in ways that break in Electron's sandboxed renderer.
**Why it happens:** pdfmake's browser build uses Blob URLs and anchor-click download patterns that require direct DOM access.
**How to avoid:** Always run pdfmake in the main process. Send serializable estimation data from renderer → main via IPC, generate PDF in main, write to disk with `dialog.showSaveDialog`.
**Warning signs:** `import pdfmake from 'pdfmake/build/pdfmake'` in renderer files.

### Pitfall 3: AI JSON Suggestions Parsing Fragility
**What goes wrong:** AI returns suggestions JSON block in different formats or without the fence, breaking the parser and silently not populating the estimator.
**Why it happens:** LLMs are non-deterministic; they don't always follow the exact output format.
**How to avoid:** Wrap the suggestions parser in try/catch. If parsing fails, treat the response as informational text only (AI chat still works, just no auto-populate). Use a lenient JSON extraction regex that finds any `{...}` block between code fences.
**Warning signs:** Unguarded `JSON.parse()` on AI output.

### Pitfall 4: Monthly Hours Magic Number
**What goes wrong:** Different services use different conventions for "hours per month" (720 vs 730 vs 744). Inconsistent values cause calculation mismatches in the comparison view.
**Why it happens:** Calendar months have 28-31 days. AWS uses 730 hours/month as their standard assumption.
**How to avoid:** Define `const HOURS_PER_MONTH = 730` as a single shared constant in the calculator module.
**Warning signs:** Hardcoded `* 720` or `* 744` in calculation code.

### Pitfall 5: Plugin Type Registration
**What goes wrong:** Adding the 'launchpad' PluginId to the PLUGINS array but forgetting to add it to the `PluginId` union type in `src/renderer/src/types/plugin.ts`.
**Why it happens:** Two separate places to update: the `PluginId` type and the PLUGINS array.
**How to avoid:** Update `plugin.ts` type first, then `registry.ts`. TypeScript will catch mismatches.
**Warning signs:** TypeScript error `Type '"launchpad"' is not assignable to type 'PluginId'`.

### Pitfall 6: Comparison View Data Synchronization
**What goes wrong:** The comparison view (LNCH-10) tries to show equivalent pricing across all three providers, but the user has only configured one provider's services. Result is empty/confusing columns.
**Why it happens:** LNCH-10 implies building three parallel estimations, but the user workflow is single-provider focused.
**How to avoid:** The comparison view uses the current provider's selected services as a template, then maps each service to equivalent services in the other two providers using a pre-defined equivalence map (e.g., AWS EC2 → GCP Compute Engine → Azure VM). The comparison auto-populates with default configurations.
**Warning signs:** Requiring the user to configure all three providers separately before comparison works.

---

## Code Examples

Verified patterns from project source and official docs:

### IPC Handler for PDF Export (main process)
```typescript
// Source: pattern from src/main/ipc-handlers.ts + pdfmake docs
// Add to registerIpcHandlers() in ipc-handlers.ts

ipcMain.handle('launchpad:exportPdf', async (_event, estimation: EstimationExport) => {
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!mainWindow) throw new Error('No window available')
  const filePath = await exportEstimationPdf(mainWindow, estimation)
  return { filePath }
})
```

### Preload Bridge Extension
```typescript
// Source: src/preload/index.ts — add launchpad namespace alongside existing namespaces
launchpad: {
  exportPdf: (estimation: EstimationExport): Promise<{ filePath: string | null }> =>
    ipcRenderer.invoke('launchpad:exportPdf', estimation),
},
```

### AI Session Stream Listener Pattern (renderer store)
```typescript
// Source: pattern from src/renderer/src/stores/db-store.ts startAiSession action
const sessionId = crypto.randomUUID()
set({ aiSession: { sessionId, status: 'streaming', rawText: '', question } })

window.api.ai.removeStreamListeners()
window.api.ai.onStreamChunk(({ sessionId: id, chunk }) => {
  if (id !== sessionId) return
  set((s) => ({
    aiSession: s.aiSession
      ? { ...s.aiSession, rawText: (s.aiSession.rawText ?? '') + chunk }
      : null
  }))
})
window.api.ai.onStreamDone(({ sessionId: id }) => {
  if (id !== sessionId) return
  const rawText = get().aiSession?.rawText ?? ''
  const suggestions = parseSuggestions(rawText) // safe try/catch
  set((s) => ({
    aiSession: s.aiSession
      ? { ...s.aiSession, status: 'complete' }
      : null,
    pendingSuggestions: suggestions ?? null
  }))
  window.api.ai.removeStreamListeners()
})
```

### Service Equivalence Map for Comparison View
```typescript
// src/renderer/src/data/cloud-pricing/equivalences.ts
export const SERVICE_EQUIVALENCES: Record<string, Record<CloudProvider, string>> = {
  'ec2':      { aws: 'ec2',      gcp: 'compute-engine', azure: 'azure-vm' },
  's3':       { aws: 's3',       gcp: 'cloud-storage',  azure: 'blob-storage' },
  'rds':      { aws: 'rds',      gcp: 'cloud-sql',      azure: 'azure-sql' },
  'lambda':   { aws: 'lambda',   gcp: 'cloud-functions', azure: 'azure-functions' },
  'dynamodb': { aws: 'dynamodb', gcp: 'firestore',      azure: 'cosmos-db' },
}
```

### Curated Provider Coverage (minimum viable catalog)
For each provider, implement these service categories at minimum:

**AWS:**
- Compute: EC2 (t3, m5, c5, r5 families), Lambda
- Storage: S3 Standard, EBS (gp3)
- Database: RDS MySQL/Postgres (db.t3, db.m5), DynamoDB
- Networking: Data Transfer out, CloudFront
- Serverless: Lambda, API Gateway

**GCP (approximate equivalents):**
- Compute: Compute Engine (n2-standard, e2-standard, c2-standard)
- Storage: Cloud Storage (Standard), Persistent Disk (pd-balanced)
- Database: Cloud SQL (MySQL/Postgres), Firestore
- Networking: Data Transfer out, Cloud CDN
- Serverless: Cloud Functions, Cloud Run

**Azure (approximate equivalents):**
- Compute: Azure VM (Dsv3, Bsv2 series), Azure Functions
- Storage: Blob Storage (Hot tier), Managed Disks (Premium SSD)
- Database: Azure SQL Database, Cosmos DB
- Networking: Data Transfer out, Azure CDN
- Serverless: Azure Functions, App Service

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsPDF for Electron PDF | pdfmake in main process | Ongoing — jsPDF contextBridge issue (#743) | Avoids renderer/bridge PDF incompatibilities |
| Dynamic live pricing APIs | Curated static data for personal/offline tools | N/A — design choice | Zero network deps, instant, always works |
| Separate AI infrastructure per plugin | Shared `ai:startAnalysis` IPC | Phase 4 (DbInspector) | All plugins reuse same streaming channel |
| Router-based plugin tabs | Local `useState<Tab>` | Phase 3 (CodeReviewBot) | Simpler; no URL pollution |
| Manual history cleanup | MAX_ENTRIES cap constant | Phase 2 (Activity Log) | Prevents unbounded electron-store growth |

**Deprecated/outdated:**
- jsPDF AutoTable in Electron renderer: Known contextBridge bug, avoid in this project.
- Dynamic cloud pricing API fetching for a single-user offline tool: impractical file sizes and auth requirements.

---

## Open Questions

1. **Pricing data freshness**
   - What we know: Static prices will drift over time as providers adjust rates.
   - What's unclear: How often to update. Cloud pricing changes infrequently (1-2x/year for major services).
   - Recommendation: Add a comment to each price constant with the source URL and date. Accept occasional staleness — this is a personal estimation tool, not a billing calculator.

2. **pdfmake font embedding**
   - What we know: pdfmake supports built-in PDF fonts (Helvetica, Times, Courier) that require no external files. Custom fonts need embedded base64 or file references.
   - What's unclear: Whether the project's JetBrains Mono should appear in the PDF.
   - Recommendation: Use built-in Helvetica for the PDF report. No custom font embedding needed — report readability over brand consistency.

3. **Comparison view configuration strategy**
   - What we know: LNCH-10 requires side-by-side provider comparison. The user configures one provider.
   - What's unclear: Should comparison use default configs or user-specified configs for all three providers?
   - Recommendation: Auto-map the current provider's configuration to equivalent services in other providers using default comparable configs. User can view but not deeply configure the comparison columns — the comparison is informational, not a second estimator.

4. **AI suggestions auto-populate UX**
   - What we know: LNCH-07 requires AI suggestions to auto-populate the estimator.
   - What's unclear: Should it replace or merge with existing selections?
   - Recommendation: Show a "Apply AI Suggestions" button after the AI response when suggestions are parsed. Never auto-apply silently — preserve user agency. If the user clicks Apply, it replaces the current selection with the AI suggestion set.

---

## Curated Pricing Reference Data

Representative on-demand pricing (us-east-1 / us-central1 / East US) as of early 2026:

### AWS
| Service | Unit | Price |
|---------|------|-------|
| EC2 t3.micro | /hour | $0.0104 |
| EC2 t3.small | /hour | $0.0208 |
| EC2 t3.medium | /hour | $0.0416 |
| EC2 t3.large | /hour | $0.0832 |
| EC2 m5.large | /hour | $0.096 |
| EC2 m5.xlarge | /hour | $0.192 |
| EC2 c5.large | /hour | $0.085 |
| S3 Standard storage | /GB/month | $0.023 |
| S3 data transfer out | /GB | $0.09 (first 10TB) |
| RDS db.t3.micro | /hour | $0.017 |
| RDS db.t3.small | /hour | $0.034 |
| RDS db.m5.large | /hour | $0.171 |
| Lambda requests | /1M req | $0.20 |
| Lambda duration | /GB-second | $0.0000166667 |
| EBS gp3 | /GB/month | $0.08 |
| CloudFront data | /GB (first 10TB) | $0.085 |
| DynamoDB read | /million RCU | $0.25 |
| DynamoDB write | /million WCU | $1.25 |

### GCP (approximate)
| Service | Unit | Price |
|---------|------|-------|
| n2-standard-2 (2 vCPU, 8GB) | /hour | $0.097 |
| n2-standard-4 (4 vCPU, 16GB) | /hour | $0.194 |
| e2-standard-2 (2 vCPU, 8GB) | /hour | $0.067 |
| Cloud Storage Standard | /GB/month | $0.020 |
| Cloud Storage network egress | /GB | $0.08 (up to 1TB) |
| Cloud SQL db-n1-standard-1 | /hour | $0.105 |
| Cloud Functions (invocations) | /million | $0.40 |
| Persistent Disk (SSD) | /GB/month | $0.17 |

### Azure (approximate)
| Service | Unit | Price |
|---------|------|-------|
| B2s VM (2 vCPU, 4GB) | /hour | $0.042 |
| D2s v3 VM (2 vCPU, 8GB) | /hour | $0.096 |
| D4s v3 VM (4 vCPU, 16GB) | /hour | $0.192 |
| Blob Storage Hot | /GB/month | $0.018 |
| Blob Storage data egress | /GB | $0.087 (first 10TB) |
| Azure SQL S1 | /month | $30 (10 DTU) |
| Azure Functions (exec time) | /GB-second | $0.000016 |
| Premium SSD Managed Disk (P10) | /month | $19.71 |

---

## Sources

### Primary (HIGH confidence)
- Project source: `src/main/ipc-handlers.ts` — `ai:startAnalysis` channel, existing patterns
- Project source: `src/preload/index.ts` — bridge extension pattern
- Project source: `src/renderer/src/stores/db-store.ts` — Zustand store pattern for plugins with AI
- Project source: `src/renderer/src/plugins/db-inspector/AskAI.tsx` — AI chat component pattern
- pdfmake docs: https://pdfmake.github.io/docs/0.1/ — declarative table API, Node.js support
- pdfbolt pdfmake guide: https://pdfbolt.com/blog/generate-pdf-pdfmake-nodejs — Node.js createPdfKitDocument + pipe pattern

### Secondary (MEDIUM confidence)
- AWS EC2 pricing page: https://aws.amazon.com/ec2/pricing/on-demand/ — verified on-demand us-east-1 rates
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/ — request + duration pricing
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/ — storage + transfer out rates
- Electron dialog docs: https://www.electronjs.org/docs/latest/api/dialog — showSaveDialog API
- jsPDF-AutoTable contextBridge issue: https://github.com/simonbengtsson/jsPDF-AutoTable/issues/743 — confirms jsPDF renderer incompatibility

### Tertiary (LOW confidence — use as approximate starting point)
- GCP Compute Engine pricing: https://discuss.google.dev/t/pricing-compute-engine-virtual-machines-gcp/48742 — rates need verification against current https://cloud.google.com/compute/vm-instance-pricing
- Azure VM pricing: https://azure.microsoft.com/pricing/calculator — approximate rates need verification
- Infracost Cloud Pricing API: https://www.infracost.io/blog/cloud-pricing-api/ — alternative if live pricing ever needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries are already in the project; only pdfmake is new, verified from official docs
- Architecture: HIGH — follows established project patterns (db-store, CodeReviewBot tabs, review-store history)
- Curated pricing data: MEDIUM — representative rates verified from AWS official pages; GCP/Azure are approximate and should be verified before finalizing catalog
- PDF generation pattern: HIGH — pdfmake Node.js API verified from official docs and examples
- AI chat integration: HIGH — reuses proven `ai:startAnalysis` channel with no new infrastructure

**Research date:** 2026-03-09
**Valid until:** 2026-09-09 (stable ecosystem; pricing data should be reverified before 2027)
