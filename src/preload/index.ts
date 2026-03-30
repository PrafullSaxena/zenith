import { contextBridge, ipcRenderer } from 'electron'

console.log('[preload] Executing preload script...')

// Build the API object that will be exposed to the renderer.
// IMPORTANT: All functions must return serializable types (Promises, primitives, plain objects).
// ipcRenderer.on() returns an IpcRenderer instance which contextBridge cannot proxy,
// so we must wrap those calls in void-returning functions.
const api = {
  settings: {
    getAll: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:getAll'),
    get: (key: string): Promise<unknown> => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('settings:set', key, value),
    reset: (namespace: string): Promise<void> => ipcRenderer.invoke('settings:reset', namespace),
  },
  credentials: {
    set: (service: string, value: string): Promise<void> =>
      ipcRenderer.invoke('credentials:set', service, value),
    has: (service: string): Promise<boolean> => ipcRenderer.invoke('credentials:has', service),
  },
  app: {
    probeOllama: (): Promise<{ available: boolean; models: string[] }> =>
      ipcRenderer.invoke('app:probeOllama'),
    probeCli: (command: string): Promise<{ available: boolean }> =>
      ipcRenderer.invoke('app:probeCli', command),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('app:openExternal', url),
    exportDiagnosticLogs: (): Promise<{ filePath: string }> =>
      ipcRenderer.invoke('app:exportDiagnosticLogs'),
    selectDirectory: (currentPath?: string): Promise<{ canceled: boolean; path: string }> =>
      ipcRenderer.invoke('app:selectDirectory', currentPath),
    exportPdf: (data: {
      markdown: string;
      title?: string;
      mermaidImages?: Record<number, string>;
      orientation?: 'portrait' | 'landscape';
    }): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('app:exportPdf', data),
    saveTextFile: (
      content: string,
      defaultFilename: string,
      filters: { name: string; extensions: string[] }[]
    ): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('app:saveTextFile', content, defaultFilename, filters),
  },
  bitbucket: {
    connect: (): Promise<{ connected: boolean; displayName: string }> =>
      ipcRenderer.invoke('bitbucket:connect'),
    disconnect: (): Promise<void> => ipcRenderer.invoke('bitbucket:disconnect'),
    isConnected: (): Promise<boolean> => ipcRenderer.invoke('bitbucket:isConnected'),
    listPRs: (workspace: string, repoSlug: string, page?: number, pagelen?: number): Promise<unknown> =>
      ipcRenderer.invoke('bitbucket:listPRs', workspace, repoSlug, page, pagelen),
    getPRDiff: (workspace: string, repoSlug: string, prId: number): Promise<string> =>
      ipcRenderer.invoke('bitbucket:getPRDiff', workspace, repoSlug, prId),
    postComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      filePath: string,
      line: number,
      comment: string
    ): Promise<void> =>
      ipcRenderer.invoke(
        'bitbucket:postComment',
        workspace,
        repoSlug,
        prId,
        filePath,
        line,
        comment
      ),
    postTopLevelComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      comment: string
    ): Promise<void> =>
      ipcRenderer.invoke(
        'bitbucket:postTopLevelComment',
        workspace,
        repoSlug,
        prId,
        comment
      ),
    getDiffstatCount: (workspace: string, repoSlug: string, prId: number): Promise<number> =>
      ipcRenderer.invoke('bitbucket:getDiffstatCount', workspace, repoSlug, prId),
  },
  ai: {
    startReview: (
      providerId: string,
      modelName: string,
      diff: string,
      sessionId: string,
      command?: string,
      guidelines?: string
    ): Promise<{ started: boolean; sessionId: string }> =>
      ipcRenderer.invoke('ai:startReview', providerId, modelName, diff, sessionId, command, guidelines),
    cancelReview: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('ai:cancelReview', sessionId),
    // IMPORTANT: Do NOT return ipcRenderer.on() — it returns an IpcRenderer instance
    // which cannot be serialized across the contextBridge. Return void instead.
    onStreamChunk: (cb: (data: { sessionId: string; chunk: string }) => void): void => {
      ipcRenderer.on('ai:stream:chunk', (_e, data) => cb(data))
    },
    onStreamDone: (cb: (data: { sessionId: string; usage?: { totalTokens: number; isEstimated: boolean } }) => void): void => {
      ipcRenderer.on('ai:stream:done', (_e, data) => cb(data))
    },
    onStreamError: (cb: (data: { sessionId: string; error: string }) => void): void => {
      ipcRenderer.on('ai:stream:error', (_e, data) => cb(data))
    },
    removeStreamListeners: (): void => {
      ipcRenderer.removeAllListeners('ai:stream:chunk')
      ipcRenderer.removeAllListeners('ai:stream:done')
      ipcRenderer.removeAllListeners('ai:stream:error')
    },
    startAnalysis: (
      providerId: string,
      modelName: string,
      systemPrompt: string,
      userPrompt: string,
      sessionId: string,
      command?: string
    ): Promise<{ started: boolean; sessionId: string }> =>
      ipcRenderer.invoke('ai:startAnalysis', providerId, modelName, systemPrompt, userPrompt, sessionId, command),
    cancelAnalysis: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('ai:cancelAnalysis', sessionId),
  },
  db: {
    testConnection: (
      params: { host: string; port: number; username: string; password: string },
      engine?: 'postgresql' | 'mysql'
    ): Promise<{ success: boolean; serverVersion?: string; error?: string }> =>
      ipcRenderer.invoke('db:testConnection', params, engine),
    connect: (
      id: string,
      name: string,
      host: string,
      port: number,
      username: string,
      password: string,
      database: string,
      defaultSchema: string,
      readStrategy: string,
      engine?: 'postgresql' | 'mysql'
    ): Promise<void> =>
      ipcRenderer.invoke('db:connect', id, name, host, port, username, password, database, defaultSchema, readStrategy, engine),
    disconnect: (connectionId: string): Promise<void> =>
      ipcRenderer.invoke('db:disconnect', connectionId),
    getConnections: (): Promise<unknown[]> =>
      ipcRenderer.invoke('db:getConnections'),
    isConnected: (connectionId: string): Promise<boolean> =>
      ipcRenderer.invoke('db:isConnected', connectionId),
    getDatabases: (connectionId: string): Promise<string[]> =>
      ipcRenderer.invoke('db:getDatabases', connectionId),
    switchDatabase: (connectionId: string, database: string): Promise<void> =>
      ipcRenderer.invoke('db:switchDatabase', connectionId, database),
    getSchemas: (connectionId: string): Promise<string[]> =>
      ipcRenderer.invoke('db:getSchemas', connectionId),
    getTables: (connectionId: string, schema: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:getTables', connectionId, schema),
    getColumns: (connectionId: string, schema: string, table: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:getColumns', connectionId, schema, table),
    getTableDDL: (connectionId: string, schema: string, table: string): Promise<string> =>
      ipcRenderer.invoke('db:getTableDDL', connectionId, schema, table),
    getForeignKeys: (connectionId: string, schema: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:getForeignKeys', connectionId, schema),
    getIndexes: (connectionId: string, schema: string, table: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:getIndexes', connectionId, schema, table),
    getTableStats: (connectionId: string, schema: string, table: string): Promise<unknown> =>
      ipcRenderer.invoke('db:getTableStats', connectionId, schema, table),
    query: (connectionId: string, sql: string, allowWrite?: boolean, limit?: number, offset?: number): Promise<unknown> =>
      ipcRenderer.invoke('db:query', connectionId, sql, allowWrite, limit, offset),
    cancelQuery: (connectionId: string): Promise<void> =>
      ipcRenderer.invoke('db:cancelQuery', connectionId),
    allColumns: (connectionId: string, schema: string): Promise<Record<string, { name: string; dataType: string }[]>> =>
      ipcRenderer.invoke('db:allColumns', connectionId, schema),
    explain: (connectionId: string, sql: string): Promise<string> =>
      ipcRenderer.invoke('db:explain', connectionId, sql),
    buildSchemaContext: (connectionId: string, schema: string, tables?: string[]): Promise<string> =>
      ipcRenderer.invoke('db:buildSchemaContext', connectionId, schema, tables),
    buildOptimizationContext: (connectionId: string, schema: string, sql: string): Promise<string> =>
      ipcRenderer.invoke('db:buildOptimizationContext', connectionId, schema, sql),
    storeCredentials: (connectionId: string, password: string): Promise<void> =>
      ipcRenderer.invoke('db:storeCredentials', connectionId, password),
    getCredentials: (connectionId: string): Promise<string | null> =>
      ipcRenderer.invoke('db:getCredentials', connectionId),
    exportErDiagramPdf: (data: unknown): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('db:exportErDiagramPdf', data),
  },
  launchpad: {
    exportPdf: (estimation: {
      name: string
      provider: string
      lineItems: Array<{ serviceName: string; configSummary: string; monthly: number; yearly: number }>
      totalMonthly: number
      totalYearly: number
      aiRecommendations?: string
    }): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('launchpad:exportPdf', estimation),

    getCatalog: (provider: string): Promise<unknown[]> =>
      ipcRenderer.invoke('launchpad:getCatalog', provider),

    getPricing: (args: {
      provider: string
      region: string
      serviceIds: string[]
    }): Promise<Record<string, Record<string, number>>> =>
      ipcRenderer.invoke('launchpad:getPricing', args),

    saveCredentials: (credentials: {
      gcpApiKey?: string
      awsAccessKeyId?: string
      awsSecretAccessKey?: string
      gcpBillingAccountId?: string
    }): Promise<{ saved: boolean }> =>
      ipcRenderer.invoke('launchpad:saveCredentials', credentials),

    getCredentialStatus: (): Promise<Record<string, { set: boolean; masked: string | null }>> =>
      ipcRenderer.invoke('launchpad:getCredentialStatus'),

    deleteCredential: (args: { key: string }): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke('launchpad:deleteCredential', args),

    syncPricing: (): Promise<{
      success: boolean
      result?: {
        startedAt: number
        completedAt: number
        providers: Array<{
          provider: 'aws' | 'gcp' | 'azure'
          status: 'success' | 'error' | 'skipped'
          servicesUpdated: number
          error?: string
          deltaSkipped?: boolean
        }>
      }
      error?: string
    }> =>
      ipcRenderer.invoke('launchpad:syncPricing'),

    getSyncStatus: (): Promise<{
      success: boolean
      statuses?: Array<{
        provider: 'aws' | 'gcp' | 'azure'
        lastSyncAt: number | null
        status: string | null
        servicesUpdated: number | null
        error: string | null
      }>
      error?: string
    }> =>
      ipcRenderer.invoke('launchpad:getSyncStatus'),

    getRegions: (provider: string): Promise<{
      success: boolean
      regions?: Array<{ regionId: string; displayName: string }>
      error?: string
    }> =>
      ipcRenderer.invoke('launchpad:getRegions', provider),

    onSyncComplete: (
      callback: (result: {
        startedAt: number
        completedAt: number
        providers: Array<{ provider: string; status: string; servicesUpdated: number }>
      }) => void
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, result: unknown) =>
        callback(result as Parameters<typeof callback>[0])
      ipcRenderer.on('launchpad:syncComplete', handler)
      // Return an unsubscribe function so the renderer can clean up
      return () => ipcRenderer.removeListener('launchpad:syncComplete', handler)
    },
  },
  textcraft: {
    exportPdf: (data: { markdown: string; title?: string; mermaidImages?: Record<number, string> }): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('textcraft:exportPdf', data),
  },
  cortex: {
    listRepos: (): Promise<unknown[]> => ipcRenderer.invoke('cortex:listRepos'),
    saveRepo: (repo: unknown): Promise<void> => ipcRenderer.invoke('cortex:saveRepo', repo),
    removeRepoById: (id: string): Promise<void> => ipcRenderer.invoke('cortex:removeRepoById', id),
    updateRepoFields: (id: string, fields: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('cortex:updateRepoFields', id, fields),
    fetchBranches: (url: string): Promise<string[]> =>
      ipcRenderer.invoke('cortex:fetchBranches', url),
    clone: (url: string, name: string, branch?: string): Promise<{ repoPath: string }> =>
      ipcRenderer.invoke('cortex:clone', url, name, branch),
    analyze: (repoPath: string, branch: string, repoUrl: string): Promise<unknown> =>
      ipcRenderer.invoke('cortex:analyze', repoPath, branch, repoUrl),
    getFileContent: (
      repoPath: string,
      filePath: string
    ): Promise<{ content: string; language: string; path: string; lineCount: number }> =>
      ipcRenderer.invoke('cortex:getFileContent', repoPath, filePath),
    removeRepo: (repoPath: string): Promise<void> =>
      ipcRenderer.invoke('cortex:removeRepo', repoPath),
    getCachedAnalysis: (
      repoUrl: string,
      branch: string,
      commitSha: string
    ): Promise<unknown> =>
      ipcRenderer.invoke('cortex:getCachedAnalysis', repoUrl, branch, commitSha),
    searchCode: (repoUrl: string, query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('cortex:searchCode', repoUrl, query),
    generateHLD: (repoUrl: string, branch: string): Promise<string> =>
      ipcRenderer.invoke('cortex:generateHLD', repoUrl, branch),
    generateInsights: (repoUrl: string, branch: string): Promise<{ systemPrompt: string; userPrompt: string }> =>
      ipcRenderer.invoke('cortex:generateInsights', repoUrl, branch),
    saveInsights: (repoUrl: string, branch: string, commitSha: string, agentId: string, toonData: string): Promise<void> =>
      ipcRenderer.invoke('cortex:saveInsights', repoUrl, branch, commitSha, agentId, toonData),
    getInsights: (repoUrl: string, branch: string, commitSha: string): Promise<string | null> =>
      ipcRenderer.invoke('cortex:getInsights', repoUrl, branch, commitSha),
    reanalyze: (repoId: string, force?: boolean): Promise<{ changed: boolean; result?: unknown }> =>
      ipcRenderer.invoke('cortex:reanalyze', repoId, force),
    probeRtk: (): Promise<boolean> =>
      ipcRenderer.invoke('cortex:probeRtk'),
    // AI Enrichment
    buildDigest: (
      repoUrl: string,
      branch: string
    ): Promise<{
      data: string | null
      cached: boolean
      rawDigest?: string
      systemPrompt?: string
      userPrompt?: string
      commitSha?: string
    }> =>
      ipcRenderer.invoke('cortex:buildDigest', repoUrl, branch),
    saveEnrichment: (
      repoUrl: string,
      branch: string,
      commitSha: string,
      enrichmentType: string,
      agentId: string,
      data: string
    ): Promise<void> =>
      ipcRenderer.invoke(
        'cortex:saveEnrichment',
        repoUrl,
        branch,
        commitSha,
        enrichmentType,
        agentId,
        data
      ),
    getEnrichment: (
      repoUrl: string,
      branch: string,
      commitSha: string,
      enrichmentType: string
    ): Promise<string | null> =>
      ipcRenderer.invoke('cortex:getEnrichment', repoUrl, branch, commitSha, enrichmentType),
    buildEntityBatches: (
      repoUrl: string,
      branch: string,
      existingSummaryIds: string[]
    ): Promise<Array<{ entityIds: string[]; systemPrompt: string; userPrompt: string }>> =>
      ipcRenderer.invoke('cortex:buildEntityBatches', repoUrl, branch, existingSummaryIds),
    buildValidationPrompts: (
      repoUrl: string,
      branch: string,
      digestText: string
    ): Promise<{ systemPrompt: string; userPrompt: string; commitSha: string }> =>
      ipcRenderer.invoke('cortex:buildValidationPrompts', repoUrl, branch, digestText),
    onCloneProgress: (
      cb: (data: { stage: string; progress: number; detail: string }) => void
    ): void => {
      ipcRenderer.on('cortex:cloneProgress', (_e, data) => cb(data))
    },
    onAnalysisProgress: (
      cb: (data: {
        phase: string
        progress: number
        detail: string
        filesProcessed: number
        totalFiles: number
      }) => void
    ): void => {
      ipcRenderer.on('cortex:analysisProgress', (_e, data) => cb(data))
    },
    removeProgressListeners: (): void => {
      ipcRenderer.removeAllListeners('cortex:cloneProgress')
      ipcRenderer.removeAllListeners('cortex:analysisProgress')
    },
  },
  nebula: {
    saveNote: (note: unknown): Promise<{ saved: boolean }> =>
      ipcRenderer.invoke('nebula:saveNote', note),
    loadNote: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('nebula:loadNote', id),
    listNotes: (): Promise<unknown[]> =>
      ipcRenderer.invoke('nebula:listNotes'),
    deleteNote: (id: string): Promise<void> =>
      ipcRenderer.invoke('nebula:deleteNote', id),
    searchNotes: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('nebula:searchNotes', query),
    getGraph: (): Promise<unknown> =>
      ipcRenderer.invoke('nebula:getGraph'),
    updateEdges: (sourceId: string, targets: unknown[]): Promise<void> =>
      ipcRenderer.invoke('nebula:updateEdges', sourceId, targets),
    transcribeAudio: (buffer: number[], providerId?: string, command?: string): Promise<unknown> =>
      ipcRenderer.invoke('nebula:transcribeAudio', buffer, providerId, command),
    saveTranscription: (record: unknown): Promise<{ saved: boolean }> =>
      ipcRenderer.invoke('nebula:saveTranscription', record),
    selectAudioFile: (): Promise<{ canceled: boolean; path: string }> =>
      ipcRenderer.invoke('nebula:selectAudioFile'),
    togglePin: (noteId: string, pinned: boolean): Promise<void> =>
      ipcRenderer.invoke('nebula:togglePin', noteId, pinned),
    saveAudio: (noteId: string, audioBuffer: number[]): Promise<{ audioPath: string }> =>
      ipcRenderer.invoke('nebula:saveAudio', noteId, audioBuffer),
    loadAudio: (noteId: string): Promise<number[] | null> =>
      ipcRenderer.invoke('nebula:loadAudio', noteId),
  },
}

console.log('[preload] API namespaces:', Object.keys(api))

try {
  contextBridge.exposeInMainWorld('api', api)
  console.log('[preload] contextBridge.exposeInMainWorld succeeded')
} catch (err) {
  console.error('[preload] contextBridge.exposeInMainWorld FAILED:', err)
}
