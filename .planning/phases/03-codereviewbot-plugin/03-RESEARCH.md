# Phase 3: CodeReviewBot Plugin - Research

**Researched:** 2026-03-07
**Domain:** Bitbucket OAuth + REST API, AI streaming via Electron IPC, diff parsing and rendering
**Confidence:** MEDIUM (Bitbucket API details verified from official docs; AI-over-IPC streaming pattern is novel and needs spike; Vercel AI SDK Node.js usage confirmed but untested in Electron main process)

## Summary

Phase 3 implements the first real plugin: CodeReviewBot. This involves three major technical domains that must integrate seamlessly: (1) Bitbucket Cloud OAuth 2.0 + REST API for PR listing, diff fetching, and inline comment posting, (2) AI provider streaming in the Electron main process with token-by-token forwarding to the renderer via IPC, and (3) diff parsing and inline rendering in the React UI.

The Bitbucket Cloud REST API v2.0 is well-documented with clear OAuth 2.0 authorization code grant flow, PR listing, diff retrieval (raw unified diff format), and inline comment posting endpoints. The OAuth flow in Electron uses a BrowserWindow popup with loopback redirect interception via `webRequest.onBeforeRequest` -- no local HTTP server needed. Bitbucket Cloud supports loopback redirect URIs (`http://127.0.0.1`) with dynamic ports per RFC 8252.

The AI streaming pattern is the most novel aspect. The Vercel AI SDK (`ai` npm package) provides a unified `streamText()` function that works in pure Node.js (confirmed in official docs) and supports Anthropic, Google, and Ollama via provider packages (`@ai-sdk/anthropic`, `@ai-sdk/google`, `ollama-ai-provider`). The main process runs `streamText()`, iterates the `textStream` async iterable, and forwards each chunk to the renderer via `webContents.send()`. The renderer listens through a `contextBridge`-exposed `ipcRenderer.on()` callback. This eliminates the need to integrate individual provider SDKs directly.

**Primary recommendation:** Use the Vercel AI SDK in the Electron main process for unified AI streaming, `parse-diff` for structured diff parsing, and a custom React diff viewer (not diff2html) to maintain design consistency with the dark neon cyan theme. All Bitbucket API calls and AI inference run in the main process; the renderer is purely UI.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRVW-01 | Connect to Bitbucket via OAuth 2.0 with secure token storage (safeStorage) | OAuth 2.0 authorization code grant via BrowserWindow popup + loopback redirect interception; tokens stored via existing safeStorage/credentials IPC; access tokens expire in 1 hour, refresh tokens persist |
| CRVW-02 | List open PRs from configured Bitbucket repositories | `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN` -- paginated response with PR metadata |
| CRVW-03 | Fetch PR diff (file-by-file) for selected pull request | `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}/diff` returns raw unified diff; parse with `parse-diff` to get per-file hunks |
| CRVW-04 | Send diff to configured AI agent for code review analysis | Vercel AI SDK `streamText()` in main process with system prompt + diff content; provider resolved from agent store configuration |
| CRVW-05 | AI streams review comments token-by-token via Electron IPC | Main process iterates `textStream` async iterable, calls `webContents.send('ai:stream:chunk', data)` per token; renderer listens via exposed `window.api.ai.onStreamChunk(callback)` |
| CRVW-06 | Display AI review comments inline alongside diff view | Custom React diff viewer component rendering parsed diff with inline AI comment panels; no external diff UI library (diff2html is jQuery-oriented) |
| CRVW-07 | Post AI-generated review comments back to Bitbucket PR as inline comments | `POST /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}/comments` with `{ content: { raw }, inline: { path, from } }` body |
| CRVW-08 | Review history -- store past reviews with timestamps, PR links, comment counts | Extend activity store pattern + dedicated review history in electron-store; entries keyed by PR id with timestamps and comment metadata |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^4.x | Unified AI streaming (`streamText`, `generateText`) | Single API for all providers; Node.js native; eliminates per-provider SDK boilerplate |
| `@ai-sdk/anthropic` | ^1.x | Anthropic provider for Vercel AI SDK | Official provider package for Claude models |
| `@ai-sdk/google` | ^1.x | Google provider for Vercel AI SDK | Official provider package for Gemini models |
| `ollama-ai-provider` | ^1.x | Ollama provider for Vercel AI SDK | Community provider for local Ollama models |
| `parse-diff` | ^0.11.x | Parse unified diff format into structured JSON | Lightweight, focused, 113+ dependents; returns file/hunk/change objects directly |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/openai` | ^1.x | OpenAI-compatible provider | For Codex, Opencode, and custom OpenAI-compatible endpoints |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Direct provider SDKs (@anthropic-ai/sdk, @google/genai, ollama) | More control per-provider but 3x integration work; must handle streaming differences per provider |
| `parse-diff` | `diff2html` | diff2html is heavier (includes HTML rendering, highlight.js); we only need parsing -- rendering is custom React |
| Custom React diff viewer | `diff2html` HTML output | diff2html generates its own HTML/CSS that clashes with dark theme; custom viewer integrates natively with Tailwind/neon cyan design system |
| BrowserWindow OAuth popup | System browser + custom protocol handler | System browser is more robust for some OAuth flows, but BrowserWindow + webRequest interception is simpler in Electron, avoids protocol registration complexity |

**Installation:**
```bash
# Main process (AI + providers)
npm install ai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai ollama-ai-provider

