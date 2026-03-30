export interface PaginatedPRResult {
  prs: import('../renderer/src/types/bitbucket').PullRequest[]
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
    exportPdf: (data: {
      markdown: string
      title?: string
      mermaidImages?: Record<number, string>
      orientation?: 'portrait' | 'landscape'
    }) => Promise<{ filePath: string | null }>
  }
  bitbucket: {
    connect: () => Promise<{ connected: boolean; displayName: string }>
    disconnect: () => Promise<void>
    isConnected: () => Promise<boolean>
    listPRs: (workspace: string, repoSlug: string, page?: number, pagelen?: number) => Promise<PaginatedPRResult>
    getPRDiff: (workspace: string, repoSlug: string, prId: number) => Promise<string>
    postComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      filePath: string,
      line: number,
      comment: string
    ) => Promise<void>
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
    onStreamDone: (cb: (data: { sessionId: string; usage?: { totalTokens: number; isEstimated: boolean } }) => void) => void
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
    listRepos: () => Promise<unknown[]>
    saveRepo: (repo: unknown) => Promise<void>
    removeRepoById: (id: string) => Promise<void>
    updateRepoFields: (id: string, fields: Record<string, unknown>) => Promise<void>
    fetchBranches: (url: string) => Promise<string[]>
    clone: (url: string, name: string) => Promise<{ repoPath: string }>
    analyze: (repoPath: string, branch: string, repoUrl: string) => Promise<unknown>
    getFileContent: (
      repoPath: string,
      filePath: string
    ) => Promise<{ content: string; language: string; path: string; lineCount: number }>
    removeRepo: (repoPath: string) => Promise<void>
    getCachedAnalysis: (repoUrl: string, branch: string, commitSha: string) => Promise<unknown>
    searchCode: (repoUrl: string, query: string) => Promise<unknown[]>
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
    probeRtk: () => Promise<boolean>
    // AI Enrichment
    buildDigest: (
      repoUrl: string,
      branch: string
    ) => Promise<{
      data: string | null
      cached: boolean
      rawDigest?: string
      systemPrompt?: string
      userPrompt?: string
      commitSha?: string
    }>
    saveEnrichment: (
      repoUrl: string,
      branch: string,
      commitSha: string,
      enrichmentType: string,
      agentId: string,
      data: string
    ) => Promise<void>
    getEnrichment: (
      repoUrl: string,
      branch: string,
      commitSha: string,
      enrichmentType: string
    ) => Promise<string | null>
    buildEntityBatches: (
      repoUrl: string,
      branch: string,
      existingSummaryIds: string[]
    ) => Promise<Array<{ entityIds: string[]; systemPrompt: string; userPrompt: string }>>
    buildValidationPrompts: (
      repoUrl: string,
      branch: string,
      digestText: string
    ) => Promise<{ systemPrompt: string; userPrompt: string; commitSha: string }>
    onCloneProgress: (
      cb: (data: { stage: string; progress: number; detail: string }) => void
    ) => void
    onAnalysisProgress: (
      cb: (data: {
        phase: string
        progress: number
        detail: string
        filesProcessed: number
        totalFiles: number
      }) => void
    ) => void
    removeProgressListeners: () => void
  }
  launchpad: {
    exportPdf: (estimation: unknown) => Promise<{ filePath: string | null }>
    getCatalog: (provider: string) => Promise<unknown[]>
    getPricing: (args: {
      provider: string
      region: string
      serviceIds: string[]
    }) => Promise<Record<string, Record<string, number>>>
    saveCredentials: (credentials: {
      gcpApiKey?: string
      awsAccessKeyId?: string
      awsSecretAccessKey?: string
      gcpBillingAccountId?: string
    }) => Promise<{ saved: boolean }>
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
      callback: (result: {
        startedAt: number
        completedAt: number
        providers: Array<{ provider: string; status: string; servicesUpdated: number }>
      }) => void
    ) => (() => void)
  }
  textcraft: {
    exportPdf: (data: { markdown: string; title?: string; mermaidImages?: Record<number, string> }) => Promise<{ filePath: string | null }>
  }
  nebula: {
    saveNote: (note: unknown) => Promise<{ saved: boolean }>
    loadNote: (id: string) => Promise<unknown>
    listNotes: () => Promise<unknown[]>
    deleteNote: (id: string) => Promise<void>
    searchNotes: (query: string) => Promise<unknown[]>
    getGraph: () => Promise<unknown>
    updateEdges: (sourceId: string, targets: unknown[]) => Promise<void>
    transcribeAudio: (buffer: number[], providerId?: string, command?: string) => Promise<unknown>
    saveTranscription: (record: unknown) => Promise<{ saved: boolean }>
    selectAudioFile: () => Promise<{ canceled: boolean; path: string }>
    togglePin: (noteId: string, pinned: boolean) => Promise<void>
    saveAudio: (noteId: string, audioBuffer: number[]) => Promise<{ audioPath: string }>
    loadAudio: (noteId: string) => Promise<number[] | null>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
