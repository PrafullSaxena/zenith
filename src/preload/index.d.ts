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
  launchpad: {
    exportPdf: (estimation: unknown) => Promise<{ filePath: string | null }>
  }
  nebula: {
    saveNote: (note: unknown) => Promise<{ saved: boolean }>
    loadNote: (id: string) => Promise<unknown>
    listNotes: () => Promise<unknown[]>
    deleteNote: (id: string) => Promise<void>
    searchNotes: (query: string) => Promise<unknown[]>
    getGraph: () => Promise<unknown>
    updateEdges: (sourceId: string, targets: unknown[]) => Promise<void>
    transcribeAudio: (buffer: number[]) => Promise<unknown>
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
