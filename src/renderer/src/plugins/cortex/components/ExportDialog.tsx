/**
 * ExportDialog — Modal dialog for exporting documentation in Markdown, PDF, or Plain Text.
 * Supports section selection and format-specific options.
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, FileDown, AlignLeft, X, Download, Loader2 } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { GLASS_CARD } from '../cortex-theme'
import { analysisResultToMermaidBlocks } from './flow-utils'

type ExportFormat = 'markdown' | 'pdf' | 'plaintext'

interface ExportSection {
  id: string
  label: string
  available: boolean
}

interface ExportDialogProps {
  hldContent: string
  onClose: () => void
}

const FORMAT_OPTIONS: { id: ExportFormat; label: string; icon: typeof FileText }[] = [
  { id: 'markdown', label: 'Markdown', icon: FileText },
  { id: 'pdf', label: 'PDF', icon: FileDown },
  { id: 'plaintext', label: 'Plain Text', icon: AlignLeft }
]

export default function ExportDialog({ hldContent, onClose }: ExportDialogProps): React.JSX.Element {
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const repos = useCortexStore((s) => s.repos)
  const activeRepoId = useCortexStore((s) => s.activeRepoId)

  const activeRepo = repos.find((r) => r.id === activeRepoId)
  const repoName = activeRepo?.name ?? 'codebase'

  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build available sections
  const sections: ExportSection[] = [
    { id: 'overview', label: 'Project Overview', available: true },
    { id: 'architecture', label: 'Architecture Diagram', available: true },
    { id: 'apis', label: 'API Endpoints', available: (analysisResult?.routes.length ?? 0) > 0 },
    { id: 'components', label: 'Component Structure', available: (analysisResult?.components.length ?? 0) > 0 },
    { id: 'pipelines', label: 'Data Pipelines', available: (analysisResult?.pipelines.length ?? 0) > 0 },
    { id: 'classes', label: 'Class Diagrams', available: true },
    { id: 'modules', label: 'Key Modules', available: true },
    { id: 'full', label: 'Full HLD Document', available: true }
  ]

  const availableSections = sections.filter((s) => s.available)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(availableSections.map((s) => s.id))
  )

  const toggleSection = (id: string): void => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /**
   * Strip markdown syntax for plain text export.
   */
  const stripMarkdown = (md: string): string => {
    return md
      // Remove mermaid code blocks entirely
      .replace(/```mermaid[\s\S]*?```/g, '[Diagram omitted in plain text export]')
      // Remove other code fences but keep content
      .replace(/```\w*\n([\s\S]*?)```/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove table separators
      .replace(/^\|?\s*[-:\s|]+\s*\|?$/gm, '')
      // Clean up table formatting
      .replace(/\|/g, '  ')
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Filter content to only include selected sections.
   * If 'full' is selected, use the entire HLD content.
   */
  const getFilteredContent = (): string => {
    if (selectedSections.has('full')) {
      return hldContent
    }

    // For section-based export, split HLD by ## headers and filter
    const sectionMap: Record<string, string[]> = {
      overview: ['Project Overview'],
      architecture: ['Architecture Overview'],
      apis: ['API Endpoints'],
      components: ['Component Structure'],
      pipelines: ['Data Pipelines'],
      classes: ['Class Diagrams'],
      modules: ['Key Modules', 'Dependencies']
    }

    const lines = hldContent.split('\n')
    const filtered: string[] = []
    let currentSection = ''
    let include = false

    // Always include the title
    if (lines[0]?.startsWith('# ')) {
      filtered.push(lines[0])
      filtered.push('')
    }

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const heading = line.slice(3).trim()
        currentSection = ''
        include = false

        for (const [sectionId, headings] of Object.entries(sectionMap)) {
          if (headings.some((h) => heading.startsWith(h)) && selectedSections.has(sectionId)) {
            currentSection = sectionId
            include = true
            break
          }
        }
      }

      if (include) {
        filtered.push(line)
      }
    }

    return filtered.join('\n').trim()
  }

  /**
   * Append Mermaid flow diagram blocks to content for MD/PDF exports.
   * Each diagram is wrapped in a ```mermaid fence with a heading.
   */
  const appendFlowDiagrams = (content: string): string => {
    if (!analysisResult) return content
    const diagrams = analysisResultToMermaidBlocks(analysisResult)
    if (diagrams.length === 0) return content
    const blocks = diagrams
      .map((d) => `## ${d.title} Diagram\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``)
      .join('\n\n')
    return `${content}\n\n## Flow Diagrams\n\n${blocks}`
  }

  const handleExport = useCallback(async () => {
    if (isExporting) return

    setIsExporting(true)
    setError(null)

    try {
      const baseContent = getFilteredContent()

      if (!baseContent.trim()) {
        setError('No content to export. Select at least one section.')
        setIsExporting(false)
        return
      }

      switch (format) {
        case 'markdown': {
          const content = appendFlowDiagrams(baseContent)
          await window.api.app.saveTextFile(
            content,
            `${repoName}-documentation.md`,
            [{ name: 'Markdown', extensions: ['md'] }]
          )
          break
        }
        case 'plaintext': {
          // Append flow diagrams before stripping markdown so [Diagram omitted] placeholder applies
          const content = appendFlowDiagrams(baseContent)
          const plainText = stripMarkdown(content)
          await window.api.app.saveTextFile(
            plainText,
            `${repoName}-documentation.txt`,
            [{ name: 'Text', extensions: ['txt'] }]
          )
          break
        }
        case 'pdf': {
          const content = appendFlowDiagrams(baseContent)
          await window.api.app.exportPdf({
            markdown: content,
            title: `${repoName} - Documentation`,
            orientation: 'portrait'
          })
          break
        }
      }

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }, [format, selectedSections, hldContent, repoName, isExporting, onClose, analysisResult])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`w-[480px] ${GLASS_CARD} p-6 shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Export Documentation</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Format selector */}
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Format
            </p>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isActive = format === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-accent/30 bg-accent/[0.08] text-accent'
                        : 'border-white/[0.08] bg-white/[0.02] text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section checkboxes */}
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Sections
            </p>
            <div className="grid grid-cols-2 gap-2">
              {availableSections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-2 text-sm text-text-primary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.has(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-accent"
                  />
                  <span className="text-xs">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.05] backdrop-blur-sm px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedSections.size === 0}
              className="flex items-center gap-2 rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={13} />
                  Export
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
