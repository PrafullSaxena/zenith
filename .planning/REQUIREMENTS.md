# Requirements

## Categories

### App Shell (SHELL)

- **SHELL-01**: Electron app launches with secure BrowserWindow (nodeIntegration=false, contextIsolation=true, sandbox=true)
- **SHELL-02**: Narrow sidebar (~56px) with icon rail navigation — plugins top, settings/gear bottom
- **SHELL-03**: Clicking sidebar icon switches main content area to that plugin/section view
- **SHELL-04**: Custom titlebar (no native chrome) with macOS traffic lights preserved
- **SHELL-05**: Window state persistence (size, position) across sessions via electron-win-state
- **SHELL-06**: Responsive layout — sidebar collapses/expands, content area fills remaining space
- **SHELL-07**: Dark-only theme with neon cyan accents — no light mode toggle (dark-only by design decision)
- **SHELL-08**: CSP headers set on all responses (script-src self, no eval)
- **SHELL-09**: Graceful error boundary — unhandled renderer errors show recovery UI, not white screen

### Plugin System (PLUG)

- **PLUG-01**: PluginDefinition type with id, name, icon, route, settingsSchema, defaultAgent fields
- **PLUG-02**: Compiled-in PLUGINS array that drives sidebar icons, React Router routes, and settings sections
- **PLUG-03**: Each plugin has a stub view component that renders when selected from sidebar

### Settings (SETT)

- **SETT-01**: Dedicated settings section accessible from sidebar gear icon
- **SETT-02**: Left sidebar + content panel layout within settings view
- **SETT-03**: Application-level settings (appearance, general preferences)
- **SETT-04**: Per-plugin settings sections nested under plugin name in settings sidebar
- **SETT-05**: Auto-save on change (no explicit save button) with inline validation
- **SETT-06**: Settings persistence via electron-store through IPC (main process reads/writes, renderer requests via window.api)

### AI Agents (AGENT)

- **AGENT-01**: Pre-listed AI providers (Claude, Gemini, Codex, Opencode, Ollama, Cursor-agent) + "Add Custom" option
- **AGENT-02**: Central AI agent configuration table showing all providers with name, type, status, and connection test
- **AGENT-03**: Per-plugin default agent assignment dropdown in plugin settings
- **AGENT-04**: Test connection button with status indicator (green dot = connected, red = failed, gray = not configured)

### Dashboard (DASH)

- **DASH-01**: Mission Control as default landing view when app launches
- **DASH-02**: Dashboard shows summary cards for each active plugin
- **DASH-03**: Quick-action buttons to jump to common plugin tasks
- **DASH-04**: Activity feed showing recent operations across all plugins
- **DASH-05**: Dashboard layout uses CSS grid, responsive to window size

### Activity Log (ACTV)

- **ACTV-01**: Centralized activity log storing all plugin operations with timestamps
- **ACTV-02**: Activity entries include: plugin source, operation type, status (success/failure), duration
- **ACTV-03**: Activity log viewable from dashboard feed and dedicated activity section

### CodeReviewBot (CRVW)

- **CRVW-01**: Connect to Bitbucket via OAuth 2.0 with secure token storage (safeStorage)
- **CRVW-02**: List open PRs from configured Bitbucket repositories
- **CRVW-03**: Fetch PR diff (file-by-file) for selected pull request
- **CRVW-04**: Send diff to configured AI agent for code review analysis
- **CRVW-05**: AI streams review comments token-by-token via Electron IPC
- **CRVW-06**: Display AI review comments inline alongside diff view
- **CRVW-07**: Post AI-generated review comments back to Bitbucket PR as inline comments
- **CRVW-08**: Review history — store past reviews with timestamps, PR links, comment counts

### DbInspector (DBIS)

- **DBIS-01**: Connect to PostgreSQL/MySQL databases with connection string or individual fields
- **DBIS-02**: Database connection credentials stored securely via safeStorage
- **DBIS-03**: Browse database schema — list tables, columns, types, constraints
- **DBIS-04**: Execute read-only SQL queries with result table display
- **DBIS-05**: Query history with re-run capability
- **DBIS-06**: Export query results to CSV/JSON
- **DBIS-07**: Multiple saved connections with quick-switch
- **DBIS-08**: Table data preview (first N rows) with pagination
- **DBIS-09**: Visual query builder for common operations (SELECT with filters, JOINs)

