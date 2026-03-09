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
| DBIS-09 | 4 | - | Planned |
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
| PMPT-01 | 6 | - | Planned |
| PMPT-02 | 6 | - | Planned |
| PMPT-03 | 6 | - | Planned |
| PMPT-04 | 6 | - | Planned |
| PMPT-05 | 6 | - | Planned |
| PMPT-06 | 6 | - | Planned |
| PMPT-07 | 6 | - | Planned |
