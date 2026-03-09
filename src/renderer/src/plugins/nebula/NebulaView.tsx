/**
 * NebulaView -- Main view for the Nebula notes & knowledge management plugin.
 *
 * Layout:
 *  - Header: plugin icon + title + subtitle
 *  - Tab bar: Notes / Search / Knowledge
 *  - Content area: conditional on active tab (placeholders for now)
 *
 * Follows the same tab pattern as LaunchpadView.tsx.
 * Default-exported for React.lazy() compatibility in the plugin registry.
 */

import { useEffect } from 'react'
import { BookOpen, FileText, Search, Share2 } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
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

  // Load notes on mount (gracefully fails if IPC not wired yet)
  useEffect(() => {
    loadNotes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="flex h-full items-center justify-center text-text-secondary">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Note editor will appear here</p>
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
