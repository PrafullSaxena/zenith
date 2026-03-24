import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PLUGINS } from '../../plugins/registry'
import { GlassTab } from '@renderer/components/ui'
import type { GlassTabItem } from '@renderer/components/ui/GlassTab'
import { GeneralSettings } from './GeneralSettings'
import { PluginSettings } from './PluginSettings'
import { AIAgentsSettings } from './AIAgentsSettings'
import { MCPSettings } from './MCPSettings'
import type { PluginId } from '../../types/plugin'

type SettingsCategory = 'general' | 'ai-agents' | 'mcp-servers' | PluginId

/**
 * Settings view with GlassTab vertical sidebar listing categories and right content panel.
 * Categories: General, AI Agents, MCP Servers, then one per plugin.
 * Supports ?tab=<pluginId> URL parameter to open a specific settings section.
 */
export function SettingsLayout(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') as SettingsCategory | null
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialTab ?? 'general')

  const settingsTabs: GlassTabItem[] = [
    { id: 'general', label: 'General' },
    { id: 'ai-agents', label: 'AI Agents' },
    { id: 'mcp-servers', label: 'MCP Servers' },
    ...PLUGINS.map((p) => ({
      id: p.id as string,
      label: p.name
    }))
  ]

  const renderContent = (): React.JSX.Element => {
    switch (activeCategory) {
      case 'general':
        return <GeneralSettings />
      case 'ai-agents':
        return <AIAgentsSettings />
      case 'mcp-servers':
        return <MCPSettings />
      default:
        return <PluginSettings pluginId={activeCategory as PluginId} />
    }
  }

  return (
    <div className="flex h-full -m-4">
      {/* Left sidebar — GlassTab vertical */}
      <div className="w-48 flex-shrink-0 overflow-y-auto py-4 px-2">
        <div className="px-1 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Settings
          </span>
        </div>
        <GlassTab
          orientation="vertical"
          tabs={settingsTabs}
          activeTab={activeCategory}
          onTabChange={(id) => setActiveCategory(id as SettingsCategory)}
        />
      </div>

      {/* Right content panel — animate on category switch */}
      <div className="flex-1 overflow-y-auto p-6">
        <div key={activeCategory} className="animate-tab-enter">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