# Renderer (diff parsing)
npm install parse-diff
```

Note: `parse-diff` is safe for renderer since it is a pure parser with no Node.js dependencies. AI SDK packages are main-process-only (they use Node.js APIs like `fetch` streams).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── ipc-handlers.ts          # Extended with bitbucket:*, ai:* channels
│   ├── settings-store.ts        # Extended with review history defaults
│   ├── bitbucket/
│   │   ├── oauth.ts             # OAuth 2.0 BrowserWindow flow + token management
│   │   ├── api.ts               # Bitbucket REST API client (PRs, diffs, comments)
│   │   └── types.ts             # Bitbucket API response types
│   └── ai/
│       ├── stream.ts            # Vercel AI SDK streamText wrapper + IPC forwarding
│       └── providers.ts         # Provider factory from agent store config
├── preload/
│   └── index.ts                 # Extended: bitbucket + ai namespaces on window.api
├── renderer/src/
│   ├── plugins/
│   │   └── code-review-bot/
│   │       ├── CodeReviewBotView.tsx   # Main plugin view (replaces stub)
│   │       ├── PRList.tsx              # Pull request list component
│   │       ├── PRDiffView.tsx          # Diff viewer with inline AI comments
│   │       ├── ReviewPanel.tsx         # AI review streaming panel
│   │       └── ReviewHistory.tsx       # Past reviews list
│   ├── stores/
│   │   └── review-store.ts            # Zustand store for review state + history
│   └── types/
│       ├── bitbucket.ts               # PR, diff, comment types (renderer-side)
│       └── review.ts                  # Review session types
```

