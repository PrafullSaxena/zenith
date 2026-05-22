/**
 * grooming-agent.ts — Core AI grooming agent for the Task Groomer plugin.
 *
 * Two-pass grooming design:
 *   Pass 1 — Source selection: AI decides which sources (jira/confluence/google) are needed.
 *             For simple/self-evident tasks, pass-1 also returns Summary + Next Steps,
 *             so no second AI call is required (no-sources optimization).
 *   Pass 2 — Summarization: Only runs when sources were queried. Receives task + source
 *             results, produces structured Summary + Next Steps output.
 *
 * Progress stages emitted via optional onStage callback:
 *   'analyzing'  — pass-1 AI call is running
 *   'querying'   — integration sources are being queried
 *   'summarizing'— pass-2 AI call is running
 *
 * This module runs ONLY in the main process.
 */

import { spawn } from 'child_process'
import { generateText } from 'ai'
import { createModel, getApiKeyForProvider } from '../ai/providers'
import { getShellEnv } from '../ai/cli-stream'
import { getSetting } from '../settings-store'
import {
  getIntegrationCredential,
  getIntegrationSetting,
  CRED_JIRA_BASE_URL,
  CRED_JIRA_EMAIL,
  CRED_JIRA_API_TOKEN,
  CRED_JIRA_PROJECTS,
  CRED_CONFLUENCE_BASE_URL,
  CRED_CONFLUENCE_EMAIL,
  CRED_CONFLUENCE_API_TOKEN
} from '../integrations/credentials'
import {
  searchJira,
  type JiraCredentials,
  type JiraSearchResponse
} from '../integrations/jira-client'
import {
  searchConfluence,
  type ConfluenceCredentials,
  type ConfluenceSearchResponse
} from '../integrations/confluence-client'
import { webSearch, type SearchResponse } from '../integrations/search-client'
import type { Task } from './database'

// ── Public types ───────────────────────────────────────────────────────────

