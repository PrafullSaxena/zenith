/**
 * TaskGroomerSettings — Custom settings panel for the Task Groomer plugin.
 *
 * Three sections:
 *   1. AI Agent — which configured provider to use for grooming
 *   2. Grooming Schedule — schedule enable/time/frequency settings
 *   3. Integrations — Jira, Confluence, and Web Search cards
 */
import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Bot, Ticket, FileText, Globe } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useSettingsStore } from '../../stores/settings-store'
import { useAgentStore } from '../../stores/agent-store'

// ── Types ──────────────────────────────────────────────────────────────

interface JiraStatus {
  configured: boolean
  baseUrl: string | null
  email: string | null
  apiTokenMasked: string | null
  projects: string | null
}

interface ConfluenceStatus {
  configured: boolean
  baseUrl: string | null
  email: string | null
  apiTokenMasked: string | null
}

// ── Status dot ─────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }): React.JSX.Element {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full mr-1.5 ${active ? 'bg-green-500' : 'bg-gray-500'}`}
    />
  )
}

// ── Help tooltip ────────────────────────────────────────────────────────

function HelpTooltip({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 text-[9px] text-muted-foreground/60 hover:border-white/40 hover:text-muted-foreground transition focus:outline-none"
        aria-label="Help"
      >
        ?
      </button>
      {visible && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-64 rounded-lg border border-white/10 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="text-[11px] leading-relaxed text-muted-foreground space-y-1.5">
            {children}
          </div>
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-l border-t border-white/10 bg-zinc-900/95" />
        </div>
      )}
    </span>
  )
}

// ── Integration Health Dashboard ────────────────────────────────────────

