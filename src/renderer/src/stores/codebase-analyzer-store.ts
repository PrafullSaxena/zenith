import { create } from 'zustand'
import type {
  Repository,
  AnalysisResult,
  AnalysisProgress,
  FileContent,
  QAMessage
} from '../types/codebase-analyzer'

interface CodebaseAnalyzerState {
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

  // Q&A
  qaMessages: QAMessage[]
  isQAStreaming: boolean

  // Actions
  setActiveTab: (tab: CodebaseAnalyzerState['activeTab']) => void
  setInsightsSubTab: (tab: CodebaseAnalyzerState['insightsSubTab']) => void
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
  addQAMessage: (msg: QAMessage) => void
  updateLastQAMessage: (content: string) => void
  clearQA: () => void
  setIsQAStreaming: (v: boolean) => void
}

export const useCodebaseAnalyzerStore = create<CodebaseAnalyzerState>((set) => ({
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
  qaMessages: [],
  isQAStreaming: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setInsightsSubTab: (tab) => set({ insightsSubTab: tab }),

  addRepo: (repo) => set((s) => ({ repos: [...s.repos, repo] })),
  updateRepo: (id, updates) =>
    set((s) => ({
      repos: s.repos.map((r) => (r.id === id ? { ...r, ...updates } : r))
    })),
  removeRepo: (id) =>
    set((s) => ({
      repos: s.repos.filter((r) => r.id !== id),
      activeRepoId: s.activeRepoId === id ? null : s.activeRepoId,
      analysisResult:
        s.repos.find((r) => r.id === id)?.id === s.activeRepoId ? null : s.analysisResult
    })),
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
