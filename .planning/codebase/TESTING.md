# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Status:** Test infrastructure configured but minimal test coverage in source code

**Installed Test Tools:**
- Vitest 3.0.8 - Test runner (configured in package.json, no vitest.config.* found)
- Playwright 1.50.1 - E2E testing
- @testing-library/react 16.2.0 - React component testing
- @testing-library/jest-dom 6.6.3 - DOM matchers

**Run Commands:**
```bash
npm run test              # Run tests (if script added to package.json)
npm run test:watch       # Watch mode (if script added)
npm run test:coverage    # Coverage report (if script added)
```

**Note:** Test scripts are not currently present in `package.json`. Package dependencies are installed but no test command is configured in scripts section (lines 8-21 of package.json show format, lint, typecheck, build commands only).

## Test File Organization

**Current State:** No test files found in source code

**Expected Location (if tests were added):**
- Co-located pattern: `ComponentName.test.tsx` next to `ComponentName.tsx`
- For stores: `store-name.test.ts` next to `store-name.ts`
- For utilities: `util-name.test.ts` next to `util-name.ts`

**Example structure (not currently present):**
```
src/renderer/src/
├── components/
│   ├── AppLayout.tsx
│   ├── AppLayout.test.tsx        # Would go here
│   └── ...
├── stores/
│   ├── cortex-store.ts
│   ├── cortex-store.test.ts      # Would go here
│   └── ...
└── plugins/
    └── cortex/
        └── components/
            ├── RepoCard.tsx
            ├── RepoCard.test.tsx  # Would go here
            └── ...
```

## Test Structure

**Expected Testing Library Pattern (from installed packages):**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComponentName from './ComponentName'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should render without errors', () => {
    render(<ComponentName />)
    expect(screen.getByText('expected text')).toBeInTheDocument()
  })

  it('should handle user interactions', () => {
    render(<ComponentName />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(/* assertion */).toBe(true)
  })
})
```

**Patterns observed in codebase for future test alignment:**
- Error handling uses try/catch in IPC handlers and async operations
- State management via Zustand with clear action methods
- React components use hooks (compatible with @testing-library/react)

## Mocking

**Framework:** Vitest provides mocking via `vi.mock()` and `vi.spyOn()`

**Mocking IPC Calls (critical for Electron):**
```typescript
// Mock window.api calls in tests
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

// In tests:
beforeEach(() => {
  window.api = {
    settings: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  }
})
```

**Mocking Zustand Stores:**
```typescript
// Don't mock the store itself, mock its return values
it('should use store values', () => {
  vi.spyOn(cortexStore, 'getState').mockReturnValue({
    // Return mock store state
  })
})
```

**What to Mock:**
- External APIs (IPC handlers)
- Network requests (if any)
- File system operations (in main process code)
- Zustand store methods (if testing independently)

**What NOT to Mock:**
- React components (use render from @testing-library/react)
- React hooks (unless testing custom hooks in isolation)
- Internal utility functions (test them as used)

## Fixtures and Factories

**Test Data Location:** Not currently present in codebase

**Expected pattern based on codebase structure:**
```
src/
├── __fixtures__/           # Would contain test data
│   ├── cortex-fixtures.ts  # Mock repositories, analysis results
│   ├── nebula-fixtures.ts  # Mock notes
│   └── db-fixtures.ts      # Mock database connections
└── ...
```

**Mock Factory Pattern Example (aligned with codebase):**
```typescript
// Create factories for complex types
export const createMockRepository = (overrides?: Partial<Repository>): Repository => ({
  id: crypto.randomUUID(),
  url: 'https://github.com/example/repo.git',
  name: 'example-repo',
  branch: 'main',
  repoPath: '/tmp/repo',
  repoType: 'fullstack',
  framework: 'react',
  language: 'typescript',
  status: 'idle',
  commitSha: 'abc123',
  lastAnalyzed: null,
  error: null,
  fileCount: 42,
  ...overrides
})

