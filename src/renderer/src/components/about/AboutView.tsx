/**
 * About view — Application info, author details, and getting started guide.
 * Default-exported for React.lazy() compatibility in App.tsx.
 */
import {
  Sparkles,
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
  BookOpen
} from 'lucide-react'

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
  const handleOpenExternal = (url: string): void => {
    window.api.app.openExternal(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── App Header ── */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-violet-600 shadow-lg shadow-accent/20">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Zenith</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your AI-powered development toolkit
        </p>
        <span className="mt-2 inline-block rounded-full bg-surface-elevated px-3 py-0.5 text-[11px] font-medium text-text-secondary">
          v{APP_VERSION}
        </span>
      </div>

      {/* ── About Application ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          <Zap size={14} className="text-accent" />
          Capabilities
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <div
                key={cap.title}
                className="rounded-xl border border-border bg-surface-elevated/50 p-4 transition-colors hover:border-accent/30"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} className="shrink-0 text-accent" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {cap.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">
                  {cap.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── About Author ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          <User size={14} className="text-accent" />
          About the Author
        </h2>
        <div className="rounded-xl border border-border bg-gradient-to-br from-surface-elevated to-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
              PS
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                Prafull Saxena
              </h3>
              <p className="text-xs text-text-secondary">
                Software Engineer · Full-Stack Developer
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Building tools that make developers more productive. Zenith was created to
            bring AI-powered code review, database inspection, and query optimization
            into a single, cohesive desktop experience.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleOpenExternal(link.url)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
                >
                  <Icon size={13} />
                  {link.label}
                  <ExternalLink size={9} className="opacity-40" />
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Getting Started ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          <BookOpen size={14} className="text-accent" />
          Getting Started
        </h2>
        <div className="space-y-3">
          {GETTING_STARTED.map((item) => (
            <div
              key={item.step}
              className="flex gap-4 rounded-xl border border-border bg-surface-elevated/30 p-4"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {item.step}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  {item.title}
                </h4>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-[11px] text-text-secondary/50">
          Built with Electron · React · TypeScript · Tailwind CSS
        </p>
      </div>
    </div>
  )
}
