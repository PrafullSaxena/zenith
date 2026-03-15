import { create } from 'zustand'
import type {
  Repository,
  AnalysisResult,
  AnalysisProgress,
  FileContent,
  QAMessage,
  DigestResult,
  ValidationCorrection
} from '../types/cortex'
import { useAgentStore } from './agent-store'
import { useSettingsStore } from './settings-store'

// ── ToonInsights type (mirrors main-process toon-parser.ts) ────────────

export interface ToonInsights {
  summary: string
  architecture: { pattern: string; framework: string; language: string; libs: string[] }
  patterns: { name: string; description: string }[]
  security: { type: string; description: string }[]
  config: { source: string; description: string }[]
  async: { type: string; description: string }[]
  tests: { framework: string; details: string[] }
  insights: { severity: 'strength' | 'concern'; description: string }[]
  entities: { name: string; kind: string; location: string; summary: string }[]
  dependencies: { category: string; name: string; version: string }[]
}

// ── Lightweight renderer-side TOON parser ──────────────────────────────

function parseToonResponseRenderer(text: string): ToonInsights {
  const result: ToonInsights = {
    summary: '',
    architecture: { pattern: '', framework: '', language: '', libs: [] },
    patterns: [],
    security: [],
    config: [],
    async: [],
    tests: { framework: '', details: [] },
    insights: [],
    entities: [],
    dependencies: []
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = (parts[0] ?? '').toUpperCase()

    switch (type) {
      case 'SUMMARY':
        result.summary = parts.slice(1).join('|').trim()
        break
      case 'ARCH':
        result.architecture = {
          pattern: parts[1]?.trim() || '',
          framework: parts[2]?.trim() || '',
          language: parts[3]?.trim() || '',
          libs: (parts[4]?.trim() || '').split(',').map((s) => s.trim()).filter(Boolean)
        }
        break
      case 'PATTERN':
        if (parts.length >= 3) {
          result.patterns.push({ name: parts[1]?.trim() || '', description: parts[2]?.trim() || '' })
        }
        break
      case 'SECURITY':
        if (parts.length >= 3) {
          result.security.push({ type: parts[1]?.trim() || '', description: parts[2]?.trim() || '' })
        }
        break
      case 'CONFIG':
        if (parts.length >= 3) {
          result.config.push({ source: parts[1]?.trim() || '', description: parts[2]?.trim() || '' })
        }
        break
      case 'ASYNC':
        if (parts.length >= 3) {
          result.async.push({ type: parts[1]?.trim() || '', description: parts[2]?.trim() || '' })
        }
        break
      case 'TEST': {
        const fw = parts[1]?.trim() || ''
        const details = parts.slice(2).map((s) => s.trim()).filter(Boolean)
        if (!result.tests.framework && fw) result.tests.framework = fw
        result.tests.details.push(...details)
        break
      }
      case 'INSIGHT': {
        const rawSev = (parts[1]?.trim() || '').toLowerCase()
        const severity: 'strength' | 'concern' = rawSev === 'strength' ? 'strength' : 'concern'
        if (parts.length >= 3) {
          result.insights.push({ severity, description: parts[2]?.trim() || '' })
        }
        break
      }
      case 'ENTITY':
        if (parts.length >= 5) {
          result.entities.push({
            name: parts[1]?.trim() || '',
            kind: parts[2]?.trim() || '',
            location: parts[3]?.trim() || '',
            summary: parts[4]?.trim() || ''
          })
        }
        break
      case 'DEP':
        if (parts.length >= 4) {
          result.dependencies.push({
            category: parts[1]?.trim() || '',
            name: parts[2]?.trim() || '',
            version: parts[3]?.trim() || ''
          })
        }
        break
      default:
        break
    }
  }
  return result
}

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

  // AI Insights
  aiInsights: ToonInsights | null
  isGeneratingInsights: boolean

  // Q&A
  qaMessages: QAMessage[]
  isQAStreaming: boolean

  // AI Enrichment
  digest: DigestResult | null
  isDigestBuilding: boolean
  entityEnrichmentProgress: { done: number; total: number } | null
  validationResults: ValidationCorrection[]
  suppressedRoutes: Set<number>
  hldContent: string
  hldSections: { index: number; content: string; isGenerating: boolean }[]
  isHLDGenerating: boolean

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
  setAiInsights: (insights: ToonInsights | null) => void
  setGeneratingInsights: (v: boolean) => void
  generateInsights: () => Promise<void>
  addQAMessage: (msg: QAMessage) => void
  updateLastQAMessage: (content: string) => void
  clearQA: () => void
  setIsQAStreaming: (v: boolean) => void
  reanalyze: (repoId: string) => Promise<void>

  // AI Enrichment actions
  setDigest: (digest: DigestResult | null) => void
  setIsDigestBuilding: (v: boolean) => void
  setEntityEnrichmentProgress: (p: { done: number; total: number } | null) => void
  setValidationResults: (results: ValidationCorrection[]) => void
  updateValidationStatus: (id: string, status: ValidationCorrection['status']) => void
  setSuppressedRoutes: (routes: Set<number>) => void
  setHLDContent: (content: string) => void
  setHLDSections: (sections: { index: number; content: string; isGenerating: boolean }[]) => void
  setIsHLDGenerating: (v: boolean) => void
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
  aiInsights: null,
  isGeneratingInsights: false,
  qaMessages: [],
  isQAStreaming: false,

  // AI Enrichment
  digest: null,
  isDigestBuilding: false,
  entityEnrichmentProgress: null,
  validationResults: [],
  suppressedRoutes: new Set(),
  hldContent: '',
  hldSections: [],
  isHLDGenerating: false,

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
  setAiInsights: (insights) => set({ aiInsights: insights }),
  setGeneratingInsights: (v) => set({ isGeneratingInsights: v }),

  generateInsights: async () => {
    const state = get()
    const repo = state.repos.find((r) => r.id === state.activeRepoId)
    if (!repo) return

    const agent = getCortexAgent()
    if (!agent) return

    set({ isGeneratingInsights: true })
    const sessionId = crypto.randomUUID()
    let accumulated = ''

    // Check cache first
    try {
      const cached = await window.api.cortex.getInsights(repo.url, repo.branch, repo.commitSha)
      if (cached) {
        set({ aiInsights: parseToonResponseRenderer(cached), isGeneratingInsights: false })
        return
      }
    } catch {
      /* no cached data */
    }

    // Get prompts from main process
    const { systemPrompt, userPrompt } = await window.api.cortex.generateInsights(
      repo.url,
      repo.branch
    )

    // Set up stream listeners
    window.api.ai.onStreamChunk(({ sessionId: sid, chunk }) => {
      if (sid !== sessionId) return
      accumulated += chunk
      const partial = parseToonResponseRenderer(accumulated)
      set({ aiInsights: partial })
    })

    window.api.ai.onStreamDone(({ sessionId: sid }) => {
      if (sid !== sessionId) return
      const final = parseToonResponseRenderer(accumulated)
      set({ aiInsights: final, isGeneratingInsights: false })
      // Cache the result
      window.api.cortex.saveInsights(
        repo.url,
        repo.branch,
        repo.commitSha,
        agent.providerId,
        accumulated
      )
      window.api.ai.removeStreamListeners()
    })

    window.api.ai.onStreamError(({ sessionId: sid }) => {
      if (sid !== sessionId) return
      set({ isGeneratingInsights: false })
      window.api.ai.removeStreamListeners()
    })

    await window.api.ai.startAnalysis(
      agent.providerId,
      agent.model,
      systemPrompt,
      userPrompt,
      sessionId,
      agent.command
    )
  },

  addQAMessage: (msg) => set((s) => ({ qaMessages: [...s.qaMessages, msg] })),
  updateLastQAMessage: (content) =>
    set((s) => {
      const msgs = [...s.qaMessages]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { qaMessages: msgs }
    }),
  clearQA: () => set({ qaMessages: [] }),
  setIsQAStreaming: (v) => set({ isQAStreaming: v }),

  // AI Enrichment actions
  setDigest: (digest) => set({ digest }),
  setIsDigestBuilding: (v) => set({ isDigestBuilding: v }),
  setEntityEnrichmentProgress: (p) => set({ entityEnrichmentProgress: p }),
  setValidationResults: (results) => set({ validationResults: results }),
  updateValidationStatus: (id, status) =>
    set((s) => ({
      validationResults: s.validationResults.map((v) =>
        v.id === id ? { ...v, status } : v
      )
    })),
  setSuppressedRoutes: (routes) => set({ suppressedRoutes: routes }),
  setHLDContent: (content) => set({ hldContent: content }),
  setHLDSections: (sections) => set({ hldSections: sections }),
  setIsHLDGenerating: (v) => set({ isHLDGenerating: v }),

  reanalyze: async (repoId: string) => {
    const state = get()
    const repo = state.repos.find((r) => r.id === repoId)
    if (!repo) return

    // Set status to analyzing
    set((s) => ({
      repos: s.repos.map((r) => (r.id === repoId ? { ...r, status: 'analyzing' as const } : r)),
      isAnalyzing: true
    }))

    try {
      const response = await window.api.cortex.reanalyze(repoId)
      if (response.changed && response.result) {
        const result = response.result as AnalysisResult
        set((s) => ({
          repos: s.repos.map((r) =>
            r.id === repoId
              ? {
                  ...r,
                  status: 'ready' as const,
                  commitSha: result.commitSha,
                  lastAnalyzed: new Date().toISOString(),
                  repoType: result.repoType,
                  framework: result.framework,
                  language: result.language
                }
              : r
          ),
          analysisResult: s.activeRepoId === repoId ? result : s.analysisResult,
          isAnalyzing: false
        }))
      } else {
        // Already up to date
        set((s) => ({
          repos: s.repos.map((r) =>
            r.id === repoId ? { ...r, status: 'ready' as const } : r
          ),
          isAnalyzing: false
        }))
      }
    } catch (err) {
      set((s) => ({
        repos: s.repos.map((r) =>
          r.id === repoId
            ? { ...r, status: 'error' as const, error: String(err) }
            : r
        ),
        isAnalyzing: false
      }))
    }
  }
}))
