/**
 * ValidationPanel — Renders AI validation corrections as an accept/dismiss review queue.
 */
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import { Card } from '@renderer/components/ui/card'
import type { ValidationCorrection } from '../../../types/cortex'

const TYPE_LABELS: Record<ValidationCorrection['type'], { label: string; icon: typeof AlertTriangle; color: string }> = {
  missing_edge: { label: 'Missing Edge', icon: AlertTriangle, color: 'text-amber-400' },
  missing_route: { label: 'Missing Route', icon: AlertTriangle, color: 'text-amber-400' },
  kind_correction: { label: 'Kind Correction', icon: Info, color: 'text-blue-400' },
  route_correction: { label: 'Route Correction', icon: AlertTriangle, color: 'text-amber-400' },
  dead_route: { label: 'Dead Route', icon: AlertTriangle, color: 'text-red-400' }
}

export default function ValidationPanel(): React.JSX.Element | null {
  const validationResults = useCortexStore((s) => s.validationResults)
  const updateValidationStatus = useCortexStore((s) => s.updateValidationStatus)

  const pending = validationResults.filter((v) => v.status === 'pending')

  if (validationResults.length === 0) return null

  return (
    <Card className="border-t border-white/[0.06] rounded-none border-x-0 border-b-0">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-semibold text-foreground">AI Validation Results</h4>
          <span className="rounded-lg bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            {pending.length} pending
          </span>
        </div>
        {pending.length > 1 && (
          <button
            type="button"
            onClick={() => {
              for (const v of pending) {
                updateValidationStatus(v.id, 'accepted')
              }
            }}
            className="text-[10px] text-primary hover:underline"
          >
            Apply All
          </button>
        )}
      </div>

      <div className="max-h-60 overflow-y-auto bg-white/[0.01]">
        {validationResults.map((correction) => {
          const typeInfo = TYPE_LABELS[correction.type]
          const Icon = typeInfo.icon

          return (
            <div
              key={correction.id}
              className={`flex items-start gap-3 border-t border-white/[0.04] px-4 py-2.5 ${
                correction.status !== 'pending' ? 'opacity-50' : ''
              }`}
            >
              <Icon size={14} className={`mt-0.5 flex-shrink-0 ${typeInfo.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-foreground">
                  {typeInfo.label}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {correction.description}
                </p>
                <p className="mt-0.5 text-[10px] italic text-muted-foreground/70">
                  {correction.reason}
                </p>
              </div>
              {correction.status === 'pending' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateValidationStatus(correction.id, 'accepted')}
                    className="rounded-lg p-1 text-green-400 hover:bg-green-500/10"
                    title="Accept"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateValidationStatus(correction.id, 'dismissed')}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {correction.status === 'accepted' && (
                <span className="text-[10px] text-green-400">Applied</span>
              )}
              {correction.status === 'dismissed' && (
                <span className="text-[10px] text-muted-foreground">Dismissed</span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