### Pattern 1: OAuth 2.0 BrowserWindow Flow
**What:** Open a BrowserWindow popup for Bitbucket login, intercept the redirect to extract the authorization code, exchange for tokens in main process, store securely.
**When to use:** Initial Bitbucket connection and re-authorization.
**Example:**
```typescript
// Source: Electron docs + Bitbucket OAuth 2.0 docs
// src/main/bitbucket/oauth.ts

import { BrowserWindow } from 'electron'

const BITBUCKET_AUTH_URL = 'https://bitbucket.org/site/oauth2/authorize'
const BITBUCKET_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token'
const REDIRECT_URI = 'http://127.0.0.1/oauth/bitbucket/callback'

export async function startOAuthFlow(clientId: string, clientSecret: string): Promise<TokenPair> {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 800, height: 600,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    const authUrl = `${BITBUCKET_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    authWindow.loadURL(authUrl)

    // Intercept the redirect before it resolves
    const filter = { urls: [`${REDIRECT_URI}*`] }
    authWindow.webContents.session.webRequest.onBeforeRequest(filter, async ({ url }, callback) => {
      const code = new URL(url).searchParams.get('code')
      callback({ cancel: true }) // Prevent actual navigation
      authWindow.close()

      if (code) {
        const tokens = await exchangeCodeForTokens(code, clientId, clientSecret)
        resolve(tokens)
      } else {
        reject(new Error('No authorization code received'))
      }
    })

    authWindow.on('closed', () => reject(new Error('Auth window closed')))
  })
}
```

### Pattern 2: AI Streaming via IPC (Main-to-Renderer)
**What:** Main process runs AI inference via Vercel AI SDK, streams tokens to renderer via `webContents.send()`, renderer accumulates via `ipcRenderer.on()` exposed through contextBridge.
**When to use:** Every AI review operation.
**Example:**
```typescript
// Source: Electron IPC docs + Vercel AI SDK docs
// src/main/ai/stream.ts

import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function streamReview(
  mainWindow: BrowserWindow,
  diff: string,
  model: LanguageModel,
  sessionId: string
): Promise<void> {
  const { textStream } = streamText({
    model,
    system: 'You are a senior code reviewer. Review the following diff...',
    prompt: diff,
  })

  for await (const chunk of textStream) {
    mainWindow.webContents.send('ai:stream:chunk', { sessionId, chunk })
  }
  mainWindow.webContents.send('ai:stream:done', { sessionId })
}

// src/preload/index.ts (addition)
// ai: {
//   onStreamChunk: (cb: (data: { sessionId: string; chunk: string }) => void) =>
//     ipcRenderer.on('ai:stream:chunk', (_e, data) => cb(data)),
//   onStreamDone: (cb: (data: { sessionId: string }) => void) =>
//     ipcRenderer.on('ai:stream:done', (_e, data) => cb(data)),
//   removeStreamListeners: () => {
//     ipcRenderer.removeAllListeners('ai:stream:chunk')
//     ipcRenderer.removeAllListeners('ai:stream:done')
//   },
//   startReview: (prId: string) => ipcRenderer.invoke('ai:startReview', prId),
// }
```

### Pattern 3: Bitbucket API Client in Main Process
**What:** All Bitbucket HTTP calls happen in the main process (which has unrestricted network access). Results are sent to renderer via IPC handle/invoke.
**When to use:** PR listing, diff fetching, comment posting.
**Example:**
```typescript
// src/main/bitbucket/api.ts
const BB_API = 'https://api.bitbucket.org/2.0'

export async function listOpenPRs(
  workspace: string,
  repoSlug: string,
  accessToken: string
): Promise<PullRequest[]> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests?state=OPEN`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await response.json()
  return data.values // paginated results
}

export async function getPRDiff(
  workspace: string, repoSlug: string, prId: number, accessToken: string
): Promise<string> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return response.text() // Raw unified diff
}

export async function postInlineComment(
  workspace: string, repoSlug: string, prId: number,
  accessToken: string, filePath: string, line: number, comment: string
): Promise<void> {
  await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { raw: comment },
        inline: { path: filePath, to: line },
      }),
    }
  )
}
```

### Pattern 4: Cleanup for IPC Event Listeners
**What:** The renderer must remove `ipcRenderer.on()` listeners when components unmount to prevent memory leaks and ghost handlers.
**When to use:** Every component that subscribes to streaming events.
**Example:**
```typescript
// In the React component:
useEffect(() => {
  window.api.ai.onStreamChunk((data) => {
    setReviewText(prev => prev + data.chunk)
  })
  window.api.ai.onStreamDone(() => {
    setIsStreaming(false)
  })
  return () => {
    window.api.ai.removeStreamListeners()
  }
}, [])
```

