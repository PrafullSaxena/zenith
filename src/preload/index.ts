import { contextBridge, ipcRenderer } from 'electron'

// Phase 1 bridge: settings + credentials channels only.
// Expand in later plans as IPC handlers are added.
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
})
