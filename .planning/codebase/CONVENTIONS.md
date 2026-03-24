# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Kebab-case for component files: `RepoCard.tsx`, `cortex-store.ts`, `cortex-theme.ts`, `git-service.ts`
- Index files use explicit names: `index.ts`, `index.tsx`
- Service/utility files use descriptive suffixes: `-store.ts` (Zustand stores), `-service.ts` (backend services), `-manager.ts` (managers), `-parser.ts` (parsers)
- Type definition files: `cortex.ts`, `nebula.ts`, `textcraft.ts`, `review.ts`, `database.ts` (singular, domain-scoped)

**Functions:**
- camelCase for all function names: `formatRelativeTime()`, `getSuggestedQuestions()`, `buildGraphData()`, `registerIpcHandlers()`
- Helper functions use descriptive verbs: `build*`, `parse*`, `get*`, `set*`, `validate*`, `handle*`
- React components are PascalCase: `QAPanel()`, `RepoCard()`, `MindGraphTab()`, `ErrorBoundary()`
- Private functions use leading underscore (rare): Most functions are exported or module-scoped

**Variables:**
- camelCase for all variables: `activeRepoId`, `analysisResult`, `messagesEndRef`, `accumulatorRef`
- Constants in UPPER_SNAKE_CASE when truly constant: `STATUS_STYLES`, `REPO_TYPE_COLORS`, `GIT_TERMINAL_PROMPT`
- Boolean prefixes: `isAnalyzing`, `isFetching`, `hasError`, `isLoading`, `isQAStreaming`
- Ref names use `*Ref` suffix: `messagesEndRef`, `accumulatorRef`, `forceGraphRef`

**Types:**
- Interface names in PascalCase: `Props`, `SettingsState`, `CortexState`, `ErrorBoundaryState`, `GraphNode`
- Type aliases in PascalCase: `RepoType`, `RepoStatus`, `ToastMessage`, `ExportFormat`
- Union types use literal strings: `type RepoStatus = 'idle' | 'cloning' | 'analyzing' | 'ready' | 'error'`
- Generic parameter names: `T`, `K`, `V` (single letter for standard generics)

## Code Style

**Formatting:**
- Tool: Prettier 3.7.4
- Key settings:
  - `singleQuote: true` (single quotes for strings)
  - `semi: false` (no semicolons)
  - `printWidth: 100` (line width limit)
  - `trailingComma: none` (no trailing commas in multiline objects/arrays)

**Linting:**
- Tool: ESLint with Electron Toolkit config
- Config file: `eslint.config.mjs` (flat config format)
- Plugins:
  - `@electron-toolkit/eslint-config-ts` (TypeScript rules)
  - `@electron-toolkit/eslint-config-prettier` (Prettier integration)
  - `eslint-plugin-react` (React rules)
  - `eslint-plugin-react-hooks` (React Hooks rules)
  - `eslint-plugin-react-refresh` (Fast Refresh rules)
- Key rules enforced: React hooks deps, react-refresh, TypeScript strict mode

**Spacing:**
- 2-space indentation (enforced by Prettier)
- No trailing commas in multiline structures
- Single blank lines between logical sections

## Import Organization

**Order:**
1. External library imports (React, zustand, motion, lucide-react, etc.)
2. Electron/Node.js imports (electron, path, fs)
3. Type imports (`import type { ... }`)
4. Local store imports (`useStore()`)
5. Local component imports
6. Local utility/type imports

**Path Aliases:**
- `@renderer/*` → `src/renderer/src/*` (configured in `tsconfig.web.json`)
- Example: `import { useCortexStore } from '@renderer/stores/cortex-store'`

**Example pattern from `RepoCard.tsx`:**
```typescript
import { motion } from 'framer-motion'
import { useState } from 'react'
import { FolderGit2, Trash2, Play } from 'lucide-react'
import type { Repository } from '../../../types/cortex'
import { useCortexStore } from '../../../stores/cortex-store'
import AnalysisProgress from './AnalysisProgress'
import { GLASS_CARD, REPO_TYPE_GRADIENTS } from '../cortex-theme'
```

## Error Handling

**Patterns:**
- try/catch blocks in async functions for IPC/network operations
- Error logging with context prefix: `console.error('[ComponentName] Message:', err)`
- Graceful fallbacks in UI (e.g., showing error message to user)
- Optimistic updates followed by error recovery (e.g., in store mutations)

**Example from `settings-store.ts`:**
```typescript
setSetting: async (key: string, value: unknown) => {
  // Optimistic local update
  set((state) => ({
    settings: setPath(state.settings, key, value)
  }))
  // Persist via IPC
  try {
    await window.api.settings.set(key, value)
  } catch (err) {
    console.error('[settings-store] Failed to persist setting:', key, err)
  }
}
```

**Sentinel values:**
- `null` for absence: `lastAnalyzed: string | null`
- Empty array `[]` for no items: `patterns: []`, `insights: []`
- Conditional early returns: `if (!data) return` in getters
- Never throw in handlers; use callbacks with error state instead

