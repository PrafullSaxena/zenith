/**
 * DesignDocTab — Renders the generated HLD with Mermaid diagrams.
 * Uses AI streaming via the cortex store's generateHLD action.
 * Renders via MarkdownRenderer (which handles mermaid fences).
 */
import { motion } from 'framer-motion'
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import MarkdownRenderer from '../../../components/MarkdownRenderer'

export default function DesignDocTab(): React.JSX.Element {
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const hldContent = useCortexStore((s) => s.hldContent)
  const isHLDGenerating = useCortexStore((s) => s.isHLDGenerating)
  const generateHLD = useCortexStore((s) => s.generateHLD)
  const designDoc = useCortexStore((s) => s.designDoc)

  // Use AI-streamed HLD if available, otherwise fall back to static designDoc
  const displayContent = hldContent || designDoc

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        No analysis data available
      </div>
    )
  }

  // Empty state — no HLD generated yet
  if (!displayContent && !isHLDGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <BookOpen size={36} className="mx-auto mb-3 text-text-secondary/30" />
          <h3 className="text-sm font-semibold text-text-primary">Design Document</h3>
          <p className="mt-1 max-w-xs text-xs text-text-secondary">
            Generate a High Level Design document with architecture diagrams,
            API flows, component trees, and class relationships.
          </p>
          <button
            type="button"
            onClick={() => generateHLD()}
            className="mt-4 rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
          >
            Generate Design Document
          </button>
        </motion.div>
      </div>
    )
  }

  // Streaming state — show partial content as it arrives
  if (isHLDGenerating && !displayContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-accent" />
        <p className="text-sm text-text-secondary">Generating design document...</p>
        <div className="mt-4 w-full max-w-2xl space-y-3 px-6">
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
          <div className="h-32 w-full animate-pulse rounded bg-surface" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-24 w-full animate-pulse rounded bg-surface" />
        </div>
      </div>
    )
  }

  // HLD content rendered (including while streaming)
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-primary">High Level Design</span>
          {isHLDGenerating && (
            <Loader2 size={12} className="animate-spin text-accent" />
          )}
        </div>
        <button
          type="button"
          onClick={() => generateHLD()}
          disabled={isHLDGenerating}
          className="flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/25 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} />
          Regenerate
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MarkdownRenderer text={displayContent} />
        </motion.div>
      </div>
    </div>
  )
}
