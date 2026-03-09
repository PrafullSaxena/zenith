/**
 * Zustand store for the Nebula notes & knowledge management plugin.
 *
 * Manages tab navigation, notes list, active note, search state,
 * knowledge graph, voice recording, and AI summarization.
 *
 * Follows the same patterns as launchpad-store.ts:
 *  - IPC calls via window.api.nebula.* (wired in Plan 03)
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
  VoiceRecordingState,
  DiarizedTranscript
} from '../types/nebula'

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
      // IPC not wired yet — gracefully ignore
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
      // IPC not wired yet — gracefully ignore
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
      // IPC not wired yet — still create locally
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
      // IPC not wired yet — gracefully ignore
    }

    // Update notes list item
    const updatedNotes = get().notes.map((n) =>
      n.id === note.id
        ? { id: n.id, title: note.title, summary: note.summary, updatedAt: note.updatedAt }
        : n
    )

    set({ isSaving: false, notes: updatedNotes })
  },

  deleteNote: async (id) => {
    try {
      await window.api.nebula.deleteNote(id)
    } catch {
      // IPC not wired yet — gracefully ignore
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
  }
}))
