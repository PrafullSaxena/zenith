/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: Card with BookOpen icon, gradient title, GlassTab bar
 *  - Tab bar: Notes / Search / Knowledge
 *  - Notes tab: sidebar (NoteList) | content area (NoteEditor + DrawingCanvas)
 *  - Search tab: SearchView with FTS5 search + AI Q&A
 *  - Knowledge tab: KnowledgeGraph force-directed visualization
 *
 * Drawing panel is collapsed by default, expandable via side rail "Draw" tab.
 * Sidebar width is fixed for now (resizable panels to be added later).
 *
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  FileText,
  Search,
  Share2,
  Pencil,
  PanelLeftClose,
  PanelLeft,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { PageHeader } from '../../components/shared/page-header'
import { pageTransition } from '../../lib/motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { SpotlightCard } from '@renderer/components/ui/spotlight-card'
import NoteList from './NoteList'
import NoteEditor from './NoteEditor'
import DrawingCanvas from './DrawingCanvas'
import KnowledgeGraph from './KnowledgeGraph'
import SearchView from './SearchView'
import VoiceRecorder from './VoiceRecorder'
import ToastContainer from './ToastContainer'
import type { NebulaTab, NoteTag } from '../../types/nebula'

const TABS = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'knowledge', label: 'Knowledge', icon: Share2 }
]