### AstroPatch (ARPA)

- **ARPA-01**: Connect to Jira via API token with secure storage
- **ARPA-02**: List and filter Jira issues by project, status, assignee
- **ARPA-03**: Generate code patches from Jira issue descriptions using AI agent
- **ARPA-04**: Preview generated patches with diff view before applying
- **ARPA-05**: Create Jira issue comments with patch details and status updates
- **ARPA-06**: Patch history with link back to originating Jira issue

### Launchpad — Cloud Cost Estimator (LNCH)

- **LNCH-01**: Provider selection — choose from AWS, GCP, and Azure as cloud provider
- **LNCH-02**: Service catalog — browse and select services per provider (compute, storage, database, networking, serverless, etc.)
- **LNCH-03**: Resource configurator — specify instance types, storage sizes, regions, quantities, and usage hours per selected service
- **LNCH-04**: Cost calculation engine — compute monthly and yearly cost estimates from selected resources and configurations
- **LNCH-05**: Estimation summary — display itemized cost breakdown with subtotals per service and grand total (monthly/yearly toggle)
- **LNCH-06**: AI chat assistant — embedded chat window where user can describe needs and AI suggests services, instance types, and configurations
- **LNCH-07**: AI-driven recalculation — AI suggestions can auto-populate the estimator and trigger cost recalculation
- **LNCH-08**: Report export — download estimation report as PDF with provider, services, configurations, costs, and AI recommendations
- **LNCH-09**: Estimation history — save and reload past estimations for comparison
- **LNCH-10**: Multi-provider comparison — side-by-side cost comparison across AWS, GCP, and Azure for equivalent services

### Nebula — Notes & Knowledge (NEBL)

- **NEBL-01**: Modern minimal text editor for note-taking with rich formatting support (headings, bold, italic, lists, code blocks)
- **NEBL-02**: Drawing canvas integrated into notes using tldraw (lightweight, embeddable, MIT license)
- **NEBL-03**: Notes stored locally on disk as structured files (not in-memory only)
- **NEBL-04**: AI agent auto-summarization — spawns AI agent to generate summary when a note is saved/updated
- **NEBL-05**: Knowledge graph — visualize summary titles and connections between notes (similar to Obsidian graph view)
- **NEBL-06**: Search & Q&A — users can ask natural-language questions over their notes; AI retrieves answers from stored summaries and knowledge graph
- **NEBL-07**: Voice recording — start/stop audio recording directly in the app
- **NEBL-08**: Voice transcription — transcribe recorded audio to text with speaker diarization (tag different speakers)
- **NEBL-09**: Transcription-to-knowledge pipeline — transcriptions are stored, summarized by AI, and added to the knowledge graph automatically
- **NEBL-10**: Plugin settings managed through the standard plugin settings page (storage path, AI agent, voice input device, etc.)
- **NEBL-11**: Three-tab UI layout — Note Taking, Search, Knowledge sections accessible via tabs
- **NEBL-12**: Embedded database (SQLite via better-sqlite3) for indexing notes, summaries, and graph relationships — bundled with app, no external dependency

### TextCraft — AI Text Refinement (TXCR)

- **TXCR-01**: Plugin registered in compiled-in PLUGINS array with PenLine icon, /textcraft route, and settings schema
- **TXCR-02**: PluginId union type includes 'textcraft' for type-safe references
- **TXCR-03**: Zustand store managing input text, refinement options, AI streaming session, and history
- **TXCR-04**: AI streaming via existing ai:startAnalysis IPC channel with session-scoped listener cleanup
- **TXCR-05**: Refinement history persisted via electron-store with load/save and 50-entry cap
- **TXCR-06**: Three-panel layout: input textarea (left), tone/format controls (middle), AI output (right)
- **TXCR-07**: Tone selection from 5 options (professional, casual, technical, friendly, concise)
- **TXCR-08**: Format selection from 4 options (email, one-pager, technical-doc, general)
- **TXCR-09**: AI-streamed output rendered as markdown with copy-to-clipboard button
- **TXCR-10**: Custom instructions field for per-refinement freeform instructions

