/**
 * AnalysisProgress -- Progress indicator shown during repo analysis.
 * Displays phase label, animated progress bar, and detail text.
 */
import { motion } from 'framer-motion'
import type { AnalysisProgress as AnalysisProgressType } from '../../../types/cortex'
import { Card } from '@renderer/components/ui/card'

interface Props {
  progress: AnalysisProgressType
}

const PHASE_LABELS: Record<AnalysisProgressType['phase'], string> = {
  cloning: 'Cloning',
  scanning: 'Scanning',
  parsing: 'Parsing',
  indexing: 'Indexing',
  documenting: 'Documenting',
  done: 'Complete'
}

const PHASE_BAR_COLORS: Record<AnalysisProgressType['phase'], string> = {
  cloning: 'bg-blue-400',
  scanning: 'bg-primary',
  parsing: 'bg-warning',
  indexing: 'bg-cyan-400',
  documenting: 'bg-purple-400',
  done: 'bg-success'
}

export default function AnalysisProgress({ progress }: Props): React.JSX.Element {
  const label = PHASE_LABELS[progress.phase] ?? progress.phase
  const barColor = PHASE_BAR_COLORS[progress.phase] ?? 'bg-primary'

  return (
    <Card className="flex flex-col gap-1.5 rounded-xl p-2.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{Math.round(progress.progress)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-card">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          animate={{ width: `${progress.progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      {progress.detail && (
        <span className="text-[10px] text-muted-foreground">{progress.detail}</span>
      )}
    </Card>
  )
}
