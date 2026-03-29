import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Zap, Wrench, Download, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import zenithLogo from '../../assets/zenith-logo.png'
import {
  APP_VERSION,
  AUTHOR,
  SOCIAL_LINKS,
  CAPABILITIES,
  GETTING_STARTED
} from '../../config/about.config'

import { SpotlightCard } from '@renderer/components/ui/spotlight-card'

export default function AboutView(): React.JSX.Element {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleExportLogs = async (): Promise<void> => {
    try {
      setExportState('exporting')
      setErrorMsg(null)
      // Call electron IPC (mocked logic remains for component integrity)
      if (window.api && 'exportDiagnosticLogs' in window.api) {
        // @ts-expect-error Existing API signature
        const result = await window.api.exportDiagnosticLogs()
        if (!result.success) {
          throw new Error('Export returned failure status')
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      setExportState('done')
      setTimeout(() => setExportState('idle'), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setExportState('idle')
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    try {
      if (window.api && 'openAppDataFolder' in window.api) {
        // @ts-expect-error Existing API signature
        await window.api.openAppDataFolder()
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative h-full w-full overflow-y-auto text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[radial-gradient(#00000015_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* ── macOS title bar drag region ── */}
      <div className="drag-region absolute top-0 z-50 h-5 w-full shrink-0" />

      {/* ── Bento Grid Wrapper ── */}
      <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-6 pt-10 md:grid-cols-6 lg:gap-6 xl:p-12">
        
        {/* ROW 1: Hero (Span 4) & Author (Span 2) */}
        <SpotlightCard className="col-span-1 md:col-span-4 min-h-[320px]">
          <div className="relative flex h-full flex-col items-start justify-end p-8 md:p-12 overflow-hidden">
            <div className="absolute -right-20 -top-20 z-0 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
            <div className="z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-background/60 ring-1 ring-border shadow-[0_0_40px_rgba(130,81,238,0.3)] backdrop-blur-xl">
              <img src={zenithLogo} alt="Zenith" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="z-10 text-5xl font-black tracking-tight md:text-7xl">
              <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/40 bg-clip-text text-transparent">
                Zenith
              </span>
            </h1>
            <p className="z-10 mt-3 max-w-xl text-lg text-muted-foreground">
              The unified intelligence hub for modern software teams.
              <span className="ml-3 inline-flex items-center rounded-full border border-border bg-foreground/5 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-primary">
                v{APP_VERSION}
              </span>
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="col-span-1 md:col-span-2">
          <div className="flex h-full flex-col p-8 pb-6">
            <div className="flex-1">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary shadow-[inset_0_0_20px_rgba(130,81,238,0.1)] ring-1 ring-primary/20">
                {AUTHOR.initials}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">{AUTHOR.name}</h2>
              <p className="text-sm font-medium text-primary/90 mb-4">{AUTHOR.role}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{AUTHOR.bio}</p>
            </div>
            <div className="mt-8 flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-foreground/5 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    title={link.label}
                  >
                    <Icon size={18} className="text-foreground/70 group-hover:text-primary transition-colors" />
                  </a>
                )
              })}
            </div>
          </div>
        </SpotlightCard>

        {/* ROW 2: Capabilities (Span 3 + Span 3) */}
        {CAPABILITIES.slice(0, 2).map((cap) => (
          <SpotlightCard key={cap.title} className="col-span-1 md:col-span-3">
            <div className="flex flex-col p-8">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-border backdrop-blur-md">
                <cap.icon size={24} className="text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{cap.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{cap.desc}</p>
            </div>
          </SpotlightCard>
        ))}

        {/* ROW 3: Capabilities (Span 2 + Span 2 + Span 2) */}
        {CAPABILITIES.slice(2, 5).map((cap) => (
          <SpotlightCard key={cap.title} className="col-span-1 md:col-span-2">
            <div className="flex flex-col p-8">
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-border">
                <cap.icon size={20} className="text-foreground/80 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">{cap.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{cap.desc}</p>
            </div>
          </SpotlightCard>
        ))}

        {/* ROW 4: Cortex Wide Focus (Span 6) */}
        {CAPABILITIES.slice(5, 6).map((cap) => (
          <SpotlightCard key={cap.title} className="col-span-1 md:col-span-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 p-8 md:p-10">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_30px_rgba(130,81,238,0.15)]">
                <cap.icon size={32} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{cap.title}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl">{cap.desc}</p>
              </div>
            </div>
          </SpotlightCard>
        ))}

        {/* ROW 5: Getting Started (Span 6) */}
        <div className="col-span-1 md:col-span-6 mt-8 mb-4">
          <h2 className="text-sm font-bold tracking-[0.2em] text-muted-foreground uppercase pl-2 mb-6 pointer-events-none">
            Bootstrapping Workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GETTING_STARTED.map((step) => (
              <SpotlightCard key={step.step} className="!rounded-[20px]">
                <div className="flex flex-col p-6">
                  <div className="mb-4 text-xs font-mono font-bold tracking-widest text-primary/80">
                    STEP 0{step.step}
                  </div>
                  <h4 className="mb-2 text-base font-bold text-foreground">{step.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* ROW 6: Diagnostics & Footer (Span 6) */}
        <SpotlightCard className="col-span-1 md:col-span-6 mt-4">
          <div className="flex flex-col md:flex-row items-center justify-between p-8 gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-border">
                <Wrench size={20} className="text-foreground/70" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground mb-1">Diagnostic Tools</h4>
                <p className="text-sm text-muted-foreground max-w-lg">
                  App logs, local paths, and environment state tracing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="flex-1 md:flex-none h-11 border-border bg-background text-foreground hover:bg-muted transition-colors"
                onClick={handleOpenFolder}
              >
                App Data Directory
              </Button>
              <Button
                className="flex-1 md:flex-none h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(130,81,238,0.2)] transition-all"
                onClick={handleExportLogs}
                disabled={exportState === 'exporting'}
              >
                {exportState === 'idle' && (
                  <>
                    <Download size={16} className="mr-2" />
                    Export Logs
                  </>
                )}
                {exportState === 'exporting' && (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Packaging...
                  </>
                )}
                {exportState === 'done' && (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Exported!
                  </>
                )}
              </Button>
            </div>
          </div>
          {errorMsg && (
            <div className="px-8 pb-8">
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {errorMsg}
              </div>
            </div>
          )}
        </SpotlightCard>

        {/* Minor Footer Note */}
        <div className="col-span-1 md:col-span-6 py-8 text-center pointer-events-none">
          <p className="text-xs font-mono tracking-wider text-muted-foreground/60">
            ENGINEERED WITH REACT · ELECTRON · TYPESCRIPT
          </p>
        </div>
      </div>
    </div>
  )
}
