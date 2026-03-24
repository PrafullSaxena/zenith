# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**LLM Providers:**
- **Claude (Anthropic)** - via Vercel AI SDK
  - SDK: `@ai-sdk/anthropic` 3.0.58
  - Auth: API key stored encrypted in `zenith-credentials` electron-store
  - Provider ID: `'claude'`
  - Location: `src/main/ai/providers.ts`

- **OpenAI (GPT)** - via Vercel AI SDK
  - SDK: `@ai-sdk/openai` 3.0.41
  - Auth: API key stored encrypted in `zenith-credentials` electron-store
  - Provider ID: `'opencode'` or `'codex'`
  - Location: `src/main/ai/providers.ts`

- **Google Gemini** - via Vercel AI SDK
  - SDK: `@ai-sdk/google` 3.0.43
  - Auth: API key stored encrypted in `zenith-credentials` electron-store
  - Provider ID: `'gemini'`
  - Location: `src/main/ai/providers.ts`

- **Ollama (Local/Self-Hosted)** - via ollama-ai-provider
  - SDK: `ollama-ai-provider` 1.2.0
  - Auth: Optional API key + custom base URL configuration
  - Provider ID: `'ollama'`
  - Location: `src/main/ai/providers.ts`
  - Base URL: Configurable via `agents.providers` settings

- **Custom/Proxy Providers** - OpenAI-compatible proxies
  - SDK: `@ai-sdk/openai` (compatibility mode)
  - Auth: Custom API key + base URL
  - Provider ID: `'cursor-agent'` or `'custom-*'`
  - Supported proxies: LiteLLM, OpenRouter
  - Location: `src/main/ai/providers.ts`

**Bitbucket Integration:**
- **Service:** Bitbucket Cloud API 2.0
- **Endpoint:** `https://api.bitbucket.org/2.0`
- **OAuth Flow:** Authorization Code Grant
  - Auth URL: `https://bitbucket.org/site/oauth2/authorize`
  - Token URL: `https://bitbucket.org/site/oauth2/access_token`
  - Redirect URI: `http://127.0.0.1/oauth/bitbucket/callback` (loopback)
- **Features:** PR listing, diff fetching, comments, approvals
- **HTTP Client:** Electron's `net.fetch` (Chromium networking stack)
- **Auth Storage:** Base64-encoded App Password stored encrypted via Electron's `safeStorage`
- **Location:** `src/main/bitbucket/` (api.ts, oauth.ts, token-manager.ts)

**Transcription Service:**
- **Service:** OpenAI Whisper API
- **SDK:** openai 6.27.0 (direct client)
- **Auth:** API key from credentials store
- **Location:** `src/main/nebula/transcription.ts`

## Data Storage

**Databases:**

**Local SQLite:**
- **Type:** SQLite with WAL mode and FTS5 full-text search
- **Client:** better-sqlite3 12.6.2
- **Location:** Cortex plugin cache database at `app.getPath('userData')/cortex/cache.db`
- **Usage:** Caching analysis results, digests, parsed code structures
- **File:** `src/main/cortex/cache-db.ts`

**Remote PostgreSQL:**
- **Type:** PostgreSQL
- **Client:** pg 8.20.0
- **Connection:** Host, port, username, password, database name, schema
- **Features:**
  - Read-only or read-write access modes
  - Support for custom schema selection
  - Query parameterization for SQL injection prevention
- **Location:** `src/main/db/postgres.ts`

**Remote MySQL:**
- **Type:** MySQL 5.7+
- **Client:** mysql2 3.19.1 (promise-based API)
- **Connection:** Host, port, username, password, database name
- **Features:**
  - Read-only or read-write access modes
  - Connection pooling
- **Location:** `src/main/db/mysql.ts`
- **Manager:** `UnifiedDbManager` routes to MySQL or PostgreSQL based on connection config

**File Storage:**
- **Repositories:** `app.getPath('userData')/cortex/repos/` - Local cloned Git repositories
- **Build Resources:** `resources/` directory - Bundled resources (icons, configs)
- **Application Data:** Electron-store JSON files in app user data directory
- **Credentials:** Encrypted via Electron's safeStorage API

**Caching:**
- **Type:** In-memory React Query cache (TanStack Query)
- **Library:** @tanstack/react-query 5.69.0
- **Location:** Renderer process, no persistent cache layer

