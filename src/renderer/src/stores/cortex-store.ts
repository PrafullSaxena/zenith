import { create } from 'zustand'
import type {
  Repository,
  AnalysisResult,
  AnalysisProgress,
  FileContent,
  QAMessage
} from '../types/cortex'
import { useAgentStore } from './agent-store'
import { useSettingsStore } from './settings-store'

interface CortexState {
  // Repos
  repos: Repository[]
  activeRepoId: string | null

  // Analysis
  analysisResult: AnalysisResult | null
  isAnalyzing: boolean
  progress: AnalysisProgress | null
  error: string | null

  // UI State
  activeTab: 'insights' | 'code' | 'qa' | 'repos'
  insightsSubTab: 'overview' | 'apis' | 'flows' | 'design'

  // Code viewer
  openFiles: { path: string; language: string }[]
  activeFilePath: string | null
  fileContent: FileContent | null
  scrollToLine: number | null

  // Design doc
  designDoc: string

  // Q&A
  qaMessages: QAMessage[]
  isQAStreaming: boolean

  // Actions
  loadRepos: () => Promise<void>
  setActiveTab: (tab: CortexState['activeTab']) => void
  setInsightsSubTab: (tab: CortexState['insightsSubTab']) => void
  addRepo: (repo: Repository) => void
  updateRepo: (id: string, updates: Partial<Repository>) => void
  removeRepo: (id: string) => void
  setActiveRepo: (id: string | null) => void
  setAnalysisResult: (result: AnalysisResult | null) => void
  setProgress: (progress: AnalysisProgress | null) => void
  setError: (error: string | null) => void
  setIsAnalyzing: (v: boolean) => void
  openFile: (path: string, language: string) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string | null) => void
  setFileContent: (content: FileContent | null) => void
  setScrollToLine: (line: number | null) => void
  navigateToFile: (filePath: string, line?: number) => void
  setDesignDoc: (doc: string) => void
  addQAMessage: (msg: QAMessage) => void
  updateLastQAMessage: (content: string) => void
  clearQA: () => void
  setIsQAStreaming: (v: boolean) => void
}

/**
 * Resolve the configured AI agent for Cortex.
 * Checks `plugins.cortex.defaultAgent` in settings first; falls back to
 * the first connected/available agent from the agent store.
 */
export function getCortexAgent(): { providerId: string; model: string; command?: string } | null {
  const defaultAgentId = useSettingsStore.getState().getSetting(
    'plugins.cortex.defaultAgent'
  ) as string | undefined

  const providers = useAgentStore.getState().providers
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)

  if (!agent) return null
  return { providerId: agent.id, model: agent.model ?? agent.id, command: agent.command }
}

export const useCortexStore = create<CortexState>((set, get) => ({
  repos: [],
  activeRepoId: null,
  analysisResult: null,
  isAnalyzing: false,
  progress: null,
  error: null,
  activeTab: 'repos',
  insightsSubTab: 'overview',
  openFiles: [],
  activeFilePath: null,
  fileContent: null,
  scrollToLine: null,
  designDoc: '',
  qaMessages: [],
  isQAStreaming: false,

  loadRepos: async () => {
    const repos = await window.api.cortex.listRepos()
    set({ repos })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setInsightsSubTab: (tab) => set({ insightsSubTab: tab }),

  addRepo: (repo) => {
    set((s) => ({ repos: [...s.repos, repo] }))
    window.api.cortex.saveRepo(repo)
  },
  updateRepo: (id, updates) => {
    set((s) => ({
      repos: s.repos.map((r) => (r.id === id ? { ...r, ...updates } : r))
    }))
    window.api.cortex.updateRepoFields(id, updates)
  },
  removeRepo: (id) => {
    set((s) => ({
      repos: s.repos.filter((r) => r.id !== id),
      activeRepoId: s.activeRepoId === id ? null : s.activeRepoId,
      analysisResult:
        s.repos.find((r) => r.id === id)?.id === s.activeRepoId ? null : s.analysisResult
    }))
    window.api.cortex.removeRepoById(id)
  },
  setActiveRepo: (id) => set({ activeRepoId: id }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),

  openFile: (path, language) =>
    set((s) => {
      const exists = s.openFiles.some((f) => f.path === path)
      return {
        openFiles: exists ? s.openFiles : [...s.openFiles, { path, language }],
        activeFilePath: path
      }
    }),
  closeFile: (path) =>
    set((s) => {
      const filtered = s.openFiles.filter((f) => f.path !== path)
      return {
        openFiles: filtered,
        activeFilePath:
          s.activeFilePath === path ? (filtered[filtered.length - 1]?.path ?? null) : s.activeFilePath
      }
    }),
  setActiveFile: (path) => set({ activeFilePath: path }),
  setFileContent: (content) => set({ fileContent: content }),
  setScrollToLine: (line) => set({ scrollToLine: line }),

  navigateToFile: async (filePath, line) => {
    const extMap: Record<string, string> = {
      java: 'java',
      py: 'python',
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascript',
      go: 'go',
      kt: 'kotlin',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
      sql: 'sql',
      css: 'css',
      scss: 'scss',
      html: 'html',
      md: 'markdown',
      json: 'json'
    }
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    const language = extMap[ext] ?? ext

    set({ activeTab: 'code' })
    get().openFile(filePath, language)

    const activeRepo = get().repos.find((r) => r.id === get().activeRepoId)
    if (activeRepo) {
      const content = await window.api.cortex.getFileContent(activeRepo.repoPath, filePath)
      set({ fileContent: content })
    }

    if (line !== undefined) {
      set({ scrollToLine: line })
    }
  },
  setDesignDoc: (doc) => set({ designDoc: doc }),

  addQAMessage: (msg) => set((s) => ({ qaMessages: [...s.qaMessages, msg] })),
  updateLastQAMessage: (content) =>
    set((s) => {
      const msgs = [...s.qaMessages]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { qaMessages: msgs }
    }),
  clearQA: () => set({ qaMessages: [] }),
  setIsQAStreaming: (v) => set({ isQAStreaming: v })
}))
