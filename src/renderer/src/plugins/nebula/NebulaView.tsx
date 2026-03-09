/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: plugin icon + title + subtitle
 *  - Tab bar: Notes / Search / Knowledge
 *  - Notes tab: NoteList sidebar + NoteEditor + DrawingCanvas toggle
 *  - Search / Knowledge tabs: placeholders for Plans 04 and 06
 *
 * Follows the same tab pattern as LaunchpadView.tsx.
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { BookOpen, FileText, Search, Share2, PenTool } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import NoteList from './NoteList'
import NoteEditor from './NoteEditor'
import DrawingCanvas from './DrawingCanvas'
import KnowledgeGraph from './KnowledgeGraph'
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

  const [showDrawing, setShowDrawing] = useState(false)

  // Debounce timer refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced content save (500ms)
  const handleContentUpdate = useCallback(
    (json: object) => {
      if (!activeNote) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveNote({
          ...activeNote,
          content: json,
          updatedAt: new Date().toISOString()
        })
      }, 500)
    },
    [activeNote, saveNote]
  )

  // Title change: immediate store update + debounced save
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activeNote) return
      // Update the active note in store immediately for responsiveness
      const updatedNote = { ...activeNote, title, updatedAt: new Date().toISOString() }
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
      titleTimerRef.current = setTimeout(() => {
        saveNote(updatedNote)
      }, 500)
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
      <div key={activeTab} className="flex-1 overflow-hidden">
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
                    onTitleChange={handleTitleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDrawing(!showDrawing)}
                    className={`flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs transition-colors ${
                      showDrawing
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:text-text-primary'
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
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-text-secondary">
                  <div className="text-center">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Select a note or create a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search tab */}
        {activeTab === 'search' && (
          <div className="flex h-full items-center justify-center text-text-secondary">
            <div className="text-center">
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Search &amp; Q&amp;A will appear here</p>
            </div>
          </div>
        )}

        {/* Knowledge tab */}
        {activeTab === 'knowledge' && <KnowledgeGraph />}
      </div>
    </div>
  )
}
