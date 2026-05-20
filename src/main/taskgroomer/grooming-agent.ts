/**
 * grooming-agent.ts — Core AI grooming agent for the Task Groomer plugin.
 *
 * Processes a single Dump-status task by:
 *   1. Gathering integration credentials (Jira, Confluence)
 *   2. Querying integrations in parallel with 30s timeouts
 *   3. Building a context-rich prompt
 *   4. Calling Claude via Vercel AI SDK generateText
 *   5. Parsing and validating the structured JSON response
 *
 * This module runs ONLY in the main process.
 */

import { generateText } from 'ai'
import { createModel, getApiKeyForProvider } from '../ai/providers'
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
  evidenceSummary: string | null // bullet list, one bullet per source with results
  jiraTicketKey: string | null // only when AI is confident it's the same work item
  jiraTicketUrl: string | null
  researchSummary: string | null // 3-5 sentence synthesis — only for research-mode tasks
  researchLinks: string | null // JSON: {title: string, url: string}[] — up to 5 links
  groomedAt: number // Date.now()
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

// ── AI response shape ──────────────────────────────────────────────────────

interface AiGroomingResponse {
  priority: string
  priorityRationale: string
  suggestedAction: string
  evidenceSummary: string | null
  jiraTicketKey: string | null
  jiraTicketUrl: string | null
  isResearchMode: boolean
  researchSummary: string | null
  researchLinks: Array<{ title: string; url: string }> | null
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

// ── Main exported function ─────────────────────────────────────────────────

/**
 * Groom a single task using Claude AI and available integrations.
 *
 * Throws only on:
 * - Missing Anthropic API key
 * - Claude API call failure
 * - Invalid/unparseable JSON response from Claude
 *
 * Integration timeouts and missing credentials produce skip sentinels,
 * not errors — grooming always completes as long as Claude is reachable.
 */
export async function groomTask(task: Task): Promise<GroomingResult> {
  // Step 1: Get Claude API key — fail fast if not configured
  const apiKey = await getApiKeyForProvider('claude')
  if (!apiKey) {
    throw new Error(
      'Anthropic API key not configured. Set it in Settings > Code Review Bot > Provider.'
    )
  }

  // Step 2: Build integration credentials (null if any required field is missing)
  const jiraCredentials = buildJiraCredentials()
  const confluenceCredentials = buildConfluenceCredentials()

  // Step 3: Query integrations in parallel with 30s timeouts — never throw on failure
  const [jiraResult, confluenceResult, webResult] = await Promise.all([
    withTimeout(searchJira(task.text, jiraCredentials), 30000).catch(() => JIRA_SKIP),
    withTimeout(searchConfluence(task.text, confluenceCredentials), 30000).catch(
      () => CONFLUENCE_SKIP
    ),
    withTimeout(webSearch(task.text), 30000).catch(() => WEB_SKIP)
  ])

  // Step 4: Build integration context string for the AI prompt
  const integrationContext = buildIntegrationContext(jiraResult, confluenceResult, webResult)

  // Step 5: Build prompts
  const systemPrompt = `You are a task grooming assistant for a software developer. You analyze tasks and produce structured grooming output. You MUST respond with valid JSON only — no markdown, no explanation, just the JSON object.`

  const userPrompt = `Groom this task:

TASK: ${task.text}

INTEGRATION CONTEXT:
${integrationContext}

Respond with exactly this JSON structure (no other text):
{
  "priority": "p1" | "p2" | "p3",
  "priorityRationale": "<one sentence explaining why, e.g. P1 — blocks the auth release>",
  "suggestedAction": "do" | "delegate" | "defer" | "delete",
  "evidenceSummary": "<bullet list with one bullet per source that returned results, e.g. '• Jira: PROJ-42 in progress — auth token bug\\n• Web: 3 relevant articles found'. null if no sources returned results.>",
  "jiraTicketKey": "<Jira key like PROJ-42 only when you are confident this is the SAME work item, or null>",
  "jiraTicketUrl": "<full URL if jiraTicketKey is set, or null>",
  "isResearchMode": true | false,
  "researchSummary": "<3-5 sentence synthesis of all findings — only include if isResearchMode is true, otherwise null>",
  "researchLinks": [{"title": "...", "url": "..."}] | null
}

Research mode rules:
- Set isResearchMode=true if the task is ambiguous, technical, multi-part, or unclear what to do next.
- Set isResearchMode=false if the task is short and clear (e.g. "Fix typo in docs", "Update package version").
- researchLinks: up to 5 links from Jira, Confluence, or web results. null if isResearchMode=false.

Priority rules:
- P1: Do today — blocks something, urgent, time-sensitive
- P2: Do this week — important but not today
- P3: Someday — low urgency, nice to have

4D rules:
- Do: You should act on this yourself
- Delegate: Someone else should handle this
- Defer: Do it later, not urgent
- Delete: This is no longer relevant or worthwhile`

  // Step 6: Call Claude via Vercel AI SDK generateText (non-streaming)
  const model = createModel('claude', 'claude-sonnet-4-6', apiKey)
  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 1024
  })

  // Step 7: Parse and validate the JSON response
  let parsed: AiGroomingResponse
  try {
    parsed = JSON.parse(text) as AiGroomingResponse
  } catch {
    const preview = text.slice(0, 200)
    throw new Error(`Claude returned invalid JSON. Raw response (first 200 chars): ${preview}`)
  }

  if (!parsed.priority || !validatePriority(parsed.priority)) {
    throw new Error(
      `Claude returned invalid priority: "${parsed.priority}". Expected p1, p2, or p3.`
    )
  }

  if (!parsed.suggestedAction || !validateAction(parsed.suggestedAction)) {
    throw new Error(
      `Claude returned invalid suggestedAction: "${parsed.suggestedAction}". Expected do, delegate, defer, or delete.`
    )
  }

  // Step 8: Map researchLinks to JSON string if research mode is active
  let researchLinks: string | null = null
  if (
    parsed.isResearchMode === true &&
    Array.isArray(parsed.researchLinks) &&
    parsed.researchLinks.length > 0
  ) {
    researchLinks = JSON.stringify(parsed.researchLinks.slice(0, 5))
  }

  return {
    priority: parsed.priority,
    priorityRationale: parsed.priorityRationale ?? '',
    suggestedAction: parsed.suggestedAction,
    evidenceSummary: parsed.evidenceSummary ?? null,
    jiraTicketKey: parsed.jiraTicketKey ?? null,
    jiraTicketUrl: parsed.jiraTicketUrl ?? null,
    researchSummary: parsed.isResearchMode === true ? (parsed.researchSummary ?? null) : null,
    researchLinks,
    groomedAt: Date.now()
  }
}
