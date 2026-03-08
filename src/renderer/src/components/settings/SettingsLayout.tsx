import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PLUGINS } from '../../plugins/registry'
import { GeneralSettings } from './GeneralSettings'
import { PluginSettings } from './PluginSettings'
import { AIAgentsSettings } from './AIAgentsSettings'
import type { PluginId } from '../../types/plugin'

type SettingsCategory = 'general' | 'ai-agents' | PluginId

interface CategoryItem {
  id: SettingsCategory
  label: string
}

/**
 * Settings view with left sidebar listing categories and right content panel.
 * Categories: General, AI Agents (placeholder), then one per plugin.
 * Supports ?tab=<pluginId> URL parameter to open a specific settings section.
 */
export function SettingsLayout(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') as SettingsCategory | null
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialTab ?? 'general')

  const categories: CategoryItem[] = [
    { id: 'general', label: 'General' },
    { id: 'ai-agents', label: 'AI Agents' }
  ]

  const pluginCategories: CategoryItem[] = PLUGINS.map((p) => ({
    id: p.id as SettingsCategory,
    label: p.name
  }))

  const renderContent = (): React.JSX.Element => {
    switch (activeCategory) {
      case 'general':
        return <GeneralSettings />
      case 'ai-agents':
        return <AIAgentsSettings />
      default:
        return <PluginSettings pluginId={activeCategory as PluginId} />
    }
  }

  return (
    <div className="flex h-full -m-4">
      {/* Left sidebar */}
      <div className="w-48 flex-shrink-0 border-r border-border bg-surface overflow-y-auto py-4">
        <div className="px-3 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Settings
          </span>
        </div>

        {/* General + AI Agents */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full px-3 py-1.5 text-left text-sm transition ${
              activeCategory === cat.id
                ? 'bg-surface-elevated text-text-primary font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
            }`}
          >
            {cat.label}
          </button>
        ))}

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-border" />

        <div className="px-3 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Plugins
          </span>
        </div>

        {/* Plugin categories */}
        {pluginCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full px-3 py-1.5 text-left text-sm transition ${
              activeCategory === cat.id
                ? 'bg-surface-elevated text-text-primary font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Right content panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  )
}
