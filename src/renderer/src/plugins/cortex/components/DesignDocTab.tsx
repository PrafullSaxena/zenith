/**
 * DesignDocTab — Renders the generated HLD with Mermaid diagrams.
 * Calls cban:generateHLD IPC to generate document from analysis results,
 * then renders via MarkdownRenderer (which handles mermaid fences).
 * Stores HLD content in the codebase-analyzer store for export access.
 */
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react'
import { useCodebaseAnalyzerStore } from '../../../../stores/codebase-analyzer-store'
import MarkdownRenderer from '../../../../components/MarkdownRenderer'

export default function DesignDocTab(): React.JSX.Element {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analysisResult = useCodebaseAnalyzerStore((s) => s.analysisResult)
  const designDoc = useCodebaseAnalyzerStore((s) => s.designDoc)
  const setDesignDoc = useCodebaseAnalyzerStore((s) => s.setDesignDoc)
  const repos = useCodebaseAnalyzerStore((s) => s.repos)
  const activeRepoId = useCodebaseAnalyzerStore((s) => s.activeRepoId)

  const activeRepo = repos.find((r) => r.id === activeRepoId)

  const handleGenerate = useCallback(async () => {
    if (!activeRepo || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const doc = await window.api.cban.generateHLD(activeRepo.url, activeRepo.branch)
      setDesignDoc(doc)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate HLD'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }, [activeRepo, isGenerating, setDesignDoc])

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        No analysis data available
      </div>
    )
  }

  // Empty state — no HLD generated yet
  if (!designDoc && !isGenerating) {
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
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-4 rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 transition-colors"
          >
            Generate Design Document
          </button>
        </motion.div>
      </div>
    )
  }

  // Loading state with skeleton placeholders
  if (isGenerating) {
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

  // HLD content rendered
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-primary">High Level Design</span>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/25 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} />
          Regenerate
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MarkdownRenderer text={designDoc} />
        </motion.div>
      </div>
    </div>
  )
}
