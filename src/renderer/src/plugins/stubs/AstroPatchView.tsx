import { Wrench, Construction } from 'lucide-react'

export default function AstroPatchView(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/[0.06]">
          <Wrench size={28} className="text-accent/40" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">AstroPatch</h2>
        <p className="mt-1 text-sm text-text-secondary">AI-powered patch generation</p>
        <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-surface-elevated px-4 py-1.5">
          <Construction size={14} className="text-amber-400" />
          <span className="text-xs font-medium text-text-secondary">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
