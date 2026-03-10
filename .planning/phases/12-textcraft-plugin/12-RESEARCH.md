# Phase 12: TextCraft Plugin - Research

**Researched:** 2026-03-11
**Domain:** AI-powered text refinement plugin for Electron/React app (Zenith)
**Confidence:** HIGH

## Summary

TextCraft is an AI-powered text refinement plugin for the Zenith desktop app. It follows the established plugin architecture: a `PluginDefinition` in the compiled-in registry, a Zustand store for state management, AI streaming via the existing `ai:startAnalysis` IPC channel, and a React component lazy-loaded via `React.lazy()`. The three-panel layout (input / options / output) maps cleanly to the existing flexbox patterns used in Launchpad's three-column estimator layout.

The project already has all the infrastructure this plugin needs: Vercel AI SDK v6 for streaming (`streamAnalysis`), session-scoped IPC listeners (`onStreamChunk`/`onStreamDone`/`onStreamError`), the `useAgentStore` for agent selection, the `useSettingsStore` for plugin settings persistence, and the `MarkdownRenderer` component for formatted output display. No new main-process code is needed -- TextCraft is purely a renderer-side plugin that calls the existing `ai:startAnalysis` IPC channel with a custom system prompt.

The input panel should use a plain `<textarea>` rather than Tiptap. Rationale: the user is pasting or typing raw text to be refined -- rich formatting would be stripped before sending to the AI anyway, and a textarea is simpler, faster, and avoids the Tiptap v3 complexity already encountered in Nebula. The output panel should display AI-streamed markdown via the existing `MarkdownRenderer`, with a copy-to-clipboard button using `navigator.clipboard.writeText()` (pattern already used in 6+ places in the codebase).

**Primary recommendation:** Build TextCraft as a renderer-only plugin using the existing `ai:startAnalysis` IPC infrastructure, plain textarea for input, flexbox three-panel layout, and Zustand store following the Launchpad AI chat pattern exactly.

## Standard Stack

### Core (already in project -- no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.3 | Plugin state management | Every plugin uses zustand stores |
| ai (Vercel AI SDK) | ^6.0.116 | AI streaming backend | Already powers CodeReviewBot, Launchpad, Nebula AI |
| react-router-dom | ^7.13.1 | Plugin route registration | Plugin registry drives routes via App.tsx |
| lucide-react | ^0.475.0 | Icon library | All icons are lucide-react throughout the app |
| framer-motion | ^12.5.0 | Animations (optional) | Used in Nebula for FAB/toast; available for TextCraft |
| tailwindcss | v4 | Styling | CSS-first with @theme tokens; all components use Tailwind |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-store | ^10.0.0 | Settings/history persistence | Via `window.api.settings.set/get` IPC |
| MarkdownRenderer | built-in | Render AI output | Display formatted AI response in output panel |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain textarea | Tiptap editor for input | Tiptap adds complexity, bundle size; raw text is what AI needs -- textarea wins |
| Custom markdown | MarkdownRenderer | MarkdownRenderer is battle-tested in project, supports code blocks, lists, bold, etc. |
| react-resizable-panels | Flexbox | Removed in Phase 9 due to infinite re-render loops; use plain flexbox |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  plugins/
    textcraft/
      TextCraftView.tsx       # Main view (default export for React.lazy)
      InputPanel.tsx           # Left: textarea with character count
      ControlsPanel.tsx        # Middle: tone/format/style options
      OutputPanel.tsx          # Right: AI-streamed output with copy button
  stores/
    textcraft-store.ts         # Zustand store (AI session, options, history)
  types/
    textcraft.ts               # TypeScript type definitions