## Authentication & Identity

**Auth Provider:**
- **Custom Implementation** - Multi-provider support through Vercel AI SDK
- **Credential Storage:**
  - LLM API keys: Encrypted via Electron's `safeStorage` → stored in `zenith-credentials` electron-store
  - Bitbucket App Password: Encrypted via Electron's `safeStorage` → stored in `zenith-credentials` electron-store
  - Database credentials: Encrypted and persisted per connection
- **Location:**
  - Provider instantiation: `src/main/ai/providers.ts`
  - IPC handlers: `src/main/ipc-handlers.ts`
  - Bitbucket token manager: `src/main/bitbucket/token-manager.ts`

**Credential Encryption:**
- **Method:** Electron safeStorage (OS-level encryption)
- **Fallback:** Returns `undefined` if encryption unavailable
- **Retrieval:** Decrypted on-demand when API calls are made

## Monitoring & Observability

**Error Tracking:**
- **Service:** Not detected — No Sentry, Rollbar, or similar configured
- **Local Logging:** Console output captured via `src/main/log-collector.ts`

**Logs:**
- **Approach:** Console.log/console.error captured in main process
- **Storage:** Likely persisted to user data directory (log-collector implementation)
- **Location:** `src/main/log-collector.ts`

## CI/CD & Deployment

**Hosting:**
- **Packaging:** Electron Builder 26.0.12
- **Targets:**
  - macOS: Universal (arm64 + x64) with code signing, DMG installer
  - Windows: NSIS installer (.exe)
  - Linux: AppImage, snap, deb packages
- **Configuration:** `electron-builder.yml` in project root
- **Publishing:** Generic provider (must configure URL in electron-builder.yml)

**CI Pipeline:**
- **Service:** Not detected — No GitHub Actions, GitLab CI, or similar in codebase
- **Build Scripts:** npm scripts in package.json
  - `npm run build` - Build with Vite
  - `npm run build:mac/win/linux` - Platform-specific builds

## Environment Configuration

**Required env vars (if configured):**
- `ELECTRON_RENDERER_URL` - Dev server URL (electron-vite sets automatically in dev mode)
- `NODE_ENV` - Inferred from electron-vite dev/build mode (not explicitly set)

**Secrets location:**
- **No `.env` files used** - All secrets encrypted via Electron's safeStorage
- Credentials persisted to named stores: `zenith-credentials`, `zenith-settings`
- Located in Electron app user data directory (OS-specific)
- **macOS:** `~/Library/Application Support/Zenith/`
- **Windows:** `%APPDATA%/Zenith/`
- **Linux:** `~/.config/Zenith/`

**Settings Retrieval:**
- `src/main/settings-store.ts` - Electron Store wrapper for persistent settings
- Access pattern: `getSetting('section.key')` across codebase

## Webhooks & Callbacks

**Incoming:**
- **Not detected** — No webhook servers or endpoints found in codebase

**Outgoing:**
- **Bitbucket OAuth Callback:**
  - Redirect: `http://127.0.0.1/oauth/bitbucket/callback`
  - Captured via BrowserWindow URL interception
  - Exchanged for access token via `net.fetch` POST to Bitbucket token endpoint
  - Location: `src/main/bitbucket/oauth.ts`

**Git Remotes (implicit):**
- Clone/fetch/pull operations via simple-git
- Location: `src/main/cortex/git-service.ts`

## External Code Repositories

**Git Integration:**
- **Service:** GitHub/GitLab/Bitbucket (via SSH or HTTPS)
- **Client:** simple-git 3.33.0 (wraps native git CLI)
- **Auth:** SSH keys or HTTPS credentials (managed by system git config)
- **Operations:** Clone, fetch, pull, log, diff
- **Location:** `src/main/cortex/git-service.ts`
- **Terminal Prompt Suppression:** `GIT_TERMINAL_PROMPT=0` prevents hanging on auth prompts

## Third-Party CDNs & Resources

**Tldraw Assets:**
- **CDN:** https://cdn.tldraw.com
- **Usage:** Tldraw library assets (fonts, images)
- **CSP Whitelist:** Allowed in Content-Security-Policy headers (`img-src`, `font-src`)
- **Location:** `src/main/index.ts` (CSP definition)

---

*Integration audit: 2026-03-24*
