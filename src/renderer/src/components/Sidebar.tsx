import { NavLink } from 'react-router-dom'
import {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Activity,
  Info,
  Rocket,
  BookOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLUGINS } from '../plugins/registry'

/**
 * Static map of icon name strings to lucide-react components.
 * All icons used in PLUGINS must be listed here.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  GitPullRequest,
  Database,
  Wrench,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Activity,
  Info,
  Rocket,
  BookOpen,
}

function SidebarIcon({
  iconName,
  label,
  to,
}: {
  iconName: string
  label: string
  to: string
}): React.JSX.Element {
  const Icon = ICON_MAP[iconName]

  return (
    <NavLink
      to={to}
      className="no-drag group relative flex items-center"
    >
      {({ isActive }) => (
        <>
          {/* Active indicator — left accent bar */}
          <div
            className={`absolute left-0 h-6 w-[3px] rounded-r transition-all duration-200 ${
              isActive ? 'bg-accent opacity-100' : 'opacity-0'
            }`}
          />
          {/* Icon button */}
          <div
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? 'text-accent shadow-[0_0_8px_var(--color-accent-glow)]'
                : 'text-text-secondary hover:scale-105 hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            {Icon ? <Icon size={20} /> : <span className="text-xs">{iconName}</span>}
          </div>
          {/* Tooltip */}
          <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border border-border/30 bg-surface-elevated/95 px-2.5 py-1 text-xs text-text-primary opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100">
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="relative z-10 flex h-full w-14 flex-shrink-0 flex-col border-r border-border bg-surface">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region h-8 w-full" />

      {/* Navigation icons */}
      <nav className="flex flex-1 flex-col items-center gap-2 pt-1">
        {/* App-level navigation */}
        <SidebarIcon iconName="LayoutDashboard" label="Zenith" to="/dashboard" />
        <SidebarIcon iconName="Activity" label="Activity Log" to="/activity" />

        {/* Separator between app icons and plugin icons */}
        <div className="mx-auto my-1 h-px w-7 bg-border/40" />

        {/* Plugin icons */}
        {PLUGINS.map((plugin) => (
          <SidebarIcon
            key={plugin.id}
            iconName={plugin.icon}
            label={plugin.name}
            to={plugin.route}
          />
        ))}
      </nav>

      {/* About + Settings at bottom */}
      <div className="flex flex-col items-center gap-2 pb-3">
        <SidebarIcon iconName="Info" label="About" to="/about" />
        <SidebarIcon iconName="Settings" label="Settings" to="/settings" />
      </div>
    </aside>
  )
}
