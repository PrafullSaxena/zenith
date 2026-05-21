import { ipcMain, safeStorage, shell, BrowserWindow, dialog, app, net, clipboard } from 'electron'
import Store from 'electron-store'
import { getSettings, getSetting, setSetting, resetSettings, settingsStore } from './settings-store'
import { TokenManager } from './bitbucket/token-manager'
import {
  listOpenPRs,
  getPRDiff,
  postInlineComment,
  postTopLevelComment,
  getDiffstatCount,
  testCredentials,
  basicAuthHeader
} from './bitbucket/api'
import { streamReview, cancelSdkReview, streamAnalysis } from './ai/stream'
import {
  streamCliReview,
  cancelCliReview,
  streamCliAnalysis,
  probeCliBinary
} from './ai/cli-stream'
import { UnifiedDbManager } from './db/db-manager'
import { validateQuery } from './db/postgres'
import {
  buildSchemaContext,
  buildQueryOptimizationContext,
  buildTableDDL
} from './db/introspection'
import { exportDiagnosticZip } from './log-collector'
// PDF generators are imported dynamically inside handlers to avoid
// module-level side effects (pdfmake.fonts) that could interfere
// with handler registration if module loading fails.
import { NebulaDatabase } from './nebula/database'
import { TaskDatabase } from './taskgroomer/database'
import { NoteFileStorage } from './nebula/file-storage'
import { transcribeAudio } from './nebula/transcription'
import { getApiKeyForProvider } from './ai/providers'
import { GitService } from './cortex/git-service'
import { CodebaseAnalyzer, PARSER_VERSION } from './cortex/analyzer'
import {
  generateArchitectureDiagram,
  generateAPIFlowDiagram,
  generateComponentTreeDiagram,
  generatePipelineDiagram,
  generateClassDiagram
} from './cortex/mermaid-generator'
import { generateHLDDocument } from './cortex/doc-generator'
import { buildInsightsPrompt } from './cortex/toon-parser'
import { isRtkAvailable } from './cortex/rtk-integration'
import {
  buildStaticDigest,
  buildDigestRefinementPrompt,
  buildDigestUserPrompt
} from './cortex/digest-builder'
import { buildEntityBatches } from './cortex/entity-enricher'
import { buildValidationPrompt, buildValidationUserPrompt } from './cortex/analysis-validator'
import path from 'node:path'
import fs from 'node:fs'
import { hideCaptureWindow, getCaptureWindow } from './capture-window'
import {
  saveIntegrationCredential,
  getIntegrationCredential,
  hasIntegrationCredential,
  deleteIntegrationCredential,
  getIntegrationCredentialMasked,
  saveIntegrationSetting,
  getIntegrationSetting,
  CRED_JIRA_BASE_URL,
  CRED_JIRA_EMAIL,
  CRED_JIRA_API_TOKEN,
  CRED_JIRA_PROJECTS,
  CRED_CONFLUENCE_BASE_URL,
  CRED_CONFLUENCE_EMAIL,
  CRED_CONFLUENCE_API_TOKEN
} from './integrations/credentials'
import { searchJira, type JiraCredentials } from './integrations/jira-client'
import { searchConfluence, type ConfluenceCredentials } from './integrations/confluence-client'
import { webSearch } from './integrations/search-client'
import { initPricingDb } from './pricing/pricing-db'
import { pricingRepository } from './pricing/pricing-repository'
import {
  saveCredential,
  hasCredential,
  deleteCredential,
  getCredentialMasked,
  CRED_GCP_API_KEY,
  CRED_AWS_ACCESS_KEY_ID,
  CRED_AWS_SECRET_ACCESS_KEY,
  CRED_GCP_BILLING_ACCOUNT_ID
} from './pricing/credentials'
import { seedPricingDb } from './pricing/seed'
import { pricingSync } from './pricing/pricing-sync'
import { groomTask } from './taskgroomer/grooming-agent'

/**
 * Separate electron-store instance for credentials.
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/** Module-level credential manager for Bitbucket App Password auth. */
const tokenManager = new TokenManager()

/** Module-level unified DB manager for DbInspector (routes to PostgreSQL or MySQL). */
const dbManager = new UnifiedDbManager()

/** Lazy-initialized Nebula database and file storage instances. */
let nebulaDb: NebulaDatabase | null = null
let nebulaFs: NoteFileStorage | null = null

/** Lazy-initialized Cortex instances. */
let cortexGit: GitService | null = null
let cortexAnalyzer: CodebaseAnalyzer | null = null

/** Lazy-initialized Task Groomer database instance. */
let taskGroomerDb: TaskDatabase | null = null

function getTaskGroomerDb(): TaskDatabase {
  if (!taskGroomerDb) {
    taskGroomerDb = new TaskDatabase()
  }
  return taskGroomerDb
}

/** Prevents double-triggering a grooming batch run. */
let groomingRunActive = false

// Initialize pricing DB and seed on first launch
try {
  initPricingDb()
  seedPricingDb()
} catch (err) {
  console.error('[Launchpad] Failed to initialize pricing DB:', err)
}

function getCortexInstances(): { git: GitService; analyzer: CodebaseAnalyzer } {
  if (!cortexGit || !cortexAnalyzer) {
    cortexGit = new GitService()
    cortexAnalyzer = new CodebaseAnalyzer()
  }
  return { git: cortexGit, analyzer: cortexAnalyzer }
}

/** One-time migration: move settings from plugins.codebase-analyzer to plugins.cortex */
function migrateCortexSettings(): void {
  const oldPrefix = 'plugins.codebase-analyzer'
  const oldSettings = settingsStore.get(oldPrefix)
  if (oldSettings && typeof oldSettings === 'object') {
    const newPrefix = 'plugins.cortex'
    for (const [key, value] of Object.entries(oldSettings as Record<string, unknown>)) {
      settingsStore.set(`${newPrefix}.${key}`, value)
    }
    settingsStore.delete(oldPrefix)
  }
}

function getNebulaInstances(): { db: NebulaDatabase; fs: NoteFileStorage } {
  if (!nebulaDb || !nebulaFs) {
    const storagePath =
      (getSetting('plugins.nebula.storagePath') as string) || app.getPath('userData')
    nebulaDb = new NebulaDatabase(storagePath)
    nebulaFs = new NoteFileStorage(storagePath)
  }
  return { db: nebulaDb, fs: nebulaFs }
}

