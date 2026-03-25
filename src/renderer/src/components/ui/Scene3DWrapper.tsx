/**
 * Scene3DWrapper — Shared ErrorBoundary + Suspense wrapper for all 3D scenes.
 *
 * Catches WebGL failures and renders a 2D fallback. Shows a loading spinner
 * while the lazy-loaded 3D scene chunk downloads.
 *
 * Usage:
 *   <Scene3DWrapper fallback={<My2DFallback />} loadingMessage="Loading 3D...">
 *     <My3DCanvas />
 *   </Scene3DWrapper>
 */
import React, { Suspense } from 'react'
import { GlassSkeleton } from './GlassSkeleton'

// ── ErrorBoundary for WebGL / 3D failures ────────────────────────────────

interface ErrorBoundaryProps {
  fallback: React.ReactNode
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class Scene3DErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// ── Scene3DWrapper ───────────────────────────────────────────────────────

interface Scene3DWrapperProps {
  fallback: React.ReactNode
  children: React.ReactNode
  loadingMessage?: string
}

export default function Scene3DWrapper({
  fallback,
  children,
  loadingMessage
}: Scene3DWrapperProps): React.JSX.Element {
  return (
    <Scene3DErrorBoundary fallback={fallback}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-text-secondary">
              <GlassSkeleton variant="circle" className="mx-auto mb-2 h-8 w-8" />
              {loadingMessage && (
                <p className="text-[11px]">{loadingMessage}</p>
              )}
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </Scene3DErrorBoundary>
  )
}
