/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: plugin icon + title + subtitle
 *  - Tab bar: Notes / Search / Knowledge
 *  - Notes tab: NoteList sidebar + NoteEditor + DrawingCanvas toggle
 *  - Search tab: SearchView with FTS5 search + AI Q&A
 *  - Knowledge tab: KnowledgeGraph force-directed visualization
 *
 * Follows the same tab pattern as LaunchpadView.tsx.
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { BookOpen, FileText, Search, Share2, PenTool, Check } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import NoteList from './NoteList'
import NoteEditor from './NoteEditor'
import DrawingCanvas from './DrawingCanvas'
import KnowledgeGraph from './KnowledgeGraph'
import SearchView from './SearchView'
import type { NebulaTab } from '../../types/nebula'

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

  const [showDrawing, setShowDrawing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track pending (dirty) content that hasn't been saved yet
  const pendingContentRef = useRef<object | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show "Saved" indicator briefly after save completes
  useEffect(() => {
    if (!isSaving && activeNote) {
      setShowSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500)
    }
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [isSaving]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transcription-to-knowledge pipeline: when lastTranscript changes,
  // create a note from it and trigger summarization -> graph update
  useEffect(() => {
    if (lastTranscript) {
      handleTranscription(lastTranscript)
    }
  }, [lastTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  // Content update: just track dirty content — actual save happens on blur
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
      // Immediately reflect title in UI
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

  // Flush pending content when switching notes or unmounting
  useEffect(() => {
    return () => {
      if (pendingContentRef.current && activeNote) {
        // Flush unsaved content on note switch / unmount
        saveNote({
          ...activeNote,
          content: pendingContentRef.current,
          updatedAt: new Date().toISOString()
        })
        pendingContentRef.current = null
      }
    }
  }, [activeNote?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
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
          <div className="flex h-full overflow-hidden">
            <NoteList />
            <div className="flex flex-1 flex-col overflow-hidden">
              {activeNote ? (
                <>
                  <NoteEditor
                    content={activeNote.content}
                    title={activeNote.title}
                    onUpdate={handleContentUpdate}
                    onBlur={handleEditorBlur}
                    onTitleChange={handleTitleChange}
                    isSummarizing={isSummarizing}
                    isSaving={isSaving}
                    showSaved={showSaved}
                  />

                  {/* Drawing toggle + canvas */}
                  <div className="border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowDrawing(!showDrawing)}
                      className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                        showDrawing
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                      }`}
                    >
                      <PenTool size={12} />
                      {showDrawing ? 'Hide Drawing' : 'Show Drawing'}
                    </button>
                    <DrawingCanvas
                      snapshot={activeNote.drawing}
                      onSave={handleDrawingSave}
                      visible={showDrawing}
                    />
                  </div>
                </>
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
