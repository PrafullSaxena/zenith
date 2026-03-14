/**
 * TestCoverageCard -- Shows test file coverage with an animated SVG progress ring.
 * Displays test count, framework badges, file coverage %, and uncovered files.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, TestTube } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import type { TestStats } from '../../../types/cortex'

interface TestCoverageCardProps {
  stats: TestStats
}

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getRingColorClass(pct: number): string {
  if (pct >= 70) return 'stroke-teal-400'
  if (pct >= 40) return 'stroke-amber-400'
  return 'stroke-rose-400'
}

function getTextColorClass(pct: number): string {
  if (pct >= 70) return 'text-teal-400'
  if (pct >= 40) return 'text-amber-400'
  return 'text-rose-400'
}

export default function TestCoverageCard({ stats }: TestCoverageCardProps): React.JSX.Element {
  const navigateToFile = useCortexStore((s) => s.navigateToFile)
  const [uncoveredExpanded, setUncoveredExpanded] = useState(false)

  const { testCount, frameworks, filesUncovered, fileCoveragePercent } = stats
  const pct = Math.round(fileCoveragePercent)
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
  const ringColor = getRingColorClass(pct)
  const textColor = getTextColorClass(pct)

  const visibleUncovered = filesUncovered.slice(0, 10)

  return (
    <div className="rounded-xl border border-border/60 bg-surface-elevated/70 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <TestTube size={14} className="text-text-secondary" />
        <span className="text-xs font-semibold text-text-primary">Test Coverage</span>
      </div>

      <div className="flex items-start gap-6">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <div
            title="Percentage of source files that have a corresponding test file. Not execution-based coverage."
            className="cursor-default"
          >
            <svg width="100" height="100" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-border/30"
              />
              {/* Animated progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className={ringColor}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                style={{ strokeDasharray: CIRCUMFERENCE }}
              />
            </svg>
          </div>
          {/* Centered percentage label (counter-rotate to fix -rotate-90 parent) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold leading-none ${textColor}`}>{pct}%</span>
            <span className="mt-0.5 text-[9px] text-text-secondary">files</span>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Test count */}
          <div>
            <p className="text-2xl font-bold text-text-primary">{testCount.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wide text-text-secondary">Test Cases</p>
          </div>

          {/* Framework badges */}
          {frameworks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map((fw) => (
                <span
                  key={fw}
                  className="rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                >
                  {fw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Uncovered files section */}
      {visibleUncovered.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setUncoveredExpanded((v) => !v)}
          >
            <span className="text-[10px] uppercase tracking-wide text-text-secondary">
              Files without tests ({filesUncovered.length})
            </span>
            {uncoveredExpanded ? (
              <ChevronUp size={12} className="text-text-secondary" />
            ) : (
              <ChevronDown size={12} className="text-text-secondary" />
            )}
          </button>

          {uncoveredExpanded && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-1 overflow-hidden"
            >
              {visibleUncovered.map((filePath) => (
                <li key={filePath}>
                  <button
                    className="w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                    onClick={() => navigateToFile(filePath)}
                    title={filePath}
                  >
                    {filePath}
                  </button>
                </li>
              ))}
              {filesUncovered.length > 10 && (
                <li className="px-1 py-0.5 text-[10px] text-text-secondary/60">
                  +{filesUncovered.length - 10} more
                </li>
              )}
            </motion.ul>
          )}
        </div>
      )}
    </div>
  )
}