### Anti-Patterns to Avoid
- **Running AI SDK in renderer:** The renderer is sandboxed (sandbox=true) and has no Node.js APIs. All AI calls MUST go through the main process via IPC.
- **Storing tokens in renderer:** OAuth tokens must stay in main process via safeStorage. Never expose raw tokens to the renderer.
- **Polling for stream data:** Do NOT poll from renderer. Use push-based `webContents.send()` from main.
- **Using diff2html directly:** diff2html generates its own HTML/CSS with inline styles that fight the dark theme. Parse the diff separately and render with custom React components.
- **Forgetting to remove IPC listeners:** `ipcRenderer.on()` creates persistent listeners. Must cleanup on unmount or risk duplicate handlers on re-renders.
- **Skipping token refresh:** Bitbucket access tokens expire in 1 hour. Must implement automatic refresh using the refresh token before API calls fail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unified diff parsing | Custom regex parser for diff format | `parse-diff` | Diff format has edge cases (binary files, renames, mode changes, no-newline-at-EOF markers); parse-diff handles them all |
| AI provider abstraction | Custom wrapper per provider (Claude SDK, Gemini SDK, Ollama REST) | Vercel AI SDK (`ai` + provider packages) | Unified `streamText()` API across all providers; handles streaming protocol differences, error normalization, token counting |
| OAuth 2.0 token management | Custom token refresh logic | Encapsulated token manager with auto-refresh | Token refresh timing, error handling, concurrent request coordination are deceptively complex |
| Relative time formatting | Custom date diffing | `Intl.RelativeTimeFormat` (already used in Phase 2 `utils.ts`) | Built-in browser API, no library needed, already established pattern |

**Key insight:** The three hardest integration points (diff parsing, multi-provider AI streaming, and OAuth token lifecycle) each have robust solutions that handle edge cases we'd inevitably miss in hand-rolled implementations.

## Common Pitfalls

### Pitfall 1: Bitbucket Token Expiry During Long Reviews
**What goes wrong:** User starts a review, takes 90 minutes reading AI output, then tries to post comments back to Bitbucket. The access token (1-hour expiry) has expired and the POST fails.
**Why it happens:** Bitbucket access tokens expire after 1 hour. Long review sessions outlast the token.
**How to avoid:** Implement a token manager that automatically refreshes before expiry. Before every Bitbucket API call, check `tokenExpiresAt - Date.now() < 5_MINUTES` and refresh proactively.
**Warning signs:** 401 responses from Bitbucket API after the app has been open for a while.

### Pitfall 2: IPC Listener Accumulation
**What goes wrong:** Every time the user navigates to the review view and back, new `ipcRenderer.on()` listeners are added without removing old ones. After several navigations, each streaming chunk triggers multiple callbacks.
**Why it happens:** React component mounts register listeners, but unmount cleanup is missing or incorrect.
**How to avoid:** Always return a cleanup function from `useEffect` that calls `removeAllListeners` for the specific channel. Use the exposed `removeStreamListeners()` API method.
**Warning signs:** Duplicate AI text appearing in the UI, increasing memory usage over time.

### Pitfall 3: CSP Blocking Bitbucket API Calls from Renderer
**What goes wrong:** If Bitbucket API calls are accidentally attempted from the renderer (fetch in React component), CSP blocks them because `connect-src` is `'self'`.
**Why it happens:** Developer forgets that all external HTTP calls must go through main process IPC.
**How to avoid:** Never make fetch calls from renderer to external APIs. All external calls go through `ipcMain.handle` -> main process fetch -> return result to renderer.
**Warning signs:** CSP violation errors in DevTools console.

### Pitfall 4: Large Diff Overloading AI Context Window
**What goes wrong:** User selects a PR with 50+ changed files and 10,000+ lines of diff. The entire diff is sent to the AI, exceeding context limits or producing garbage output.
**Why it happens:** No diff size management or chunking strategy.
**How to avoid:** Parse the diff into per-file chunks. Send files individually or in small batches. Show a warning for very large PRs. Consider a file selector to let users choose which files to review.
**Warning signs:** AI responses that cut off mid-sentence, API errors about token limits, very slow responses.

