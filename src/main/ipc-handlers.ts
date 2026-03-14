import { ipcMain, safeStorage, shell, BrowserWindow, dialog, app, net } from 'electron'
import Store from 'electron-store'
import { getSettings, getSetting, setSetting, resetSettings } from './settings-store'
import { TokenManager } from './bitbucket/token-manager'
import { listOpenPRs, getPRDiff, postInlineComment, postTopLevelComment, getDiffstatCount, testCredentials, basicAuthHeader } from './bitbucket/api'
import { streamReview, cancelSdkReview, streamAnalysis } from './ai/stream'
import { streamCliReview, cancelCliReview, streamCliAnalysis, probeCliBinary } from './ai/cli-stream'
import { UnifiedDbManager } from './db/db-manager'
import { validateQuery } from './db/postgres'
import { buildSchemaContext, buildQueryOptimizationContext, buildTableDDL } from './db/introspection'
import { exportDiagnosticZip } from './log-collector'
// PDF generators are imported dynamically inside handlers to avoid
// module-level side effects (pdfmake.fonts) that could interfere
// with handler registration if module loading fails.
import { NebulaDatabase } from './nebula/database'
import { NoteFileStorage } from './nebula/file-storage'
import { transcribeAudio } from './nebula/transcription'
import { getApiKeyForProvider } from './ai/providers'
import { GitService } from './codebase-analyzer/git-service'
import { CodebaseAnalyzer } from './codebase-analyzer/analyzer'
import {
  generateArchitectureDiagram,
  generateAPIFlowDiagram,
  generateComponentTreeDiagram,
  generatePipelineDiagram,
  generateClassDiagram
} from './codebase-analyzer/mermaid-generator'
import { generateHLDDocument } from './codebase-analyzer/doc-generator'
import path from 'node:path'
import fs from 'node:fs'

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

/** Lazy-initialized Codebase Analyzer instances. */
let cbanGit: GitService | null = null
let cbanAnalyzer: CodebaseAnalyzer | null = null

