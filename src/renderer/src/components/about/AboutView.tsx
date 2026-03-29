/**
 * About view — Application info, author details, and getting started guide.
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  ExternalLink,
  Zap,
  Wrench,
  BookOpen,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import zenithLogo from '../../assets/zenith-logo.png'
import { APP_VERSION, AUTHOR, SOCIAL_LINKS, CAPABILITIES, GETTING_STARTED } from '../../config/about.config'



export default function AboutView(): React.JSX.Element {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle')

  const handleOpenExternal = (url: string): void => {
    window.api.app.openExternal(url)
  }

  const handleExportLogs = async (): Promise<void> => {
    setExportState('exporting')
    try {
      const { filePath } = await window.api.app.exportDiagnosticLogs()
      if (filePath) {
        setExportState('done')
        setTimeout(() => setExportState('idle'), 3000)
      } else {
        setExportState('idle') // user cancelled save dialog
      }
    } catch {
      setExportState('idle')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="mx-auto max-w-3xl space-y-8 p-6 pt-0">
        {/* Drag region for macOS title bar dragging */}
        <div className="drag-region h-4 w-full shrink-0" />
      {/* ── App Header ── */}
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/10 p-8 text-center backdrop-blur-md">
        {/* Glowing Orb */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        
        <img
          src={zenithLogo}
          alt="Zenith"
          className="relative mx-auto mb-4 h-20 w-20 shadow-lg shadow-accent/20 transition-transform duration-200 hover:scale-105"
        />
        <h1 className="relative text-2xl font-bold text-foreground">Zenith</h1>
        <p className="relative mt-1 text-sm text-muted-foreground">
          Your AI-powered development toolkit
        </p>
        <span className="relative mt-3 inline-block rounded-full border border-white/5 bg-black/30 px-3 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
          v{APP_VERSION}
        </span>
      </div>

      {/* ── Capabilities ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Zap size={14} className="text-primary" />
          Capabilities
        </h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <motion.div key={cap.title} variants={staggerItem}>
                <motion.div
                  className="group flex h-full flex-col rounded-xl border border-white/5 bg-black/20 p-4 transition-colors duration-200 hover:border-white/10 backdrop-blur-md"
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {cap.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                    {cap.desc}
                  </p>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ── About Author ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <User size={14} className="text-primary" />
          About the Author
        </h2>
        <div className="rounded-xl border border-white/5 bg-black/20 p-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]">
              {AUTHOR.initials}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {AUTHOR.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {AUTHOR.role}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {AUTHOR.bio}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Button
                  key={link.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenExternal(link.url)}
                  className="hover:bg-white/5 font-medium"
                >
                  <Icon size={13} />
                  {link.label}
                  <ExternalLink size={9} className="opacity-40" />
                </Button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Getting Started — Glass Timeline ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <BookOpen size={14} className="text-primary" />
          Getting Started
        </h2>
        <div className="relative rounded-xl border border-white/5 bg-black/20 p-5 px-6 backdrop-blur-md">
          {/* Vertical continuous track line */}
          <div className="absolute left-[33px] top-8 bottom-8 w-px bg-white/10" />
          
          <div className="relative space-y-6">
            {GETTING_STARTED.map((item) => (
              <div key={item.step} className="group flex gap-4">
                {/* Numbered step indicator glowing node */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-transform group-hover:scale-110">
                  {item.step}
                </div>
                
                <div className="min-w-0 pt-0.5">
                  <h4 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground opacity-90">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diagnostics ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Wrench size={14} className="text-primary" />
          Diagnostics
        </h2>
        <div className="rounded-xl border border-white/5 bg-black/20 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Export Diagnostic Logs
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Download a ZIP with app logs, system info, and settings (credentials redacted) for troubleshooting.
              </p>
            </div>
            <Button
              onClick={handleExportLogs}
              disabled={exportState !== 'idle'}
              size="sm"
              variant="outline"
              className="bg-black/30 hover:bg-white/5"
            >
              {exportState === 'exporting' && (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Exporting...
                </>
              )}
              {exportState === 'done' && (
                <>
                  <CheckCircle size={14} className="mr-2 text-primary" />
                  Saved!
                </>
              )}
              {exportState === 'idle' && (
                <>
                  <Download size={14} className="mr-2" />
                  Download Logs
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-[11px] text-muted-foreground/70">
          Built with Electron · React · TypeScript · Tailwind CSS
        </p>
      </div>
      </div>
    </div>
  )
}
