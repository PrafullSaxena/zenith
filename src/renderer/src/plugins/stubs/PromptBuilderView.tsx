import { MessageSquare } from 'lucide-react'

export default function PromptBuilderView(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="stagger-children flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="animate-status-pulse absolute -inset-4 rounded-full bg-accent/[0.04] blur-2xl" />
          <div className="animate-fade-in-up relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/[0.08]">
            <MessageSquare size={28} className="text-accent/60" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">PromptBuilder</h2>
        <p className="mt-1 text-sm text-text-secondary/70">Prompt template management</p>
        <div className="hover-lift mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-warning-muted px-4 py-1.5">
          <span className="text-xs font-medium text-warning">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