### Pitfall 5: OAuth Popup Blocked or Lost
**What goes wrong:** The BrowserWindow for OAuth opens but the user doesn't see it (behind main window), or macOS security prompts interfere.
**Why it happens:** BrowserWindow creation without proper `parent` and focus management.
**How to avoid:** Set `parent: mainWindow` and call `authWindow.focus()` after creation. Handle the `'closed'` event to reject the promise and show an error in the UI.
**Warning signs:** User clicks "Connect" but nothing visible happens.

### Pitfall 6: Inline Comment `to` vs `from` Confusion
**What goes wrong:** Comments appear on wrong lines or the API returns errors.
**Why it happens:** Bitbucket's inline comment API has confusing semantics: `from` is the old-file line number, `to` is the new-file line number. For added lines (which is what you comment on in a review), use `to` only. If both `from` and `to` are provided, Bitbucket may behave unexpectedly.
**How to avoid:** For new/modified lines, use `{ inline: { path, to: lineNumber } }`. For deleted lines, use `{ inline: { path, from: lineNumber } }`. Never send both.
**Warning signs:** Comments appearing on the wrong side of the diff or on unexpected lines.

## Code Examples

Verified patterns from official sources:

### Bitbucket OAuth 2.0 Token Exchange
```typescript
// Source: https://developer.atlassian.com/cloud/bitbucket/oauth-2/
async function exchangeCodeForTokens(
  code: string, clientId: string, clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch('https://bitbucket.org/site/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })
  return response.json()
}
```

### Bitbucket Token Refresh
```typescript
// Source: https://developer.atlassian.com/cloud/bitbucket/oauth-2/
async function refreshAccessToken(
  refreshToken: string, clientId: string, clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch('https://bitbucket.org/site/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  return response.json()
}
```

### parse-diff Usage
```typescript
// Source: https://github.com/sergeyt/parse-diff
import parseDiff from 'parse-diff'

const files = parseDiff(rawDiffString)
// files: Array<{
//   from: string,     // old file path
//   to: string,       // new file path
//   chunks: Array<{
//     content: string, // chunk header (@@...@@)
//     changes: Array<{
//       type: 'add' | 'del' | 'normal',
//       ln?: number,   // line number (for add/normal)
//       ln1?: number,  // old line number (for del)
//       ln2?: number,  // new line number (for normal)
//       content: string
//     }>
//   }>,
//   additions: number,
//   deletions: number
// }>
```

### Vercel AI SDK streamText in Main Process
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { ollama } from 'ollama-ai-provider'