```

### Pattern 1: Plugin Registration (PLUG-01/PLUG-02/PLUG-03)
**What:** Add TextCraft to the compiled-in PLUGINS array in `registry.ts`
**When to use:** Every new plugin must follow this pattern
**Example:**
```typescript
// Source: src/renderer/src/plugins/registry.ts (existing pattern)
{
  id: 'textcraft',
  name: 'TextCraft',
  description: 'AI-powered text refinement with tone and format controls',
  icon: 'PenLine',  // lucide-react icon for writing/editing
  route: '/textcraft',
  component: React.lazy(() => import('./textcraft/TextCraftView')),
  settingsSchema: [
    {
      key: 'defaultTone',
      label: 'Default Tone',
      type: 'select',
      description: 'Default writing tone for new refinements',
      defaultValue: 'professional',
      options: [
        { label: 'Professional', value: 'professional' },
        { label: 'Casual', value: 'casual' },
        { label: 'Technical', value: 'technical' },
        { label: 'Friendly', value: 'friendly' },
        { label: 'Concise', value: 'concise' }
      ]
    },
    {
      key: 'defaultFormat',
      label: 'Default Format',
      type: 'select',
      description: 'Default output format for new refinements',
      defaultValue: 'email',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'One-Pager', value: 'one-pager' },
        { label: 'Technical Doc', value: 'technical-doc' },
        { label: 'General', value: 'general' }
      ]
    }
  ],
  defaultAgent: null
}
```

### Pattern 2: AI Streaming via Zustand Store (Launchpad Pattern)
**What:** Use `window.api.ai.startAnalysis` with session-scoped IPC listeners
**When to use:** Any plugin that streams AI responses
**Example:**
```typescript
// Source: src/renderer/src/stores/launchpad-store.ts (lines 265-330)
// This is the EXACT pattern TextCraft must follow for AI streaming:

startRefinement: async (inputText, options, agentId, model, command) => {
  const sessionId = `textcraft-${Date.now()}`
  set({
    session: { sessionId, status: 'streaming', rawText: '', inputText },
    error: null
  })

  // Build system prompt based on user options
  const systemPrompt = buildSystemPrompt(options)

  // Set up streaming listeners (session-scoped, cleaned up on done/error)
  window.api.ai.onStreamChunk((data) => {
    const current = get().session
    if (!current || current.sessionId !== data.sessionId) return
    set({ session: { ...current, rawText: current.rawText + data.chunk } })
  })

  window.api.ai.onStreamDone((data) => {
    const current = get().session
    if (!current || current.sessionId !== data.sessionId) return
    set({ session: { ...current, status: 'complete' } })
    window.api.ai.removeStreamListeners()
  })

  window.api.ai.onStreamError((data) => {
    const current = get().session
    if (!current || current.sessionId !== data.sessionId) return
    set({ session: { ...current, status: 'error' }, error: data.error })
    window.api.ai.removeStreamListeners()
  })

  await window.api.ai.startAnalysis(agentId, model, systemPrompt, inputText, sessionId, command)
}
```

### Pattern 3: Agent Resolution (Launchpad/AiAdvisor Pattern)
**What:** Resolve the configured AI agent from settings + agent store
**When to use:** Any component that needs to call an AI agent
**Example:**
```typescript
// Source: src/renderer/src/plugins/launchpad/AiAdvisor.tsx (lines 39-44)
const providers = useAgentStore((s) => s.providers)
const getSetting = useSettingsStore((s) => s.getSetting)

const defaultAgentId = getSetting('plugins.textcraft.defaultAgent') as string | undefined
const agent = defaultAgentId
  ? providers.find((p) => p.id === defaultAgentId)
  : providers.find((p) => p.status === 'connected' || p.hasApiKey)
```

### Pattern 4: Three-Panel Flexbox Layout (Launchpad Estimator Pattern)
**What:** Three-column layout with fixed-width side panels and flexible center
**When to use:** TextCraft's left/middle/right panel layout
**Example:**
```typescript
// Source: src/renderer/src/plugins/launchpad/LaunchpadView.tsx (lines 112-127)
<div className="flex h-full overflow-hidden">
  {/* Left: Input textarea */}
  <div className="flex-1 overflow-y-auto border-r border-border">
    <InputPanel />
  </div>

  {/* Middle: Controls (narrow) */}
  <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
    <ControlsPanel />
  </div>

  {/* Right: AI output */}
  <div className="flex-1 overflow-y-auto">
    <OutputPanel />
  </div>
