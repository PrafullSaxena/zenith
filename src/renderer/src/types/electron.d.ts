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

interface Task {
  id: string
  text: string
  status: 'dump' | 'groomed' | 'done' | 'delegated' | 'aborted'
  captureSource: 'typed' | 'clipboard'
  createdAt: number
  updatedAt: number
  priority: 'p1' | 'p2' | 'p3' | null
  suggestedAction: 'do' | 'delegate' | 'defer' | 'delete' | null
  jiraTicketKey: string | null
  jiraTicketUrl: string | null
  evidenceSummary: string | null
  researchSummary: string | null
  researchLinks: string | null
  groomedAt: number | null
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
    selectDirectory: (currentPath?: string) => Promise<{ canceled: boolean; path: string }>
    exportPdf: (data: {
      markdown: string
      title?: string
      mermaidImages?: Record<number, string>
      orientation?: 'portrait' | 'landscape'
      diagramImage?: string
    }) => Promise<{ filePath: string | null }>
    saveTextFile: (
      content: string,
      defaultFilename: string,
      filters: { name: string; extensions: string[] }[]
    ) => Promise<{ filePath: string | null }>
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
    getPRDiff: (workspace: string, repoSlug: string, prId: number) => Promise<string>
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
    getDiffstatCount: (workspace: string, repoSlug: string, prId: number) => Promise<number>
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
    onStreamChunk: (cb: (data: { sessionId: string; chunk: string }) => void) => void
    onStreamDone: (
      cb: (data: {
        sessionId: string
        usage?: { totalTokens: number; isEstimated: boolean }
      }) => void
    ) => void
    onStreamError: (cb: (data: { sessionId: string; error: string }) => void) => void
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
  cortex: {
    listRepos: () => Promise<Array<import('./cortex').Repository>>
    saveRepo: (repo: Partial<import('./cortex').Repository>) => Promise<void>
    removeRepoById: (id: string) => Promise<void>
    updateRepoFields: (id: string, fields: Record<string, unknown>) => Promise<void>
    fetchBranches: (url: string) => Promise<string[]>
    clone: (url: string, name: string, branch?: string) => Promise<{ repoPath: string }>
    analyze: (
      repoPath: string,
      branch: string,
      repoUrl: string
    ) => Promise<import('./cortex').AnalysisResult>
    getFileContent: (repoPath: string, filePath: string) => Promise<import('./cortex').FileContent>
    removeRepo: (repoPath: string) => Promise<void>
    getCachedAnalysis: (
      repoUrl: string,
      branch: string,
      commitSha: string
    ) => Promise<import('./cortex').AnalysisResult | null>
    searchCode: (repoUrl: string, query: string) => Promise<{ filePath: string; snippet: string }[]>
    generateHLD: (repoUrl: string, branch: string) => Promise<string>
    generateInsights: (
      repoUrl: string,
      branch: string
    ) => Promise<{ systemPrompt: string; userPrompt: string }>
    saveInsights: (
      repoUrl: string,
      branch: string,
      commitSha: string,
      agentId: string,
      toonData: string
    ) => Promise<void>
    getInsights: (repoUrl: string, branch: string, commitSha: string) => Promise<string | null>
    reanalyze: (
      repoId: string
    ) => Promise<{ changed: boolean; result?: import('./cortex').AnalysisResult }>
    probeRtk: () => Promise<boolean>
    onCloneProgress: (cb: (data: import('./cortex').CloneProgress) => void) => void
    onAnalysisProgress: (cb: (data: import('./cortex').AnalysisProgress) => void) => void
    removeProgressListeners: () => void
  }
  db: {
    testConnection: (
      params: {
        host: string
        port: number
        username: string
        password: string
      },
      engine?: 'postgresql' | 'mysql'
    ) => Promise<TestConnectionResult>
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
    ) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    getConnections: () => Promise<DbConnection[]>
    isConnected: (connectionId: string) => Promise<boolean>
    getDatabases: (connectionId: string) => Promise<string[]>
    switchDatabase: (connectionId: string, database: string) => Promise<void>
    getSchemas: (connectionId: string) => Promise<string[]>
    getTables: (connectionId: string, schema: string) => Promise<TableInfo[]>
    getColumns: (connectionId: string, schema: string, table: string) => Promise<ColumnInfo[]>
    getTableDDL: (connectionId: string, schema: string, table: string) => Promise<string>
    getForeignKeys: (connectionId: string, schema: string) => Promise<ForeignKey[]>
    getIndexes: (connectionId: string, schema: string, table: string) => Promise<IndexInfo[]>
    getTableStats: (connectionId: string, schema: string, table: string) => Promise<TableStats>
    query: (
      connectionId: string,
      sql: string,
      allowWrite?: boolean,
      limit?: number,
      offset?: number
    ) => Promise<QueryResult & { hasMore: boolean }>
    cancelQuery: (connectionId: string) => Promise<void>
    allColumns: (
      connectionId: string,
      schema: string
    ) => Promise<Record<string, { name: string; dataType: string }[]>>
    explain: (connectionId: string, sql: string) => Promise<string>
    buildSchemaContext: (connectionId: string, schema: string, tables?: string[]) => Promise<string>
    buildOptimizationContext: (connectionId: string, schema: string, sql: string) => Promise<string>
    storeCredentials: (connectionId: string, password: string) => Promise<void>
    getCredentials: (connectionId: string) => Promise<string | null>
    exportErDiagramPdf: (data: {
      imageDataUrl: string
      width: number
      height: number
      connectionName: string
      schema: string
      tableCount: number
      relationshipMode: string
      generatedAt: string
    }) => Promise<{ filePath: string | null }>
  }
  launchpad: {
    exportPdf: (
      estimation: import('./launchpad').EstimationExport
    ) => Promise<{ filePath: string | null }>
    getPricing: (args: {
      provider: string
      region: string
      serviceIds: string[]
    }) => Promise<Record<string, Record<string, number>>>
    getCatalog: (provider: string) => Promise<
      Array<{
        id: string
        name: string
        services: Array<{
          id: string
          provider: string
          category: string
          name: string
          description: string | null
          configSchema: string
          equivalenceId: string | null
          updatedAt: number
        }>
      }>
    >
    saveCredentials: (credentials: {
      gcpApiKey?: string
      awsAccessKeyId?: string
      awsSecretAccessKey?: string
      gcpBillingAccountId?: string
    }) => Promise<{ saved: boolean }>
    getCredentialStatus: () => Promise<Record<string, { set: boolean; masked: string | null }>>
    deleteCredential: (args: { key: string }) => Promise<{ deleted: boolean }>
    syncPricing: () => Promise<{
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
    }>
    getSyncStatus: () => Promise<{
      success: boolean
      statuses?: Array<{
        provider: 'aws' | 'gcp' | 'azure'
        lastSyncAt: number | null
        status: string | null
        servicesUpdated: number | null
        error: string | null
      }>
      error?: string
    }>
    getRegions: (provider: string) => Promise<{
      success: boolean
      regions?: Array<{ regionId: string; displayName: string }>
      error?: string
    }>
    onSyncComplete: (
      cb: (data: {
        provider: 'aws' | 'gcp' | 'azure'
        servicesUpdated: number
        status: 'success' | 'error' | 'skipped'
      }) => void
    ) => () => void
  }
  nebula: {
    saveNote: (note: unknown) => Promise<{ saved: boolean }>
    loadNote: (id: string) => Promise<unknown>
    listNotes: () => Promise<unknown[]>
    deleteNote: (id: string) => Promise<void>
    searchNotes: (query: string) => Promise<unknown[]>
    getGraph: () => Promise<unknown>
    updateEdges: (
      noteId: string,
      edges: { targetId: string; relationship: string; weight: number }[]
    ) => Promise<void>
    transcribeAudio: (buffer: number[]) => Promise<unknown>
    saveTranscription: (record: unknown) => Promise<{ saved: boolean }>
    selectAudioFile: () => Promise<{ canceled: boolean; path: string }>
    togglePin: (noteId: string, pinned: boolean) => Promise<void>
    saveAudio: (noteId: string, audioBuffer: number[]) => Promise<{ audioPath: string }>
    loadAudio: (noteId: string) => Promise<number[] | null>
  }
  taskgroomer: {
    createTask: (args: { text: string; captureSource: 'typed' | 'clipboard' }) => Promise<Task>
    listTasks: (args?: { statuses?: string[] }) => Promise<Task[]>
    updateTask: (args: {
      id: string
      fields: Partial<Omit<Task, 'id' | 'createdAt'>>
    }) => Promise<Task>
    deleteTask: (args: { id: string }) => Promise<{ success: boolean }>
  }
  capture: {
    getClipboard: () => Promise<string | null>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
