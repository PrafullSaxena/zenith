import { ipcMain, safeStorage, shell, BrowserWindow, dialog, app } from 'electron'
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
import { NebulaDatabase } from './nebula/database'
import { NoteFileStorage } from './nebula/file-storage'

/**
 * Separate electron-store instance for credentials.
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/** Module-level credential manager for Bitbucket App Password auth. */
const tokenManager = new TokenManager()

/** Module-level PostgreSQL connection manager for DbInspector. */
const dbManager = new PostgresConnectionManager()

/** Lazy-initialized Nebula database and file storage instances. */
let nebulaDb: NebulaDatabase | null = null
let nebulaFs: NoteFileStorage | null = null

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

  // --- Nebula channels ---
  ipcMain.handle('nebula:saveNote', async (_event, note: {
    id: string
    title: string
    content: object
    drawing: object | null
    summary: string | null
    topics: string[]
    createdAt: string
    updatedAt: string
  }) => {
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
  })

  ipcMain.handle('nebula:loadNote', async (_event, id: string) => {
    const { fs: noteFs } = getNebulaInstances()
    return noteFs.readNote(id)
  })

  ipcMain.handle('nebula:listNotes', async () => {
    const { db } = getNebulaInstances()
    return db.listNotes()
  })

  ipcMain.handle('nebula:deleteNote', async (_event, id: string) => {
    const { db, fs: noteFs } = getNebulaInstances()
    db.deleteNote(id)
    noteFs.deleteNote(id)
  })

  ipcMain.handle('nebula:searchNotes', async (_event, query: string) => {
    const { db } = getNebulaInstances()
    return db.searchNotes(query)
  })

  ipcMain.handle('nebula:getGraph', async () => {
    const { db } = getNebulaInstances()
    return db.getGraphData()
  })

  ipcMain.handle('nebula:updateEdges', async (_event, sourceId: string, targets: { targetId: string; relationship: string; weight: number }[]) => {
    const { db } = getNebulaInstances()
    db.upsertEdges(sourceId, targets)
  })

  ipcMain.handle('nebula:transcribeAudio', async (_event, _audioBuffer: number[]) => {
    // Stub — transcription wired in Plan 05
    throw new Error('Transcription not yet configured')
  })

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

  // --- DbInspector ER Diagram PDF export ---
  ipcMain.handle('db:exportErDiagramPdf', async (_event, data: {
    imageDataUrl: string
    width: number
    height: number
    connectionName: string
    schema: string
    tableCount: number
    relationshipMode: string
    generatedAt: string
  }) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) throw new Error('No window available for save dialog')

    const workingDir = getSetting('general.workingDirectory') as string
    const defaultDir = workingDir || app.getPath('downloads')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const schemaSlug = data.schema.replace(/\s+/g, '-') || 'schema'
    const filename = `er-diagram-${schemaSlug}-${timestamp}.pdf`

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export ER Diagram as PDF',
      defaultPath: `${defaultDir}/${filename}`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return { filePath: null }

    // Strip data URL prefix to get raw base64
    const base64 = data.imageDataUrl.replace(/^data:image\/png;base64,/, '')

    const pdfmake = await import('pdfmake')
    pdfmake.default.fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    }

    const content: unknown[] = [
      { text: 'ER Diagram', fontSize: 22, bold: true, color: '#111111', marginBottom: 4 },
      { text: `${data.connectionName} / ${data.schema}`, fontSize: 14, color: '#666666', marginBottom: 4 },
      {
        text: `${data.tableCount} tables · ${data.relationshipMode} mode · Generated ${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        fontSize: 10,
        color: '#888888',
        marginBottom: 20
      },
      {
        image: `data:image/png;base64,${base64}`,
        width: Math.min(data.width, 755) // landscape page width minus margins
      }
    ]

    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 11 },
      pageOrientation: 'landscape' as const,
      content,
      pageMargins: [40, 40, 40, 40]
    }

    const pdf = pdfmake.default.createPdf(docDefinition as Parameters<typeof pdfmake.default.createPdf>[0])
    const buffer = await pdf.getBuffer()
    const fs = await import('fs')
    fs.writeFileSync(filePath, buffer)

    return { filePath }
  })
}
