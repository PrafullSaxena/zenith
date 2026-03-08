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
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