export interface GroomingResult {
  priority: 'p1' | 'p2' | 'p3'
  priorityRationale: string // one sentence, e.g. "P1 — blocks auth release this week"
  suggestedAction: 'do' | 'delegate' | 'defer' | 'delete'
  shortTitle: string | null // AI-generated short title ≤8 words
  category: 'research' | 'bug' | 'chore' | null // detected task category
  summarySection: string | null // bullet-point summary (without Next Steps)
  nextStepsSection: string | null // bullet-point next steps
  summary: string | null // full combined text for backward compat
  nextSteps: string | null // always null — embedded inside summary string
  evidenceSummary: string | null // backward compat: same value as summary
  jiraTicketKey: string | null // only when AI is confident it's the same work item
  jiraTicketUrl: string | null
  researchSummary: string | null // kept as null for backward compat
  researchLinks: string | null // JSON: {title: string, url: string}[] — up to 5 links
  groomedAt: number // Date.now()
  sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[] // which sources were actually queried and returned results
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Races a promise against a timeout. Rejects with Error('timeout') after ms.
 * Each caller wraps in its own try/catch to return a skip sentinel.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** Skip sentinel for Jira when timeout/error occurs */
const JIRA_SKIP: JiraSearchResponse = { results: [], skipped: true, reason: 'error' }

/** Skip sentinel for Confluence when timeout/error occurs */
const CONFLUENCE_SKIP: ConfluenceSearchResponse = { results: [], skipped: true, reason: 'error' }

/** Skip sentinel for web search when timeout/error occurs */
const WEB_SKIP: SearchResponse = { results: [], skipped: true, reason: 'error', strategy: null }

// ── Credential builders ────────────────────────────────────────────────────

function buildJiraCredentials(): JiraCredentials | null {
  const baseUrl = getIntegrationCredential(CRED_JIRA_BASE_URL)
  const email = getIntegrationCredential(CRED_JIRA_EMAIL)
  const apiToken = getIntegrationCredential(CRED_JIRA_API_TOKEN)
  const projectsSetting = getIntegrationSetting(CRED_JIRA_PROJECTS)

  if (!baseUrl || !email || !apiToken) return null

  const projects = projectsSetting
    ? projectsSetting
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : []

  return { baseUrl, email, apiToken, projects }
}

function buildConfluenceCredentials(): ConfluenceCredentials | null {
  const baseUrl = getIntegrationCredential(CRED_CONFLUENCE_BASE_URL)
  const email = getIntegrationCredential(CRED_CONFLUENCE_EMAIL)
  const apiToken = getIntegrationCredential(CRED_CONFLUENCE_API_TOKEN)

  if (!baseUrl || !email || !apiToken) return null

  return { baseUrl, email, apiToken }
}

// ── Integration context builder ────────────────────────────────────────────

function buildIntegrationContext(
  jiraResult: JiraSearchResponse,
  confluenceResult: ConfluenceSearchResponse,
  webResult: SearchResponse
): string {
  const lines: string[] = []

  if (jiraResult.skipped === false && jiraResult.results.length > 0) {
    for (const issue of jiraResult.results.slice(0, 5)) {
      lines.push(`JIRA: ${issue.key} — ${issue.summary} [${issue.status}]`)
    }
  }

  if (confluenceResult.skipped === false && confluenceResult.results.length > 0) {
    for (const page of confluenceResult.results.slice(0, 3)) {
      lines.push(`CONFLUENCE: ${page.title} — ${page.bodyExcerpt}`)
    }
  }

  if (webResult.skipped === false && webResult.results.length > 0) {
    for (const result of webResult.results.slice(0, 5)) {
      lines.push(`WEB: ${result.title} — ${result.url}`)
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'No integration results found.'
}

// ── AI response shapes ─────────────────────────────────────────────────────

/** Pass-1 response when sources are needed */
interface Pass1WithSources {
  category: 'research' | 'bug' | 'chore'
  shortTitle: string
  sourcesNeeded: ('jira' | 'confluence' | 'google')[]
  skipReason: null
  summary: null
  nextSteps: null
}

/** Pass-1 response when no sources are needed (includes full assessment) */
interface Pass1NoSources {
  category: 'research' | 'bug' | 'chore'
  shortTitle: string
  sourcesNeeded: []
  skipReason: string | null
  priority: string
  priorityRationale: string
  suggestedAction: string
  summarySection: string
  nextStepsSection: string
  summary: null
  nextSteps: null
}

type Pass1Response = Pass1WithSources | Pass1NoSources

/** Pass-2 response (summarization after sources queried) */
interface Pass2Response {
  priority: string
  priorityRationale: string
  suggestedAction: string
  shortTitle: string
  summarySection: string
  nextStepsSection: string
  jiraTicketKey: string | null
  jiraTicketUrl: string | null
  isResearchMode: boolean
  researchLinks: Array<{ title: string; url: string }> | null
  summary: string
  nextSteps: null
}

// ── Validation helpers ────────────────────────────────────────────────────

const VALID_PRIORITIES = new Set(['p1', 'p2', 'p3'])
const VALID_ACTIONS = new Set(['do', 'delegate', 'defer', 'delete'])

function validatePriority(value: string): value is 'p1' | 'p2' | 'p3' {
  return VALID_PRIORITIES.has(value)
}

function validateAction(value: string): value is 'do' | 'delegate' | 'defer' | 'delete' {
  return VALID_ACTIONS.has(value)
}

// ── Provider resolution ────────────────────────────────────────────────────

/**
 * Resolve which provider to use for grooming.
 * Reads plugins.task-groomer.groomingProvider from settings, then looks up
 * the full provider config from agents.providers. Falls back to the first
 * connected/configured provider if no explicit selection is saved.
 */
function resolveGroomingProvider(): {
  providerId: string
  model: string
  command: string
  apiKey: Promise<string | undefined>
} | null {
  const savedProviderId = (getSetting('plugins.task-groomer.groomingProvider') as string) ?? ''
  const allProviders =
    (getSetting('agents.providers') as Array<{
      id: string
      name: string
      type: string
      model: string
      command: string
      baseUrl: string
      requiresApiKey: boolean
    }> | null) ?? []

  // Find the explicitly selected provider, or auto-select first connected one
  const provider = savedProviderId
    ? allProviders.find((p) => p.id === savedProviderId)
    : allProviders[0]

  if (!provider) return null

  return {
    providerId: provider.id,
    model: provider.model || 'claude-sonnet-4-6',
    command: provider.command || '',
    apiKey: provider.requiresApiKey ? getApiKeyForProvider(provider.id) : Promise.resolve(undefined)
  }
}

// ── CLI helper ────────────────────────────────────────────────────────────

/**
 * Returns a CLI-specific flag to disable tool use during grooming.
 * Each CLI has a different (or no) flag for this purpose:
 *   - Claude CLI: `--tools ""` disables all built-in tools (WebFetch, Exa, etc.)
 *   - Gemini CLI: no equivalent flag; rely on system-prompt instruction only
 *   - Others (codex, ollama, cursor-agent): no equivalent; rely on system prompt
 */
function getNoToolsFlag(command: string): string {
  const base = command.trim().split(/\s+/)[0].toLowerCase()
  // Claude CLI binary is "claude"; never add the flag if already present
  if ((base === 'claude' || base.endsWith('/claude')) && !command.includes('--tools')) {
    return '--tools ""'
  }
  return ''
}

/**
 * Call the AI via CLI spawn — pipes the full prompt to stdin, collects stdout,
 * extracts the first JSON object from the response.
 */
function groomWithCLI(prompt: string, command: string): Promise<string> {
  const toolFlag = getNoToolsFlag(command)
  const safeCommand = toolFlag ? `${command} ${toolFlag}` : command

  return new Promise((resolve, reject) => {
    const child = spawn(safeCommand, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: getShellEnv()
    })

    let stdout = ''
    let stderr = ''

    child.stdin.on('error', () => {
      /* suppress EPIPE */
    })
    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    const canContinue = child.stdin.write(prompt)
    if (!canContinue) {
      child.stdin.once('drain', () => child.stdin.end())
    } else {
      child.stdin.end()
    }

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`CLI grooming failed (exit ${code}): ${stderr.trim() || 'Unknown error'}`))
        return
      }
      // Extract JSON from output — CLI agents may wrap in markdown fences
      const jsonMatch = stdout.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        reject(new Error(`CLI returned no JSON. Output (first 200 chars): ${stdout.slice(0, 200)}`))
        return
      }
      resolve(jsonMatch[0])
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to start CLI for grooming: ${err.message}`))
    })
  })
}

// ── AI call helper ────────────────────────────────────────────────────────

/**
 * Calls the AI agent (SDK or CLI) with a system + user prompt and returns the raw text.
 */
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  opts: {
    useSDK: boolean
    useCLI: boolean
    providerId: string
    model: string
    apiKey: string | undefined
    command: string
    maxTokens: number
  }
): Promise<string> {
  if (opts.useSDK) {
    const sdkModel = createModel(opts.providerId, opts.model, opts.apiKey!)
    const { text } = await generateText({
      model: sdkModel,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: opts.maxTokens
    })
    return text
  } else {
    // CLI: combine system + user prompts into a single stdin payload
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`
    return groomWithCLI(combinedPrompt, opts.command)
  }
}