## Logging

**Framework:** Native `console` object (no logging library)

**Patterns:**
- Prefix all logs with component/module name in brackets: `[ComponentName]`, `[StoreModule]`, `[ServiceName]`
- Log errors with context: `console.error('[VoiceRecorder] Failed to save audio:', err)`
- Use `console.warn()` for non-critical issues: `console.warn('[NoteEditor] Image too large')`
- Use `console.log()` for debug info: `console.log('[renderer] window.api namespaces:', Object.keys(window.api).join(', '))`

**Examples from codebase:**
- `console.error('[Cortex] Validation failed:', err)`
- `console.warn('[NoteEditor] Image too large (${fileSize}MB). Max 5MB.')`
- `console.log('[CodeReviewBot] loadPRs effect: isConnected=${isConnected}')`

## Comments

**When to Comment:**
- Complex algorithms or business logic (e.g., git progress parsing in `GitService`)
- Section dividers in large files: `// ── Section Name ──────────────────────`
- Explaining WHY, not WHAT (code should be self-documenting)
- Warnings about side effects or gotchas: `// PDF generators imported dynamically to avoid module-level side effects`

**JSDoc/TSDoc:**
- Used extensively for type definitions and complex interfaces
- Format: `/** Description */` on single line or multi-line for complex types
- Example from `nebula.ts`:
```typescript
/**
 * Tag attached to a note for categorization.
 */
export type NoteTag = { id: string; label: string; color: string }

/**
 * Full note file shape — matches the JSON structure persisted on disk.
 */
export interface NoteFile {
  id: string
  title: string
  content: object // Tiptap JSON document
  // ...
}
```

**Section Separators:**
- ASCII art separators for logical sections: `// ── Section ────────────────────────`
- Common sections:
  - `// ── Types ───────────────────────────`
  - `// ── Helper functions ────────────────`
  - `// ── Main component ──────────────────`
  - `// ── Suggested questions ────────────`

## Function Design

**Size:** Keep functions small and focused
- Most functions < 50 lines
- Larger functions broken into helper functions
- Store getter functions are single expressions

**Parameters:**
- Use object parameters for multiple related arguments: `{ repo, isActive, index, onSelect, onAnalyze }`
- Destructure in function signature: `function RepoCard({ repo, isActive, index, onSelect, onAnalyze }: Props)`
- Type props with `interface Props` pattern in React components

**Return Values:**
- Explicit return type annotations: `async function clone(...): Promise<{ repoPath: string }>`
- Return early pattern: `if (!condition) return null`
- React components return `React.JSX.Element`

**Example from `MindGraphTab.tsx`:**
```typescript
function buildGraphData(
  entities: CodeEntity[],
  calls: CallEdge[],
  showMethods: boolean
): GraphData {
  const filtered = showMethods
    ? entities
    : entities.filter((e) => e.kind !== 'method')
  // ... implementation
  return { nodes, links }
}
```

## Module Design

**Exports:**
- Named exports for utility functions and types
- Default export for React components and Zustand stores
- Type exports use `export type { ... }`

**Barrel Files:**
- Not commonly used; imports usually direct to source file
- Types are grouped in domain-scoped files: `src/renderer/src/types/cortex.ts`

**Zustand Store Pattern:**
- Single `create<StoreState>((set, get) => ({ ... }))` call
- State initialization in object
- Methods as object properties (no classes)
- Direct mutations within set callback: `set((state) => ({ ... }))`
- Getters accessed via `get().propertyName`

**Example from `activity-store.ts`:**
```typescript
export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  entries: [],
  isLoading: true,

  addEntry: (entry: ActivityEntry) => {
    set((state) => ({
      entries: [entry, ...state.entries]
    }))
  }
}))
```

## React Patterns

**Component Structure:**
- Functional components with hooks
- Props interface defined at top: `interface Props { ... }`
- Hooks at component start: `const [state, setState] = useState(...)`
- Store subscriptions via Zustand selectors: `const value = useStore((s) => s.value)`
- Effects organized by concern
- JSX at end of file

**Example from `QAPanel.tsx`:**
```typescript
export default function QAPanel(): React.JSX.Element {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const qaMessages = useCortexStore((s) => s.qaMessages)
  const isQAStreaming = useCortexStore((s) => s.isQAStreaming)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaMessages])

  // ... handlers and effects

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

**Animation Library:** Framer Motion
- Wrap elements with `<motion.*>` components
- Define animations as props: `initial`, `animate`, `whileHover`, `transition`
- Example: `<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} />`

**Styling:**
- Tailwind CSS with custom theme tokens
- Glass morphism patterns: `GLASS_CARD`, `GLASS_SURFACE` constants in cortex-theme
- Grid/flex layouts via Tailwind classes
- Inline conditional classes: `` className={`base ${isActive ? 'active' : ''}`} ``

---

*Convention analysis: 2026-03-24*
