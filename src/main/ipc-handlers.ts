import { ipcMain, safeStorage, BrowserWindow } from 'electron'
import Store from 'electron-store'
import { getSettings, getSetting, setSetting, resetSettings } from './settings-store'
import { TokenManager } from './bitbucket/token-manager'
import { startOAuthFlow } from './bitbucket/oauth'
import { listOpenPRs, getPRDiff, postInlineComment } from './bitbucket/api'
import { streamReview, cancelReview } from './ai/stream'

/**
 * Separate electron-store instance for credentials.
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/** Module-level token manager for Bitbucket OAuth token lifecycle. */
const tokenManager = new TokenManager()

/**
 * Registers all IPC handlers for settings, credentials, and app channels.
 * Must be called before createWindow() so handlers are ready when renderer loads.
 */
export function registerIpcHandlers(): void {
  // --- Settings channels ---
  ipcMain.handle('settings:getAll', () => getSettings())

  ipcMain.handle('settings:get', (_event, key: string) => getSetting(key))

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    setSetting(key, value)
  })

  ipcMain.handle('settings:reset', (_event, namespace: string) => {
    resetSettings(namespace)
  })

  // --- Credentials channels ---
  ipcMain.handle('credentials:set', (_event, service: string, value: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }
    const encrypted = safeStorage.encryptString(value)
    credentialsStore.set(service, encrypted.toString('base64'))
  })

  ipcMain.handle('credentials:has', (_event, service: string) => {
    return credentialsStore.has(service)
  })

  // --- Bitbucket channels ---
  ipcMain.handle('bitbucket:connect', async () => {
    const clientId = getSetting('plugins.code-review-bot.bitbucketClientId') as string
    const clientSecret = getSetting('plugins.code-review-bot.bitbucketClientSecret') as string

    if (!clientId || !clientSecret) {
      throw new Error(
        'Bitbucket OAuth credentials not configured. Set Client ID and Client Secret in Settings > Code Review Bot.'
      )
    }

    const tokens = await startOAuthFlow(clientId, clientSecret)
    tokenManager.storeTokens(tokens, clientId, clientSecret)
    return { connected: true }
  })

  ipcMain.handle('bitbucket:disconnect', () => {
    tokenManager.clearTokens()
    return { connected: false }
  })

  ipcMain.handle('bitbucket:isConnected', () => {
    return tokenManager.isConnected()
  })

  ipcMain.handle(
    'bitbucket:listPRs',
    async (_event, workspace: string, repoSlug: string) => {
      const token = await tokenManager.getAccessToken()
      return listOpenPRs(workspace, repoSlug, token)
    }
  )

  ipcMain.handle(
    'bitbucket:getPRDiff',
    async (_event, workspace: string, repoSlug: string, prId: number) => {
      const token = await tokenManager.getAccessToken()
      return getPRDiff(workspace, repoSlug, prId, token)
    }
  )

  ipcMain.handle(
    'bitbucket:postComment',
    async (
      _event,
      workspace: string,
      repoSlug: string,
      prId: number,
      filePath: string,
      line: number,
      comment: string
    ) => {
      const token = await tokenManager.getAccessToken()
      await postInlineComment(workspace, repoSlug, prId, token, filePath, line, comment)
    }
  )

  // --- AI channels ---
  ipcMain.handle(
    'ai:startReview',
    async (
      _event,
      providerId: string,
      modelName: string,
      diff: string,
      sessionId: string
    ) => {
      const mainWindow =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) {
        throw new Error('No browser window available for streaming')
      }

      // Fire and forget -- streaming happens asynchronously via IPC events
      streamReview({ mainWindow, diff, providerId, modelName, sessionId })
      return { started: true, sessionId }
    }
  )

  ipcMain.handle('ai:cancelReview', (_event, sessionId: string) => {
    cancelReview(sessionId)
  })

  // --- App channels ---
  ipcMain.handle('app:probeOllama', async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        return { available: false, models: [] }
      }

      const data = (await response.json()) as { models?: { name: string }[] }
      const models = (data.models ?? []).map((m) => m.name)
      return { available: true, models }
    } catch {
      return { available: false, models: [] }
    }
  })
}
