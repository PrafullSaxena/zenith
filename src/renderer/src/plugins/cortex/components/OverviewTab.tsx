/**
 * OverviewTab -- Displays auto-generated documentation and repo statistics.
 * Stats cards, language breakdown, documentation section, entity breakdown.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Hash, Route, Component, Sparkles, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import MarkdownRenderer from '../../../components/MarkdownRenderer'
import span from './span'
import TestCoverageCard from './TestCoverageCard'
import { getKindColor } from '../cortex-theme'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import DonutChart from './DonutChart'

const SOURCE_LANGUAGES = new Set([
  'java', 'python', 'typescript', 'javascript', 'go', 'kotlin',
  'rust', 'ruby', 'csharp', 'c', 'cpp', 'swift', 'php', 'scala'
])

function isSourceLanguage(lang: string): boolean {
  return SOURCE_LANGUAGES.has(lang.toLowerCase())
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Java: '#b07219',
  Python: '#3572a5',
  Go: '#00add8',
  SQL: '#e38c00',
  Kotlin: '#a97bff',
  Rust: '#dea584',
  Ruby: '#cc342d',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Other: '#6b7280'
}

export default function OverviewTab(): React.JSX.Element {
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const enrichEntities = useCortexStore((s) => s.enrichEntities)
  const entityEnrichmentProgress = useCortexStore((s) => s.entityEnrichmentProgress)
  const isDigestBuilding = useCortexStore((s) => s.isDigestBuilding)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [expandedMdFile, setExpandedMdFile] = useState<string | null>(null)

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No analysis data available
      </div>
    )
  }

  const { stats, documentation } = analysisResult

  // Split languages into two tiers
  const sourceLanguages = stats.languages.filter((l) => isSourceLanguage(l.language))
  const configLanguages = stats.languages.filter((l) => !isSourceLanguage(l.language))
  const totalSourceLines = sourceLanguages.reduce((sum, l) => sum + l.lineCount, 0)
  const totalConfigLines = configLanguages.reduce((sum, l) => sum + l.lineCount, 0)

  // Stats cards data
  const statCards = [
    {
      label: 'Total Files',
      value: stats.totalFiles,
      icon: FileText,
      color: 'text-blue-400',
      accentFrom: '#3b82f6',
      accentTo: '#06b6d4'
    },
    {
      label: 'Total Lines',
      value: stats.totalLines,
      icon: Hash,
      color: 'text-green-400',
      accentFrom: '#10b981',
      accentTo: '#34d399'
    },
    ...(stats.routeCount > 0
      ? [
          {
            label: 'API Endpoints',
            value: stats.routeCount,
            icon: Route,
            color: 'text-amber-400',
            accentFrom: '#f59e0b',
            accentTo: '#fbbf24'
          }
        ]
      : []),
    ...(stats.componentCount > 0
      ? [
          {
            label: 'Components',
            value: stats.componentCount,
            icon: Component,
            color: 'text-purple-400',
            accentFrom: '#a855f7',
            accentTo: '#c084fc'
          }
        ]
      : [])
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header with enrich button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        {(() => {
          const enrichedCount = analysisResult.entities.filter((e) => e.summary).length
          const isEnriched = enrichedCount > 0 && !entityEnrichmentProgress && !isDigestBuilding
          return (
            <button
              type="button"
              onClick={async () => {
                setEnrichError(null)
                try {
                  await enrichEntities()
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err)
                  setEnrichError(msg)
                }
              }}
              disabled={!!entityEnrichmentProgress || isDigestBuilding}
              title="Use AI to generate summaries for all detected entities"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                isEnriched
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              <Sparkles size={12} />
              {entityEnrichmentProgress
                ? `Enriching... ${entityEnrichmentProgress.done}/${entityEnrichmentProgress.total}`
                : isDigestBuilding
                  ? 'Building AI context...'
                  : isEnriched
                    ? `Enriched (${enrichedCount} entities)`
                    : 'Enrich with AI'}
            </button>
          )
        })()}
        {enrichError && (
          <span className="text-[10px] text-red-400" title={enrichError}>
            ⚠ {enrichError}
          </span>
        )}
      </div>
      {/* Stats cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              variants={staggerItem}
            >
            <Card className="relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${card.accentFrom}, ${card.accentTo})` }} />
              <div className="flex items-center gap-2">
                <Icon size={14} className={card.color} />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                <span value={card.value} />
              </p>
            </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Language breakdown */}
      {stats.languages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-foreground">Language Breakdown</h3>

          {/* Source Languages donut */}
          {sourceLanguages.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Source Languages
              </p>
              <div className="flex items-start gap-6">
                <DonutChart
                  segments={sourceLanguages.map((l) => ({
                    label: l.language,
                    value: l.lineCount,
                    color: LANGUAGE_COLORS[l.language] ?? LANGUAGE_COLORS.Other
                  }))}
                  size={120}
                  strokeWidth={14}
                />
                <div className="flex flex-1 flex-wrap gap-3">
                  {sourceLanguages.map((lang) => {
                    const pct = totalSourceLines > 0 ? (lang.lineCount / totalSourceLines) * 100 : 0
                    if (pct < 0.5) return null
                    return (
                      <div key={lang.language} className="flex items-center gap-1.5 text-[10px]">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: LANGUAGE_COLORS[lang.language] ?? LANGUAGE_COLORS.Other }}
                        />
                        <span className="text-muted-foreground">
                          {lang.language} {pct.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Config & Other bar */}
          {configLanguages.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Config &amp; Other
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-card">
                {configLanguages.map((lang) => {
                  const pct = totalConfigLines > 0 ? (lang.lineCount / totalConfigLines) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={lang.language}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: LANGUAGE_COLORS[lang.language] ?? '#6b7280'
                      }}
                      className="h-full opacity-60 first:rounded-l-full last:rounded-r-full"
                      title={`${lang.language}: ${pct.toFixed(1)}%`}
                    />
                  )
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {configLanguages.map((lang) => {
                  const pct = totalConfigLines > 0 ? (lang.lineCount / totalConfigLines) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div key={lang.language} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="inline-block h-2 w-2 rounded-full opacity-60"
                        style={{
                          backgroundColor: LANGUAGE_COLORS[lang.language] ?? '#6b7280'
                        }}
                      />
                      <span className="text-muted-foreground/60">
                        {lang.language} {pct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Documentation section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-6"
      >
        <h3 className="mb-3 text-xs font-semibold text-foreground">Documentation</h3>
        {documentation ? (
          <Card className="p-4">
            <MarkdownRenderer text={documentation} />
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <FileText size={24} className="text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">
              Documentation will be generated during analysis with an AI agent configured
            </p>
          </Card>
        )}
      </motion.div>

      {/* Repository Markdown Files */}
      {analysisResult.markdownFiles && analysisResult.markdownFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-foreground">
            <BookOpen size={12} className="mr-1 inline-block" />
            Repository Documentation
          </h3>
          <div className="space-y-2">
            {analysisResult.markdownFiles.map((file) => {
              const isExpanded = expandedMdFile === file.path
              return (
                <Card
                  key={file.path}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedMdFile(isExpanded ? null : file.path)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-foreground hover:bg-secondary"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <FileText size={12} className="text-muted-foreground" />
                    {file.name}
                    <span className="text-[10px] text-muted-foreground">{file.path}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 py-3">
                      <MarkdownRenderer text={file.content} />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Entity breakdown */}
      {stats.entityCount.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-foreground">Entity Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {stats.entityCount.map((entity) => {
              const colors = getKindColor(entity.kind)
              const firstEntity = analysisResult?.entities.find((e) => e.kind === entity.kind)
              const isClickable = !!firstEntity
              return (
                <motion.button
                  key={entity.kind}
                  type="button"
                  whileHover={{ y: -1 }}
                  onClick={isClickable ? () => navigateToFile(firstEntity.filePath, firstEntity.line) : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <span className="text-sm font-bold" style={{ color: colors.text }}>{entity.count}</span>
                  <span className="text-[10px] capitalize" style={{ color: colors.text, opacity: 0.7 }}>
                    {entity.kind === 'dag' ? 'DAGs' : `${entity.kind}s`}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Test coverage card */}
      {analysisResult?.testStats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-foreground">Test Coverage</h3>
          <TestCoverageCard stats={analysisResult.testStats} />
        </motion.div>
      )}
    </div>
  )
}