</div>
```

### Pattern 5: View Structure with Header (Launchpad/Nebula Pattern)
**What:** Standard plugin view with header + icon + title, consistent with all views
**When to use:** Every plugin main view
**Example:**
```typescript
// Source: src/renderer/src/plugins/launchpad/LaunchpadView.tsx (lines 54-77)
export default function TextCraftView(): React.JSX.Element {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">TextCraft</h1>
          <span className="text-xs text-text-secondary">AI Text Refinement</span>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Three-panel layout here */}
      </div>
    </div>
  )
}
```

### Pattern 6: Sidebar Icon Registration
**What:** Add the new icon to Sidebar.tsx ICON_MAP
**When to use:** Every new plugin must have its icon mapped
**Example:**
```typescript
// Source: src/renderer/src/components/Sidebar.tsx (lines 21-32)
// Must add PenLine to the ICON_MAP and the import:
import { ..., PenLine } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  // ... existing icons ...
  PenLine,  // TextCraft
}
```

### Pattern 7: PluginId Type Update
**What:** Add 'textcraft' to the PluginId union type
**When to use:** Every new plugin
**Example:**
```typescript
// Source: src/renderer/src/types/plugin.ts (line 7)
export type PluginId = 'code-review-bot' | 'db-inspector' | 'astro-patch' | 'prompt-builder' | 'launchpad' | 'nebula' | 'textcraft'
```

### Anti-Patterns to Avoid
- **Using Tiptap for input:** The input is raw text for AI refinement -- rich text adds complexity without value. Use a plain textarea.
- **Creating new IPC channels:** The `ai:startAnalysis` channel is generic and reusable. Do NOT create `textcraft:*` IPC channels for AI.
- **Using react-resizable-panels:** Was removed in Phase 9 due to infinite re-render loops. Use plain flexbox with fixed widths.
- **Forgetting to clean up stream listeners:** Must call `window.api.ai.removeStreamListeners()` in both done and error handlers.
- **Auto-applying AI output:** Always require user action (copy button) to take the refined text elsewhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI streaming | Custom WebSocket/fetch streaming | `window.api.ai.startAnalysis` + IPC events | Already handles all providers (SDK + CLI), cancellation, error handling |
| Markdown rendering | Custom markdown parser | `MarkdownRenderer` component | Already handles code blocks, lists, tables, bold, italic |
| Settings persistence | Custom file storage | `window.api.settings.set/get` | Already encrypted, IPC-safe, supports dot-notation paths |
| Agent resolution | Custom provider lookup | `useAgentStore` + `useSettingsStore` pattern | Handles probe, fallback, API key status |
| Copy to clipboard | Custom clipboard handler | `navigator.clipboard.writeText()` | Already used in 6+ places in the codebase |
| Plugin routing | Custom route management | Plugin registry in `registry.ts` | Automatically wires sidebar, routes, settings sections |

**Key insight:** TextCraft is a UI-only plugin that orchestrates existing infrastructure. Zero new main-process code is needed. The entire feature is a Zustand store + 4 React components + type definitions.

## Common Pitfalls

### Pitfall 1: Forgetting Session-Scoped Listener Cleanup
**What goes wrong:** IPC stream listeners accumulate across multiple refinement requests, causing memory leaks and ghost updates from old sessions.
**Why it happens:** `window.api.ai.onStreamChunk` adds a NEW listener each time. Without `removeStreamListeners()`, they stack.
**How to avoid:** Call `window.api.ai.removeStreamListeners()` in BOTH the `onStreamDone` and `onStreamError` callbacks. Also call it in `cancelRefinement`. See Launchpad store lines 308, 315.
**Warning signs:** Output panel shows text from a previous refinement mixed with the current one.

### Pitfall 2: Not Guarding Session ID in Stream Callbacks
**What goes wrong:** A stale callback from a previous session writes chunks into the current session's output.
**Why it happens:** The IPC listener was registered for session A, but session B has started.
**How to avoid:** Every stream callback MUST check `if (!current || current.sessionId !== data.sessionId) return`. This is the established pattern in launchpad-store and review-store.
**Warning signs:** Output text appears garbled or contains fragments from different AI responses.

### Pitfall 3: Missing PluginId Union Update
**What goes wrong:** TypeScript compile error when adding the plugin to the registry.
**Why it happens:** `PluginId` is a string literal union in `types/plugin.ts`. Adding a new plugin without updating the union causes type mismatch.
**How to avoid:** Add `'textcraft'` to the `PluginId` type AND add the icon to `Sidebar.tsx` ICON_MAP in the same task.
**Warning signs:** `tsc` errors on `registry.ts` -- "Type 'textcraft' is not assignable to type 'PluginId'".

### Pitfall 4: Blocking UI During AI Streaming
**What goes wrong:** The input panel or controls become unresponsive during streaming.
**Why it happens:** Re-renders on every chunk if state structure is wrong.
**How to avoid:** Keep the streaming `rawText` in a nested `session` object, and only subscribe components to what they need (e.g., output panel subscribes to `session.rawText`, controls panel subscribes to `session.status`).
**Warning signs:** Typing in the input panel lags while AI is streaming.

### Pitfall 5: Not Setting Default Export for React.lazy()
**What goes wrong:** Runtime error when navigating to the TextCraft route.
**Why it happens:** `React.lazy()` requires a default export. Named exports fail silently or throw.
**How to avoid:** `export default function TextCraftView()` -- not `export function TextCraftView()`.
**Warning signs:** White screen or error boundary when clicking TextCraft in sidebar.

### Pitfall 6: System Prompt Too Vague
**What goes wrong:** AI output doesn't match the selected tone/format, or is inconsistent across providers.
**Why it happens:** The system prompt doesn't clearly encode the user's selected options.
**How to avoid:** Build a structured system prompt that explicitly states the tone, format, and task. Include concrete examples of what "professional email" vs "casual one-pager" means.
**Warning signs:** Selecting different tones produces nearly identical output.

## Code Examples

Verified patterns from the existing codebase:

### System Prompt Builder for TextCraft
```typescript
// Pattern derived from launchpad-store.ts LAUNCHPAD_AI_SYSTEM_PROMPT

