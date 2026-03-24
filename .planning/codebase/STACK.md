# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.9.3 - Main language for both renderer and main process code
- TSX/JSX - React components using React 19.2.1

**Secondary:**
- JavaScript (ES modules) - Configuration files (electron-vite, eslint)
- YAML - Configuration files (electron-builder.yml, .prettierrc.yaml)

## Runtime

**Environment:**
- Node.js 25.6.0 (no .nvmrc specified — uses system Node)
- Electron 39.2.6 — Desktop application framework

**Package Manager:**
- npm 11.8.0
- Lockfile: `package-lock.json` (primary), `pnpm-lock.yaml` (legacy, present but not actively used)

## Frameworks

**Core:**
- Electron 39.2.6 - Desktop application framework with main/preload/renderer separation
- React 19.2.1 - UI framework for renderer process
- Vite 7.2.6 - Build tooling and dev server via electron-vite
- Electron Vite 5.0.0 - Electron-specific Vite configuration and bundler
- TailwindCSS 4.0.12 - Utility-first CSS framework with @tailwindcss/vite plugin

**State Management:**
- Zustand 5.0.3 - Client-side state management (used in renderer)
- Electron Store 10.0.0 - Persistent local settings storage via JSON files

**Data Fetching & Streaming:**
- Vercel AI SDK (ai 6.0.116) - Unified interface for LLM streaming
  - @ai-sdk/anthropic 3.0.58 - Anthropic Claude models
  - @ai-sdk/openai 3.0.41 - OpenAI models
  - @ai-sdk/google 3.0.43 - Google Gemini models
  - ollama-ai-provider 1.2.0 - Local Ollama inference
- React Query 5.69.0 (@tanstack/react-query) - Server state management and caching

**Editor & Code Highlighting:**
- CodeMirror 6.0.2 - Code editor with language support
  - @codemirror/lang-* (6 languages: JavaScript, Python, Java, CSS, HTML, SQL, JSON, Markdown)
  - @codemirror/state, @codemirror/view, @codemirror/commands, @codemirror/autocomplete
  - @codemirror/theme-one-dark - Dark theme
  - @codemirror/lint - Linting integration
- Highlight.js 11.11.1 - Syntax highlighting for rendered content
- Lowlight 3.3.0 - AST-based highlighting using highlight.js
- Tiptap 3.20.1 - Rich text editor with extensions
  - Extensions: tables, links, images, code blocks, placeholders

**Visualization & Graphs:**
- Three.js 0.183.2 - 3D graphics library
  - @react-three/fiber 9.5.0 - React renderer for Three.js
  - @react-three/drei 10.7.7 - Utility helpers for Three.js
- d3-force-3d 3.0.6 - 3D force-directed graph simulations
- React Force Graph 2D 1.29.1 - 2D force-directed graph visualization
- @xyflow/react 12.10.1 - Node-based flow diagram library (replaces react-flow-renderer)
- Dagre 2.0.4 (@dagrejs/dagre) - Graph layout engine
- Mermaid 11.12.3 - Diagram rendering (flowcharts, sequences, etc.)
- Tldraw 4.4.1 - Drawing/whiteboarding canvas

**Database & Storage:**
- better-sqlite3 12.6.2 - Embedded SQLite with Node.js bindings (WAL mode, FTS5)
- pg 8.20.0 - PostgreSQL client for remote database connections
- mysql2 3.19.1 - MySQL client library for remote database connections
- Parse Diff 0.11.1 - Diff parsing utility for code diffs

**Document Generation:**
- PDFMake 0.3.5 - PDF generation library
- sql-formatter 15.7.2 - SQL query formatting

**HTTP & Networking:**
- Electron's `net.fetch` (Chromium networking) - Used for Bitbucket OAuth and API calls
- OpenAI SDK 6.27.0 - Direct OpenAI client (legacy, Vercel AI SDK preferred)

**Utilities:**
- Simple Git 3.33.0 - Git command wrapper for repository operations
- Zod 3.25.76 - TypeScript-first schema validation
- Framer Motion 12.5.0 - React animation library
- React Router DOM 7.13.1 - Client-side routing
- React Window 1.8.11 - Virtual list rendering for large datasets
- React Resizable Panels 4.7.2 - Draggable panel resizing
- Lucide React 0.475.0 - Icon library
- Plist 1.3.0 - macOS plist file parsing
- tw-animate-css 1.2.5 - Tailwind CSS animations
- Pako 1.0.11 - Zlib compression/decompression

## Testing

**Unit/Component:**
- Vitest 3.0.8 - Fast unit test runner (config not found — likely configured inline)
- @testing-library/react 16.2.0 - React component testing utilities
- @testing-library/jest-dom 6.6.3 - Jest matchers for DOM elements

**E2E:**
- Playwright 1.50.1 - Browser automation testing (config not found)

## Build & Development

**Build Tools:**
- Electron Builder 26.0.12 - Electron app packaging and distribution
- Tailwind CSS with Vite plugin 4.0.12
- @vitejs/plugin-react 5.1.1 - React JSX transformation
- Vite 7.2.6

**Code Quality:**
- ESLint 9.39.1 with electron-toolkit config
  - @typescript-eslint/eslint-plugin 8.26.1
  - eslint-plugin-react 7.37.5
  - eslint-plugin-react-hooks 7.0.1
  - eslint-plugin-react-refresh 0.4.24
- Prettier 3.7.4 - Code formatter with electron-toolkit config

**Type Checking:**
- TypeScript 5.9.3 - Separate configs for node (main/preload) and web (renderer)
- @electron-toolkit/tsconfig 2.0.0 - Shared TypeScript config

**Electron Toolkit:**
- @electron-toolkit/utils 4.0.0 - Utilities for Electron app detection
- @electron-toolkit/preload 3.0.2 - Safe preload module exports
- @electron-toolkit/eslint-config-ts 3.1.0 - TypeScript linting config
- @electron-toolkit/eslint-config-prettier 3.0.0 - Prettier integration

## Configuration

**Environment:**
- No `.env` files detected — configuration uses `electron-store` and `safeStorage`
- Credentials stored encrypted via Electron's `safeStorage` API
- Settings persisted to `zenith-credentials` and `zenith-settings` stores

**Build Configuration:**
- `electron-vite.config.ts` - Vite + Electron bundler config with React/Tailwind plugins
- `tsconfig.json` - Composite TypeScript config with references to node and web configs
- `tsconfig.node.json` - Main process and preload compilation targets
- `tsconfig.web.json` - Renderer process with JSX, path aliases (@renderer/*)
- `electron-builder.yml` - Cross-platform packaging (macOS, Windows, Linux)
- `.prettierrc.yaml` - Code formatter config (singleQuote, no semi, 100 char width)
- `eslint.config.mjs` - Flat config format with TS, React, and Prettier plugins

## Platform Requirements

**Development:**
- Node.js 25.6.0+ (Electron requires Node 14+)
- npm 11.8.0+
- macOS, Windows, or Linux
- Git (for simple-git integration)

**Production:**
- Electron app bundles for:
  - macOS (arm64, x64) - DMG installer, requires notarization setup
  - Windows - NSIS installer
  - Linux - AppImage, snap, deb packages
- Permissions (electron-builder.yml):
  - macOS: Camera, microphone, Documents, Downloads access

## Dependencies At Risk

**Note:** no `.env` or `requirements.txt` file detected — this is a pure Node.js + Electron project with npm dependencies only.

---

*Stack analysis: 2026-03-24*
