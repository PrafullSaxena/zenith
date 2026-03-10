/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: plugin icon + title + subtitle
 *  - Tab bar: Notes / Search / Knowledge
 *  - Notes tab: resizable sidebar (NoteList) | content area (NoteEditor + DrawingCanvas split)
 *  - Search tab: SearchView with FTS5 search + AI Q&A
 *  - Knowledge tab: KnowledgeGraph force-directed visualization
 *
 * Uses react-resizable-panels v4 (Group/Panel/Separator) for:
 *  1. Outer split: sidebar | content (persisted as "nebula-sidebar")
 *  2. Inner split: editor | drawing (persisted as "nebula-editor-split")
 *
 * Drawing panel is collapsed by default, expandable via side rail "Draw" tab.
 * Double-clicking the inner divider resets to 60/40 split.
 * Sidebar collapses to just an expand button.
 *
 * Follows the same tab pattern as LaunchpadView.tsx.
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { BookOpen, FileText, Search, Share2, Pencil, ChevronRight } from 'lucide-react'
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef
} from 'react-resizable-panels'
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

// Panel IDs for react-resizable-panels layout persistence
const SIDEBAR_PANEL_ID = 'sidebar'
const CONTENT_PANEL_ID = 'content'
const EDITOR_PANEL_ID = 'editor'
const DRAWING_PANEL_ID = 'drawing'

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

  // Panel imperative refs
  const sidebarPanelRef = usePanelRef()
  const drawingPanelRef = usePanelRef()

  // Track pending (dirty) content that hasn't been saved yet
  const pendingContentRef = useRef<object | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSavingRef = useRef(false)

  // Layout persistence via useDefaultLayout
  const sidebarLayout = useDefaultLayout({
    id: 'nebula-sidebar',
    storage: localStorage
  })

  const editorLayout = useDefaultLayout({
    id: 'nebula-editor-split',
    storage: localStorage
  })

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
        // Fire a toast notification after transcription completes
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

  // Toggle drawing panel open/closed
  const handleToggleDrawing = useCallback(() => {
    if (drawingOpen) {
      drawingPanelRef.current?.collapse()
      setDrawingOpen(false)
    } else {
      drawingPanelRef.current?.expand()
      setDrawingOpen(true)
    }
  }, [drawingOpen, drawingPanelRef])

  // Double-click inner divider to reset to 60/40 split
  const handleDividerDoubleClick = useCallback(() => {
    // Clear persisted editor split layout to reset to defaults
    try {
      localStorage.removeItem('react-resizable-panels:nebula-editor-split')
    } catch {
      // Ignore storage errors
    }
    // Force both panels to target sizes
    drawingPanelRef.current?.resize('40%')
    setDrawingOpen(true)
  }, [drawingPanelRef])

  // Track sidebar collapse state from panel resize events
  const handleSidebarResize = useCallback(
    (panelSize: { asPercentage: number }) => {
      const collapsed = panelSize.asPercentage < 5
      if (collapsed !== sidebarCollapsed) {
        setSidebarCollapsed(collapsed)
      }
    },
    [sidebarCollapsed]
  )

  // Track drawing panel collapse/expand
  const handleDrawingResize = useCallback(
    (panelSize: { asPercentage: number }) => {
      const isOpen = panelSize.asPercentage > 2
      if (isOpen !== drawingOpen) {
        setDrawingOpen(isOpen)
      }
    },
    [drawingOpen]
  )

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
        {/* Notes tab with resizable panels */}
        {activeTab === 'notes' && (
          <Group
            orientation="horizontal"
            id="nebula-sidebar"
            defaultLayout={sidebarLayout.defaultLayout}
            onLayoutChange={sidebarLayout.onLayoutChange}
            onLayoutChanged={sidebarLayout.onLayoutChanged}
            className="h-full"
          >
            {/* Sidebar panel -- collapsible NoteList */}
            <Panel
              id={SIDEBAR_PANEL_ID}
              defaultSize="22%"
              minSize="5%"
              maxSize="40%"
              collapsible
              collapsedSize="0%"
              panelRef={sidebarPanelRef}
              onResize={handleSidebarResize}
              className="overflow-hidden"
            >
              {sidebarCollapsed ? (
                <div className="flex h-full w-full items-start justify-center pt-3 bg-surface">
                  <button
                    type="button"
                    onClick={() => {
                      sidebarPanelRef.current?.expand()
                      setSidebarCollapsed(false)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-accent/15 hover:text-accent"
                    title="Expand sidebar"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <NoteList />
              )}
            </Panel>

            {/* Sidebar resize handle */}
            <Separator className="w-1 bg-border hover:bg-accent/30 transition-colors cursor-col-resize" />

            {/* Content panel */}
            <Panel id={CONTENT_PANEL_ID} defaultSize="78%" className="overflow-hidden">
              <div className="relative flex h-full overflow-hidden">
                {activeNote ? (
                  <Group
                    orientation="horizontal"
                    id="nebula-editor-split"
                    defaultLayout={editorLayout.defaultLayout}
                    onLayoutChange={editorLayout.onLayoutChange}
                    onLayoutChanged={editorLayout.onLayoutChanged}
                    className="h-full w-full"
                  >
                    {/* Editor panel */}
                    <Panel
                      id={EDITOR_PANEL_ID}
                      defaultSize={drawingOpen ? '60%' : '100%'}
                      minSize="30%"
                      className="overflow-hidden"
                    >
                      <NoteEditor
                        noteId={activeNote.id}
                        content={activeNote.content}
                        title={activeNote.title}
                        tags={activeNote.tags}
                        onTagsChange={handleTagsChange}
                        updatedAt={activeNote.updatedAt}
                        onUpdate={handleContentUpdate}
                        onBlur={handleEditorBlur}
                        onTitleChange={handleTitleChange}
                        isSummarizing={isSummarizing}
                        isSaving={isSaving}
                        showSaved={showSaved}
                      />
                    </Panel>

                    {/* Editor/drawing resize handle -- only when drawing is open */}
                    {drawingOpen && (
                      <Separator
                        className="w-1.5 bg-border hover:bg-accent/50 transition-colors cursor-col-resize"
                        onDoubleClick={handleDividerDoubleClick}
                      />
                    )}

                    {/* Drawing panel -- collapsed by default, expandable via side rail */}
                    <Panel
                      id={DRAWING_PANEL_ID}
                      defaultSize={drawingOpen ? '40%' : '0%'}
                      minSize="0%"
                      collapsible
                      collapsedSize="0%"
                      panelRef={drawingPanelRef}
                      onResize={handleDrawingResize}
                      className="overflow-hidden"
                    >
                      {drawingOpen && (
                        <DrawingCanvas
                          key={activeNote.id}
                          snapshot={activeNote.drawing}
                          onSave={handleDrawingSave}
                        />
                      )}
                    </Panel>
                  </Group>
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

                {/* Voice Recorder FAB -- bottom-right of content area, visible when note selected */}
                <VoiceRecorder noteId={activeNote?.id ?? null} />
              </div>
            </Panel>
          </Group>
        )}

        {/* Search tab */}
        {activeTab === 'search' && <SearchView />}

        {/* Knowledge tab */}
        {activeTab === 'knowledge' && <KnowledgeGraph />}
      </div>
    </div>
  )
}
