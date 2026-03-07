import { ipcMain, safeStorage, BrowserWindow } from 'electron'
import Store from 'electron-store'
import { getSettings, getSetting, setSetting, resetSettings } from './settings-store'
import { TokenManager } from './bitbucket/token-manager'
import { listOpenPRs, getPRDiff, postInlineComment, postTopLevelComment, testCredentials, basicAuthHeader } from './bitbucket/api'
import { streamReview, cancelSdkReview } from './ai/stream'
import { streamCliReview, cancelCliReview, probeCliBinary } from './ai/cli-stream'

/**
 * Separate electron-store instance for credentials.
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/** Module-level credential manager for Bitbucket App Password auth. */
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
    const username = getSetting('plugins.code-review-bot.bitbucketUsername') as string
    const appPassword = getSetting('plugins.code-review-bot.bitbucketAppPassword') as string

    if (!username || !appPassword) {
      throw new Error(
        'Bitbucket credentials not configured. Set Username and App Password in Settings > CodeReviewBot.'
      )
    }

    // Test credentials by calling the /user endpoint
    const authHeader = basicAuthHeader(username, appPassword)
    const displayName = await testCredentials(authHeader)

    // Store credentials securely for future API calls
    tokenManager.storeCredentials(username, appPassword)

    return { connected: true, displayName }
  })

  ipcMain.handle('bitbucket:disconnect', () => {
    tokenManager.clearCredentials()
    return { connected: false }
  })

  ipcMain.handle('bitbucket:isConnected', () => {
    return tokenManager.isConnected()
  })

  ipcMain.handle(
    'bitbucket:listPRs',
    async (_event, workspace: string, repoSlug: string, page?: number, pagelen?: number) => {
      const authHeader = tokenManager.getAuthHeader()
      return listOpenPRs(workspace, repoSlug, authHeader, page, pagelen)
    }
  )

  ipcMain.handle(
    'bitbucket:getPRDiff',
    async (_event, workspace: string, repoSlug: string, prId: number) => {
      const authHeader = tokenManager.getAuthHeader()
      return getPRDiff(workspace, repoSlug, prId, authHeader)
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
      const authHeader = tokenManager.getAuthHeader()
      await postInlineComment(workspace, repoSlug, prId, authHeader, filePath, line, comment)
    }
  )

  ipcMain.handle(
    'bitbucket:postTopLevelComment',
    async (
      _event,
      workspace: string,
      repoSlug: string,
      prId: number,
      comment: string
    ) => {
      const authHeader = tokenManager.getAuthHeader()
      await postTopLevelComment(workspace, repoSlug, prId, authHeader, comment)
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
      sessionId: string,
      command?: string,
      guidelines?: string
    ) => {
      const mainWindow =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) {
        throw new Error('No browser window available for streaming')
      }

      if (command) {
        // CLI agent — spawn a local process
        streamCliReview({ mainWindow, diff, command, sessionId, guidelines })
      } else {
        // SDK agent — use Vercel AI SDK
        streamReview({ mainWindow, diff, providerId, modelName, sessionId, guidelines })
      }

      return { started: true, sessionId }
    }
  )

  ipcMain.handle('ai:cancelReview', (_event, sessionId: string) => {
    // Try both cancellation methods — only the active one will have the session
    cancelSdkReview(sessionId)
    cancelCliReview(sessionId)
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

  ipcMain.handle('app:probeCli', async (_event, command: string) => {
    const available = await probeCliBinary(command)
    return { available }
  })
}
