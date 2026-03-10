/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: plugin icon + title + subtitle
 *  - Tab bar: Notes / Search / Knowledge
 *  - Notes tab: sidebar (NoteList) | content area (NoteEditor + DrawingCanvas)
 *  - Search tab: SearchView with FTS5 search + AI Q&A
 *  - Knowledge tab: KnowledgeGraph force-directed visualization
 *
 * Drawing panel is collapsed by default, expandable via side rail "Draw" tab.
 * Sidebar width is fixed for now (resizable panels to be added later).
 *
 * Follows the same tab pattern as LaunchpadView.tsx.
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { BookOpen, FileText, Search, Share2, Pencil, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import NoteList from './NoteList'
import NoteEditor from './NoteEditor'
import DrawingCanvas from './DrawingCanvas'
import KnowledgeGraph from './KnowledgeGraph'
import SearchView from './SearchView'
import VoiceRecorder from './VoiceRecorder'
import ToastContainer from './ToastContainer'
import type { NebulaTab, NoteTag } from '../../types/nebula'

const TABS: { id: NebulaTab; label: string; icon: typeof FileText }[] = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'knowledge', label: 'Knowledge', icon: Share2 }
]

export default function NebulaView(): React.JSX.Element {
  const activeTab = useNebulaStore((s) => s.activeTab)
  const setActiveTab = useNebulaStore((s) => s.setActiveTab)
  const loadNotes = useNebulaStore((s) => s.loadNotes)
  const activeNote = useNebulaStore((s) => s.activeNote)
  const saveNote = useNebulaStore((s) => s.saveNote)
  const isSaving = useNebulaStore((s) => s.isSaving)
  const isSummarizing = useNebulaStore((s) => s.isSummarizing)
  const lastTranscript = useNebulaStore((s) => s.lastTranscript)
  const handleTranscription = useNebulaStore((s) => s.handleTranscription)
  const addToast = useNebulaStore((s) => s.addToast)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawingOpen, setDrawingOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track pending (dirty) content that hasn't been saved yet
  const pendingContentRef = useRef<object | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSavingRef = useRef(false)

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show "Saved" indicator briefly only after a real save completes (not on mount)
  useEffect(() => {
    if (wasSavingRef.current && !isSaving && activeNote) {
      setShowSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500)
    }
    wasSavingRef.current = isSaving
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [isSaving]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up title debounce timer on unmount
  useEffect(() => {
    return () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    }
  }, [])

  // Transcription-to-knowledge pipeline: when lastTranscript changes,
  // create a note from it and trigger summarization -> graph update
  useEffect(() => {
    if (lastTranscript) {
      handleTranscription(lastTranscript).then(() => {
        const noteTitle = useNebulaStore.getState().activeNote?.title ?? 'Voice Note'
        const noteId = useNebulaStore.getState().activeNoteId ?? undefined
        addToast({
          message: `Transcription added to "${noteTitle}"`,
          noteId,
          type: 'success'
        })
      })
    }
  }, [lastTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  // Content update: just track dirty content -- actual save happens on blur
  const handleContentUpdate = useCallback(
    (json: object) => {
      if (!activeNote) return
      pendingContentRef.current = json
    },
    [activeNote]
  )

  // Save pending content when user leaves the editor (blur)
  const handleEditorBlur = useCallback(() => {
    if (!activeNote || !pendingContentRef.current) return
    const content = pendingContentRef.current
    pendingContentRef.current = null
    saveNote({
      ...activeNote,
      content,
      updatedAt: new Date().toISOString()
    })
  }, [activeNote, saveNote])

  // Title change: update store immediately for responsiveness + debounced save
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activeNote) return
      const updatedNote = { ...activeNote, title, updatedAt: new Date().toISOString() }
      useNebulaStore.setState({ activeNote: updatedNote })
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
      titleTimerRef.current = setTimeout(() => {
        saveNote(updatedNote)
      }, 800)
    },
    [activeNote, saveNote]
  )

  // Drawing save
  const handleDrawingSave = useCallback(
    (snapshot: object) => {
      if (!activeNote) return
      saveNote({
        ...activeNote,
        drawing: snapshot,
        updatedAt: new Date().toISOString()
      })
    },
    [activeNote, saveNote]
  )

  // Tags change: save the note with updated tags
  const handleTagsChange = useCallback(
    (tags: NoteTag[]) => {
      if (!activeNote) return
      const updatedNote = { ...activeNote, tags, updatedAt: new Date().toISOString() }
      useNebulaStore.setState({ activeNote: updatedNote })
      saveNote(updatedNote)
    },
    [activeNote, saveNote]
  )

  // Flush pending content when switching notes or unmounting
  useEffect(() => {
    return () => {
      if (pendingContentRef.current && activeNote) {
        saveNote({
          ...activeNote,
          content: pendingContentRef.current,
          updatedAt: new Date().toISOString()
        })
        pendingContentRef.current = null
      }
    }
  }, [activeNote?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle drawing panel
  const handleToggleDrawing = useCallback(() => {
    setDrawingOpen((prev) => !prev)
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Toast notifications -- visible across all tabs */}
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-accent" />
          <h1 className="text-lg font-semibold text-text-primary">Nebula</h1>
          <span className="text-xs text-text-secondary">Notes &amp; Knowledge</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="flex-1 overflow-hidden animate-tab-enter">
        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div className="flex h-full">
            {/* Sidebar */}
            {sidebarCollapsed ? (
              <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-surface pt-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-accent/15 hover:text-accent"
                  title="Expand sidebar"
                >
                  <PanelLeft size={16} />
                </button>
              </div>
            ) : (
              <div className="flex w-64 shrink-0 flex-col border-r border-border">
                {/* Collapse button */}
                <div className="flex justify-end px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-secondary/40 transition-colors hover:bg-accent/10 hover:text-text-secondary"
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                </div>
                <NoteList />
              </div>
            )}

            {/* Content area */}
            <div className="relative flex flex-1 overflow-hidden">
              {activeNote ? (
                <div className="flex h-full w-full">
                  {/* Editor */}
                  <div className={`flex flex-col overflow-hidden ${drawingOpen ? 'w-3/5' : 'flex-1'}`}>
                    <NoteEditor
                      noteId={activeNote.id}
                      content={activeNote.content}
                      title={activeNote.title}
                      tags={activeNote.tags ?? []}
                      onTagsChange={handleTagsChange}
                      updatedAt={activeNote.updatedAt}
                      onUpdate={handleContentUpdate}
                      onBlur={handleEditorBlur}
                      onTitleChange={handleTitleChange}
                      isSummarizing={isSummarizing}
                      isSaving={isSaving}
                      showSaved={showSaved}
                    />
                  </div>

                  {/* Drawing panel */}
                  {drawingOpen && (
                    <div className="flex w-2/5 border-l border-border">
                      <DrawingCanvas
                        key={activeNote.id}
                        snapshot={activeNote.drawing}
                        onSave={handleDrawingSave}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-text-secondary">
                  <div className="text-center">
                    <FileText size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No note selected</p>
                    <p className="mt-1 text-xs text-text-secondary/60">
                      Select a note from the sidebar or create a new one
                    </p>
                  </div>
                </div>
              )}

              {/* Side rail "Draw" tab -- visible when drawing panel is closed */}
              {activeNote && !drawingOpen && (
                <button
                  type="button"
                  onClick={handleToggleDrawing}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 rounded-l-lg border border-r-0 border-border bg-surface-elevated px-1.5 py-3 text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent shadow-sm"
                  title="Open drawing panel"
                >
                  <Pencil size={14} />
                  <span className="text-[9px] font-medium [writing-mode:vertical-lr]">
                    Draw
                  </span>
                </button>
              )}

              {/* Voice Recorder FAB */}
              <VoiceRecorder noteId={activeNote?.id ?? null} />
            </div>
          </div>
        )}

        {/* Search tab */}
        {activeTab === 'search' && <SearchView />}

        {/* Knowledge tab */}
        {activeTab === 'knowledge' && <KnowledgeGraph />}
      </div>
    </div>
  )
}