export default function NebulaView(): React.JSX.Element {
  const activeTab = useNebulaStore((s) => s.activeTab)
  const setActiveTab = useNebulaStore((s) => s.setActiveTab)
  const loadNotes = useNebulaStore((s) => s.loadNotes)
  const notes = useNebulaStore((s) => s.notes)
  const createNote = useNebulaStore((s) => s.createNote)
  const activeNote = useNebulaStore((s) => s.activeNote)
  const saveNote = useNebulaStore((s) => s.saveNote)
  const isSaving = useNebulaStore((s) => s.isSaving)
  const isSummarizing = useNebulaStore((s) => s.isSummarizing)
  const lastTranscript = useNebulaStore((s) => s.lastTranscript)
  const handleTranscription = useNebulaStore((s) => s.handleTranscription)
  const addToast = useNebulaStore((s) => s.addToast)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawingOpen, setDrawingOpen] = useState(false)
  const [drawingFullscreen, setDrawingFullscreen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track pending (dirty) content that hasn't been saved yet
  const pendingContentRef = useRef<object | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSavingRef = useRef(false)
  const leftPanelRef = useRef<any>(null)

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
    setDrawingFullscreen(false)
  }, [])

  // Toggle fullscreen for drawing panel
  const handleToggleFullscreen = useCallback(() => {
    setDrawingFullscreen((prev) => !prev)
  }, [])

  // Close drawing panel
  const handleCloseDrawing = useCallback(() => {
    setDrawingOpen(false)
    setDrawingFullscreen(false)
  }, [])

  // Draggable resize handle between editor and drawing using Panels natively

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:24px_24px]">
      {/* Toast notifications -- visible across all tabs */}
      <ToastContainer />

      {/* Header with Card */}
      <PageHeader
        icon={BookOpen}
        title="Nebula"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as NebulaTab)}
      />

      {/* Tab content with AnimatePresence page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 overflow-hidden"
        >
          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="flex flex-1 overflow-hidden relative z-0 w-full h-full">
              <PanelGroup orientation="horizontal" className="w-full h-full">
              {/* Sidebar */}
              <Panel
                  panelRef={leftPanelRef}
                  collapsible={true}
                  collapsedSize="0%"
                  defaultSize="22%"
                  minSize="15%"
                  maxSize="40%"
                  onResize={(size) => {
                    setSidebarCollapsed(size.asPercentage === 0)
                  }}
                  className="flex flex-col px-4 pb-4 pt-4"
                >
                <SpotlightCard className="flex h-full flex-col w-full overflow-hidden">
                {sidebarCollapsed ? (
                  <div className="flex flex-1 flex-col items-center pt-3 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => leftPanelRef.current?.expand()}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                      title="Expand sidebar"
                    >
                      <PanelLeft size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full flex-col h-full overflow-hidden">
                    {/* Collapse button */}
                    <div className="flex justify-end px-1 pt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => leftPanelRef.current?.collapse()}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-primary/10 hover:text-muted-foreground"
                        title="Collapse sidebar"
                      >
                        <PanelLeftClose size={14} />
                      </button>
                    </div>
                    <NoteList />
                  </div>
                )}
                </SpotlightCard>
              </Panel>

              <PanelResizeHandle className="relative flex w-2 shrink-0 items-center justify-center bg-transparent cursor-col-resize z-50 group">
                <div className="w-0.5 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
              </PanelResizeHandle>

              {/* Content area */}
              <Panel className="relative flex flex-col overflow-hidden px-4 pb-4 pt-4">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-border bg-card/40 backdrop-blur-3xl">
                {activeNote ? (
                  <PanelGroup orientation="horizontal" className="w-full h-full">
                    {/* Editor -- hidden when drawing is fullscreen */}
                    {!drawingFullscreen && (
                      <Panel defaultSize="60%" className="flex flex-col overflow-hidden">
                        <NoteEditor
                          key={activeNote.id}
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
                      </Panel>
                    )}

                    {/* Resize handle between editor and drawing */}
                    {drawingOpen && !drawingFullscreen && (
                      <PanelResizeHandle className="relative flex w-2 shrink-0 items-center justify-center bg-transparent cursor-col-resize z-50 group -mx-px">
                        <div className="h-8 w-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
                      </PanelResizeHandle>
                    )}

                    {/* Drawing panel */}
                    {drawingOpen && (
                      <Panel defaultSize={drawingFullscreen ? "100%" : "40%"} className="flex flex-col border-l border-border/50 overflow-hidden">
                        {/* Drawing panel header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-1.5 bg-transparent">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Pencil size={12} />
                            Drawing
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleToggleFullscreen}
                              title={drawingFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                              className="h-6 w-6 p-0"
                            >
                              {drawingFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCloseDrawing}
                              title="Close drawing panel"
                              className="h-6 w-6 p-0"
                            >
                              <X size={13} />
                            </Button>
                          </div>
                        </div>
                        {/* Canvas */}
                        <div className="flex-1 bg-transparent">
                          <DrawingCanvas
                            key={activeNote.id}
                            snapshot={activeNote.drawing}
                            onSave={handleDrawingSave}
                          />
                        </div>
                      </Panel>
                    )}
                  </PanelGroup>
                ) : notes.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No notes yet"
                    description="Create your first note to start building your knowledge base with AI-powered search and summarization."
                    actionLabel="Create Note"
                    onAction={() => createNote()}
                    className="flex-1"
                  />
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No note selected"
                    description="Select a note from the sidebar or create a new one"
                    className="flex-1"
                  />
                )}

                {/* Side rail "Draw" tab -- visible when drawing panel is closed */}
                {activeNote && !drawingOpen && (
                  <button
                    type="button"
                    onClick={handleToggleDrawing}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 rounded-l-lg border border-r-0 border-border/50 bg-card/40 px-1.5 py-3 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary shadow-sm backdrop-blur-md"
                    title="Open drawing panel"
                  >
                    <Pencil size={14} />
                    <span className="text-[9px] font-medium [writing-mode:vertical-lr]">
                      Draw
                    </span>
                  </button>
                )}

                {/* Voice Recorder FAB -- hidden when drawing is fullscreen */}
                {!drawingFullscreen && <VoiceRecorder noteId={activeNote?.id ?? null} />}
                </div>
              </Panel>
            </PanelGroup>
            </div>
          )}

          {/* Search tab */}
          {activeTab === 'search' && <SearchView />}

          {/* Knowledge tab */}
          {activeTab === 'knowledge' && <KnowledgeGraph />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
