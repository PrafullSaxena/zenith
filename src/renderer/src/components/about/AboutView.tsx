/**
 * About view — Application info, author details, and getting started guide.
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Github,
  Linkedin,
  Twitter,
  ExternalLink,
  Database,
  GitPullRequest,
  Zap,
  MessageSquare,
  Wrench,
  Server,
  BookOpen,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import zenithLogo from '../../assets/zenith-logo.png'

const APP_VERSION = '1.0.0'

const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    url: 'https://github.com/prafullsaxena',
    icon: Github
  },
  {
    label: 'LinkedIn',
    url: 'https://linkedin.com/in/prafullsaxena',
    icon: Linkedin
  },
  {
    label: 'Twitter / X',
    url: 'https://x.com/prafullsaxena',
    icon: Twitter
  }
]

const CAPABILITIES = [
  {
    icon: GitPullRequest,
    title: 'AI Code Reviews',
    desc: 'Automated Bitbucket PR reviews with AI-generated inline comments and severity analysis'
  },
  {
    icon: Database,
    title: 'Database Inspector',
    desc: 'Connect to PostgreSQL databases, browse schemas, explore tables, columns, indexes, and foreign keys'
  },
  {
    icon: Zap,
    title: 'Query Optimizer',
    desc: 'EXPLAIN ANALYZE + AI insights, mermaid query flow, tradeoff analysis, and optimized SQL generation'
  },
  {
    icon: MessageSquare,
    title: 'AI-Powered Q&A',
    desc: 'Ask natural language questions about your database schema with follow-up conversation support'
  },
  {
    icon: Wrench,
    title: 'ER Diagrams',
    desc: 'Generate interactive entity-relationship diagrams with zoom, pan, code editing, and visual rendering'
  },
  {
    icon: Server,
    title: 'MCP Integration',
    desc: 'Configure Model Context Protocol servers for extended AI capabilities and tool orchestration'
  }
]

const GETTING_STARTED = [
  {
    step: 1,
    title: 'Configure an AI Agent',
    desc: 'Go to Settings → AI Agents. Ensure at least one provider (Claude, Gemini, Ollama, etc.) shows "Connected" status.'
  },
  {
    step: 2,
    title: 'Add a Database Connection',
    desc: 'Open DbInspector, click "Add Connection", enter your PostgreSQL credentials, and test the connection.'
  },
  {
    step: 3,
    title: 'Explore Your Schema',
    desc: 'Select a database and schema from the left panel. Browse tables, view columns, indexes, and foreign keys.'
  },
  {
    step: 4,
    title: 'Ask AI About Your Data',
    desc: 'Switch to the "Ask AI" tab and ask questions like "Which tables store user data?" or "Write a query to find inactive users".'
  },
  {
    step: 5,
    title: 'Optimize Queries',
    desc: 'Paste a slow SQL query in the "Query Optimizer" tab. AI will run EXPLAIN ANALYZE and suggest index, rewrite, and structural optimizations.'
  },
  {
    step: 6,
    title: 'Generate ER Diagrams',
    desc: 'Select tables in the "ER Diagram" tab and click Generate. Zoom, pan, and edit the Mermaid syntax for documentation.'
  }
]

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
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* ── App Header ── */}
      <Card className="text-center">
        <img
          src={zenithLogo}
          alt="Zenith"
          className="mx-auto mb-4 h-20 w-20 shadow-lg shadow-accent/20 transition-transform duration-200 hover:scale-105"
        />
        <h1 className="text-2xl font-bold text-foreground">Zenith</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI-powered development toolkit
        </p>
        <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
          v{APP_VERSION}
        </span>
      </Card>

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
                <Card interactive className="h-full">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon size={16} className="shrink-0 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {cap.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {cap.desc}
                  </p>
                </Card>
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
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              PS
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Prafull Saxena
              </h3>
              <p className="text-xs text-muted-foreground">
                Software Engineer · Full-Stack Developer
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Building tools that make developers more productive. Zenith was created to
            bring AI-powered code review, database inspection, and query optimization
            into a single, cohesive desktop experience.
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
                >
                  <Icon size={13} />
                  {link.label}
                  <ExternalLink size={9} className="opacity-40" />
                </Button>
              )
            })}
          </div>
        </Card>
      </section>

      {/* ── Getting Started — Glass Timeline ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <BookOpen size={14} className="text-primary" />
          Getting Started
        </h2>
        <div className="space-y-3">
          {GETTING_STARTED.map((item, index) => (
            <Card key={item.step} className="relative pl-10">
              {/* Numbered step indicator */}
              <div className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {item.step}
              </div>
              {/* Vertical connecting line between steps */}
              {index < GETTING_STARTED.length - 1 && (
                <div className="absolute left-[21px] top-9 bottom-0 w-px bg-border/40" />
              )}
              <h4 className="text-sm font-semibold text-foreground">
                {item.title}
              </h4>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Diagnostics ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Wrench size={14} className="text-primary" />
          Diagnostics
        </h2>
        <Card>
          <div className="flex items-center justify-between">
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
            >
              {exportState === 'exporting' && (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Exporting...
                </>
              )}
              {exportState === 'done' && (
                <>
                  <CheckCircle size={14} className="text-success" />
                  Saved!
                </>
              )}
              {exportState === 'idle' && (
                <>
                  <Download size={14} />
                  Download Logs
                </>
              )}
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-[11px] text-muted-foreground/70">
          Built with Electron · React · TypeScript · Tailwind CSS
        </p>
      </div>
    </div>
  )
}