function buildSystemPrompt(options: RefinementOptions): string {
  const toneDescriptions: Record<string, string> = {
    professional: 'Use professional, clear, and polished language suitable for business communication.',
    casual: 'Use a relaxed, friendly, and conversational tone.',
    technical: 'Use precise technical language with appropriate jargon for a technical audience.',
    friendly: 'Use warm, approachable language that builds rapport.',
    concise: 'Be extremely brief and to the point. Remove all filler words.'
  }

  const formatInstructions: Record<string, string> = {
    email: 'Format as a professional email with greeting, body paragraphs, and sign-off.',
    'one-pager': 'Format as a structured one-pager with clear headings and bullet points.',
    'technical-doc': 'Format as technical documentation with sections, code references where appropriate, and precise language.',
    general: 'Format as clean, well-structured prose.'
  }

  return `You are an expert writing assistant. Rewrite the user's text according to these specifications:

TONE: ${toneDescriptions[options.tone] || toneDescriptions.professional}
FORMAT: ${formatInstructions[options.format] || formatInstructions.general}
${options.customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${options.customInstructions}` : ''}

RULES:
- Fix all spelling and grammatical errors
- Preserve the original meaning and intent
- Improve clarity and readability
- Match the requested tone consistently
- Apply the requested format structure
- Do NOT add information that wasn't in the original
- Output the refined text directly — no preamble like "Here is the refined version"
- Use markdown formatting for structure (headers, lists, bold) when appropriate`
}
```

