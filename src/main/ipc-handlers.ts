import { ipcMain, safeStorage, shell, BrowserWindow } from 'electron'
import Store from 'electron-store'
import { getSettings, getSetting, setSetting, resetSettings } from './settings-store'
import { TokenManager } from './bitbucket/token-manager'
import { listOpenPRs, getPRDiff, postInlineComment, postTopLevelComment, getDiffstatCount, testCredentials, basicAuthHeader } from './bitbucket/api'
import { streamReview, cancelSdkReview, streamAnalysis } from './ai/stream'
import { streamCliReview, cancelCliReview, streamCliAnalysis, probeCliBinary } from './ai/cli-stream'
import { PostgresConnectionManager } from './db/postgres'
import { buildSchemaContext, buildQueryOptimizationContext, buildTableDDL } from './db/introspection'
import { exportDiagnosticZip } from './log-collector'
import { exportEstimationPdf } from './launchpad/pdf-generator'

/**
 * Separate electron-store instance for credentials.
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/** Module-level credential manager for Bitbucket App Password auth. */
const tokenManager = new TokenManager()

/** Module-level PostgreSQL connection manager for DbInspector. */
const dbManager = new PostgresConnectionManager()

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

  ipcMain.handle(
    'bitbucket:getDiffstatCount',
    async (_event, workspace: string, repoSlug: string, prId: number) => {
      const authHeader = tokenManager.getAuthHeader()
      return getDiffstatCount(workspace, repoSlug, prId, authHeader)
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

  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('app:exportDiagnosticLogs', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { filePath: '' }
    const filePath = await exportDiagnosticZip(win)
    return { filePath }
  })

  // --- Database channels ---
  ipcMain.handle(
    'db:testConnection',
    async (
      _event,
      params: { host: string; port: number; username: string; password: string }
    ) => {
      return dbManager.testConnection(params)
    }
  )

  ipcMain.handle(
    'db:connect',
    async (
      _event,
      id: string,
      name: string,
      host: string,
      port: number,
      username: string,
      password: string,
      database: string,
      defaultSchema: string,
      readStrategy: 'read-only' | 'read-write'
    ) => {
      await dbManager.connect({
        id,
        name,
        host,
        port,
        username,
        password,
        database,
        defaultSchema,
        readStrategy
      })
    }
  )

  ipcMain.handle('db:disconnect', async (_event, connectionId: string) => {
    await dbManager.disconnect(connectionId)
  })

  ipcMain.handle('db:getConnections', () => {
    return dbManager.getActiveConnections()
  })

  ipcMain.handle('db:isConnected', (_event, connectionId: string) => {
    return dbManager.isConnected(connectionId)
  })

  ipcMain.handle('db:getDatabases', async (_event, connectionId: string) => {
    return dbManager.getDatabases(connectionId)
  })

  ipcMain.handle(
    'db:switchDatabase',
    async (_event, connectionId: string, database: string) => {
      await dbManager.switchDatabase(connectionId, database)
    }
  )

  ipcMain.handle('db:getSchemas', async (_event, connectionId: string) => {
    return dbManager.getSchemas(connectionId)
  })

  ipcMain.handle('db:getTables', async (_event, connectionId: string, schema: string) => {
    return dbManager.getTables(connectionId, schema)
  })

  ipcMain.handle(
    'db:getColumns',
    async (_event, connectionId: string, schema: string, table: string) => {
      return dbManager.getColumns(connectionId, schema, table)
    }
  )

  ipcMain.handle(
    'db:getTableDDL',
    async (_event, connectionId: string, schema: string, table: string) => {
      return buildTableDDL(dbManager, connectionId, schema, table)
    }
  )

  ipcMain.handle('db:getForeignKeys', async (_event, connectionId: string, schema: string) => {
    return dbManager.getForeignKeys(connectionId, schema)
  })

  ipcMain.handle(
    'db:getIndexes',
    async (_event, connectionId: string, schema: string, table: string) => {
      return dbManager.getIndexes(connectionId, schema, table)
    }
  )

  ipcMain.handle(
    'db:getTableStats',
    async (_event, connectionId: string, schema: string, table: string) => {
      return dbManager.getTableStats(connectionId, schema, table)
    }
  )

  ipcMain.handle('db:query', async (_event, connectionId: string, sql: string) => {
    const result = await dbManager.query(connectionId, sql)
    return {
      rows: result.rows,
      fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      rowCount: result.rowCount ?? 0,
      command: result.command
    }
  })

  ipcMain.handle('db:explain', async (_event, connectionId: string, sql: string) => {
    return dbManager.explain(connectionId, sql)
  })

  ipcMain.handle(
    'db:buildSchemaContext',
    async (_event, connectionId: string, schema: string, tables?: string[]) => {
      return buildSchemaContext(dbManager, connectionId, schema, tables)
    }
  )

  ipcMain.handle(
    'db:buildOptimizationContext',
    async (_event, connectionId: string, schema: string, sql: string) => {
      return buildQueryOptimizationContext(dbManager, connectionId, schema, sql)
    }
  )

  ipcMain.handle(
    'db:storeCredentials',
    (_event, connectionId: string, password: string) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system')
      }
      const encrypted = safeStorage.encryptString(password)
      credentialsStore.set(`db:${connectionId}`, encrypted.toString('base64'))
    }
  )

  ipcMain.handle('db:getCredentials', (_event, connectionId: string) => {
    const encrypted = credentialsStore.get(`db:${connectionId}`) as string | undefined
    if (!encrypted) return null
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  })

  // --- AI analysis channels (generic, reusable for any plugin) ---
  ipcMain.handle(
    'ai:startAnalysis',
    async (
      _event,
      providerId: string,
      modelName: string,
      systemPrompt: string,
      userPrompt: string,
      sessionId: string,
      command?: string
    ) => {
      const mainWindow =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) {
        throw new Error('No browser window available for streaming')
      }

      if (command) {
        streamCliAnalysis({ mainWindow, systemPrompt, userPrompt, command, sessionId })
      } else {
        streamAnalysis({ mainWindow, systemPrompt, userPrompt, providerId, modelName, sessionId })
      }

      return { started: true, sessionId }
    }
  )

  ipcMain.handle('ai:cancelAnalysis', (_event, sessionId: string) => {
    cancelSdkReview(sessionId)
    cancelCliReview(sessionId)
  })

  // --- Launchpad channels ---
  ipcMain.handle('launchpad:exportPdf', async (_event, estimation) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) throw new Error('No window available for save dialog')
    const filePath = await exportEstimationPdf(mainWindow, estimation)
    return { filePath }
  })
}