### CodebaseAnalyzer (CBAN)

- **CBAN-01**: Plugin registered in PLUGINS array with route /codebase-analyzer, sidebar icon, and settings schema
- **CBAN-02**: Add repository URL + branch selection UI with analyze trigger button
- **CBAN-03**: Repository analysis engine — clone/fetch repo, detect repo type (BE/FE/DE), parse codebase structure
- **CBAN-04**: Generated documentation cached by repo+branch combination for fast re-access
- **CBAN-05**: Two-section layout — Insights (documentation, flow diagrams, design docs) and Code (file browser, code viewer)
- **CBAN-06**: Code flow visualization — interactive staged flow diagrams showing function call chains with hover summaries
- **CBAN-07**: Code file browser — tree view of repository files with syntax-highlighted code viewer in new tabs
- **CBAN-08**: Natural language Q&A — query the codebase in plain English and get AI-powered answers with code references
- **CBAN-09**: Documentation export — export generated docs as Markdown, PDF, and Plain Text formats
- **CBAN-10**: Design document extraction — generate High Level Design document with Mermaid diagrams
- **CBAN-11**: BE repo support — list controllers, map user journeys, list APIs, plot full API flow visually with stage summaries and click-to-code
- **CBAN-12**: DE repo support — list trigger scripts, map data flows, same visual treatment as BE repos
- **CBAN-13**: FE repo support — detect App.tsx/App.js entry point, visualize component tree and routing structure
- **CBAN-14**: Visually impressive UI with animations, transitions, and interactive elements throughout

### PromptBuilder (PMPT)

- **PMPT-01**: Create and edit prompt templates with variable placeholders
- **PMPT-02**: Prompt library with categories and search
- **PMPT-03**: Variable substitution preview — fill placeholders and see final prompt
- **PMPT-04**: Send constructed prompts to any configured AI agent
- **PMPT-05**: Prompt version history with diff between versions
- **PMPT-06**: Import/export prompts as JSON files
- **PMPT-07**: Prompt execution history with responses stored locally

## Traceability

