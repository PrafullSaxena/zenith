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
  }
  bitbucket: {
    connect: () => Promise<{ connected: boolean }>
    disconnect: () => Promise<{ connected: boolean }>
    isConnected: () => Promise<boolean>
    listPRs: (
      workspace: string,
      repoSlug: string
    ) => Promise<import('./bitbucket').PullRequest[]>
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
  }
  ai: {
    startReview: (
      providerId: string,
      modelName: string,
      diff: string,
      sessionId: string
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
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
