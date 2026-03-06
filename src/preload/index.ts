import { contextBridge, ipcRenderer } from 'electron'

// Bridge: settings + credentials + app + bitbucket + ai channels.
contextBridge.exposeInMainWorld('api', {
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    reset: (namespace: string) => ipcRenderer.invoke('settings:reset', namespace),
  },
  credentials: {
    set: (service: string, value: string) => ipcRenderer.invoke('credentials:set', service, value),
    has: (service: string) => ipcRenderer.invoke('credentials:has', service),
    // NOTE: credentials:get is intentionally NOT exposed — secrets stay in main process
  },
  app: {
    probeOllama: () => ipcRenderer.invoke('app:probeOllama'),
  },
  bitbucket: {
    connect: () => ipcRenderer.invoke('bitbucket:connect'),
    disconnect: () => ipcRenderer.invoke('bitbucket:disconnect'),
    isConnected: () => ipcRenderer.invoke('bitbucket:isConnected'),
    listPRs: (workspace: string, repoSlug: string) =>
      ipcRenderer.invoke('bitbucket:listPRs', workspace, repoSlug),
    getPRDiff: (workspace: string, repoSlug: string, prId: number) =>
      ipcRenderer.invoke('bitbucket:getPRDiff', workspace, repoSlug, prId),
    postComment: (
      workspace: string,
      repoSlug: string,
      prId: number,
      filePath: string,
      line: number,
      comment: string
    ) =>
      ipcRenderer.invoke(
        'bitbucket:postComment',
        workspace,
        repoSlug,
        prId,
        filePath,
        line,
        comment
      ),
  },
  ai: {
    startReview: (
      providerId: string,
      modelName: string,
      diff: string,
      sessionId: string
    ) => ipcRenderer.invoke('ai:startReview', providerId, modelName, diff, sessionId),
    cancelReview: (sessionId: string) =>
      ipcRenderer.invoke('ai:cancelReview', sessionId),
    onStreamChunk: (cb: (data: { sessionId: string; chunk: string }) => void) =>
      ipcRenderer.on('ai:stream:chunk', (_e, data) => cb(data)),
    onStreamDone: (cb: (data: { sessionId: string }) => void) =>
      ipcRenderer.on('ai:stream:done', (_e, data) => cb(data)),
    onStreamError: (cb: (data: { sessionId: string; error: string }) => void) =>
      ipcRenderer.on('ai:stream:error', (_e, data) => cb(data)),
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('ai:stream:chunk')
      ipcRenderer.removeAllListeners('ai:stream:done')
      ipcRenderer.removeAllListeners('ai:stream:error')
    },
  },
})
