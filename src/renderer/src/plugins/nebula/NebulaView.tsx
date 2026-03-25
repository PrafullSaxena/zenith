/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: PluginHeader with BookOpen icon, gradient title, GlassTab bar
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
import { PluginHeader, GlassButton, EmptyState } from '../../components/ui'
import { pageTransition } from '../../lib/motion'
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
  const [drawingWidthPct, setDrawingWidthPct] = useState(40) // percentage of content area
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track pending (dirty) content that hasn't been saved yet
  const pendingContentRef = useRef<object | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSavingRef = useRef(false)
  const contentAreaRef = useRef<HTMLDivElement>(null)

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

  // Draggable resize handle between editor and drawing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const contentEl = contentAreaRef.current
      if (!contentEl) return

      const handleMouseMove = (ev: MouseEvent): void => {
        const rect = contentEl.getBoundingClientRect()
        const mouseX = ev.clientX - rect.left
        const totalW = rect.width
        const editorPct = (mouseX / totalW) * 100
        // Clamp: drawing between 20% and 70%
        const newDrawingPct = Math.max(20, Math.min(70, 100 - editorPct))
        setDrawingWidthPct(newDrawingPct)
      }
      const handleMouseUp = (): void => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    []
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-br from-surface-elevated/40 via-background to-surface-elevated/20">
      {/* Toast notifications -- visible across all tabs */}
      <ToastContainer />

      {/* Header with PluginHeader */}
      <PluginHeader
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
            <div className="flex h-full">
              {/* Sidebar */}
              {sidebarCollapsed ? (
                <div className="flex w-10 shrink-0 flex-col items-center border-r border-border/50 bg-surface/50 pt-3">
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
                <div className="flex w-64 shrink-0 flex-col border-r border-border/50 bg-surface/30">
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
              <div ref={contentAreaRef} className="relative flex flex-1 overflow-hidden">
                {activeNote ? (
                  <div className="flex h-full w-full">
                    {/* Editor -- hidden when drawing is fullscreen */}
                    {!drawingFullscreen && (
                      <div
                        className="flex flex-col overflow-hidden"
                        style={drawingOpen ? { width: `${100 - drawingWidthPct}%` } : { flex: 1 }}
                      >
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
                      </div>
                    )}

                    {/* Resize handle between editor and drawing */}
                    {drawingOpen && !drawingFullscreen && (
                      <div
                        onMouseDown={handleResizeStart}
                        className="group flex w-1.5 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent/20 transition-colors"
                        title="Drag to resize"
                      >
                        <div className="h-8 w-0.5 rounded-full bg-border group-hover:bg-accent transition-colors" />
                      </div>
                    )}

                    {/* Drawing panel */}
                    {drawingOpen && (
                      <div
                        className="flex flex-col border-l border-border/50"
                        style={drawingFullscreen ? { width: '100%' } : { width: `${drawingWidthPct}%` }}
                      >
                        {/* Drawing panel header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                            <Pencil size={12} />
                            Drawing
                          </span>
                          <div className="flex items-center gap-1">
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              onClick={handleToggleFullscreen}
                              title={drawingFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                              className="h-6 w-6 p-0"
                            >
                              {drawingFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </GlassButton>
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              onClick={handleCloseDrawing}
                              title="Close drawing panel"
                              className="h-6 w-6 p-0"
                            >
                              <X size={13} />
                            </GlassButton>
                          </div>
                        </div>
                        {/* Canvas */}
                        <div className="flex-1">
                          <DrawingCanvas
                            key={activeNote.id}
                            snapshot={activeNote.drawing}
                            onSave={handleDrawingSave}
                          />
                        </div>
                      </div>
                    )}
                  </div>
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 rounded-l-lg border border-r-0 border-border/50 bg-surface-elevated/80 px-1.5 py-3 text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent shadow-sm backdrop-blur-sm"
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
