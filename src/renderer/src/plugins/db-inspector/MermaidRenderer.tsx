/**
 * MermaidRenderer — Shared component for rendering Mermaid diagrams
 * with zoom, pan, and reset controls.
 *
 * Includes syntax pre-processing to fix common issues:
 * - Pipe `|` characters inside flowchart node labels (mermaid uses `|` for link text)
 * - Orphaned mermaid error SVGs accumulating in the document body
 */
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Code2, Check } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'

interface MermaidRendererProps {
  syntax: string
  className?: string
  /** Enable interactive zoom/pan controls (default: false). */
  interactive?: boolean
  /** Show a "Copy Code" overlay button on hover (default: false). */
  showCopyCode?: boolean
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 3
const ZOOM_STEP = 0.15

/**
 * Pre-process mermaid syntax to fix common issues before rendering.
 * - Flowcharts: replace `|` inside node labels ([...], (...), {...}) with ` · `
 *   since mermaid uses `|` as a link-text delimiter.
 * - ER diagrams are left untouched (they use `|` in relationship notation).
 */
function preprocessMermaid(raw: string): string {
  const trimmed = raw.trim()

  // Only sanitize pipe characters in flowchart / graph definitions
  if (/^(flowchart|graph)\s/i.test(trimmed)) {
    // Replace | inside [...] node labels
    let result = trimmed.replace(/\[[^\]]*\]/g, (m) => m.replace(/\|/g, ' · '))
    // Replace | inside (...) node labels (round shapes)
    result = result.replace(/\([^)]*\)/g, (m) => m.replace(/\|/g, ' · '))
    // Replace | inside {...} decision labels (diamond shapes)
    result = result.replace(/\{[^}]*\}/g, (m) => m.replace(/\|/g, ' · '))
    return result
  }

  return trimmed
}

/** Remove orphaned mermaid error SVGs that mermaid injects into the document body. */
function cleanupMermaidErrors(): void {
  document.querySelectorAll('svg[id^="d"]').forEach((el) => {
    // Mermaid error SVGs contain an element with class "error-icon" or text "Syntax error"
    if (
      el.querySelector('.error-icon') ||
      el.textContent?.includes('Syntax error')
    ) {
      el.remove()
    }
  })
  // Also remove any loose mermaid container divs with error content
  document.querySelectorAll('div[id^="d"]').forEach((el) => {
    if (el.textContent?.includes('Syntax error') && el.querySelector('svg')) {
      el.remove()
    }
  })
}

export default function MermaidRenderer({
  syntax,
  className,
  interactive = false,
  showCopyCode = false
}: MermaidRendererProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  // Copy mermaid source code to clipboard
  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(syntax).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 1500)
    })
  }, [syntax])

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Render mermaid
  useEffect(() => {
    if (!syntax || !svgContainerRef.current) return
    let cancelled = false

    const render = async (): Promise<void> => {
      try {
        setError(null)
        const mermaid = await import('mermaid')
        mermaid.default.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#6366f1',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#4f46e5',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            fontSize: '12px'
          },
          er: { useMaxWidth: true },
          flowchart: { useMaxWidth: true, curve: 'basis' }
        })

        const sanitized = preprocessMermaid(syntax)
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
        const { svg } = await mermaid.default.render(id, sanitized)

        if (!cancelled && svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svg
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          if (svgContainerRef.current) {
            svgContainerRef.current.innerHTML = ''
          }
        }
      } finally {
        // Always clean up orphaned error SVGs from the document body
        cleanupMermaidErrors()
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [syntax])

  // Reset zoom/pan when syntax changes
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [syntax])

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!interactive) return
      e.preventDefault()
      setZoom((prev) => {
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta))
      })
    },
    [interactive]
  )

  // Pan with mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive) return
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      }
    },
    [interactive, pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP * 2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP * 2))
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const zoomPercent = Math.round(zoom * 100)

  // Copy code overlay (shared between interactive and non-interactive modes)
  const copyCodeOverlay = showCopyCode ? (
    <button
      type="button"
      onClick={handleCopyCode}
      className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md
        text-[10px] font-medium bg-card/80 backdrop-blur-sm border border-border/50
        text-muted-foreground hover:text-foreground hover:bg-secondary
        opacity-0 group-hover:opacity-100 transition-opacity"
      title="Copy mermaid code"
    >
      <span icon={codeCopied ? Check : Code2} iconKey={codeCopied ? 'check' : 'code'} size={11} className={codeCopied ? 'text-emerald-400' : undefined} />
      {codeCopied ? ' Copied' : ' Code'}
    </button>
  ) : null

  // Non-interactive: simple render
  if (!interactive) {
    return (
      <div className={`group relative ${className ?? ''}`}>
        {copyCodeOverlay}
        {error && (
          <pre className="mb-2 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
            Diagram render error: {error}
          </pre>
        )}
        <div ref={svgContainerRef} className="[&_svg]:max-w-full" />
      </div>
    )
  }

  // Interactive: zoom/pan wrapper
  return (
    <div className={`group relative ${className ?? ''}`}>
      {error && (
        <pre className="mb-2 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          Diagram render error: {error}
        </pre>
      )}

      {/* Copy code overlay (positioned below zoom controls) */}
      {showCopyCode && (
        <button
          type="button"
          onClick={handleCopyCode}
          className="absolute left-3 top-3 z-10 flex items-center gap-1 px-2 py-1 rounded-md
            text-[10px] font-medium bg-card/80 backdrop-blur-sm border border-border/50
            text-muted-foreground hover:text-foreground hover:bg-secondary
            opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy mermaid code"
        >
          <span icon={codeCopied ? Check : Code2} iconKey={codeCopied ? 'check' : 'code'} size={11} className={codeCopied ? 'text-emerald-400' : undefined} />
          {codeCopied ? ' Copied' : ' Code'}
        </button>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={handleZoomOut}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="min-w-[3rem] text-center text-[10px] font-medium text-muted-foreground">
          {zoomPercent}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={handleReset}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Reset view"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Pannable / zoomable container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`overflow-hidden rounded-lg border border-border bg-secondary/30 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ minHeight: 200 }}
      >
        <div
          ref={svgContainerRef}
          className="origin-center transition-transform duration-75 [&_svg]:max-w-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Hint */}
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
        Scroll to zoom · Drag to pan · Click reset to fit
      </p>
    </div>
  )
}