function IntegrationHealthDashboard({
  aiConfigured,
  jiraConfigured,
  confluenceConfigured,
  webSearchConfigured
}: {
  aiConfigured: boolean
  jiraConfigured: boolean
  confluenceConfigured: boolean
  webSearchConfigured: boolean
}): React.JSX.Element {
  const services = [
    { icon: Bot, label: 'AI Agent', configured: aiConfigured, color: 'text-primary' },
    { icon: Ticket, label: 'Jira', configured: jiraConfigured, color: 'text-blue-400' },
    {
      icon: FileText,
      label: 'Confluence',
      configured: confluenceConfigured,
      color: 'text-blue-300'
    },
    { icon: Globe, label: 'Web Search', configured: webSearchConfigured, color: 'text-green-400' }
  ]
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.04] p-4">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
        Integration Status
      </p>
      <div className="flex items-center gap-3">
        {services.map(({ icon: Icon, label, configured, color }) => (
          <div
            key={label}
            title={label}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border',
              configured
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-white/6 bg-white/[0.02] opacity-30 grayscale'
            )}
            aria-label={`${label}: ${configured ? 'configured' : 'not configured'}`}
          >
            <Icon size={18} className={configured ? color : 'text-muted-foreground'} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────

export default function TaskGroomerSettings(): React.JSX.Element {
  const { getSetting, setSetting } = useSettingsStore()
  const { providers, loadProviders } = useAgentStore()

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  // ── Jira state ────────────────────────────────────────────────────────
  const [jiraStatus, setJiraStatus] = useState<JiraStatus>({
    configured: false,
    baseUrl: null,
    email: null,
    apiTokenMasked: null,
    projects: null
  })
  const [jiraEditing, setJiraEditing] = useState(false)
  const [jiraForm, setJiraForm] = useState({ baseUrl: '', email: '', apiToken: '', projects: '' })
  const [jiraTestResult, setJiraTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [jiraConfirmClear, setJiraConfirmClear] = useState(false)
  const [jiraSaving, setJiraSaving] = useState(false)
  const [jiraTesting, setJiraTesting] = useState(false)

  // ── Confluence state ───────────────────────────────────────────────────
  const [confluenceStatus, setConfluenceStatus] = useState<ConfluenceStatus>({
    configured: false,
    baseUrl: null,
    email: null,
    apiTokenMasked: null
  })
  const [confluenceEditing, setConfluenceEditing] = useState(false)
  const [confluenceForm, setConfluenceForm] = useState({ baseUrl: '', email: '', apiToken: '' })
  const [confluenceTestResult, setConfluenceTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [confluenceConfirmClear, setConfluenceConfirmClear] = useState(false)
  const [confluenceSaving, setConfluenceSaving] = useState(false)
  const [confluenceTesting, setConfluenceTesting] = useState(false)

  // ── Grooming agent selection ───────────────────────────────────────────
  const groomingProvider = (getSetting('plugins.task-groomer.groomingProvider') as string) ?? ''
  const availableProviders = providers.filter((p) => p.status === 'connected' || p.hasApiKey)

  // ── Schedule settings (from settings store) ───────────────────────────
  const scheduleEnabled = (getSetting('plugins.task-groomer.schedule.enabled') as boolean) ?? false
  const scheduleTime = (getSetting('plugins.task-groomer.schedule.time') as string) ?? '09:00'
  const scheduleFrequency =
    (getSetting('plugins.task-groomer.schedule.frequency') as string) ?? 'daily'

  // ── Data fetching ──────────────────────────────────────────────────────

  const refreshJiraStatus = useCallback(async () => {
    try {
      const status = await window.api.integrations.jira.getStatus()
      setJiraStatus(status)
    } catch (err) {
      console.error('[TaskGroomerSettings] Failed to fetch Jira status:', err)
    }
  }, [])

  const refreshConfluenceStatus = useCallback(async () => {
    try {
      const status = await window.api.integrations.confluence.getStatus()
      setConfluenceStatus(status)
    } catch (err) {
      console.error('[TaskGroomerSettings] Failed to fetch Confluence status:', err)
    }
  }, [])

  useEffect(() => {
    refreshJiraStatus()
    refreshConfluenceStatus()
  }, [refreshJiraStatus, refreshConfluenceStatus])

  // ── Jira handlers ──────────────────────────────────────────────────────

  const handleJiraSave = async (): Promise<void> => {
    if (!jiraForm.baseUrl.trim() || !jiraForm.email.trim() || !jiraForm.apiToken.trim()) {
      toast.error('Base URL, Email, and API Token are required')
      return
    }
    setJiraSaving(true)
    try {
      await window.api.integrations.jira.saveCredentials({
        baseUrl: jiraForm.baseUrl.trim(),
        email: jiraForm.email.trim(),
        apiToken: jiraForm.apiToken.trim(),
        projects: jiraForm.projects.trim()
      })
      toast.success('Jira credentials saved')
      setJiraEditing(false)
      setJiraForm({ baseUrl: '', email: '', apiToken: '', projects: '' })
      await refreshJiraStatus()
    } catch (err) {
      toast.error('Failed to save Jira credentials')
    } finally {
      setJiraSaving(false)
    }
  }

  const handleJiraTest = async (): Promise<void> => {
    setJiraTesting(true)
    setJiraTestResult(null)
    try {
      const result = await window.api.integrations.jira.testConnection()
      setJiraTestResult({
        success: result.success,
        message: result.success ? 'Connection successful' : `Failed: ${result.error}`
      })
      setTimeout(() => setJiraTestResult(null), 3000)
    } catch {
      setJiraTestResult({ success: false, message: 'Connection test failed' })
      setTimeout(() => setJiraTestResult(null), 3000)
    } finally {
      setJiraTesting(false)
    }
  }

  const handleJiraClear = async (): Promise<void> => {
    try {
      await window.api.integrations.jira.clearCredentials()
      toast.success('Jira credentials cleared')
      setJiraConfirmClear(false)
      await refreshJiraStatus()
    } catch {
      toast.error('Failed to clear Jira credentials')
    }
  }

  // ── Confluence handlers ────────────────────────────────────────────────

  const handleConfluenceSave = async (): Promise<void> => {
    if (
      !confluenceForm.baseUrl.trim() ||
      !confluenceForm.email.trim() ||
      !confluenceForm.apiToken.trim()
    ) {
      toast.error('Base URL, Email, and API Token are required')
      return
    }
    setConfluenceSaving(true)
    try {
      await window.api.integrations.confluence.saveCredentials({
        baseUrl: confluenceForm.baseUrl.trim(),
        email: confluenceForm.email.trim(),
        apiToken: confluenceForm.apiToken.trim()
      })
      toast.success('Confluence credentials saved')
      setConfluenceEditing(false)
      setConfluenceForm({ baseUrl: '', email: '', apiToken: '' })
      await refreshConfluenceStatus()
    } catch {
      toast.error('Failed to save Confluence credentials')
    } finally {
      setConfluenceSaving(false)
    }
  }

  const handleConfluenceTest = async (): Promise<void> => {
    setConfluenceTesting(true)
    setConfluenceTestResult(null)
    try {
      const result = await window.api.integrations.confluence.testConnection()
      setConfluenceTestResult({
        success: result.success,
        message: result.success ? 'Connection successful' : `Failed: ${result.error}`
      })
      setTimeout(() => setConfluenceTestResult(null), 3000)
    } catch {
      setConfluenceTestResult({ success: false, message: 'Connection test failed' })
      setTimeout(() => setConfluenceTestResult(null), 3000)
    } finally {
      setConfluenceTesting(false)
    }
  }

  const handleConfluenceClear = async (): Promise<void> => {
    try {
      await window.api.integrations.confluence.clearCredentials()
      toast.success('Confluence credentials cleared')
      setConfluenceConfirmClear(false)
      await refreshConfluenceStatus()
    } catch {
      toast.error('Failed to clear Confluence credentials')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-foreground tracking-tight">InTake</h2>
      <p className="mb-6 text-xs text-muted-foreground">
        AI-powered task grooming with Jira, Confluence, and web search integrations
      </p>

      <div className="space-y-6">
        {/* ── Integration Health Dashboard ──────────────────────────── */}
        <IntegrationHealthDashboard
          aiConfigured={availableProviders.length > 0}
          jiraConfigured={jiraStatus.configured}
          confluenceConfigured={confluenceStatus.configured}
          webSearchConfigured={true}
        />

        {/* ── Section 0: AI Agent ───────────────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-1">AI Agent</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Which configured AI agent to use for grooming tasks. Configure agents in{' '}
            <span className="text-primary/80">Settings → AI Agents</span>.
          </p>

          {availableProviders.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[12px] text-muted-foreground">
              No AI agents configured. Go to{' '}
              <span className="text-primary/80">Settings → AI Agents</span> to set one up.
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[12px] text-muted-foreground">
                Grooming agent
              </label>
              <select
                value={groomingProvider}
                onChange={(e) =>
                  setSetting('plugins.task-groomer.groomingProvider', e.target.value)
                }
                className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">Auto (first available)</option>
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.type === 'cli' ? ' (CLI)' : p.requiresApiKey ? ' (SDK)' : ' (Local)'}
                  </option>
                ))}
              </select>
              {groomingProvider && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                  {availableProviders.find((p) => p.id === groomingProvider)?.command
                    ? `Command: ${availableProviders.find((p) => p.id === groomingProvider)?.command}`
                    : 'SDK provider — uses API key from credentials store'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Section 1: Grooming Schedule ─────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Grooming Schedule</h3>

          <div className="space-y-3">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-muted-foreground">Auto-grooming enabled</label>
              <button
                onClick={() =>
                  setSetting('plugins.task-groomer.schedule.enabled', !scheduleEnabled)
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  scheduleEnabled ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Schedule time */}
            <div>
              <label className="mb-1.5 block text-[12px] text-muted-foreground">
                Schedule time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setSetting('plugins.task-groomer.schedule.time', e.target.value)}
                disabled={!scheduleEnabled}
                className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary disabled:opacity-40"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="mb-1.5 block text-[12px] text-muted-foreground">Frequency</label>
              <select
                value={scheduleFrequency}
                onChange={(e) =>
                  setSetting('plugins.task-groomer.schedule.frequency', e.target.value)
                }
                disabled={!scheduleEnabled}
                className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground focus:outline-none focus:border-primary disabled:opacity-40 appearance-none"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays only</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Section 2: Integrations ──────────────────────────────── */}
        <div className="rounded-xl border border-white/6 bg-white/[0.04] p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Integrations</h3>

          <div className="space-y-4">
            {/* ── Jira card ── */}
            <div className="rounded-lg border border-white/6 bg-white/[0.03] p-4">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <StatusDot active={jiraStatus.configured} />
                  <span className="text-[12px] font-medium text-foreground">Jira</span>
                  <HelpTooltip>
                    <p className="font-medium text-foreground/80 mb-1">API token setup</p>
                    <p>
                      Generate at{' '}
                      <span className="text-foreground/70">
                        id.atlassian.com → Security → API tokens
                      </span>
                      . Classic tokens have{' '}
                      <span className="text-foreground/70">no scope selector</span> — the token
                      inherits your account&apos;s existing project permissions.
                    </p>
                    <p className="pt-1.5 border-t border-white/8 font-medium text-foreground/70">
                      Your account needs:
                    </p>
                    <p>
                      <span className="text-foreground/60">Search &amp; read issues →</span> Browse
                      Projects on configured project(s)
                    </p>
                    <p>
                      <span className="text-foreground/60">Push issues (future) →</span> Create
                      Issues
                    </p>
                    <p className="text-muted-foreground/50 pt-0.5">
                      A read-only account is enough for grooming.
                    </p>
                  </HelpTooltip>
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {jiraStatus.configured ? 'Connected' : 'Not connected'}
                  </span>
                </div>

                {!jiraEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setJiraEditing(true)
                        setJiraForm({
                          baseUrl: jiraStatus.baseUrl ?? '',
                          email: jiraStatus.email ?? '',
                          apiToken: '',
                          projects: jiraStatus.projects ?? ''
                        })
                      }}
                      className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                    >
                      Edit
                    </button>
                    {jiraStatus.configured && (
                      <>
                        <button
                          onClick={handleJiraTest}
                          disabled={jiraTesting}
                          className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4 disabled:opacity-50"
                        >
                          {jiraTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        {jiraConfirmClear ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">Confirm?</span>
                            <button
                              onClick={handleJiraClear}
                              className="rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[11px] text-red-400 transition hover:bg-red-500/30"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setJiraConfirmClear(false)}
                              className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setJiraConfirmClear(true)}
                            className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-red-400 hover:bg-red-500/10"
                          >
                            Clear
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Test result inline */}
              {jiraTestResult && (
                <p
                  className={`mb-2 text-[11px] ${jiraTestResult.success ? 'text-green-400' : 'text-red-400'}`}
                >
                  {jiraTestResult.message}
                </p>
              )}

              {/* Configured view */}
              {!jiraEditing && jiraStatus.configured && (
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div>
                    <span className="text-muted-foreground/60">Base URL: </span>
                    {jiraStatus.baseUrl}
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">Email: </span>
                    {jiraStatus.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">API Token: </span>
                    {jiraStatus.apiTokenMasked}
                  </div>
                  {jiraStatus.projects && (
                    <div>
                      <span className="text-muted-foreground/60">Projects: </span>
                      {jiraStatus.projects}
                    </div>
                  )}
                </div>
              )}

              {/* Edit form */}
              {jiraEditing && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Base URL</label>
                    <input
                      type="url"
                      value={jiraForm.baseUrl}
                      onChange={(e) => setJiraForm((f) => ({ ...f, baseUrl: e.target.value }))}
                      placeholder="https://company.atlassian.net"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={jiraForm.email}
                      onChange={(e) => setJiraForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      API Token
                    </label>
                    <input
                      type="password"
                      value={jiraForm.apiToken}
                      onChange={(e) => setJiraForm((f) => ({ ...f, apiToken: e.target.value }))}
                      placeholder="Atlassian API token"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      Project Keys
                    </label>
                    <input
                      type="text"
                      value={jiraForm.projects}
                      onChange={(e) => setJiraForm((f) => ({ ...f, projects: e.target.value }))}
                      placeholder="PROJ, ENG, ..."
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleJiraSave}
                      disabled={jiraSaving}
                      className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {jiraSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setJiraEditing(false)
                        setJiraForm({ baseUrl: '', email: '', apiToken: '', projects: '' })
                      }}
                      className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Confluence card ── */}
            <div className="rounded-lg border border-white/6 bg-white/[0.03] p-4">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <StatusDot active={confluenceStatus.configured} />
                  <span className="text-[12px] font-medium text-foreground">Confluence</span>
                  <HelpTooltip>
                    <p className="font-medium text-foreground/80 mb-1">API token setup</p>
                    <p>
                      Same classic API token as Jira (
                      <span className="text-foreground/70">
                        id.atlassian.com → Security → API tokens
                      </span>
                      ) if using the same Atlassian account.{' '}
                      <span className="text-foreground/70">No scope selector</span> — inherits your
                      account permissions.
                    </p>
                    <p className="pt-1.5 border-t border-white/8 font-medium text-foreground/70">
                      Your account needs:
                    </p>
                    <p>
                      <span className="text-foreground/60">Search &amp; read pages →</span> View
                      Pages on any space (set in Space Settings → Permissions)
                    </p>
                    <p className="text-muted-foreground/50 pt-0.5">
                      Zenith is read-only — no write permissions needed.
                    </p>
                  </HelpTooltip>
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {confluenceStatus.configured ? 'Connected' : 'Not connected'}
                  </span>
                </div>

                {!confluenceEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setConfluenceEditing(true)
                        setConfluenceForm({
                          baseUrl: confluenceStatus.baseUrl ?? '',
                          email: confluenceStatus.email ?? '',
                          apiToken: ''
                        })
                      }}
                      className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                    >
                      Edit
                    </button>
                    {confluenceStatus.configured && (
                      <>
                        <button
                          onClick={handleConfluenceTest}
                          disabled={confluenceTesting}
                          className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4 disabled:opacity-50"
                        >
                          {confluenceTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        {confluenceConfirmClear ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">Confirm?</span>
                            <button
                              onClick={handleConfluenceClear}
                              className="rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[11px] text-red-400 transition hover:bg-red-500/30"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfluenceConfirmClear(false)}
                              className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfluenceConfirmClear(true)}
                            className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-red-400 hover:bg-red-500/10"
                          >
                            Clear
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Test result inline */}
              {confluenceTestResult && (
                <p
                  className={`mb-2 text-[11px] ${confluenceTestResult.success ? 'text-green-400' : 'text-red-400'}`}
                >
                  {confluenceTestResult.message}
                </p>
              )}

              {/* Configured view */}
              {!confluenceEditing && confluenceStatus.configured && (
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div>
                    <span className="text-muted-foreground/60">Base URL: </span>
                    {confluenceStatus.baseUrl}
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">Email: </span>
                    {confluenceStatus.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">API Token: </span>
                    {confluenceStatus.apiTokenMasked}
                  </div>
                </div>
              )}

              {/* Edit form */}
              {confluenceEditing && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Base URL</label>
                    <input
                      type="url"
                      value={confluenceForm.baseUrl}
                      onChange={(e) =>
                        setConfluenceForm((f) => ({ ...f, baseUrl: e.target.value }))
                      }
                      placeholder="https://company.atlassian.net"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={confluenceForm.email}
                      onChange={(e) => setConfluenceForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      API Token
                    </label>
                    <input
                      type="password"
                      value={confluenceForm.apiToken}
                      onChange={(e) =>
                        setConfluenceForm((f) => ({ ...f, apiToken: e.target.value }))
                      }
                      placeholder="Atlassian API token"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleConfluenceSave}
                      disabled={confluenceSaving}
                      className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {confluenceSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setConfluenceEditing(false)
                        setConfluenceForm({ baseUrl: '', email: '', apiToken: '' })
                      }}
                      className="rounded-lg border border-white/8 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground hover:bg-white/4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Google/Web Search card ── */}
            <div className="rounded-lg border border-white/6 bg-white/[0.03] p-4">
              <div className="flex items-center mb-2">
                <StatusDot active={true} />
                <span className="text-[12px] font-medium text-foreground">Google / Web Search</span>
                <span className="ml-2 text-[11px] text-muted-foreground">Available</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                No credentials required. Uses Gemini CLI if installed, falls back to DuckDuckGo HTML
                scraping via built-in fetch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