function getCbanInstances(): { git: GitService; analyzer: CodebaseAnalyzer } {
  if (!cbanGit || !cbanAnalyzer) {
    cbanGit = new GitService()
    cbanAnalyzer = new CodebaseAnalyzer()
  }
  return { git: cbanGit, analyzer: cbanAnalyzer }
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
      if (!(/\bLIMIT\b/i.test(sql))) {
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

  // --- Unified PDF export channel ---
  ipcMain.handle('app:exportPdf', async (_event, data: {
    markdown: string;
    title?: string;
    mermaidImages?: Record<number, string>;
    orientation?: 'portrait' | 'landscape';
  }) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) throw new Error('No window available for save dialog')
    const { exportPdf } = await import('./lib/pdf-generator')
    const filePath = await exportPdf(mainWindow, data)
    return { filePath }
  })

  // --- Launchpad channels (forwards to unified PDF engine) ---
  ipcMain.handle('launchpad:exportPdf', async (_event, estimation: {
    name: string;
    provider: string;
    lineItems: Array<{ serviceName: string; configSummary: string; monthly: number; yearly: number }>;
    totalMonthly: number;
    totalYearly: number;
    aiRecommendations?: string;
  }) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) throw new Error('No window available for save dialog')

    // Convert estimation to markdown for unified engine
    const tableHeader = '| Service | Configuration | Monthly | Yearly |\n| --- | --- | --- | --- |'
    const tableRows = estimation.lineItems.map(
      (li) => `| ${li.serviceName} | ${li.configSummary} | $${li.monthly.toFixed(2)} | $${li.yearly.toFixed(2)} |`
    ).join('\n')
    const totalRow = `\n**Total: $${estimation.totalMonthly.toFixed(2)}/mo — $${estimation.totalYearly.toFixed(2)}/yr**`

    let md = `# ${estimation.name}\n\n**Provider:** ${estimation.provider}\n\n${tableHeader}\n${tableRows}\n${totalRow}`

    if (estimation.aiRecommendations) {
      md += `\n\n## AI Recommendations\n\n${estimation.aiRecommendations}`
    }

    const { exportPdf } = await import('./lib/pdf-generator')
    const filePath = await exportPdf(mainWindow, { markdown: md, title: estimation.name })
    return { filePath }
  })

  // --- TextCraft channels (backward-compatible alias for unified engine) ---
  ipcMain.handle('textcraft:exportPdf', async (_event, data: { markdown: string; title?: string; mermaidImages?: Record<number, string> }) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!mainWindow) throw new Error('No window available for save dialog')
    const { exportPdf } = await import('./lib/pdf-generator')
    const filePath = await exportPdf(mainWindow, data)
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

  ipcMain.handle('nebula:updateEdges', async (_event, sourceId: string, targets: { targetId: string; relationship: string; weight: number }[]) => {
    const { db } = getNebulaInstances()
    db.upsertEdges(sourceId, targets)
  })

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
    async (_event, record: { id: string; noteId: string | null; audioPath: string; transcript: string; speakers: string }) => {
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

  // --- Codebase Analyzer channels ---

  // Fetch remote branches from a URL (before cloning)
  ipcMain.handle('cban:fetchBranches', async (_event, url: string) => {
    const { git } = getCbanInstances()
    return git.fetchRemoteBranches(url)
  })

  // Clone a repository
  ipcMain.handle('cban:clone', async (event, url: string, name: string) => {
    const { git } = getCbanInstances()
    const win = BrowserWindow.fromWebContents(event.sender)
    return git.clone(url, name, (progress) => {
      win?.webContents.send('cban:cloneProgress', progress)
    })
  })

  // Analyze a cloned repository
  ipcMain.handle(
    'cban:analyze',
    async (event, repoPath: string, branch: string, repoUrl: string) => {
      const { analyzer } = getCbanInstances()
      const win = BrowserWindow.fromWebContents(event.sender)
      return analyzer.analyzeRepository(repoPath, branch, repoUrl, (progress) => {
        win?.webContents.send('cban:analysisProgress', progress)
      })
    }
  )

  // Get file content from a cloned repo
  ipcMain.handle(
    'cban:getFileContent',
    async (_event, repoPath: string, filePath: string) => {
      const { git, analyzer } = getCbanInstances()
      const content = await git.getFileContent(repoPath, filePath)
      const language = analyzer.detectLanguage(filePath)
      return {
        content,
        language,
        path: filePath,
        lineCount: content.split('\n').length
      }
    }
  )

  // Remove a cloned repository
  ipcMain.handle('cban:removeRepo', async (_event, repoPath: string) => {
    const { git } = getCbanInstances()
    return git.removeRepo(repoPath)
  })

  // Get cached analysis
  ipcMain.handle(
    'cban:getCachedAnalysis',
    async (_event, repoUrl: string, branch: string, commitSha: string) => {
      const { analyzer } = getCbanInstances()
      return analyzer.cache.getAnalysis(repoUrl, branch, commitSha)
    }
  )

  // Search code files (FTS5)
  ipcMain.handle('cban:searchCode', async (_event, repoUrl: string, query: string) => {
    const { analyzer } = getCbanInstances()
    return analyzer.cache.searchFiles(repoUrl, query)
  })

  // --- Codebase Analyzer HLD generation ---
  ipcMain.handle('cban:generateHLD', async (_event, repoUrl: string, branch: string) => {
    const { analyzer } = getCbanInstances()
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
      architecture: generateArchitectureDiagram(typedAnalysis as Parameters<typeof generateArchitectureDiagram>[0]),
      apiFlow: generateAPIFlowDiagram(typedAnalysis as Parameters<typeof generateAPIFlowDiagram>[0]),
      componentTree: generateComponentTreeDiagram(typedAnalysis as Parameters<typeof generateComponentTreeDiagram>[0]),
      pipeline: generatePipelineDiagram(typedAnalysis as Parameters<typeof generatePipelineDiagram>[0]),
      classDiagram: generateClassDiagram(typedAnalysis as Parameters<typeof generateClassDiagram>[0])
    }

    return generateHLDDocument(typedAnalysis as Parameters<typeof generateHLDDocument>[0], diagrams)
  })

  // --- DbInspector ER Diagram PDF export (forwards to unified engine) ---
  ipcMain.handle('db:exportErDiagramPdf', async (_event, data: {
    markdown?: string;
    mermaidImages?: Record<number, string>;
    title?: string;
    // Legacy fields (image-based export)
    imageDataUrl?: string;
    width?: number;
    height?: number;
    connectionName?: string;
    schema?: string;
    tableCount?: number;
    relationshipMode?: string;
    generatedAt?: string;
  }) => {
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
  })
}
