import { useSearchParams } from 'react-router-dom'
import { PLUGINS } from '../../plugins/registry'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { GeneralSettings } from './GeneralSettings'
import { PluginSettings } from './PluginSettings'
import { AIAgentsSettings } from './AIAgentsSettings'
import { MCPSettings } from './MCPSettings'
import type { PluginId } from '../../types/plugin'

type SettingsCategory = 'general' | 'ai-agents' | 'mcp-servers' | PluginId

/**
 * Settings view with vertical Tabs sidebar listing categories and right content panel.
 * Categories: General, AI Agents, MCP Servers, then one per plugin.
 * Supports ?tab=<pluginId> URL parameter to open a specific settings section.
 */
export function SettingsLayout(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') as SettingsCategory | null

  const settingsTabs = [
    { id: 'general', label: 'General' },
    { id: 'ai-agents', label: 'AI Agents' },
    { id: 'mcp-servers', label: 'MCP Servers' },
    ...PLUGINS.map((p) => ({
      id: p.id as string,
      label: p.name
    }))
  ]

  return (
    <div className="relative flex flex-col h-full -m-4">
      <div className="pointer-events-none absolute inset-0 z-0 dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[radial-gradient(#00000015_1px,transparent_1px)] [background-size:24px_24px]" />
      {/* Drag region for macOS title bar dragging */}
      <div className="drag-region h-3 w-full shrink-0" />
      <Tabs
        defaultValue={initialTab ?? 'general'}
        orientation="vertical"
        className="flex flex-1 min-h-0 w-full"
      >
        {/* Left sidebar — vertical tabs */}
        <div className="w-44 shrink-0 overflow-y-auto border-r border-white/6 bg-black/20 backdrop-blur-md py-4 px-2">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Settings
            </span>
          </div>
          <TabsList className="flex flex-col h-auto bg-transparent gap-0.5">
            {settingsTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="w-full justify-start rounded-lg text-left px-2.5 py-1.5 text-[13px] data-[state=active]:bg-white/6 data-[state=active]:text-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Right content panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="general" className="mt-0">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="ai-agents" className="mt-0">
            <AIAgentsSettings />
          </TabsContent>
          <TabsContent value="mcp-servers" className="mt-0">
            <MCPSettings />
          </TabsContent>
          {PLUGINS.map((plugin) => (
            <TabsContent key={plugin.id} value={plugin.id} className="mt-0">
              <PluginSettings pluginId={plugin.id as PluginId} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
