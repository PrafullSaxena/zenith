import { cn, GLASS_BASE } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassSurfaceProps {
  as?: keyof React.JSX.IntrinsicElements
  children?: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BASE_CLASSES = 'rounded-xl p-4'

/**
 * A plain translucent container for headers, toolbars, and panel backgrounds.
 *
 * Uses the translucent tier (no backdrop-blur). Supports polymorphic rendering
 * via the `as` prop (defaults to `div`).
 */
export function GlassSurface({ as: Component = 'div', children, className }: GlassSurfaceProps) {
  return (
    <Component className={cn(GLASS_BASE.translucent, BASE_CLASSES, className)}>
      {children}
    </Component>
  )
}
