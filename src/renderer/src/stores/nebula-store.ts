/**
 * Zustand store for the Nebula notes & knowledge management plugin.
 *
 * Manages tab navigation, notes list, active note, search state,
 * knowledge graph, voice recording, and AI summarization.
 *
 * Follows the same patterns as launchpad-store.ts:
 *  - IPC calls via window.api.nebula.* (wired in Plan 03)
 *  - AI streaming via window.api.ai.startAnalysis + session-scoped listeners
 *  - State shape drives all UI components
 *  - Actions encapsulate all side effects
 */

import { create } from 'zustand'
import type {
  NoteListItem,
  NoteFile,
  NebulaTab,
  GraphData,
  SearchResult,
  SummarizationResult,
  VoiceRecordingState,
  DiarizedTranscript
} from '../types/nebula'
import { useAgentStore } from './agent-store'
import { useSettingsStore } from './settings-store'
import { useTokenStore } from './token-store'

// ── AI System Prompt ─────────────────────────────────────────────────

const QA_SYSTEM_PROMPT = `You are a knowledgeable assistant. Answer the user's question using ONLY the provided note summaries as context. If the notes don't contain relevant information, say so. Be concise and cite which notes your answer is based on.`

const SUMMARIZE_SYSTEM_PROMPT = `You are a knowledge assistant. Given a note's content, produce a JSON object with:
1. "title": A concise title (max 10 words) capturing the note's main idea
2. "summary": A 2-3 sentence summary of the key points
3. "topics": An array of 3-7 key topics/concepts mentioned (single words or short phrases)
4. "connections": An array of general topic keywords that could connect this note to others

Output ONLY valid JSON, no markdown fences, no explanation:
{"title":"...","summary":"...","topics":["..."],"connections":["..."]}`

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract plain text from a Tiptap JSON content object.
 * Walks the tree and concatenates text node content.
 */
function extractPlainText(content: object): string {
  const result: string[] = []

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.text === 'string') {
      result.push(n.text)
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child)
      }
    }
  }

  walk(content)
  return result.join(' ').trim()
}

/**
 * Get the configured AI agent for the nebula plugin.
 * Falls back to first provider with connected/hasApiKey status.
 */
function getNebulaAgent(): { providerId: string; model: string } | null {
  const defaultAgentId = useSettingsStore.getState().getSetting('plugins.nebula.defaultAgent') as
    | string
    | undefined
  const providers = useAgentStore.getState().providers

  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)

  if (!agent) return null
  return { providerId: agent.id, model: agent.model }
}

// ── Store interface ──────────────────────────────────────────────────

interface NebulaStore {
  // Tab navigation
  activeTab: NebulaTab

  // Notes state
  notes: NoteListItem[]
  activeNoteId: string | null
  activeNote: NoteFile | null
  isSaving: boolean

  // Search state
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  qaAnswer: string
  qaSessionId: string | null

  // Knowledge graph
  graphData: GraphData | null
  selectedGraphNodeId: string | null

  // Voice state
  voiceState: VoiceRecordingState
  lastTranscript: DiarizedTranscript | null

  // AI state
  isSummarizing: boolean
  summarizeSessionId: string | null

  // Actions
  setActiveTab: (tab: NebulaTab) => void
  loadNotes: () => Promise<void>
  selectNote: (id: string) => Promise<void>
  createNote: () => Promise<void>
  saveNote: (note: NoteFile) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  setSearchQuery: (query: string) => void
  searchNotes: (query: string) => Promise<void>
  loadGraphData: () => Promise<void>
  setSelectedGraphNode: (id: string | null) => void
  setVoiceState: (state: VoiceRecordingState) => void
  setLastTranscript: (transcript: DiarizedTranscript | null) => void
  setSummarizing: (isSummarizing: boolean, sessionId?: string | null) => void
  setQaAnswer: (answer: string) => void
  setQaSessionId: (id: string | null) => void
  clearActiveNote: () => void
  askQuestion: (question: string) => void
  cancelQa: () => void
  triggerSummarization: (note: NoteFile) => void
  inferEdges: (noteId: string, topics: string[], connections: string[]) => void
  cleanup: () => void
}

// ── Store creation ───────────────────────────────────────────────────

