/**
 * useCommandPaletteItems -- Builds the full list of CommandPaletteItems
 * for the global command palette: navigation routes, settings sections, and actions.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  Info,
  Settings,
  GitPullRequest,
  Database,
  Rocket,
  BookOpen,
  PenLine,
  Brain,
  PanelLeft,
  FilePlus
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLUGINS } from '@renderer/plugins/registry'
import type { CommandPaletteItem } from '@renderer/components/shared/command-palette'
import { useSidebarCollapsed } from '@renderer/components/layout/sidebar'

/** Map plugin icon name strings to Lucide components (mirrors sidebar ICON_MAP) */
const ICON_MAP: Record<string, LucideIcon> = {
  GitPullRequest,
  Database,
  Settings,
  LayoutDashboard,
  Activity,
  Info,
  Rocket,
  BookOpen,
  PenLine,
  Brain
}

export function useCommandPaletteItems(): CommandPaletteItem[] {
  const navigate = useNavigate()
  const [, toggleSidebar] = useSidebarCollapsed()

  return useMemo(() => {
    const items: CommandPaletteItem[] = []

    // -- Navigation group: system routes
    items.push({
      id: 'nav-dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      group: 'Navigation',
      onSelect: () => navigate('/dashboard')
    })
    items.push({
      id: 'nav-activity',
      label: 'Activity Log',
      icon: Activity,
      group: 'Navigation',
      onSelect: () => navigate('/activity')
    })
    items.push({
      id: 'nav-about',
      label: 'About',
      icon: Info,
      group: 'Navigation',
      onSelect: () => navigate('/about')
    })
    items.push({
      id: 'nav-settings',
      label: 'Settings',
      icon: Settings,
      shortcut: 'Cmd+,',
      group: 'Navigation',
      onSelect: () => navigate('/settings')
    })

    // -- Navigation group: plugin routes
    for (const plugin of PLUGINS) {
      const Icon = ICON_MAP[plugin.icon]
      items.push({
        id: `nav-${plugin.id}`,
        label: plugin.name,
        icon: Icon,
        group: 'Navigation',
        onSelect: () => navigate(plugin.route)
      })
    }

    // -- Settings group
    items.push({
      id: 'settings-general',
      label: 'General Settings',
      icon: Settings,
      group: 'Settings',
      onSelect: () => navigate('/settings')
    })
    items.push({
      id: 'settings-ai-agents',
      label: 'AI Agents Settings',
      icon: Settings,
      group: 'Settings',
      onSelect: () => navigate('/settings')
    })
    items.push({
      id: 'settings-mcp',
      label: 'MCP Server Settings',
      icon: Settings,
      group: 'Settings',
      onSelect: () => navigate('/settings')
    })
    items.push({
      id: 'settings-plugins',
      label: 'Plugin Settings',
      icon: Settings,
      group: 'Settings',
      onSelect: () => navigate('/settings')
    })
    items.push({
      id: 'settings-connections',
      label: 'Connection Settings',
      icon: Settings,
      group: 'Settings',
      onSelect: () => navigate('/settings')
    })

    // -- Actions group
    items.push({
      id: 'action-new-note',
      label: 'New Note',
      icon: FilePlus,
      shortcut: 'Cmd+N',
      group: 'Actions',
      onSelect: () => navigate('/nebula')
    })
    items.push({
      id: 'action-sidebar',
      label: 'Toggle Sidebar',
      icon: PanelLeft,
      shortcut: 'Cmd+B',
      group: 'Actions',
      onSelect: () => toggleSidebar()
    })

    return items
  }, [navigate, toggleSidebar])
}
