import { useState, useMemo, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, LayoutGroup, Reorder, AnimatePresence } from 'framer-motion'
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
  Brain,
  PanelLeft
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLUGINS } from '../../plugins/registry'
import { useSettingsStore } from '../../stores/settings-store'
import type { PluginDefinition } from '../../types/plugin'
import { cn } from '@renderer/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'

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

// ---------------------------------------------------------------------------
// Sidebar collapse hook (exported for external consumers like CommandPalette)
// ---------------------------------------------------------------------------

export function useSidebarCollapsed(): [boolean, () => void] {
  const getSetting = useSettingsStore((s) => s.getSetting)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const storedValue = (getSetting('general.sidebarCollapsed') as boolean) ?? true

  const [isCollapsed, setIsCollapsed] = useState(storedValue)

  // Sync local state when store value changes (e.g. from another consumer)
  useEffect(() => {
    setIsCollapsed(storedValue)
  }, [storedValue])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      setSetting('general.sidebarCollapsed', next)
      return next
    })
  }, [setSetting])

  return [isCollapsed, toggleCollapsed]
}

// ---------------------------------------------------------------------------
// SidebarIcon — single nav item with optional text label in expanded mode
// ---------------------------------------------------------------------------

function SidebarIcon({
  iconName,
  label,
  to,
  isCollapsed
}: {
  iconName: string
  label: string
  to: string
  isCollapsed: boolean
}): React.JSX.Element {
  const Icon = ICON_MAP[iconName]

  const linkContent = (
    <NavLink to={to} className="no-drag group relative flex items-center w-full">
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Active indicator — sliding left accent bar via layoutId */}
          {isActive && (
            <motion.div
              layoutId="sidebarActiveBar"
              className="absolute left-0 h-6 w-[3px] rounded-r bg-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          {/* Icon + optional label */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg transition-all duration-150',
              isCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'mx-2 h-10 w-full px-3',
              isActive
                ? 'bg-primary/18 border border-primary/35 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {Icon ? <Icon size={20} className="shrink-0" /> : <span className="text-xs">{iconName}</span>}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-medium truncate overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </NavLink>
  )

  // Show tooltip only in collapsed mode
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  for (const id of savedOrder) {
    const plugin = pluginMap.get(id as PluginDefinition['id'])
    if (plugin) {
      ordered.push(plugin)
      pluginMap.delete(id as PluginDefinition['id'])
    }
  }

  for (const plugin of pluginMap.values()) {
    ordered.push(plugin)
  }

  return ordered
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export function Sidebar(): React.JSX.Element {
  const getSetting = useSettingsStore((s) => s.getSetting)
  const setSetting = useSettingsStore((s) => s.setSetting)

  const storedCollapsed = (getSetting('general.sidebarCollapsed') as boolean) ?? true
  const [isCollapsed, setIsCollapsed] = useState(storedCollapsed)

  // Keep local state in sync with store changes from other consumers
  useEffect(() => {
    setIsCollapsed(storedCollapsed)
  }, [storedCollapsed])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      setSetting('general.sidebarCollapsed', next)
      return next
    })
  }, [setSetting])

  // Cmd+B / Ctrl+B keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCollapsed])

  const savedOrder = getSetting('general.pluginOrder') as string[] | undefined
  const initialPlugins = useMemo(() => buildOrderedPlugins(savedOrder), [savedOrder])
  const [orderedPlugins, setOrderedPlugins] = useState<PluginDefinition[]>(initialPlugins)

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
    <TooltipProvider>
      <motion.aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'relative z-10 flex h-full flex-shrink-0 flex-col',
          'border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl'
        )}
        animate={{ width: isCollapsed ? 56 : 240 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Drag region for macOS traffic lights */}
        <div className="drag-region h-[52px] w-full flex-shrink-0" />

        {/* Toggle + branding — sits below the traffic light area */}
        <div className={cn('flex items-center flex-shrink-0 pb-1', isCollapsed ? 'justify-center px-1' : 'px-3')}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              'no-drag flex items-center justify-center rounded-lg',
              'h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft size={16} />
          </button>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 ml-2 overflow-hidden"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
                  Z
                </div>
                <span className="text-xs font-medium text-foreground whitespace-nowrap tracking-tight">Zenith</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation icons — LayoutGroup enables layoutId sliding between all icons */}
        <LayoutGroup>
          <nav className="flex flex-1 flex-col gap-1 pt-1 overflow-hidden">
            {/* App-level navigation (fixed) */}
            <SidebarIcon iconName="LayoutDashboard" label="Dashboard" to="/dashboard" isCollapsed={isCollapsed} />
            <SidebarIcon iconName="Activity" label="Activity Log" to="/activity" isCollapsed={isCollapsed} />

            {/* Separator between app icons and plugin icons */}
            <div className={cn('my-1 h-px bg-border/40', isCollapsed ? 'mx-3' : 'mx-4')} />

            {/* Draggable plugin icons */}
            <Reorder.Group
              axis="y"
              values={orderedPlugins}
              onReorder={handleReorder}
              className="flex flex-col gap-1"
              as="div"
              aria-label="Plugin navigation"
            >
              {orderedPlugins.map((plugin) => (
                <Reorder.Item
                  key={plugin.id}
                  value={plugin}
                  as="div"
                  className="group/drag relative cursor-grab active:cursor-grabbing"
                  whileDrag={{
                    scale: 1.05,
                    zIndex: 50,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {/* Drag grip indicator — appears on hover in expanded mode */}
                  {!isCollapsed && (
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/drag:opacity-40">
                      <GripVertical size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <SidebarIcon
                    iconName={plugin.icon}
                    label={plugin.name}
                    to={plugin.route}
                    isCollapsed={isCollapsed}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </nav>

          {/* About + Settings at bottom (fixed) */}
          <div className="flex flex-col gap-1 pb-3">
            <SidebarIcon iconName="Info" label="About" to="/about" isCollapsed={isCollapsed} />
            <SidebarIcon iconName="Settings" label="Settings" to="/settings" isCollapsed={isCollapsed} />
          </div>
        </LayoutGroup>
      </motion.aside>
    </TooltipProvider>
  )
}
