/**
 * AI review streaming module.
 * Orchestrates AI code review via Vercel AI SDK and forwards tokens
 * to the renderer process via IPC (webContents.send).
 *
 * Channels:
 *   ai:stream:chunk  - { sessionId, chunk }  per token
 *   ai:stream:done   - { sessionId }         on completion
 *   ai:stream:error  - { sessionId, error }  on failure
 */

import type { BrowserWindow } from 'electron'
import { streamText } from 'ai'
import { createModel, getApiKeyForProvider } from './providers'

/** Active review sessions keyed by sessionId, used for cancellation. */
const activeSessions = new Map<string, AbortController>()

/**
 * Stream an AI code review for the given diff.
 *
 * 1. Creates an AbortController for cancellation support.
 * 2. Resolves the API key from the credentials store.
 * 3. Constructs the LanguageModel via the provider factory.
 * 4. Calls streamText() and iterates the textStream async iterable.
 * 5. Forwards each chunk to the renderer via webContents.send().
 * 6. Sends a done event when the stream completes.
 * 7. Sends an error event on failure.
 */
export async function streamReview(params: {
  mainWindow: BrowserWindow
  diff: string
  providerId: string
  modelName: string
  sessionId: string
}): Promise<void> {
  const { mainWindow, diff, providerId, modelName, sessionId } = params

  const controller = new AbortController()
  activeSessions.set(sessionId, controller)

  try {
    const apiKey = await getApiKeyForProvider(providerId)
    const model = createModel(providerId, modelName, apiKey)

    const { textStream } = streamText({
      model,
      system: `You are a senior code reviewer. Analyze the following unified diff and provide a structured code review.

For each issue found, output a JSON object on its own line with this format:
{"file": "path/to/file", "line": number, "severity": "critical"|"warning"|"suggestion", "comment": "description"}

After all file-specific comments, provide a brief overall summary.

Be concise. Focus on bugs, security issues, performance problems, and code quality.`,
      prompt: diff,
      abortSignal: controller.signal
    })

    for await (const chunk of textStream) {
      if (mainWindow.isDestroyed()) break
      mainWindow.webContents.send('ai:stream:chunk', { sessionId, chunk })
    }

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:stream:done', { sessionId })
    }
  } catch (err: unknown) {
    // AbortError is expected when the user cancels -- do not send as error
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }

    if (!mainWindow.isDestroyed()) {
      const message = err instanceof Error ? err.message : String(err)
      mainWindow.webContents.send('ai:stream:error', { sessionId, error: message })
    }
  } finally {
    activeSessions.delete(sessionId)
  }
}

/**
 * Cancel an in-progress review session.
 * Aborts the underlying AI stream via AbortController.
 */
export function cancelReview(sessionId: string): void {
  const controller = activeSessions.get(sessionId)
  if (controller) {
    controller.abort()
    activeSessions.delete(sessionId)
  }
}
