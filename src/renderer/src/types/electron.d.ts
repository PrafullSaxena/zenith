import type {
  TableInfo,
  ColumnInfo,
  ForeignKey,
  IndexInfo,
  TableStats,
  QueryResult,
  TestConnectionResult,
  DbConnection
} from './database'

export interface PaginatedPRResult {
  prs: import('./bitbucket').PullRequest[]
  page: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ElectronAPI {
  settings: {
    getAll: () => Promise<Record<string, unknown>>
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    reset: (namespace: string) => Promise<void>
  }
  credentials: {
    set: (service: string, value: string) => Promise<void>
    has: (service: string) => Promise<boolean>
  }
  app: {
    probeOllama: () => Promise<{ available: boolean; models: string[] }>
    probeCli: (command: string) => Promise<{ available: boolean }>
    openExternal: (url: string) => Promise<void>
  }
  bitbucket: {
    connect: () => Promise<{ connected: boolean }>
    disconnect: () => Promise<{ connected: boolean }>
    isConnected: () => Promise<boolean>
    listPRs: (
      workspace: string,
      repoSlug: string,
      page?: number,
      pagelen?: number
    ) => Promise<PaginatedPRResult>
    getPRDiff: (
      workspace: string,
      repoSlug: string,
      prId: number
    ) => Promise<string>
    postComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      filePath: string,
      line: number,
      comment: string
    ) => Promise<void>
    postTopLevelComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      comment: string
    ) => Promise<void>
    getDiffstatCount: (
      workspace: string,
      repoSlug: string,
      prId: number
    ) => Promise<number>
  }
  ai: {
    startReview: (
      providerId: string,
      modelName: string,
      diff: string,
      sessionId: string,
      command?: string,
      guidelines?: string
    ) => Promise<{ started: boolean; sessionId: string }>
    cancelReview: (sessionId: string) => Promise<void>
    onStreamChunk: (
      cb: (data: { sessionId: string; chunk: string }) => void
    ) => void
    onStreamDone: (cb: (data: { sessionId: string }) => void) => void
    onStreamError: (
      cb: (data: { sessionId: string; error: string }) => void
    ) => void
    removeStreamListeners: () => void
    startAnalysis: (
      providerId: string,
      modelName: string,
      systemPrompt: string,
      userPrompt: string,
      sessionId: string,
      command?: string
    ) => Promise<{ started: boolean; sessionId: string }>
    cancelAnalysis: (sessionId: string) => Promise<void>
  }
  db: {
    testConnection: (params: {
      host: string
      port: number
      username: string
      password: string
    }) => Promise<TestConnectionResult>
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
    ) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    getConnections: () => Promise<DbConnection[]>
    isConnected: (connectionId: string) => Promise<boolean>
    getDatabases: (connectionId: string) => Promise<string[]>
    switchDatabase: (connectionId: string, database: string) => Promise<void>
    getSchemas: (connectionId: string) => Promise<string[]>
    getTables: (connectionId: string, schema: string) => Promise<TableInfo[]>
    getColumns: (
      connectionId: string,
      schema: string,
      table: string
    ) => Promise<ColumnInfo[]>
    getTableDDL: (
      connectionId: string,
      schema: string,
      table: string
    ) => Promise<string>
    getForeignKeys: (
      connectionId: string,
      schema: string
    ) => Promise<ForeignKey[]>
    getIndexes: (
      connectionId: string,
      schema: string,
      table: string
    ) => Promise<IndexInfo[]>
    getTableStats: (
      connectionId: string,
      schema: string,
      table: string
    ) => Promise<TableStats>
    query: (connectionId: string, sql: string) => Promise<QueryResult>
    explain: (connectionId: string, sql: string) => Promise<string>
    buildSchemaContext: (
      connectionId: string,
      schema: string,
      tables?: string[]
    ) => Promise<string>
    buildOptimizationContext: (
      connectionId: string,
      schema: string,
      sql: string
    ) => Promise<string>
    storeCredentials: (connectionId: string, password: string) => Promise<void>
    getCredentials: (connectionId: string) => Promise<string | null>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
