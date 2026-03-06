# Project: Zenith

## What It Is

Desktop GUI toolkit that consolidates daily developer workflows into a single Electron application. Personal tool — audience of one.

## Core Value

**CodeReviewBot must work flawlessly** — automated PR code review that connects to Bitbucket, fetches diffs, and posts inline AI-generated review comments.

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Electron 39 + React 19 | Changed from Tauri to Electron |
| Build | electron-vite 5.0 | Replaces electron-webpack/forge |
| Styling | Tailwind v4 CSS-first | @theme blocks, no tailwind.config.js |
| Components | shadcn/ui + Radix UI | Copy-paste component model |
| State | Zustand | Global state management |
| Async Data | TanStack Query | Server state + caching |
| Animation | Framer Motion | Route transitions, micro-animations |
| Icons | lucide-react | Consistent icon set |
| Storage | electron-store v10 | ESM-only, requires type=module |
| Credentials | safeStorage | keytar is deprecated |
| Window State | electron-win-state | electron-window-state is broken |
| Testing | Vitest + Testing Library + Playwright | Unit + integration + E2E |

## V1 Plugins (Compiled-In)

1. **CodeReviewBot** — Automated Bitbucket PR code review with AI-generated inline comments
2. **DbInspector** — Database inspection and query tooling
3. **AstroPatch** — Automated patch generation with Jira integration
4. **PromptBuilder** — Prompt construction and management tool

## Architecture

- **Plugin System:** Compiled-in (not dynamic loading). Single `PluginDefinition[]` array drives sidebar, router, and settings.
- **Navigation:** Narrow sidebar (~56px) with icon rail. Plugins top, settings bottom.
- **Security:** nodeIntegration=false, contextIsolation=true, sandbox=true — MANDATORY, never override. window.api is the ONLY contextBridge export.
- **Theme:** Dark-only with neon cyan accents. oklch() color tokens via @theme blocks. No light mode.
- **Multi-AI Agent System:** Supports Claude, Gemini, Codex, Opencode, Ollama, Cursor-agent. Per-plugin default agent assignment.
- **IPC Pattern:** Typed contextBridge channels (settings, credentials, app namespaces). No generic invoke passthrough.

## Key Decisions

| Decision | Context | Date |
|----------|---------|------|
| Electron + React (not Tauri) | User changed from initial Tauri choice | 2026-03-06 |
| Compiled-in plugins | Not dynamic loading — simpler, type-safe | 2026-03-06 |
| Dark-only theme | No light mode toggle | 2026-03-06 |
| Neon cyan accents | oklch(72% 0.15 195) accent color | 2026-03-06 |
| safeStorage over keytar | keytar deprecated, safeStorage is built-in | 2026-03-06 |
| electron-win-state over electron-window-state | electron-window-state is broken | 2026-03-06 |
| electron-store v10 ESM | Requires type=module in package.json | 2026-03-06 |
| Tailwind v4 CSS-first | @theme blocks, no config file | 2026-03-06 |
| CodeReviewBot as core priority | Highest ROI plugin, validates AI patterns | 2026-03-06 |
| Multi-agent support | 6 providers + custom, per-plugin defaults | 2026-03-06 |
| Sidebar narrow icons ~56px | Plugins top, settings/gear bottom | 2026-03-06 |
| Settings: left sidebar + content | Auto-save on change, inline validation | 2026-03-06 |

## Constraints

- Personal tool (audience of one)
- macOS primary target
- No telemetry, no analytics
- All secrets in main process via safeStorage (never exposed to renderer)