### Copy-to-Clipboard Pattern
```typescript
// Source: src/renderer/src/plugins/nebula/CodeBlockControls.tsx (line 185)
// and src/renderer/src/plugins/db-inspector/AskAI.tsx (line 119)

const [copied, setCopied] = useState(false)

const handleCopy = () => {
  if (!outputText) return
  navigator.clipboard.writeText(outputText).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}
```

### History Persistence Pattern
```typescript
// Source: src/renderer/src/stores/launchpad-store.ts (lines 211-240)

const HISTORY_STORAGE_KEY = 'textcraft.history'
const MAX_HISTORY_ENTRIES = 50

saveToHistory: async (entry: TextCraftHistoryEntry) => {
  const updated = [entry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)
  set({ history: updated })
  await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
}

loadHistory: async () => {
  try {
    const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
    const history = Array.isArray(raw) ? (raw as TextCraftHistoryEntry[]) : []
    set({ history: history.slice(0, MAX_HISTORY_ENTRIES) })
  } catch {
    set({ history: [] })
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-resizable-panels | Plain flexbox | Phase 9 (removed) | Must use fixed widths + flex-1, not resizable panels |
| Custom streaming | `ai:startAnalysis` generic channel | Phase 7 (Launchpad) | Reusable for any plugin needing AI streaming |
| `@tiptap/react` BubbleMenu | `@tiptap/react/menus` BubbleMenu | Phase 9 (Tiptap v3) | Not relevant for TextCraft (uses textarea) |
| Token usage estimation | SDK `result.usage` | Phase 7 | Token tracking via `useTokenStore` is optional |

**Deprecated/outdated:**
- react-resizable-panels: Removed in Phase 9 due to infinite re-render loops. Do not use.

## Open Questions

1. **History tab vs inline history?**
   - What we know: Launchpad uses a separate "History" tab. TextCraft could either use tabs or keep it simpler.
   - What's unclear: Whether the user wants a full tab navigation or just the three-panel view.
   - Recommendation: Start with a single-view three-panel layout. Add a small history dropdown or sidebar later if needed. Keep the MVP focused on the core write/refine/copy workflow.

2. **Custom instructions per refinement?**
   - What we know: The user wants tone/format controls. They may also want freeform instructions ("make it shorter", "emphasize security").
   - What's unclear: Whether this should be a persistent setting or per-request.
   - Recommendation: Add a small "Additional instructions" text field in the controls panel (per-request, not persisted). This gives flexibility without complexity.

3. **Word/character count display?**
   - What we know: Writing tools typically show word and character counts.
   - What's unclear: Whether to show for input only, output only, or both.
   - Recommendation: Show word count and character count for both input and output panels. Lightweight -- just `text.split(/\s+/).length` and `text.length`.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of: registry.ts, plugin.ts types, launchpad-store.ts, AiAdvisor.tsx, LaunchpadView.tsx, NebulaView.tsx, stream.ts, providers.ts, ipc-handlers.ts, preload/index.ts, Sidebar.tsx, App.tsx, MarkdownRenderer.tsx, settings-store.ts, agent-store.ts, main.css
- **package.json** - Verified all dependency versions are already installed

### Secondary (MEDIUM confidence)
- **lucide-react icon selection** - `PenLine` is an appropriate writing/editing icon based on lucide-react icon naming conventions and project usage of similar icons (Pencil for drawing in Nebula)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in the project; no new dependencies needed
- Architecture: HIGH - Patterns directly observed from Launchpad (exact same AI chat pattern), Nebula, and CodeReviewBot
- Pitfalls: HIGH - Pitfalls derived from actual decisions documented in STATE.md (react-resizable-panels removal, listener cleanup, session ID guards)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- no external dependencies or fast-moving APIs involved)