/**
 * Called from main/index.ts after BrowserWindow is created.
 * Starts the daily pricing sync schedule and connects the push notification target.
 */
export function initPricingSync(mainWindow: BrowserWindow): void {
  try {
    pricingSync.init(mainWindow)
  } catch (err) {
    console.error('[Launchpad] Failed to start pricing sync:', err)
  }
}

/**
 * Registers all IPC handlers for settings, credentials, and app channels.
 * Must be called before createWindow() so handlers are ready when renderer loads.
 */
export function registerIpcHandlers(): void {
  // One-time migration from old plugin id
  migrateCortexSettings()

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
    async (_event, workspace: string, repoSlug: string, prId: number, comment: string) => {
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
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
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

      const response = await net.fetch('http://localhost:11434/api/tags', {
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

  ipcMain.handle('app:selectDirectory', async (_event, currentPath?: string) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) return { canceled: true, path: '' }

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Working Directory',
      defaultPath: currentPath || app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory']
    })

    if (canceled || filePaths.length === 0) return { canceled: true, path: '' }
    return { canceled: false, path: filePaths[0] }
  })

  ipcMain.handle(
    'app:saveTextFile',
    async (
      _event,
      content: string,
      defaultFilename: string,
      filters: { name: string; extensions: string[] }[]
    ) => {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) return { filePath: null }

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFilename,
        filters
      })

      if (canceled || !filePath) return { filePath: null }

      await fs.promises.writeFile(filePath, content, 'utf-8')
      return { filePath }
    }
  )

  // --- Database channels ---
  ipcMain.handle(
    'db:testConnection',
    async (
      _event,
      params: { host: string; port: number; username: string; password: string },
      engine?: 'postgresql' | 'mysql'
    ) => {
      return dbManager.testConnection(params, engine)
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
      readStrategy: 'read-only' | 'read-write',
      engine?: 'postgresql' | 'mysql'
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
        readStrategy,
        engine: engine ?? 'postgresql'
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

  ipcMain.handle('db:switchDatabase', async (_event, connectionId: string, database: string) => {
    await dbManager.switchDatabase(connectionId, database)
  })

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

  ipcMain.handle(
    'db:query',
    async (
      _event,
      connectionId: string,
      sql: string,
      allowWrite?: boolean,
      limit?: number,
      offset?: number
    ) => {
      // Safety: always validate unless allowWrite is explicitly true
      if (!allowWrite) {
        validateQuery(sql)
      }

      // Pagination: wrap with LIMIT/OFFSET if requested and not already present
      let querySql = sql
      const defaultLimit = limit ?? 100
      if (!/\bLIMIT\b/i.test(sql)) {
        const off = offset ?? 0
        querySql = `${sql.trimEnd().replace(/;+$/, '')}\nLIMIT ${defaultLimit} OFFSET ${off}`
      }

      const result = await dbManager.query(connectionId, querySql)
      const hasMore = result.rows.length === defaultLimit

      return {
        rows: result.rows,
        fields: result.fields,
        rowCount: result.rowCount ?? 0,
        command: result.command,
        hasMore
      }
    }
  )

  ipcMain.handle('db:cancelQuery', async (_event, connectionId: string) => {
    return dbManager.cancelQuery(connectionId)
  })

  ipcMain.handle('db:allColumns', async (_event, connectionId: string, schema: string) => {
    const tables = await dbManager.getTables(connectionId, schema)
    const tableNames = tables.map((t) => t.name)

    // Fetch columns for all tables with concurrency limit of 5
    const result: Record<string, { name: string; dataType: string }[]> = {}
    const concurrencyLimit = 5

    for (let i = 0; i < tableNames.length; i += concurrencyLimit) {
      const batch = tableNames.slice(i, i + concurrencyLimit)
      await Promise.all(
        batch.map(async (tableName) => {
          const columns = await dbManager.getColumns(connectionId, schema, tableName)
          result[tableName] = columns.map((c) => ({ name: c.name, dataType: c.dataType }))
        })
      )
    }

    return result
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

  ipcMain.handle('db:storeCredentials', (_event, connectionId: string, password: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }
    const encrypted = safeStorage.encryptString(password)
    credentialsStore.set(`db:${connectionId}`, encrypted.toString('base64'))
  })

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
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
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

  // --- Unified PDF export channel ---
  ipcMain.handle(
    'app:exportPdf',
    async (
      _event,
      data: {
        markdown: string
        title?: string
        mermaidImages?: Record<number, string>
        orientation?: 'portrait' | 'landscape'
        diagramImage?: string
      }
    ) => {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) throw new Error('No window available for save dialog')
      const { exportPdf } = await import('./lib/pdf-generator')
      const filePath = await exportPdf(mainWindow, data)
      return { filePath }
    }
  )

  // --- Launchpad channels (forwards to unified PDF engine) ---
  ipcMain.handle(
    'launchpad:exportPdf',
    async (
      _event,
      estimation: {
        name: string
        provider: string
        lineItems: Array<{
          serviceName: string
          configSummary: string
          monthly: number
          yearly: number
        }>
        totalMonthly: number
        totalYearly: number
        aiRecommendations?: string
      }
    ) => {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) throw new Error('No window available for save dialog')

      // Convert estimation to markdown for unified engine
      const tableHeader =
        '| Service | Configuration | Monthly | Yearly |\n| --- | --- | --- | --- |'
      const tableRows = estimation.lineItems
        .map(
          (li) =>
            `| ${li.serviceName} | ${li.configSummary} | $${li.monthly.toFixed(2)} | $${li.yearly.toFixed(2)} |`
        )
        .join('\n')
      const totalRow = `\n**Total: $${estimation.totalMonthly.toFixed(2)}/mo — $${estimation.totalYearly.toFixed(2)}/yr**`

      let md = `# ${estimation.name}\n\n**Provider:** ${estimation.provider}\n\n${tableHeader}\n${tableRows}\n${totalRow}`

      if (estimation.aiRecommendations) {
        md += `\n\n## AI Recommendations\n\n${estimation.aiRecommendations}`
      }

      const { exportPdf } = await import('./lib/pdf-generator')
      const filePath = await exportPdf(mainWindow, { markdown: md, title: estimation.name })
      return { filePath }
    }
  )

  // --- Launchpad data channels ---
  ipcMain.handle('launchpad:getCatalog', (_event, provider: string) => {
    if (!['aws', 'gcp', 'azure'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }
    return pricingRepository.getCatalog(provider as 'aws' | 'gcp' | 'azure')
  })

  ipcMain.handle(
    'launchpad:getPricing',
    (_event, args: { provider: string; region: string; serviceIds: string[] }) => {
      if (!['aws', 'gcp', 'azure'].includes(args.provider)) {
        throw new Error(`Invalid provider: ${args.provider}`)
      }
      if (typeof args.region !== 'string' || !Array.isArray(args.serviceIds)) {
        throw new Error('Invalid arguments: region must be string, serviceIds must be array')
      }
      return pricingRepository.getRates(
        args.serviceIds,
        args.provider as 'aws' | 'gcp' | 'azure',
        args.region
      )
    }
  )

  ipcMain.handle(
    'launchpad:saveCredentials',
    (
      _event,
      credentials: {
        gcpApiKey?: string
        awsAccessKeyId?: string
        awsSecretAccessKey?: string
        gcpBillingAccountId?: string
      }
    ) => {
      if (credentials.gcpApiKey !== undefined) {
        saveCredential(CRED_GCP_API_KEY, credentials.gcpApiKey)
      }
      if (credentials.awsAccessKeyId !== undefined) {
        saveCredential(CRED_AWS_ACCESS_KEY_ID, credentials.awsAccessKeyId)
      }
      if (credentials.awsSecretAccessKey !== undefined) {
        saveCredential(CRED_AWS_SECRET_ACCESS_KEY, credentials.awsSecretAccessKey)
      }
      if (credentials.gcpBillingAccountId !== undefined) {
        saveCredential(CRED_GCP_BILLING_ACCOUNT_ID, credentials.gcpBillingAccountId)
      }
      return { saved: true }
    }
  )

  // ── launchpad:getCredentialStatus ────────────────────────────────────────
  ipcMain.handle('launchpad:getCredentialStatus', () => {
    const credKeys = {
      gcpApiKey: CRED_GCP_API_KEY,
      awsAccessKeyId: CRED_AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: CRED_AWS_SECRET_ACCESS_KEY,
      gcpBillingAccountId: CRED_GCP_BILLING_ACCOUNT_ID
    } as const

    const result: Record<string, { set: boolean; masked: string | null }> = {}
    for (const [friendly, credKey] of Object.entries(credKeys)) {
      result[friendly] = {
        set: hasCredential(credKey),
        masked: getCredentialMasked(credKey)
      }
    }
    return result
  })

  // ── launchpad:deleteCredential ─────────────────────────────────────────
  ipcMain.handle(
    'launchpad:deleteCredential',
    (
      _event,
      {
        key
      }: { key: 'gcpApiKey' | 'awsAccessKeyId' | 'awsSecretAccessKey' | 'gcpBillingAccountId' }
    ) => {
      const credKeyMap: Record<string, string> = {
        gcpApiKey: CRED_GCP_API_KEY,
        awsAccessKeyId: CRED_AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: CRED_AWS_SECRET_ACCESS_KEY,
        gcpBillingAccountId: CRED_GCP_BILLING_ACCOUNT_ID
      }
      const credKey = credKeyMap[key]
      if (!credKey) return { deleted: false }
      deleteCredential(credKey)
      return { deleted: true }
    }
  )

  // ── launchpad:syncPricing ──────────────────────────────────────────────
  ipcMain.handle('launchpad:syncPricing', async () => {
    try {
      const result = await pricingSync.syncAll()
      return { success: true, result }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // ── launchpad:getSyncStatus ────────────────────────────────────────────
  ipcMain.handle('launchpad:getSyncStatus', async () => {
    try {
      const providers: Array<'aws' | 'gcp' | 'azure'> = ['aws', 'gcp', 'azure']
      const statuses = providers.map((p) => pricingRepository.getSyncStatus(p))
      return { success: true, statuses }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // ── launchpad:getRegions ───────────────────────────────────────────────
  ipcMain.handle('launchpad:getRegions', async (_event, provider: string) => {
    const validProviders = ['aws', 'gcp', 'azure']
    if (!validProviders.includes(provider)) {
      return { success: false, error: `Invalid provider: ${provider}` }
    }
    try {
      const regions = pricingRepository.getRegions(provider as 'aws' | 'gcp' | 'azure')
      return { success: true, regions }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // --- TextCraft channels (backward-compatible alias for unified engine) ---
  ipcMain.handle(
    'textcraft:exportPdf',
    async (
      _event,
      data: { markdown: string; title?: string; mermaidImages?: Record<number, string> }
    ) => {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) throw new Error('No window available for save dialog')
      const { exportPdf } = await import('./lib/pdf-generator')
      const filePath = await exportPdf(mainWindow, data)
      return { filePath }
    }
  )

  // --- Nebula channels ---
  ipcMain.handle(
    'nebula:saveNote',
    async (
      _event,
      note: {
        id: string
        title: string
        content: object
        drawing: object | null
        summary: string | null
        topics: string[]
        createdAt: string
        updatedAt: string
      }
    ) => {
      const { db, fs: noteFs } = getNebulaInstances()
      noteFs.writeNote(note)
      const contentText = noteFs.extractPlainText(note.content)
      db.upsertNote({
        id: note.id,
        title: note.title,
        content: JSON.stringify(note.content),
        drawing: note.drawing ? JSON.stringify(note.drawing) : null,
        summary: note.summary,
        topics: note.topics,
        contentText
      })
      return { saved: true }
    }
  )

  ipcMain.handle('nebula:loadNote', async (_event, id: string) => {
    const { fs: noteFs } = getNebulaInstances()
    return noteFs.readNote(id)
  })

  ipcMain.handle('nebula:listNotes', async () => {
    const { db } = getNebulaInstances()
    return db.listNotes().map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      pinned: row.pinned === 1,
      hasDrawing: row.drawing !== null && row.drawing !== '',
      contentPreview: row.content_preview || null,
      audioPath: null,
      updatedAt: row.updated_at
    }))
  })

  ipcMain.handle('nebula:deleteNote', async (_event, id: string) => {
    const { db, fs: noteFs } = getNebulaInstances()
    db.deleteNote(id)
    noteFs.deleteNote(id)
  })

  ipcMain.handle('nebula:searchNotes', async (_event, query: string) => {
    const { db } = getNebulaInstances()
    return db.searchNotes(query).map((row) => ({
      id: row.id,
      title: row.title,
      titleHighlight: row.title_highlight,
      summaryHighlight: row.summary_highlight,
      summary: row.summary,
      contentText: row.content_text ?? null,
      updatedAt: row.updated_at,
      rank: row.rank
    }))
  })

  ipcMain.handle('nebula:getGraph', async () => {
    const { db } = getNebulaInstances()
    const raw = db.getGraphData()
    return {
      nodes: raw.nodes.map((n) => ({
        id: n.id,
        name: n.title,
        val: n.connections
      })),
      links: raw.links.map((e) => ({
        source: e.source_id,
        target: e.target_id,
        label: e.relationship,
        weight: e.weight
      }))
    }
  })

  ipcMain.handle(
    'nebula:updateEdges',
    async (
      _event,
      sourceId: string,
      targets: { targetId: string; relationship: string; weight: number }[]
    ) => {
      const { db } = getNebulaInstances()
      db.upsertEdges(sourceId, targets)
    }
  )

  ipcMain.handle(
    'nebula:transcribeAudio',
    async (_event, audioBuffer: number[], providerId?: string, command?: string) => {
      const tmpPath = path.join(app.getPath('temp'), `nebula-${Date.now()}.webm`)
      try {
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer))

        // Use the configured provider (falls back to 'openai' if none specified)
        const resolvedProvider = providerId || 'openai'
        const apiKey = await getApiKeyForProvider(resolvedProvider)

        const result = await transcribeAudio(tmpPath, resolvedProvider, apiKey, command)
        return result
      } finally {
        // Cleanup temp file
        try {
          fs.unlinkSync(tmpPath)
        } catch {
          /* ignore cleanup errors */
        }
      }
    }
  )

  ipcMain.handle(
    'nebula:saveTranscription',
    async (
      _event,
      record: {
        id: string
        noteId: string | null
        audioPath: string
        transcript: string
        speakers: string
      }
    ) => {
      const { db } = getNebulaInstances()
      db.saveTranscription(record)
      return { saved: true }
    }
  )

  ipcMain.handle('nebula:selectAudioFile', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) return { canceled: true, path: '' }

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio File',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'webm', 'ogg'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return { canceled: true, path: '' }
    return { canceled: false, path: filePaths[0] }
  })

  ipcMain.handle('nebula:togglePin', async (_event, noteId: string, pinned: boolean) => {
    const { db } = getNebulaInstances()
    db.togglePin(noteId, pinned)
  })

  ipcMain.handle('nebula:saveAudio', async (_event, noteId: string, audioBuffer: number[]) => {
    const { fs: noteFs } = getNebulaInstances()
    const buffer = Buffer.from(audioBuffer)
    const audioPath = noteFs.saveAudio(noteId, buffer)
    return { audioPath }
  })

  ipcMain.handle('nebula:loadAudio', async (_event, noteId: string) => {
    const { fs: noteFs } = getNebulaInstances()
    const buffer = noteFs.loadAudio(noteId)
    if (!buffer) return null
    return Array.from(new Uint8Array(buffer))
  })

  // --- Cortex channels ---

  // --- Cortex repo persistence ---

  ipcMain.handle('cortex:listRepos', async () => {
    const { analyzer } = getCortexInstances()
    const repos = analyzer.cache.listRepos()
    return repos.map((repo) => ({
      ...repo,
      status: fs.existsSync(repo.repoPath) ? ('idle' as const) : ('needs-clone' as const),
      error: null
    }))
  })

  ipcMain.handle('cortex:saveRepo', async (_event, repo) => {
    const { analyzer } = getCortexInstances()
    analyzer.cache.saveRepo(repo)
  })

  ipcMain.handle('cortex:removeRepoById', async (_event, id: string) => {
    const { analyzer } = getCortexInstances()
    analyzer.cache.removeRepo(id)
  })

  ipcMain.handle(
    'cortex:updateRepoFields',
    async (_event, id: string, fields: Record<string, unknown>) => {
      const { analyzer } = getCortexInstances()
      analyzer.cache.updateRepo(id, fields)
    }
  )

  // Fetch remote branches from a URL (before cloning)
  ipcMain.handle('cortex:fetchBranches', async (_event, url: string) => {
    const { git } = getCortexInstances()
    return git.fetchRemoteBranches(url)
  })

  // Clone a repository
  ipcMain.handle('cortex:clone', async (event, url: string, name: string, branch?: string) => {
    const { git } = getCortexInstances()
    const win = BrowserWindow.fromWebContents(event.sender)
    return git.clone(url, name, branch, (progress) => {
      win?.webContents.send('cortex:cloneProgress', progress)
    })
  })

  // Analyze a cloned repository
  ipcMain.handle(
    'cortex:analyze',
    async (event, repoPath: string, branch: string, repoUrl: string) => {
      const { analyzer } = getCortexInstances()
      const win = BrowserWindow.fromWebContents(event.sender)
      return analyzer.analyzeRepository(repoPath, branch, repoUrl, (progress) => {
        win?.webContents.send('cortex:analysisProgress', progress)
      })
    }
  )

  // Get file content from a cloned repo
  ipcMain.handle('cortex:getFileContent', async (_event, repoPath: string, filePath: string) => {
    const { git, analyzer } = getCortexInstances()
    const content = await git.getFileContent(repoPath, filePath)
    const language = analyzer.detectLanguage(filePath)
    return {
      content,
      language,
      path: filePath,
      lineCount: content.split('\n').length
    }
  })

  // Remove a cloned repository
  ipcMain.handle('cortex:removeRepo', async (_event, repoPath: string) => {
    const { git } = getCortexInstances()
    return git.removeRepo(repoPath)
  })

  // Get cached analysis (returns null if parser version is stale)
  ipcMain.handle(
    'cortex:getCachedAnalysis',
    async (_event, repoUrl: string, branch: string, commitSha: string) => {
      const { analyzer } = getCortexInstances()
      const cached = analyzer.cache.getAnalysis(repoUrl, branch, commitSha)
      if (!cached) return null
      // Reject stale cache entries from older parser versions
      const cachedVersion = (cached as Record<string, unknown>)._parserVersion as number | undefined
      if (cachedVersion !== PARSER_VERSION) return null
      return cached
    }
  )

  // Search code files (FTS5)
  ipcMain.handle('cortex:searchCode', async (_event, repoUrl: string, query: string) => {
    const { analyzer } = getCortexInstances()
    return analyzer.cache.searchFiles(repoUrl, query)
  })

  // --- Cortex HLD generation ---
  ipcMain.handle('cortex:generateHLD', async (_event, repoUrl: string, branch: string) => {
    const { analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '') // latest
    if (!analysis) throw new Error('No analysis found. Analyze the repository first.')

    const typedAnalysis = analysis as unknown as {
      repoId: string
      repoType: string
      framework: string
      language: string
      commitSha: string
      entities: unknown[]
      calls: unknown[]
      routes: unknown[]
      components: unknown[]
      pipelines: unknown[]
      fileTree: unknown[]
      stats: {
        totalFiles: number
        totalLines: number
        languages: { language: string; fileCount: number; lineCount: number }[]
        entityCount: { kind: string; count: number }[]
        routeCount: number
        componentCount: number
        pipelineCount: number
      }
      documentation: string
    }

    const diagrams = {
      architecture: generateArchitectureDiagram(
        typedAnalysis as Parameters<typeof generateArchitectureDiagram>[0]
      ),
      apiFlow: generateAPIFlowDiagram(
        typedAnalysis as Parameters<typeof generateAPIFlowDiagram>[0]
      ),
      componentTree: generateComponentTreeDiagram(
        typedAnalysis as Parameters<typeof generateComponentTreeDiagram>[0]
      ),
      pipeline: generatePipelineDiagram(
        typedAnalysis as Parameters<typeof generatePipelineDiagram>[0]
      ),
      classDiagram: generateClassDiagram(
        typedAnalysis as Parameters<typeof generateClassDiagram>[0]
      )
    }

    return generateHLDDocument(typedAnalysis as Parameters<typeof generateHLDDocument>[0], diagrams)
  })

  // --- Cortex TOON insights ---

  ipcMain.handle('cortex:generateInsights', async (_event, repoUrl: string, branch: string) => {
    const { analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found. Analyze first.')

    const { system, user } = buildInsightsPrompt(analysis)
    return { systemPrompt: system, userPrompt: user }
  })

  ipcMain.handle(
    'cortex:saveInsights',
    async (
      _event,
      repoUrl: string,
      branch: string,
      commitSha: string,
      agentId: string,
      toonData: string
    ) => {
      const { analyzer } = getCortexInstances()
      analyzer.cache.saveInsights(repoUrl, branch, commitSha, agentId, toonData)
    }
  )

  ipcMain.handle(
    'cortex:getInsights',
    async (_event, repoUrl: string, branch: string, commitSha: string) => {
      const { analyzer } = getCortexInstances()
      return analyzer.cache.getInsights(repoUrl, branch, commitSha)
    }
  )

  // Re-analyze: fetch latest from remote, reset, and re-run analysis
  // force=true skips the SHA check so users can force a re-parse
  ipcMain.handle('cortex:reanalyze', async (event, repoId: string, force?: boolean) => {
    const { git, analyzer } = getCortexInstances()
    const repo = analyzer.cache.getRepoById(repoId)
    if (!repo) throw new Error('Repo not found')

    // Fetch and reset to latest
    const newSha = await git.fetchAndReset(repo.repoPath, repo.branch)
    if (!force && newSha === repo.commitSha) return { changed: false }

    // Clear old cache
    analyzer.cache.deleteAnalysis(repo.url, repo.branch)
    analyzer.cache.clearInsights(repo.url, repo.branch)

    // Re-analyze
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await analyzer.analyzeRepository(
      repo.repoPath,
      repo.branch,
      repo.url,
      (progress) => {
        win?.webContents.send('cortex:analysisProgress', progress)
      }
    )

    // Update repo record
    analyzer.cache.updateRepo(repoId, { commitSha: newSha, lastAnalyzed: new Date().toISOString() })

    return { changed: true, result }
  })

  // --- Cortex AI Enrichment ---

  // Build or return cached codebase digest
  ipcMain.handle('cortex:buildDigest', async (event, repoUrl: string, branch: string) => {
    const { git, analyzer } = getCortexInstances()
    const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
    if (!analysis) throw new Error('No analysis found. Analyze the repository first.')

    const typedAnalysis = analysis as Record<string, unknown>
    const commitSha = typedAnalysis.commitSha as string

    // Check for cached digest
    const cached = analyzer.cache.getEnrichment(repoUrl, branch, commitSha, 'digest')
    if (cached) return { data: cached, cached: true }

    // Pass 1: Build static digest
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.webContents.send('cortex:analysisProgress', {
      phase: 'enriching',
      progress: 10,
      detail: 'Building AI context...',
      filesProcessed: 0,
      totalFiles: 0
    })

    // Get repoPath from repos table
    const repos = analyzer.cache.listRepos()
    const repo = repos.find((r) => r.url === repoUrl && r.branch === branch)
    if (!repo) throw new Error('Repository not found in database')

    const rawDigest = await buildStaticDigest(
      typedAnalysis as unknown as Parameters<typeof buildStaticDigest>[0],
      repo.repoPath,
      git
    )

    win?.webContents.send('cortex:analysisProgress', {
      phase: 'enriching',
      progress: 30,
      detail: 'Static digest built, preparing AI refinement...',
      filesProcessed: 0,
      totalFiles: 0
    })

    // Return raw digest + prompts for renderer to stream via AI
    const systemPrompt = buildDigestRefinementPrompt()
    const userPrompt = buildDigestUserPrompt(rawDigest)

    return {
      data: null,
      cached: false,
      rawDigest,
      systemPrompt,
      userPrompt,
      commitSha
    }
  })

  // Save enrichment data
  ipcMain.handle(
    'cortex:saveEnrichment',
    async (
      _event,
      repoUrl: string,
      branch: string,
      commitSha: string,
      enrichmentType: string,
      agentId: string,
      data: string
    ) => {
      const { analyzer } = getCortexInstances()
      analyzer.cache.saveEnrichment(repoUrl, branch, commitSha, enrichmentType, agentId, data)
    }
  )

  // Get cached enrichment
  ipcMain.handle(
    'cortex:getEnrichment',
    async (_event, repoUrl: string, branch: string, commitSha: string, enrichmentType: string) => {
      const { analyzer } = getCortexInstances()
      return analyzer.cache.getEnrichment(repoUrl, branch, commitSha, enrichmentType)
    }
  )

  // Build entity summary batches for AI processing
  ipcMain.handle(
    'cortex:buildEntityBatches',
    async (_event, repoUrl: string, branch: string, existingSummaryIds: string[]) => {
      const { git, analyzer } = getCortexInstances()
      const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
      if (!analysis) throw new Error('No analysis found.')

      const typedAnalysis = analysis as Record<string, unknown>
      const entities = typedAnalysis.entities as Array<{
        id: string
        name: string
        kind: string
        filePath: string
        line: number
        endLine: number
        summary: string
      }>

      const repos = analyzer.cache.listRepos()
      const repo = repos.find((r) => r.url === repoUrl && r.branch === branch)
      if (!repo) throw new Error('Repository not found')

      const batches = await buildEntityBatches(
        entities,
        new Set(existingSummaryIds),
        repo.repoPath,
        git
      )

      return batches.map((b) => ({
        entityIds: b.entities.map((e) => e.id),
        systemPrompt: b.systemPrompt,
        userPrompt: b.userPrompt
      }))
    }
  )

  // Build validation prompts for AI review
  ipcMain.handle(
    'cortex:buildValidationPrompts',
    async (_event, repoUrl: string, branch: string, digestText: string) => {
      const { analyzer } = getCortexInstances()
      const analysis = analyzer.cache.getAnalysis(repoUrl, branch, '')
      if (!analysis) throw new Error('No analysis found.')

      const typedAnalysis = analysis as Record<string, unknown>
      const routes = typedAnalysis.routes as Array<Record<string, unknown>>
      const calls = typedAnalysis.calls as Array<Record<string, unknown>>

      const routesText = routes
        .map((r, i) => `[${i}] ${r.method} ${r.fullPath} → ${r.handlerName} (${r.controllerName})`)
        .join('\n')

      const edgesText = calls.map((c) => `${c.callerId} → ${c.calleeId} (${c.type})`).join('\n')

      return {
        systemPrompt: buildValidationPrompt(),
        userPrompt: buildValidationUserPrompt(digestText, routesText, edgesText),
        commitSha: typedAnalysis.commitSha as string
      }
    }
  )

  // --- Cortex RTK probe ---
  ipcMain.handle('cortex:probeRtk', async () => {
    return isRtkAvailable()
  })

  // --- Task Groomer channels ---
  ipcMain.handle(
    'taskgroomer:createTask',
    (_event, args: { text: string; captureSource: 'typed' | 'clipboard' }) => {
      return getTaskGroomerDb().createTask(args)
    }
  )

  ipcMain.handle('taskgroomer:listTasks', (_event, args?: { statuses?: string[] }) => {
    return getTaskGroomerDb().listTasks(args?.statuses)
  })

  ipcMain.handle(
    'taskgroomer:updateTask',
    (_event, args: { id: string; fields: Parameters<TaskDatabase['updateTask']>[0]['fields'] }) => {
      return getTaskGroomerDb().updateTask({ id: args.id, fields: args.fields })
    }
  )

  ipcMain.handle('taskgroomer:deleteTask', (_event, args: { id: string }) => {
    return getTaskGroomerDb().deleteTask(args.id)
  })

  ipcMain.handle(
    'taskgroomer:addComment',
    (_event, args: { taskId: string; text: string }) => {
      return getTaskGroomerDb().addComment(args.taskId, args.text)
    }
  )

  ipcMain.handle(
    'taskgroomer:updateComment',
    (_event, args: { taskId: string; commentId: string; text: string }) => {
      return getTaskGroomerDb().updateComment(args.taskId, args.commentId, args.text)
    }
  )

  ipcMain.handle(
    'taskgroomer:deleteComment',
    (_event, args: { taskId: string; commentId: string }) => {
      return getTaskGroomerDb().deleteComment(args.taskId, args.commentId)
    }
  )

  ipcMain.handle('taskgroomer:groom', async (event) => {
    if (groomingRunActive) {
      return { started: false, reason: 'already_running' }
    }
    groomingRunActive = true

    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0]

    // Kick off grooming as a background task (don't await here — return immediately)
    runGroomingBatch(win).finally(() => {
      groomingRunActive = false
    })

    return { started: true }
  })

  ipcMain.handle('taskgroomer:regroom', async (_event, args: { taskId: string }) => {
    if (groomingRunActive) {
      return { started: false, reason: 'already_running' }
    }
    groomingRunActive = true

    const db = getTaskGroomerDb()
    const tasks = db.listTasks()
    const task = tasks.find((t) => t.id === args.taskId)

    if (!task) {
      groomingRunActive = false
      return { started: false, reason: 'task_not_found' }
    }

    try {
      const result = await groomTask(task)

      // Merge strategy: preserve existing Jira link if AI returns null for those fields
      const existingJiraKey = task.jiraTicketKey
      const existingJiraUrl = task.jiraTicketUrl

      db.updateTask({
        id: task.id,
        fields: {
          status: 'groomed',
          priority: result.priority,
          priorityRationale: result.priorityRationale,
          suggestedAction: result.suggestedAction,
          evidenceSummary: result.evidenceSummary,
          jiraTicketKey: result.jiraTicketKey ?? existingJiraKey,
          jiraTicketUrl: result.jiraTicketUrl ?? existingJiraUrl,
          researchSummary: result.researchSummary,
          researchLinks: result.researchLinks,
          groomedAt: result.groomedAt
        }
      })

      return {
        started: true,
        result: {
          priority: result.priority,
          priorityRationale: result.priorityRationale,
          suggestedAction: result.suggestedAction,
          evidenceSummary: result.evidenceSummary,
          jiraTicketKey: result.jiraTicketKey ?? existingJiraKey,
          jiraTicketUrl: result.jiraTicketUrl ?? existingJiraUrl,
          researchSummary: result.researchSummary,
          researchLinks: result.researchLinks,
          groomedAt: result.groomedAt,
          sourcesUsed: result.sourcesUsed
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { started: true, result: null, error: message }
    } finally {
      groomingRunActive = false
    }
  })

  // --- DbInspector ER Diagram PDF export (forwards to unified engine) ---
  ipcMain.handle(
    'db:exportErDiagramPdf',
    async (
      _event,
      data: {
        markdown?: string
        mermaidImages?: Record<number, string>
        title?: string
        // Legacy fields (image-based export)
        imageDataUrl?: string
        width?: number
        height?: number
        connectionName?: string
        schema?: string
        tableCount?: number
        relationshipMode?: string
        generatedAt?: string
      }
    ) => {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!mainWindow) throw new Error('No window available for save dialog')
      const { exportPdf } = await import('./lib/pdf-generator')

      // If markdown is provided, use unified engine directly
      if (data.markdown) {
        const filePath = await exportPdf(mainWindow, {
          markdown: data.markdown,
          title: data.title || 'ER Diagram',
          mermaidImages: data.mermaidImages,
          orientation: 'landscape'
        })
        return { filePath }
      }

      // Legacy fallback: image-based export — wrap image in markdown
      const title = data.connectionName ? `${data.connectionName} — ${data.schema}` : 'ER Diagram'
      const md = `# ${title}\n\n**Tables:** ${data.tableCount ?? 'N/A'} | **Mode:** ${data.relationshipMode ?? 'N/A'}`
      const mermaidImages = data.imageDataUrl ? { 0: data.imageDataUrl } : undefined
      const mdWithDiagram = mermaidImages ? md + '\n\n```mermaid\nplaceholder\n```' : md

      const filePath = await exportPdf(mainWindow, {
        markdown: mdWithDiagram,
        title,
        mermaidImages,
        orientation: 'landscape'
      })
      return { filePath }
    }
  )

  // --- Capture popup channels ---
  ipcMain.handle('capture:getClipboard', () => {
    const text = clipboard.readText().trim()
    if (!text) return null

    // Match URLs (http/https prefix)
    if (/^https?:\/\/.+/.test(text)) return text

    // Match Jira-style ticket IDs: e.g. PROJ-123, ABC-4567
    if (/^[A-Z][A-Z0-9]+-\d+$/.test(text)) return text

    return null
  })

  ipcMain.handle('capture:close', () => {
    hideCaptureWindow()
  })

  ipcMain.handle('capture:resize', (_event, height: number) => {
    const win = getCaptureWindow()
    if (!win || win.isDestroyed()) return
    const target = Math.round(height)
    const [currentW, currentH] = win.getSize()
    if (currentH === target) return
    win.setSize(currentW, target, process.platform === 'darwin')
  })

  // --- Integrations channels ---

  ipcMain.handle(
    'integrations:jira:saveCredentials',
    (
      _event,
      creds: {
        baseUrl: string
        email: string
        apiToken: string
        projects: string
      }
    ) => {
      saveIntegrationCredential(CRED_JIRA_BASE_URL, creds.baseUrl)
      saveIntegrationCredential(CRED_JIRA_EMAIL, creds.email)
      saveIntegrationCredential(CRED_JIRA_API_TOKEN, creds.apiToken)
      saveIntegrationSetting(CRED_JIRA_PROJECTS, creds.projects)
      return { saved: true }
    }
  )

  ipcMain.handle('integrations:jira:getStatus', () => {
    return {
      configured: hasIntegrationCredential(CRED_JIRA_API_TOKEN),
      baseUrl: getIntegrationCredential(CRED_JIRA_BASE_URL),
      email: getIntegrationCredential(CRED_JIRA_EMAIL),
      apiTokenMasked: getIntegrationCredentialMasked(CRED_JIRA_API_TOKEN),
      projects: getIntegrationSetting(CRED_JIRA_PROJECTS)
    }
  })

  ipcMain.handle('integrations:jira:clearCredentials', () => {
    deleteIntegrationCredential(CRED_JIRA_BASE_URL)
    deleteIntegrationCredential(CRED_JIRA_EMAIL)
    deleteIntegrationCredential(CRED_JIRA_API_TOKEN)
    return { cleared: true }
  })

  ipcMain.handle('integrations:jira:testConnection', async () => {
    const baseUrl = getIntegrationCredential(CRED_JIRA_BASE_URL)
    const email = getIntegrationCredential(CRED_JIRA_EMAIL)
    const apiToken = getIntegrationCredential(CRED_JIRA_API_TOKEN)
    if (!baseUrl || !email || !apiToken) {
      return { success: false, error: 'Credentials not configured' }
    }
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
      const resp = await fetch(`${baseUrl}/rest/api/3/project/search?maxResults=1`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        signal: controller.signal
      })
      clearTimeout(timeout)
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` }
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  ipcMain.handle('integrations:jira:search', async (_event, query: string) => {
    const baseUrl = getIntegrationCredential(CRED_JIRA_BASE_URL)
    const email = getIntegrationCredential(CRED_JIRA_EMAIL)
    const apiToken = getIntegrationCredential(CRED_JIRA_API_TOKEN)
    const projectsRaw = getIntegrationSetting(CRED_JIRA_PROJECTS)
    const projects = projectsRaw
      ? projectsRaw
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : []
    const credentials: JiraCredentials | null =
      baseUrl && email && apiToken ? { baseUrl, email, apiToken, projects } : null
    return searchJira(query, credentials)
  })

  ipcMain.handle(
    'integrations:confluence:saveCredentials',
    (
      _event,
      creds: {
        baseUrl: string
        email: string
        apiToken: string
      }
    ) => {
      saveIntegrationCredential(CRED_CONFLUENCE_BASE_URL, creds.baseUrl)
      saveIntegrationCredential(CRED_CONFLUENCE_EMAIL, creds.email)
      saveIntegrationCredential(CRED_CONFLUENCE_API_TOKEN, creds.apiToken)
      return { saved: true }
    }
  )

  ipcMain.handle('integrations:confluence:getStatus', () => {
    return {
      configured: hasIntegrationCredential(CRED_CONFLUENCE_API_TOKEN),
      baseUrl: getIntegrationCredential(CRED_CONFLUENCE_BASE_URL),
      email: getIntegrationCredential(CRED_CONFLUENCE_EMAIL),
      apiTokenMasked: getIntegrationCredentialMasked(CRED_CONFLUENCE_API_TOKEN)
    }
  })

  ipcMain.handle('integrations:confluence:clearCredentials', () => {
    deleteIntegrationCredential(CRED_CONFLUENCE_BASE_URL)
    deleteIntegrationCredential(CRED_CONFLUENCE_EMAIL)
    deleteIntegrationCredential(CRED_CONFLUENCE_API_TOKEN)
    return { cleared: true }
  })

  ipcMain.handle('integrations:confluence:testConnection', async () => {
    const baseUrl = getIntegrationCredential(CRED_CONFLUENCE_BASE_URL)
    const email = getIntegrationCredential(CRED_CONFLUENCE_EMAIL)
    const apiToken = getIntegrationCredential(CRED_CONFLUENCE_API_TOKEN)
    if (!baseUrl || !email || !apiToken) {
      return { success: false, error: 'Credentials not configured' }
    }
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
      const resp = await fetch(`${baseUrl}/wiki/rest/api/space?limit=1`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        signal: controller.signal
      })
      clearTimeout(timeout)
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` }
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  ipcMain.handle('integrations:confluence:search', async (_event, query: string) => {
    const baseUrl = getIntegrationCredential(CRED_CONFLUENCE_BASE_URL)
    const email = getIntegrationCredential(CRED_CONFLUENCE_EMAIL)
    const apiToken = getIntegrationCredential(CRED_CONFLUENCE_API_TOKEN)
    const credentials: ConfluenceCredentials | null =
      baseUrl && email && apiToken ? { baseUrl, email, apiToken } : null
    return searchConfluence(query, credentials)
  })

  ipcMain.handle('integrations:web:search', async (_event, query: string) => {
    return webSearch(query)
  })
}

// ── Task Groomer batch runner ─────────────────────────────────────────────

async function runGroomingBatch(win: BrowserWindow | null): Promise<void> {
  const db = getTaskGroomerDb()
  const dumpTasks = db.listTasks(['dump'])

  let succeeded = 0
  let failed = 0

  for (const task of dumpTasks) {
    try {
      const result = await groomTask(task, (stage) => {
        // Push stage-specific grooming progress — renderer shows shimmer + stage label
        win?.webContents.send('taskgroomer:groom:progress', {
          taskId: task.id,
          status: 'grooming',
          stage
        })
      })

      // Write result back to DB
      db.updateTask({
        id: task.id,
        fields: {
          status: 'groomed',
          priority: result.priority,
          priorityRationale: result.priorityRationale,
          suggestedAction: result.suggestedAction,
          evidenceSummary: result.evidenceSummary,
          jiraTicketKey: result.jiraTicketKey,
          jiraTicketUrl: result.jiraTicketUrl,
          researchSummary: result.researchSummary,
          researchLinks: result.researchLinks,
          groomedAt: result.groomedAt
        }
      })

      // Push 'done' with full result — renderer flips card to Groomed
      win?.webContents.send('taskgroomer:groom:progress', {
        taskId: task.id,
        status: 'done',
        result: {
          priority: result.priority,
          priorityRationale: result.priorityRationale,
          suggestedAction: result.suggestedAction,
          evidenceSummary: result.evidenceSummary,
          jiraTicketKey: result.jiraTicketKey,
          jiraTicketUrl: result.jiraTicketUrl,
          researchSummary: result.researchSummary,
          researchLinks: result.researchLinks,
          groomedAt: result.groomedAt,
          sourcesUsed: result.sourcesUsed
        }
      })

      succeeded++
    } catch (err) {
      console.error(`[TaskGroomer] Failed to groom task ${task.id}:`, err)
      // Push 'failed' — renderer leaves card in Dump, adds to failure count
      win?.webContents.send('taskgroomer:groom:progress', {
        taskId: task.id,
        status: 'failed'
      })
      failed++
    }
  }

  // Push run-complete summary so renderer can show toast
  win?.webContents.send('taskgroomer:groom:progress', {
    taskId: '__run_complete__',
    status: 'done',
    result: { succeeded, failed, total: dumpTasks.length }
  })
}

// ── Task Groomer schedule ─────────────────────────────────────────────────

/**
 * Initializes the grooming schedule.
 * Called from main/index.ts after mainWindow is created.
 *
 * Behavior:
 *  1. Catch-up check on app start: if schedule was missed today AND dump tasks exist, run immediately.
 *  2. Every 60 seconds, check if the configured schedule time has been reached today.
 *     If yes and not already run today, trigger grooming.
 */
export function initGroomingSchedule(mainWindow: BrowserWindow): void {
  // Track the date of the last auto-groom to prevent multiple runs on same day
  let lastAutoGroomDate: string | null = null

  function getTodayStr(): string {
    return new Date().toDateString()
  }

  function getScheduleConfig(): { enabled: boolean; time: string } {
    const enabled = (getSetting('plugins.task-groomer.schedule.enabled') as boolean) ?? false
    const time = (getSetting('plugins.task-groomer.schedule.time') as string) ?? '09:00'
    return { enabled, time }
  }

  function shouldRunNow(): boolean {
    const { enabled, time } = getScheduleConfig()
    if (!enabled) return false
    if (groomingRunActive) return false

    const today = getTodayStr()
    if (lastAutoGroomDate === today) return false // Already ran today

    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
  }

  // Catch-up check: run immediately on app start if schedule was missed today
  // Wait 3 seconds after window creation to avoid race with renderer load
  setTimeout(() => {
    if (mainWindow.isDestroyed()) return
    if (shouldRunNow()) {
      const dumpTasks = getTaskGroomerDb().listTasks(['dump'])
      if (dumpTasks.length > 0) {
        console.log('[TaskGroomer] Catch-up: running missed schedule')
        lastAutoGroomDate = getTodayStr()
        groomingRunActive = true
        mainWindow.webContents.send('taskgroomer:groom:start', { taskCount: dumpTasks.length })
        runGroomingBatch(mainWindow).finally(() => {
          groomingRunActive = false
        })
      }
    }
  }, 3000)

  // Poll every 60 seconds for schedule trigger
  setInterval(() => {
    if (mainWindow.isDestroyed()) return
    if (shouldRunNow()) {
      const dumpTasks = getTaskGroomerDb().listTasks(['dump'])
      if (dumpTasks.length > 0) {
        console.log('[TaskGroomer] Schedule: running grooming at configured time')
        lastAutoGroomDate = getTodayStr()
        groomingRunActive = true
        mainWindow.webContents.send('taskgroomer:groom:start', { taskCount: dumpTasks.length })
        runGroomingBatch(mainWindow).finally(() => {
          groomingRunActive = false
        })
      }
    }
  }, 60_000)
}