// Provider factory based on agent store config
function getModel(providerId: string, modelName: string, apiKey?: string) {
  switch (providerId) {
    case 'claude':
      return anthropic(modelName, { apiKey })
    case 'gemini':
      return google(modelName, { apiKey })
    case 'ollama':
      return ollama(modelName) // No API key needed
    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}

// Stream a review
async function* reviewDiff(diff: string, model: LanguageModel) {
  const { textStream } = streamText({
    model,
    system: `You are a senior code reviewer. Analyze the diff and provide:
1. Summary of changes
2. Potential bugs or issues
3. Suggestions for improvement
Format each comment with the file path and line number.`,
    prompt: diff,
  })
  for await (const chunk of textStream) {
    yield chunk
  }
}
```

### Preload Bridge Extension
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/ipc
// Addition to src/preload/index.ts
contextBridge.exposeInMainWorld('api', {
  // ... existing settings, credentials, app namespaces ...
  bitbucket: {
    connect: () => ipcRenderer.invoke('bitbucket:connect'),
    disconnect: () => ipcRenderer.invoke('bitbucket:disconnect'),
    isConnected: () => ipcRenderer.invoke('bitbucket:isConnected'),
    listPRs: (workspace: string, repoSlug: string) =>
      ipcRenderer.invoke('bitbucket:listPRs', workspace, repoSlug),
    getPRDiff: (workspace: string, repoSlug: string, prId: number) =>
      ipcRenderer.invoke('bitbucket:getPRDiff', workspace, repoSlug, prId),
    postComment: (workspace: string, repoSlug: string, prId: number,
                  filePath: string, line: number, comment: string) =>
      ipcRenderer.invoke('bitbucket:postComment', workspace, repoSlug, prId,
                          filePath, line, comment),
  },
  ai: {
    startReview: (prId: number, diff: string) =>
      ipcRenderer.invoke('ai:startReview', prId, diff),
    cancelReview: (sessionId: string) =>
      ipcRenderer.invoke('ai:cancelReview', sessionId),
    onStreamChunk: (cb: (data: { sessionId: string; chunk: string }) => void) =>
      ipcRenderer.on('ai:stream:chunk', (_e, data) => cb(data)),
    onStreamDone: (cb: (data: { sessionId: string }) => void) =>
      ipcRenderer.on('ai:stream:done', (_e, data) => cb(data)),
    onStreamError: (cb: (data: { sessionId: string; error: string }) => void) =>
      ipcRenderer.on('ai:stream:error', (_e, data) => cb(data)),
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('ai:stream:chunk')
      ipcRenderer.removeAllListeners('ai:stream:done')
      ipcRenderer.removeAllListeners('ai:stream:error')
    },
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual AI provider SDKs | Vercel AI SDK unified interface | 2024-2025 | Single `streamText()` call works across 50+ providers; eliminates per-provider integration |
| `electron-oauth2` library | Direct BrowserWindow + webRequest interception | 2023+ | electron-oauth2 is unmaintained; native approach is simpler and requires no dependency |
| Bitbucket OAuth 1.0 | Bitbucket OAuth 2.0 only | Feb 27, 2026 (OAuth 1.0 retirement) | OAuth 1.0 is being retired by Bitbucket; new implementations MUST use OAuth 2.0 |
| `@google/generative-ai` SDK | `@google/genai` or Vercel AI SDK `@ai-sdk/google` | 2025 | Legacy Google AI SDK no longer receives Gemini 2.0+ features |
| diff2html for full rendering | parse-diff for data + custom React rendering | Ongoing | Separation of parsing and rendering gives full UI control |

**Deprecated/outdated:**
- `keytar`: Deprecated. Use `safeStorage` (already established in Phase 1).
- `electron-oauth2`: Unmaintained since 2020. Use native BrowserWindow approach.
- `@google/generative-ai`: Legacy SDK. Use `@ai-sdk/google` through Vercel AI SDK.
- Bitbucket OAuth 1.0: Retiring February 27, 2026. Must use OAuth 2.0.

## Open Questions

1. **Bitbucket OAuth Consumer Client ID/Secret Storage**
   - What we know: The OAuth consumer requires a client_id and client_secret. The client_secret should not be hardcoded.
   - What's unclear: Whether to store these as settings fields the user fills in (they create their own OAuth consumer in Bitbucket workspace settings) or ship pre-configured credentials.
   - Recommendation: Since this is a personal tool (audience of one), have the user create their own OAuth consumer and enter the client_id + client_secret in plugin settings. Store the secret via safeStorage alongside the tokens. This avoids shipping embedded secrets and is the standard pattern for desktop OAuth apps.

2. **Vercel AI SDK in Electron Main Process -- Untested**
   - What we know: The AI SDK docs list Node.js as a supported runtime. The `streamText` function returns an async iterable that should work in any Node.js environment.
   - What's unclear: Whether the AI SDK has any implicit dependencies (like HTTP server APIs) that conflict with Electron's main process environment.
   - Recommendation: Build an early spike (first task of first plan) that installs the AI SDK, creates a simple `streamText` call in the main process, and verifies it streams successfully. If it fails, fall back to direct provider SDK usage.

3. **AI Review Output Format -- Structured vs Freeform**
   - What we know: The AI needs to produce comments that map to specific files and line numbers for CRVW-07 (posting inline comments back to Bitbucket).
   - What's unclear: Whether to use structured output (JSON schema) or parse freeform text for file/line references.
   - Recommendation: Use the AI SDK's `system` prompt to instruct the model to output structured JSON with `{ file, line, comment, severity }` entries. Parse the accumulated stream as JSON after completion. This is more reliable than regex-parsing freeform text.

4. **Diff Size Limits for AI Context**
   - What we know: Large PRs can generate diffs exceeding AI context windows (Claude: 200K tokens, Gemini: 1M tokens, Ollama: varies by model).
   - What's unclear: The optimal chunking strategy for very large diffs.
   - Recommendation: Parse the diff into per-file chunks. Review files individually. Show a warning for PRs with >20 files or >5000 total changed lines. Allow the user to select which files to review.

## Sources

### Primary (HIGH confidence)
- [Bitbucket OAuth 2.0 Documentation](https://developer.atlassian.com/cloud/bitbucket/oauth-2/) - Authorization code grant flow, token exchange, refresh tokens
- [Bitbucket Cloud REST API Scopes](https://developer.atlassian.com/cloud/bitbucket/bitbucket-cloud-rest-api-scopes/) - `pullrequest` scope (read + comment), `pullrequest:write` scope
- [Bitbucket Cloud REST API - Pull Requests](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/) - PR listing, diff, comment endpoints
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) - webContents.send, ipcRenderer.on, contextBridge patterns
- [Vercel AI SDK Introduction](https://ai-sdk.dev/docs/introduction) - Node.js support, streamText API, provider packages
- [Vercel AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Function signature, textStream property

### Secondary (MEDIUM confidence)
- [Bitbucket Loopback Redirect URI Support](https://community.atlassian.com/forums/Bitbucket-questions/OAuth-should-ignore-port-for-loopback-redirect-URIs/qaq-p/2168184) - Confirmed loopback URI support with dynamic ports
- [Electron OAuth Flow Blog](https://pradyothkukkapalli.com/tech/electron-oauth/) - BrowserWindow + webRequest.onBeforeRequest interception pattern
- [Bitbucket Inline Comments Community Thread](https://community.developer.atlassian.com/t/api-post-endpoint-for-inline-pull-request-comments/60452) - Inline comment JSON structure with path/from/to
- [diff2html GitHub](https://github.com/rtfpessoa/diff2html) - TypeScript support, line-by-line and side-by-side modes
- [parse-diff GitHub](https://github.com/sergeyt/parse-diff) - Unified diff parser API

### Tertiary (LOW confidence)
- AI SDK in Electron main process: No verified source confirms it works in Electron specifically. Node.js support is confirmed, but Electron main process has some differences. Needs spike validation.
- Bitbucket inline comment `from` vs `to` semantics: Documented in community threads but not clearly in official API reference. The behavior of sending both fields simultaneously is described inconsistently across sources.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Vercel AI SDK is well-documented for Node.js but untested in Electron main process; parse-diff is stable and simple; Bitbucket API is well-documented
- Architecture: HIGH - The patterns (BrowserWindow OAuth, IPC streaming, main-process-only external calls) are established Electron patterns verified in official docs
- Pitfalls: HIGH - Token expiry, IPC listener leaks, CSP blocking, and diff size limits are well-known issues with clear mitigations
- Bitbucket API: HIGH - Official documentation is comprehensive; scopes, endpoints, and JSON structures are verified
- AI streaming via IPC: MEDIUM - The Electron IPC pattern is standard, but forwarding Vercel AI SDK streams over IPC at token granularity is a novel composition that needs spike validation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- Bitbucket API and Vercel AI SDK are stable; OAuth 1.0 retirement date is fixed)
