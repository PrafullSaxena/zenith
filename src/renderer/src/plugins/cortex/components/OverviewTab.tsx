/**
 * OverviewTab -- Displays auto-generated documentation and repo statistics.
 * Stats cards, language breakdown, documentation section, entity breakdown.
 */
import { motion } from 'framer-motion'
import { FileText, Hash, Route, Component, Sparkles } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import MarkdownRenderer from '../../../components/MarkdownRenderer'
import AnimatedCounter from './AnimatedCounter'
import TestCoverageCard from './TestCoverageCard'
import { usePrefersReducedMotion } from './useReducedMotion'

function useCardVariants(): {
  hidden: object
  visible: (i: number) => object
} {
  const reducedMotion = usePrefersReducedMotion()
  return {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 16, scale: reducedMotion ? 1 : 0.96 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: reducedMotion ? 0 : i * 0.08,
        duration: reducedMotion ? 0.15 : 0.35,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    })
  }
}

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

const ENTITY_ICONS: Record<string, string> = {
  controller: 'text-blue-400',
  service: 'text-green-400',
  repository: 'text-purple-400',
  function: 'text-amber-400',
  class: 'text-cyan-400',
  method: 'text-teal-400',
  component: 'text-pink-400',
  middleware: 'text-orange-400',
  route: 'text-red-400',
  decorator: 'text-indigo-400',
  dag: 'text-yellow-400',
  task: 'text-lime-400'
}

export default function OverviewTab(): React.JSX.Element {
  const cardVariants = useCardVariants()
  const analysisResult = useCortexStore((s) => s.analysisResult)
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const enrichEntities = useCortexStore((s) => s.enrichEntities)
  const entityEnrichmentProgress = useCortexStore((s) => s.entityEnrichmentProgress)
  const isDigestBuilding = useCortexStore((s) => s.isDigestBuilding)

  if (!analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
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
      color: 'text-blue-400'
    },
    {
      label: 'Total Lines',
      value: stats.totalLines,
      icon: Hash,
      color: 'text-green-400'
    },
    ...(stats.routeCount > 0
      ? [
          {
            label: 'API Endpoints',
            value: stats.routeCount,
            icon: Route,
            color: 'text-amber-400'
          }
        ]
      : []),
    ...(stats.componentCount > 0
      ? [
          {
            label: 'Components',
            value: stats.componentCount,
            icon: Component,
            color: 'text-purple-400'
          }
        ]
      : [])
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header with enrich button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Overview</h2>
        <button
          type="button"
          onClick={() => enrichEntities()}
          disabled={!!entityEnrichmentProgress || isDigestBuilding}
          className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          <Sparkles size={12} />
          {entityEnrichmentProgress
            ? `Enriching... ${entityEnrichmentProgress.done}/${entityEnrichmentProgress.total}`
            : isDigestBuilding
              ? 'Building AI context...'
              : 'Enrich with AI'}
        </button>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-xl border border-border/60 bg-surface-elevated/70 p-4"
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={card.color} />
                <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                  {card.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                <AnimatedCounter value={card.value} />
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Language breakdown */}
      {stats.languages.length > 0 && (
        <motion.div
          custom={statCards.length}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-text-primary">Language Breakdown</h3>

          {/* Source Languages bar */}
          {sourceLanguages.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-text-secondary">
                Source Languages
              </p>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface">
                {sourceLanguages.map((lang) => {
                  const pct = totalSourceLines > 0 ? (lang.lineCount / totalSourceLines) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={lang.language}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: LANGUAGE_COLORS[lang.language] ?? LANGUAGE_COLORS.Other
                      }}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      title={`${lang.language}: ${pct.toFixed(1)}%`}
                    />
                  )
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {sourceLanguages.map((lang) => {
                  const pct = totalSourceLines > 0 ? (lang.lineCount / totalSourceLines) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div key={lang.language} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: LANGUAGE_COLORS[lang.language] ?? LANGUAGE_COLORS.Other
                        }}
                      />
                      <span className="text-text-secondary">
                        {lang.language} {pct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Config & Other bar */}
          {configLanguages.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-text-secondary/60">
                Config &amp; Other
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-surface">
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
                      <span className="text-text-secondary/60">
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
        custom={statCards.length + 1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="mt-6"
      >
        <h3 className="mb-3 text-xs font-semibold text-text-primary">Documentation</h3>
        {documentation ? (
          <div className="rounded-xl border border-border/60 bg-surface-elevated/70 p-4">
            <MarkdownRenderer text={documentation} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/70 p-8 text-center">
            <FileText size={24} className="text-text-secondary opacity-30" />
            <p className="text-xs text-text-secondary">
              Documentation will be generated during analysis with an AI agent configured
            </p>
          </div>
        )}
      </motion.div>

      {/* Entity breakdown */}
      {stats.entityCount.length > 0 && (
        <motion.div
          custom={statCards.length + 2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-text-primary">Entity Breakdown</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {stats.entityCount.map((entity, i) => {
              const firstEntity = analysisResult?.entities.find((e) => e.kind === entity.kind)
              const isClickable = !!firstEntity
              return (
                <motion.div
                  key={entity.kind}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className={`rounded-lg border border-border/40 bg-surface-elevated/50 px-3 py-2 ${isClickable ? 'cursor-pointer transition-colors hover:border-accent/40 hover:bg-surface-elevated' : ''}`}
                  onClick={
                    isClickable
                      ? () => navigateToFile(firstEntity.filePath, firstEntity.line)
                      : undefined
                  }
                >
                  <AnimatedCounter
                    value={entity.count}
                    className="text-lg font-bold text-text-primary"
                  />
                  <p
                    className={`text-[10px] capitalize ${ENTITY_ICONS[entity.kind] ?? 'text-text-secondary'}`}
                  >
                    {entity.kind === 'dag' ? 'DAGs' : `${entity.kind}s`}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Test coverage card */}
      {analysisResult?.testStats && (
        <motion.div
          custom={statCards.length + 3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="mt-6"
        >
          <h3 className="mb-3 text-xs font-semibold text-text-primary">Test Coverage</h3>
          <TestCoverageCard stats={analysisResult.testStats} />
        </motion.div>
      )}
    </div>
  )
}