export const createMockAnalysisResult = (overrides?: Partial<AnalysisResult>): AnalysisResult => ({
  repoId: '1',
  repoType: 'backend',
  framework: 'spring-boot',
  language: 'java',
  commitSha: 'abc123',
  entities: [],
  calls: [],
  routes: [],
  components: [],
  pipelines: [],
  fileTree: [],
  stats: { /* ... */ },
  documentation: '',
  markdownFiles: [],
  ...overrides
})
```

## Coverage

**Requirements:** Not enforced (no coverage threshold in config)

**View Coverage (when tests exist):**
```bash
vitest run --coverage           # Generate coverage report
# or with specific coverage tool:
npm run test:coverage           # If script added
```

**Coverage thresholds could be configured in vite config:**
```typescript
// In vitest config (when added):
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
})
```

**Current gaps (noted for future testing):**
- No tests for main process IPC handlers (`src/main/ipc-handlers.ts` - 1165 lines)
- No tests for Zustand stores (`src/renderer/src/stores/` - multiple large files)
- No tests for complex utilities (parsers, analyzers, etc.)

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, utility methods
- Approach: Test pure functions and store actions with mocked dependencies
- Tools: Vitest + @testing-library utilities
- Example targets:
  - Parser functions (`ts-parser.ts`, `java-parser.ts`, `python-parser.ts`)
  - Store methods (all in `src/renderer/src/stores/`)
  - Utility functions (date formatting, object manipulation, etc.)

**Integration Tests:**
- Scope: Multiple components/modules working together
- Approach: Test IPC channel interactions, store + component integration
- Tools: Vitest with mocked electron IPC
- Example scenarios:
  - Settings store persistence via IPC
  - Repository analysis workflow (clone → analyze → store result)
  - QA message streaming with analysis result

**E2E Tests:**
- Framework: Playwright (installed, not configured for current codebase)
- Scope: Full user workflows in Electron app
- Example scenarios:
  - Add repository → Clone → Analyze → View results
  - Create note → Add drawing → Export as PDF
  - Configure AI agent → Run analysis

**Current State:** No E2E tests configured; Playwright available as dependency

## Common Patterns

**Async Testing (for IPC and store operations):**
```typescript
it('should load settings asynchronously', async () => {
  const store = useSettingsStore.getState()

  await store.loadSettings()

  expect(store.settings).toBeDefined()
})

it('should handle async errors', async () => {
  vi.mocked(window.api.settings.get).mockRejectedValueOnce(new Error('Failed'))
  const store = useSettingsStore.getState()

  await expect(store.loadSettings()).rejects.toThrow()
})
```

**Error Testing:**
```typescript
it('should handle validation errors gracefully', async () => {
  const result = someValidation(invalidInput)

  expect(result).toBeNull()
  // or
  expect(result.error).toBeDefined()
})

it('should catch and log errors', async () => {
  const consoleSpy = vi.spyOn(console, 'error')

  await functionThatThrows()

  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ComponentName]'))
})
```

**React Hook Testing Pattern:**
```typescript
import { renderHook, act } from '@testing-library/react'

it('should update state on action', () => {
  const { result } = renderHook(() => useCortexStore())

  act(() => {
    result.current.setActiveRepoId('new-id')
  })

  expect(result.current.activeRepoId).toBe('new-id')
})
```

**Component Testing with Zustand:**
```typescript
it('should render component with store data', () => {
  // Mock store before rendering component
  vi.spyOn(cortexStore, 'getState').mockReturnValue({
    repos: [mockRepository],
    activeRepoId: mockRepository.id,
    // ... other required state
  })

  render(<RepoCard repo={mockRepository} isActive={true} {...otherProps} />)

  expect(screen.getByText(mockRepository.name)).toBeInTheDocument()
})
```

## Testing Strategy Recommendations

**Priority areas for test coverage (based on code complexity and impact):**

1. **IPC Handlers** (`src/main/ipc-handlers.ts`)
   - Critical: All settings, credential, and AI streaming operations
   - Approach: Mock electron-store, SDK calls, test handler registration

2. **Store Operations** (`src/renderer/src/stores/`)
   - Critical: State mutations, async operations (loadSettings, clones, analysis)
   - Approach: Direct store testing with mocked IPC, integration with UI

3. **Parser/Analyzer** (`src/main/cortex/parser/`)
   - High value: Complex logic, language-specific parsing
   - Approach: Unit test with fixture code snippets

4. **React Components** (`src/renderer/src/plugins/`)
   - Medium: Component rendering, user interactions, error states
   - Approach: Use @testing-library/react with mocked stores

5. **Utilities** (`flow-utils.ts`, parsers, builders)
   - Medium: Pure functions with complex business logic
   - Approach: Unit tests with clear input/output

---

*Testing analysis: 2026-03-24*