// ── Main exported function ─────────────────────────────────────────────────

/**
 * Groom a single task using a two-pass AI approach.
 *
 * Pass 1: AI decides which sources are needed. For simple tasks, returns
 *         summary + priority + action immediately (no pass-2).
 * Pass 2: Runs only when sources were queried. AI summarizes source results.
 *
 * The optional onStage callback emits progress stages for the UI:
 *   'analyzing'   — before pass-1 AI call
 *   'querying'    — before integration source queries
 *   'summarizing' — before pass-2 AI call
 *
 * Throws only on:
 * - Missing AI provider configuration
 * - AI API call failure
 * - Invalid/unparseable JSON response from AI
 *
 * Integration timeouts and missing credentials produce skip sentinels,
 * not errors — grooming always completes as long as the AI provider is reachable.
 */
export async function groomTask(
  task: Task,
  onStage?: (stage: 'analyzing' | 'querying' | 'summarizing') => void
): Promise<GroomingResult> {
  // Step 1: Resolve configured AI provider — fail fast if nothing is set up
  const providerConfig = resolveGroomingProvider()
  if (!providerConfig) {
    throw new Error(
      'No AI agent configured for grooming. Go to Settings → Task Groomer → AI Agent and select a provider.'
    )
  }

  const { providerId, model, command, apiKey: apiKeyPromise } = providerConfig
  const apiKey = await apiKeyPromise

  // SDK providers require an API key; CLI providers use the command directly
  const useSDK = !!apiKey
  const useCLI = !useSDK && !!command
  if (!useSDK && !useCLI) {
    throw new Error(
      `Provider "${providerId}" has no API key and no CLI command. Configure it in Settings → AI Agents.`
    )
  }

  const aiOpts = { useSDK, useCLI, providerId, model, apiKey, command, maxTokens: 512 }

  // ── Pass 1: Source selection ─────────────────────────────────────────────

  const pass1System = `You are a task groomer. Respond with JSON only. Do NOT use any tools, fetch any URLs, or access the internet. Analyse the task text and respond entirely from your training knowledge.`

  const pass1UserBase = `TASK: ${task.text}

Step 1 — Classify the task into exactly one category:
- "research": learning, reading, investigating a topic, writing docs, exploring options
- "bug": fixing a bug, crash, error, performance issue, regression investigation
- "chore": config change, version bump, admin task, meeting, planning, typo fix

Step 2 — Generate a short title (≤8 words, imperative, no filler words).

Step 3 — Select sources based on category:
- research → may use confluence (internal docs) and google (external research). Never jira.
- bug → may use jira (related tickets) and confluence (relevant docs). Never google.
- chore → ALWAYS sourcesNeeded=[]. Never query any source.

For the selected sources, only include ones that would actually have relevant content.

Step 4 — If sourcesNeeded is empty: produce the full assessment now (priority, action, summary, nextSteps).
         If sourcesNeeded is non-empty: a second pass will produce the assessment after querying sources.

Priority rules (only when sourcesNeeded=[]):
- p1: blocks something today, urgent, time-sensitive
- p2: important this week
- p3: low urgency, someday

4D rules (only when sourcesNeeded=[]):
- do: act yourself now
- delegate: hand off to someone else
- defer: do later
- delete: no longer needed

Respond with exactly this JSON (no other text):
{
  "category": "research" | "bug" | "chore",
  "shortTitle": "<≤8 word imperative title>",
  "sourcesNeeded": ["confluence", "google"] | ["jira", "confluence"] | [],
  "skipReason": "chore task / self-evident" | null,
  "priority": "p1" | "p2" | "p3" | null,
  "priorityRationale": "<one sentence>" | null,
  "suggestedAction": "do" | "delegate" | "defer" | "delete" | null,
  "summarySection": "- bullet1\\n- bullet2 (3-5 concise bullets about what was found)" | null,
  "nextStepsSection": "- step1\\n- step2 (3-5 concrete next actions)" | null,
  "summary": null,
  "nextSteps": null
}`

  onStage?.('analyzing')

  const pass1Raw = await callAI(pass1System, pass1UserBase, aiOpts)

  let pass1: Pass1Response
  try {
    pass1 = JSON.parse(pass1Raw) as Pass1Response
  } catch {
    const preview = pass1Raw.slice(0, 200)
    throw new Error(`AI (pass-1) returned invalid JSON. Raw response (first 200 chars): ${preview}`)
  }

  // ── No-sources path: return immediately with pass-1 result ───────────────

  if (!pass1.sourcesNeeded || pass1.sourcesNeeded.length === 0) {
    const p1 = pass1 as Pass1NoSources

    if (!p1.priority || !validatePriority(p1.priority)) {
      throw new Error(
        `AI (pass-1 no-sources) returned invalid priority: "${p1.priority}". Expected p1, p2, or p3.`
      )
    }
    if (!p1.suggestedAction || !validateAction(p1.suggestedAction)) {
      throw new Error(
        `AI (pass-1 no-sources) returned invalid suggestedAction: "${p1.suggestedAction}". Expected do, delegate, defer, or delete.`
      )
    }

    const summarySection = (p1 as Pass1NoSources).summarySection ?? null
    const nextStepsSection = (p1 as Pass1NoSources).nextStepsSection ?? null
    const combined =
      [
        summarySection && `## Summary\n${summarySection}`,
        nextStepsSection && `## Next Steps\n${nextStepsSection}`
      ]
        .filter(Boolean)
        .join('\n\n') || null

    return {
      priority: p1.priority,
      priorityRationale: p1.priorityRationale ?? '',
      suggestedAction: p1.suggestedAction,
      shortTitle: (p1 as Pass1NoSources).shortTitle ?? null,
      category: (p1 as Pass1NoSources).category ?? null,
      summarySection,
      nextStepsSection,
      summary: combined,
      nextSteps: null,
      evidenceSummary: combined, // backward compat
      jiraTicketKey: null,
      jiraTicketUrl: null,
      researchSummary: null,
      researchLinks: null,
      groomedAt: Date.now(),
      sourcesUsed: ['ai']
    }
  }

  // ── Sources path: query requested integrations in parallel ───────────────

  const requestedSources = pass1.sourcesNeeded as ('jira' | 'confluence' | 'google')[]

  const wantsJira = requestedSources.includes('jira')
  const wantsConfluence = requestedSources.includes('confluence')
  const wantsGoogle = requestedSources.includes('google')

  const jiraCredentials = buildJiraCredentials()
  const confluenceCredentials = buildConfluenceCredentials()

  onStage?.('querying')

  const [jiraResult, confluenceResult, webResult] = await Promise.all([
    wantsJira
      ? withTimeout(searchJira(task.text, jiraCredentials), 30000).catch(() => JIRA_SKIP)
      : Promise.resolve(JIRA_SKIP),
    wantsConfluence
      ? withTimeout(searchConfluence(task.text, confluenceCredentials), 30000).catch(
          () => CONFLUENCE_SKIP
        )
      : Promise.resolve(CONFLUENCE_SKIP),
    wantsGoogle
      ? withTimeout(webSearch(task.text), 30000).catch(() => WEB_SKIP)
      : Promise.resolve(WEB_SKIP)
  ])

  // Build sourcesUsed: 'ai' always; add each integration only when queried AND returned results
  const sourcesUsed: ('ai' | 'jira' | 'confluence' | 'google')[] = ['ai']
  if (wantsJira && jiraResult.skipped === false && jiraResult.results.length > 0) {
    sourcesUsed.push('jira')
  }
  if (
    wantsConfluence &&
    confluenceResult.skipped === false &&
    confluenceResult.results.length > 0
  ) {
    sourcesUsed.push('confluence')
  }
  if (wantsGoogle && webResult.skipped === false && webResult.results.length > 0) {
    sourcesUsed.push('google')
  }

  // Build integration context string (only lines for sources with results)
  const integrationContext = buildIntegrationContext(jiraResult, confluenceResult, webResult)

  // ── Pass 2: Summarization ─────────────────────────────────────────────────

  const pass2System = `You are a task groomer. Respond with JSON only. Do NOT use any tools, fetch any URLs, or access the internet. Use only the source results already provided in the prompt.`

  const pass2User = `TASK: ${task.text}
CATEGORY: ${(pass1 as Pass1WithSources).category ?? 'unknown'}
SHORT TITLE: ${(pass1 as Pass1WithSources).shortTitle ?? ''}

SOURCE RESULTS:
${integrationContext}

Produce structured grooming output. Respond with exactly this JSON (no other text):
{
  "priority": "p1" | "p2" | "p3",
  "priorityRationale": "<one sentence, e.g. P1 — blocks auth release>",
  "suggestedAction": "do" | "delegate" | "defer" | "delete",
  "shortTitle": "<≤8 word imperative title — refine if needed>",
  "jiraTicketKey": "<PROJ-42 if confident same work item, else null>",
  "jiraTicketUrl": "<full URL if jiraTicketKey set, else null>",
  "researchLinks": [{"title":"...","url":"..."}] | null,
  "summarySection": "- bullet1 from source X\\n- bullet2 from source Y\\n(3-6 concise bullets, source-labelled, omit sources with no results)",
  "nextStepsSection": "- concrete action 1\\n- open question to answer\\n(3-5 bullets mixing concrete next actions + open questions)",
  "summary": null,
  "nextSteps": null
}

Priority rules:
- p1: Do today — blocks something, urgent, time-sensitive
- p2: Do this week — important but not today
- p3: Someday — low urgency, nice to have

4D rules:
- do: act yourself now  - delegate: hand off
- defer: do later  - delete: no longer needed

researchLinks: up to 5 most relevant links from the source results.`

  onStage?.('summarizing')

  const pass2Raw = await callAI(pass2System, pass2User, { ...aiOpts, maxTokens: 1024 })

  let pass2: Pass2Response
  try {
    pass2 = JSON.parse(pass2Raw) as Pass2Response
  } catch {
    const preview = pass2Raw.slice(0, 200)
    throw new Error(`AI (pass-2) returned invalid JSON. Raw response (first 200 chars): ${preview}`)
  }

  if (!pass2.priority || !validatePriority(pass2.priority)) {
    throw new Error(
      `AI (pass-2) returned invalid priority: "${pass2.priority}". Expected p1, p2, or p3.`
    )
  }

  if (!pass2.suggestedAction || !validateAction(pass2.suggestedAction)) {
    throw new Error(
      `AI (pass-2) returned invalid suggestedAction: "${pass2.suggestedAction}". Expected do, delegate, defer, or delete.`
    )
  }

  // Serialize research links
  let researchLinks: string | null = null
  if (Array.isArray(pass2.researchLinks) && pass2.researchLinks.length > 0) {
    researchLinks = JSON.stringify(pass2.researchLinks.slice(0, 5))
  }

  const summarySection = pass2.summarySection ?? null
  const nextStepsSection = pass2.nextStepsSection ?? null
  const combined =
    [
      summarySection && `## Summary\n${summarySection}`,
      nextStepsSection && `## Next Steps\n${nextStepsSection}`
    ]
      .filter(Boolean)
      .join('\n\n') || null

  return {
    priority: pass2.priority,
    priorityRationale: pass2.priorityRationale ?? '',
    suggestedAction: pass2.suggestedAction,
    shortTitle: pass2.shortTitle ?? (pass1 as Pass1WithSources).shortTitle ?? null,
    category: (pass1 as Pass1WithSources).category ?? null,
    summarySection,
    nextStepsSection,
    summary: combined,
    nextSteps: null,
    evidenceSummary: combined, // backward compat
    jiraTicketKey: pass2.jiraTicketKey ?? null,
    jiraTicketUrl: pass2.jiraTicketUrl ?? null,
    researchSummary: null,
    researchLinks,
    groomedAt: Date.now(),
    sourcesUsed
  }
}