export const useNebulaStore = create<NebulaStore>((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────

  activeTab: 'notes',

  notes: [],
  activeNoteId: null,
  activeNote: null,
  isSaving: false,

  searchQuery: '',
  searchResults: [],
  isSearching: false,
  qaAnswer: '',
  qaSessionId: null,

  graphData: null,
  selectedGraphNodeId: null,

  voiceState: 'idle',
  lastTranscript: null,

  isSummarizing: false,
  summarizeSessionId: null,

  // ── Actions ──────────────────────────────────────────────────────

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },

  loadNotes: async () => {
    try {
      const notes = (await window.api.nebula.listNotes()) as NoteListItem[]
      set({ notes })
    } catch {
      // IPC not wired yet -- gracefully ignore
      set({ notes: [] })
    }
  },

  selectNote: async (id) => {
    set({ activeNoteId: id })
    try {
      const note = (await window.api.nebula.loadNote(id)) as NoteFile | null
      if (note) {
        set({ activeNote: note })
      }
    } catch {
      // IPC not wired yet -- gracefully ignore
    }
  },

  createNote: async () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note: NoteFile = {
      id,
      title: 'Untitled',
      content: {},
      drawing: null,
      summary: null,
      topics: [],
      createdAt: now,
      updatedAt: now
    }

    try {
      await window.api.nebula.saveNote(note)
    } catch {
      // IPC not wired yet -- still create locally
    }

    const listItem: NoteListItem = {
      id,
      title: note.title,
      summary: null,
      updatedAt: now
    }

    set({
      notes: [listItem, ...get().notes],
      activeNoteId: id,
      activeNote: note
    })
  },

  saveNote: async (note) => {
    set({ isSaving: true })
    try {
      await window.api.nebula.saveNote(note)
    } catch {
      // IPC not wired yet -- gracefully ignore
    }

    // Update notes list item
    const updatedNotes = get().notes.map((n) =>
      n.id === note.id
        ? { id: n.id, title: note.title, summary: note.summary, updatedAt: note.updatedAt }
        : n
    )

    set({ isSaving: false, notes: updatedNotes })

    // Fire-and-forget AI summarization for notes with meaningful content
    const plainText = extractPlainText(note.content)
    if (plainText.length > 20) {
      get().triggerSummarization(note)
    }
  },

  deleteNote: async (id) => {
    try {
      await window.api.nebula.deleteNote(id)
    } catch {
      // IPC not wired yet -- gracefully ignore
    }

    const { activeNoteId } = get()
    set({
      notes: get().notes.filter((n) => n.id !== id),
      activeNoteId: activeNoteId === id ? null : activeNoteId,
      activeNote: activeNoteId === id ? null : get().activeNote
    })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  searchNotes: async (query) => {
    set({ isSearching: true })
    try {
      const results = (await window.api.nebula.searchNotes(query)) as SearchResult[]
      set({ searchResults: results, isSearching: false })
    } catch {
      set({ searchResults: [], isSearching: false })
    }
  },

  loadGraphData: async () => {
    try {
      const graphData = (await window.api.nebula.getGraph()) as GraphData
      set({ graphData })
    } catch {
      set({ graphData: null })
    }
  },

  setSelectedGraphNode: (id) => {
    set({ selectedGraphNodeId: id })
  },

  setVoiceState: (state) => {
    set({ voiceState: state })
  },

  setLastTranscript: (transcript) => {
    set({ lastTranscript: transcript })
  },

  setSummarizing: (isSummarizing, sessionId) => {
    set({
      isSummarizing,
      summarizeSessionId: sessionId !== undefined ? sessionId : get().summarizeSessionId
    })
  },

  setQaAnswer: (answer) => {
    set({ qaAnswer: answer })
  },

  setQaSessionId: (id) => {
    set({ qaSessionId: id })
  },

  clearActiveNote: () => {
    set({ activeNoteId: null, activeNote: null })
  },

  // ── AI Q&A ──────────────────────────────────────────────────────────

  askQuestion: (question: string) => {
    const agent = getNebulaAgent()
    if (!agent) {
      console.warn('[nebula-store] No AI agent configured for Q&A')
      return
    }

    const sessionId = `nebula-qa-${Date.now()}`
    let accumulated = ''

    set({ qaSessionId: sessionId, qaAnswer: '', isSearching: true })

    // First, search for relevant notes to build context
    window.api.nebula
      .searchNotes(question)
      .then((results) => {
        const searchResults = results as SearchResult[]
        // Build context from top 5 results
        const topResults = searchResults.slice(0, 5)
        const contextString = topResults
          .map((r, i) => `Note ${i + 1}: "${r.title}"\n${r.summary || 'No summary available'}`)
          .join('\n\n')

        const userPrompt = contextString
          ? `Context from notes:\n\n${contextString}\n\nQuestion: ${question}`
          : `No notes found matching the query. Question: ${question}`

        set({ isSearching: false })

        // Set up session-scoped IPC listeners (same pattern as summarization)
        window.api.ai.onStreamChunk((data) => {
          if (data.sessionId !== sessionId) return
          accumulated += data.chunk
          set({ qaAnswer: accumulated })
        })

        window.api.ai.onStreamDone((data) => {
          if (data.sessionId !== sessionId) return

          // Capture token usage
          const tokensUsed = data.usage
            ? data.usage.totalTokens
            : Math.max(1, Math.ceil(accumulated.length / 4))
          const isEstimated = data.usage ? data.usage.isEstimated : true
          useTokenStore.getState().addEntry({
            sessionId: data.sessionId,
            providerId: agent.providerId,
            providerName: agent.model,
            tokensUsed,
            isEstimated
          })

          set({ qaSessionId: null })
          window.api.ai.removeStreamListeners()
        })

        window.api.ai.onStreamError((data) => {
          if (data.sessionId !== sessionId) return
          console.error('[nebula-store] Q&A error:', data.error)
          set({ qaSessionId: null, qaAnswer: `Error: ${data.error}` })
          window.api.ai.removeStreamListeners()
        })

        // Kick off AI analysis
        window.api.ai
          .startAnalysis(agent.providerId, agent.model, QA_SYSTEM_PROMPT, userPrompt, sessionId)
          .catch((err) => {
            console.error('[nebula-store] Failed to start Q&A:', err)
            set({ qaSessionId: null, qaAnswer: 'Failed to start AI analysis.' })
            window.api.ai.removeStreamListeners()
          })
      })
      .catch(() => {
        // Search failed — still try to answer without context
        set({ isSearching: false })
        const userPrompt = `No notes context available. Question: ${question}`

        window.api.ai.onStreamChunk((data) => {
          if (data.sessionId !== sessionId) return
          accumulated += data.chunk
          set({ qaAnswer: accumulated })
        })

        window.api.ai.onStreamDone((data) => {
          if (data.sessionId !== sessionId) return
          set({ qaSessionId: null })
          window.api.ai.removeStreamListeners()
        })

        window.api.ai.onStreamError((data) => {
          if (data.sessionId !== sessionId) return
          set({ qaSessionId: null, qaAnswer: `Error: ${data.error}` })
          window.api.ai.removeStreamListeners()
        })

        window.api.ai
          .startAnalysis(agent.providerId, agent.model, QA_SYSTEM_PROMPT, userPrompt, sessionId)
          .catch((err) => {
            console.error('[nebula-store] Failed to start Q&A:', err)
            set({ qaSessionId: null, qaAnswer: 'Failed to start AI analysis.' })
            window.api.ai.removeStreamListeners()
          })
      })
  },

  cancelQa: () => {
    const { qaSessionId } = get()
    if (qaSessionId) {
      window.api.ai.cancelAnalysis(qaSessionId).catch(() => {
        // Ignore if cancel fails
      })
      window.api.ai.removeStreamListeners()
      set({ qaSessionId: null })
    }
  },

  // ── AI Summarization ──────────────────────────────────────────────

  triggerSummarization: (note: NoteFile) => {
    const agent = getNebulaAgent()
    if (!agent) {
      console.warn('[nebula-store] No AI agent configured for summarization')
      return
    }

    const sessionId = `nebula-summarize-${note.id}-${Date.now()}`
    let accumulated = ''

    set({ isSummarizing: true, summarizeSessionId: sessionId })

    // Session-scoped IPC listeners (same pattern as launchpad-store.ts)
    window.api.ai.onStreamChunk((data) => {
      if (data.sessionId !== sessionId) return
      accumulated += data.chunk
    })

    window.api.ai.onStreamDone((data) => {
      if (data.sessionId !== sessionId) return

      try {
        // Parse the accumulated JSON response
        const cleaned = accumulated
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()
        const result = JSON.parse(cleaned) as SummarizationResult

        // Update the note with AI-extracted metadata
        const updatedNote: NoteFile = {
          ...note,
          title: result.title || note.title,
          summary: result.summary || note.summary,
          topics: Array.isArray(result.topics) ? result.topics : note.topics,
          updatedAt: new Date().toISOString()
        }

        // Persist the updated note via IPC (fire-and-forget)
        window.api.nebula.saveNote(updatedNote).catch(() => {
          // IPC not wired yet -- gracefully ignore
        })

        // Update store state
        const updatedNotes = get().notes.map((n) =>
          n.id === note.id
            ? {
                id: n.id,
                title: updatedNote.title,
                summary: updatedNote.summary,
                updatedAt: updatedNote.updatedAt
              }
            : n
        )

        // Update activeNote if this is the currently selected note
        const currentActiveId = get().activeNoteId
        set({
          notes: updatedNotes,
          ...(currentActiveId === note.id ? { activeNote: updatedNote } : {})
        })

        // Infer knowledge graph edges from AI-extracted topics and connections
        get().inferEdges(
          note.id,
          Array.isArray(result.topics) ? result.topics : [],
          Array.isArray(result.connections) ? result.connections : []
        )
      } catch (err) {
        console.error('[nebula-store] Failed to parse summarization response:', err)
      }

      // Capture token usage
      const tokensUsed = data.usage
        ? data.usage.totalTokens
        : Math.max(1, Math.ceil(accumulated.length / 4))
      const isEstimated = data.usage ? data.usage.isEstimated : true
      useTokenStore.getState().addEntry({
        sessionId: data.sessionId,
        providerId: agent.providerId,
        providerName: agent.model,
        tokensUsed,
        isEstimated
      })

      set({ isSummarizing: false, summarizeSessionId: null })
      window.api.ai.removeStreamListeners()
    })

    window.api.ai.onStreamError((data) => {
      if (data.sessionId !== sessionId) return
      console.error('[nebula-store] Summarization error:', data.error)
      set({ isSummarizing: false, summarizeSessionId: null })
      window.api.ai.removeStreamListeners()
    })

    // Kick off AI analysis (fire-and-forget)
    const plainText = extractPlainText(note.content)
    window.api.ai.startAnalysis(
      agent.providerId,
      agent.model,
      SUMMARIZE_SYSTEM_PROMPT,
      plainText,
      sessionId
    ).catch((err) => {
      console.error('[nebula-store] Failed to start summarization:', err)
      set({ isSummarizing: false, summarizeSessionId: null })
      window.api.ai.removeStreamListeners()
    })
  },

  // ── Edge Inference ────────────────────────────────────────────────

  inferEdges: (noteId: string, topics: string[], connections: string[]) => {
    const notes = get().notes
    const allKeywords = [...topics, ...connections].map((k) => k.toLowerCase())

    // Find other notes with overlapping topics
    const edges: { targetId: string; relationship: string; weight: number }[] = []

    for (const other of notes) {
      if (other.id === noteId) continue

      // Load the full note to get topics (if available in activeNote or from notes list)
      // Since we only have NoteListItem in the list, we compare against summaries
      // For topic-based matching, we check if the other note's summary contains keywords
      // A more robust approach: load all notes' topics from the store
      // For now, use a lightweight keyword match on title + summary
      const otherText = [other.title, other.summary || ''].join(' ').toLowerCase()

      let overlapCount = 0
      for (const keyword of allKeywords) {
        if (keyword.length >= 3 && otherText.includes(keyword)) {
          overlapCount++
        }
      }

      if (overlapCount > 0) {
        edges.push({
          targetId: other.id,
          relationship: 'shares-topic',
          weight: overlapCount
        })
      }
    }

    if (edges.length > 0) {
      // Persist edges via IPC (fire-and-forget, graceful fallback)
      window.api.nebula.updateEdges(noteId, edges).catch(() => {
        // IPC not wired yet -- gracefully ignore
      })

      // Refresh the knowledge graph data
      get().loadGraphData()
    }
  },

  // ── Cleanup ───────────────────────────────────────────────────────

  cleanup: () => {
    try {
      window.api.ai.removeStreamListeners()
    } catch {
      // Ignore if API not available
    }
    set({ isSummarizing: false, summarizeSessionId: null, qaSessionId: null })
  }
}))
