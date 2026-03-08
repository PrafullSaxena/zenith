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
    testConnection: (params: { host: string; port: number; username: string; password: string }): Promise<{ success: boolean; serverVersion?: string; error?: string }> =>
      ipcRenderer.invoke('db:testConnection', params),
    connect: (
      id: string,
      name: string,
      host: string,
      port: number,
      username: string,
      password: string,
      database: string,
      defaultSchema: string,
      readStrategy: string
    ): Promise<void> =>
      ipcRenderer.invoke('db:connect', id, name, host, port, username, password, database, defaultSchema, readStrategy),
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
    query: (connectionId: string, sql: string): Promise<unknown> =>
      ipcRenderer.invoke('db:query', connectionId, sql),
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
  },
}

console.log('[preload] API namespaces:', Object.keys(api))

try {
  contextBridge.exposeInMainWorld('api', api)
  console.log('[preload] contextBridge.exposeInMainWorld succeeded')
} catch (err) {
  console.error('[preload] contextBridge.exposeInMainWorld FAILED:', err)
}