| Requirement | Phase | Plan | Status |
|------------|-------|------|--------|
| SHELL-01 | 1 | 01-01 | Complete |
| SHELL-02 | 1 | 01-02 | Planned |
| SHELL-03 | 1 | 01-02 | Planned |
| SHELL-04 | 1 | 01-01 | Complete |
| SHELL-05 | 1 | 01-02 | Planned |
| SHELL-06 | 1 | 01-02 | Planned |
| SHELL-07 | 1 | 01-02 | Planned |
| SHELL-08 | 1 | 01-01 | Complete |
| SHELL-09 | 1 | 01-02 | Planned |
| PLUG-01 | 1 | 01-03 | Planned |
| PLUG-02 | 1 | 01-03 | Planned |
| PLUG-03 | 1 | 01-03 | Planned |
| SETT-01 | 1 | 01-04 | Complete |
| SETT-02 | 1 | 01-04 | Complete |
| SETT-03 | 1 | 01-04 | Complete |
| SETT-04 | 1 | 01-04 | Complete |
| SETT-05 | 1 | 01-04 | Complete |
| SETT-06 | 1 | 01-04 | Complete |
| AGENT-01 | 1 | 01-05 | Planned |
| AGENT-02 | 1 | 01-05 | Planned |
| AGENT-03 | 1 | 01-05 | Planned |
| AGENT-04 | 1 | 01-05 | Planned |
| DASH-01 | 2 | - | Planned |
| DASH-02 | 2 | - | Planned |
| DASH-03 | 2 | - | Planned |
| DASH-04 | 2 | - | Planned |
| DASH-05 | 2 | - | Planned |
| ACTV-01 | 2 | 02-01 | Complete |
| ACTV-02 | 2 | 02-01 | Complete |
| ACTV-03 | 2 | - | Planned |
| CRVW-01 | 3 | 03-01 | Complete |
| CRVW-02 | 3 | - | Planned |
| CRVW-03 | 3 | - | Planned |
| CRVW-04 | 3 | - | Planned |
| CRVW-05 | 3 | - | Planned |
| CRVW-06 | 3 | - | Planned |
| CRVW-07 | 3 | - | Planned |
| CRVW-08 | 3 | - | Planned |
| DBIS-01 | 4 | - | Planned |
| DBIS-02 | 4 | - | Planned |
| DBIS-03 | 4 | - | Planned |
| DBIS-04 | 4 | - | Planned |
| DBIS-05 | 4 | - | Planned |
| DBIS-06 | 4 | - | Planned |
| DBIS-07 | 4 | - | Planned |
| DBIS-08 | 4 | - | Planned |
| DBIS-09 | - | - | Deferred |
| ARPA-01 | 5 | - | Planned |
| ARPA-02 | 5 | - | Planned |
| ARPA-03 | 5 | - | Planned |
| ARPA-04 | 5 | - | Planned |
| ARPA-05 | 5 | - | Planned |
| ARPA-06 | 5 | - | Planned |
| LNCH-01 | 7 | 01 | Complete |
| LNCH-02 | 7 | 01 | Complete |
| LNCH-03 | 7 | 01 | Complete |
| LNCH-04 | 7 | 01 | Complete |
| LNCH-05 | 7 | 03 | Complete |
| LNCH-06 | 7 | 04 | Complete |
| LNCH-07 | 7 | 04 | Complete |
| LNCH-08 | 7 | 02 | Complete |
| LNCH-09 | 7 | 04 | Complete |
| LNCH-10 | 7 | 04 | Complete |
| NEBL-01 | 8 | 03 | Complete |
| NEBL-02 | 8 | 03 | Complete |
| NEBL-03 | 8 | 01 | Complete |
| NEBL-04 | 8 | 04 | Complete |
| NEBL-05 | 8 | 04 | Complete |
| NEBL-06 | 8 | 06 | Complete |
| NEBL-07 | 8 | 05 | Complete |
| NEBL-08 | 8 | 05 | Complete |
| NEBL-09 | 8 | 05 | Complete |
| NEBL-10 | 8 | 02 | Complete |
| NEBL-11 | 8 | 02 | Complete |
| NEBL-12 | 8 | 01 | Complete |
| TXCR-01 | 12 | 12-01 | Planned |
| TXCR-02 | 12 | 12-01 | Planned |
| TXCR-03 | 12 | 12-01 | Planned |
| TXCR-04 | 12 | 12-01 | Planned |
| TXCR-05 | 12 | 12-01 | Planned |
| TXCR-06 | 12 | 12-02 | Planned |
| TXCR-07 | 12 | 12-02 | Planned |
| TXCR-08 | 12 | 12-02 | Planned |
| TXCR-09 | 12 | 12-02 | Planned |
| TXCR-10 | 12 | 12-02 | Planned |
| CBAN-01 | 13 | 13-01, 13-03 | In Progress |
| CBAN-02 | 13 | 13-03 | Planned |
| CBAN-03 | 13 | 13-01, 13-02 | In Progress |
| CBAN-04 | 13 | 13-01 | Complete |
| CBAN-05 | 13 | 13-03, 13-05 | Planned |
| CBAN-06 | 13 | 13-04 | Planned |
| CBAN-07 | 13 | 13-05 | Planned |
| CBAN-08 | 13 | 13-05 | Planned |
| CBAN-09 | 13 | 13-06 | Planned |
| CBAN-10 | 13 | 13-06 | Planned |
| CBAN-11 | 13 | 13-02, 13-04 | Planned |
| CBAN-12 | 13 | 13-02, 13-04 | Planned |
| CBAN-13 | 13 | 13-02, 13-04 | Planned |
| CBAN-14 | 13 | 13-03, 13-04, 13-06 | Planned |
| PMPT-01 | 6 | - | Planned |
| PMPT-02 | 6 | - | Planned |
| PMPT-03 | 6 | - | Planned |
| PMPT-04 | 6 | - | Planned |
| PMPT-05 | 6 | - | Planned |
| PMPT-06 | 6 | - | Planned |
| PMPT-07 | 6 | - | Planned |
