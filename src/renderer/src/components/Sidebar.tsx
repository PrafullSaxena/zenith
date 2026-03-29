import { useState, useMemo, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, LayoutGroup, Reorder } from 'framer-motion'
import {
  GitPullRequest,
  Database,
  Settings,
  LayoutDashboard,
  Activity,
  Info,
  Rocket,
  BookOpen,
  PenLine,
  GripVertical,
  Brain
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLUGINS } from '../plugins/registry'
import { useSettingsStore } from '../stores/settings-store'
import type { PluginDefinition } from '../types/plugin'

/**
 * Static map of icon name strings to lucide-react components.
 * All icons used in PLUGINS must be listed here.
 */
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

function SidebarIcon({
  iconName,
  label,
  to
}: {
  iconName: string
  label: string
  to: string
}): React.JSX.Element {
  const Icon = ICON_MAP[iconName]

  return (
    <NavLink to={to} className="no-drag group relative flex items-center">
      {({ isActive }) => (
        <>
          {/* Active indicator — sliding left accent bar via layoutId */}
          {isActive && (
            <motion.div
              layoutId="sidebarActiveBar"
              className="absolute left-0 h-6 w-[3px] rounded-r bg-accent"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          {/* Icon button with hover glow ring */}
          <div
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 ${
              isActive
                ? 'text-accent shadow-[0_0_8px_var(--color-accent-glow)]'
                : 'text-text-secondary hover:scale-[1.08] hover:shadow-[0_0_12px_var(--color-accent-glow)] hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            {Icon ? <Icon size={20} /> : <span className="text-xs">{iconName}</span>}
          </div>
          {/* Glass-styled tooltip with 400ms delay and slide entrance */}
          <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-(--glass-bg) border border-(--glass-border) px-2.5 py-1 text-xs text-text-primary opacity-0 shadow-lg backdrop-blur-sm transition-all duration-150 delay-[400ms] translate-x-0 group-hover:opacity-100 group-hover:translate-x-1">
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Builds the ordered plugin list from a saved order (string[] of plugin IDs).
 * Plugins in the saved order come first in that sequence; any new plugins
 * not found in saved order are appended at the end.
 */
function buildOrderedPlugins(savedOrder: string[] | undefined): PluginDefinition[] {
  if (!savedOrder || savedOrder.length === 0) {
    return [...PLUGINS]
  }

  const pluginMap = new Map(PLUGINS.map((p) => [p.id, p]))
  const ordered: PluginDefinition[] = []

  // Add plugins in saved order
  for (const id of savedOrder) {
    const plugin = pluginMap.get(id as PluginDefinition['id'])
    if (plugin) {
      ordered.push(plugin)
      pluginMap.delete(id as PluginDefinition['id'])
    }
  }

  // Append any plugins not in saved order (new plugins added after last save)
  for (const plugin of pluginMap.values()) {
    ordered.push(plugin)
  }

  return ordered
}

export function Sidebar(): React.JSX.Element {
  const getSetting = useSettingsStore((s) => s.getSetting)
  const setSetting = useSettingsStore((s) => s.setSetting)

  const savedOrder = getSetting('general.pluginOrder') as string[] | undefined

  const initialPlugins = useMemo(() => buildOrderedPlugins(savedOrder), [savedOrder])
  const [orderedPlugins, setOrderedPlugins] = useState<PluginDefinition[]>(initialPlugins)

  // Sync local state when saved order changes (e.g. settings loaded async)
  useEffect(() => {
    setOrderedPlugins(buildOrderedPlugins(savedOrder))
  }, [savedOrder])

  const handleReorder = useCallback(
    (newOrder: PluginDefinition[]) => {
      setOrderedPlugins(newOrder)
      setSetting(
        'general.pluginOrder',
        newOrder.map((p) => p.id)
      )
    },
    [setSetting]
  )

  return (
    <aside className="relative z-10 flex h-full w-14 flex-shrink-0 flex-col border-r border-border bg-surface">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region h-8 w-full" />

      {/* Navigation icons — LayoutGroup enables layoutId sliding between all icons */}
      <LayoutGroup>
        <nav className="flex flex-1 flex-col items-center gap-2 pt-1">
          {/* App-level navigation (fixed) */}
          <SidebarIcon iconName="LayoutDashboard" label="Zenith" to="/dashboard" />
          <SidebarIcon iconName="Activity" label="Activity Log" to="/activity" />

          {/* Separator between app icons and plugin icons */}
          <div className="mx-auto my-1 h-px w-7 bg-border/40" />

          {/* Draggable plugin icons */}
          <Reorder.Group
            axis="y"
            values={orderedPlugins}
            onReorder={handleReorder}
            className="flex flex-col items-center gap-2"
            as="div"
          >
            {orderedPlugins.map((plugin) => (
              <Reorder.Item
                key={plugin.id}
                value={plugin}
                as="div"
                className="group/drag relative cursor-grab active:cursor-grabbing"
                whileDrag={{
                  scale: 1.1,
                  zIndex: 50,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {/* Drag grip indicator — appears on hover */}
                <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover/drag:opacity-40">
                  <GripVertical size={8} className="text-text-secondary" />
                </div>
                <SidebarIcon
                  iconName={plugin.icon}
                  label={plugin.name}
                  to={plugin.route}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </nav>

        {/* About + Settings at bottom (fixed) */}
        <div className="flex flex-col items-center gap-2 pb-3">
          <SidebarIcon iconName="Info" label="About" to="/about" />
          <SidebarIcon iconName="Settings" label="Settings" to="/settings" />
        </div>
      </LayoutGroup>
    </aside>
  )
}
