/**
 * AI review streaming module (SDK-based).
 * Orchestrates AI code review via Vercel AI SDK and forwards tokens
 * to the renderer process via IPC (webContents.send).
 *
 * For CLI-based providers, see cli-stream.ts.
 *
 * Channels:
 *   ai:stream:chunk  - { sessionId, chunk }  per token
 *   ai:stream:done   - { sessionId }         on completion
 *   ai:stream:error  - { sessionId, error }  on failure
 */

import type { BrowserWindow } from 'electron'
import { streamText } from 'ai'
import { createModel, getApiKeyForProvider, getBaseUrlForProvider } from './providers'

/**
 * Safely send an IPC message to the renderer.
 * Guards against the window being destroyed between the check and the send
 * (race condition), and swallows any resulting errors so the main process
 * doesn't crash with EPIPE / ERR_IPC_CHANNEL_CLOSED.
 */
function safeSend(win: BrowserWindow, channel: string, data: unknown): boolean {
  try {
    if (win.isDestroyed() || !win.webContents) return false
    win.webContents.send(channel, data)
    return true
  } catch {
    return false
  }
}

/** Active SDK review sessions keyed by sessionId, used for cancellation. */
const activeSdkSessions = new Map<string, AbortController>()

/**
 * Stream an AI code review using the Vercel AI SDK.
 */
export async function streamReview(params: {
  mainWindow: BrowserWindow
  diff: string
  providerId: string
  modelName: string
  sessionId: string
  guidelines?: string
}): Promise<void> {
  const { mainWindow, diff, providerId, modelName, sessionId, guidelines } = params

  const controller = new AbortController()
  activeSdkSessions.set(sessionId, controller)

  // Build structured review prompt — TOON (Token-Optimized Output Notation)
  let systemPrompt = `You are a senior code reviewer. Analyze the unified diff and report issues.

OUTPUT: One finding per line, 7 pipe-separated fields:
SEV|CONF|KIND|FILE:LINE|TITLE|EXPLANATION|FIX

SEV: B=blocking I=important S=suggestion
CONF: H=high M=medium L=low
KIND: bug sec perf cor mnt test sty

After all findings, output a line "---" then a 2-3 sentence summary.

RULES:
- Exact file paths from diff headers (strip a/ b/ prefix)
- LINE = new-file line number (from + lines)
- TITLE ≤10 words, EXPLANATION ≤30 words, FIX ≤20 words
- Max 10 findings, ordered by severity desc
- Skip pure style nits unless they harm readability
- No markdown, no JSON, no code fences`

  if (guidelines?.trim()) {
    systemPrompt += `\n\nREVIEW GUIDELINES (provided by the team — prioritize these):\n${guidelines.trim()}`
  }

  try {
    const apiKey = await getApiKeyForProvider(providerId)
    const baseUrl = getBaseUrlForProvider(providerId)
    const model = createModel(providerId, modelName, apiKey, baseUrl)

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: diff,
      abortSignal: controller.signal
    })

    for await (const chunk of result.textStream) {
      if (!safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk })) break
    }

    // Capture token usage from the SDK (exact count)
    let totalTokens = 0
    try {
      const usage = await result.usage
      totalTokens = usage?.totalTokens ?? 0
    } catch { /* usage not available — that's fine */ }

    safeSend(mainWindow, 'ai:stream:done', {
      sessionId,
      usage: totalTokens > 0 ? { totalTokens, isEstimated: false } : undefined
    })
  } catch (err: unknown) {
    // AbortError is expected when the user cancels -- do not send as error
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }

    const message = err instanceof Error ? err.message : String(err)
    safeSend(mainWindow, 'ai:stream:error', { sessionId, error: message })
  } finally {
    activeSdkSessions.delete(sessionId)
  }
}

/**
 * Cancel an in-progress SDK review session.
 */
export function cancelSdkReview(sessionId: string): void {
  const controller = activeSdkSessions.get(sessionId)
  if (controller) {
    controller.abort()
    activeSdkSessions.delete(sessionId)
  }
}

/**
 * Stream a generic AI analysis using the Vercel AI SDK.
 * Unlike streamReview(), this accepts separate systemPrompt and userPrompt parameters
 * making it reusable for Database Q&A, Query Optimization, and other future features.
 */
export async function streamAnalysis(params: {
  mainWindow: BrowserWindow
  systemPrompt: string
  userPrompt: string
  providerId: string
  modelName: string
  sessionId: string
}): Promise<void> {
  const { mainWindow, systemPrompt, userPrompt, providerId, modelName, sessionId } = params

  const controller = new AbortController()
  activeSdkSessions.set(sessionId, controller)

  try {
    const apiKey = await getApiKeyForProvider(providerId)
    const baseUrl = getBaseUrlForProvider(providerId)
    const model = createModel(providerId, modelName, apiKey, baseUrl)

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: controller.signal
    })

    for await (const chunk of result.textStream) {
      if (!safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk })) break
    }

    // Capture token usage from the SDK (exact count)
    let totalTokens = 0
    try {
      const usage = await result.usage
      totalTokens = usage?.totalTokens ?? 0
    } catch { /* usage not available — that's fine */ }

    safeSend(mainWindow, 'ai:stream:done', {
      sessionId,
      usage: totalTokens > 0 ? { totalTokens, isEstimated: false } : undefined
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }

    const message = err instanceof Error ? err.message : String(err)
    safeSend(mainWindow, 'ai:stream:error', { sessionId, error: message })
  } finally {
    activeSdkSessions.delete(sessionId)
  }
}
