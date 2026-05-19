/**
 * jira-client.ts — Jira REST API v3 client for the Task Groomer integration.
 *
 * CRITICAL: When credentials is null, return the skip sentinel immediately
 * without any network calls. Missing credentials must NEVER block grooming.
 *
 * This module runs ONLY in the main process.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface JiraCredentials {
  baseUrl: string    // e.g. "https://company.atlassian.net"
  email: string
  apiToken: string
  projects: string[] // parsed from comma-separated project keys
}

export interface JiraIssue {
  key: string
  summary: string
  status: string
  url: string
  description: string | null // first 500 chars
  assignee: string | null
  priority: string | null
}

export interface JiraSearchResponse {
  results: JiraIssue[]
  skipped: boolean
  reason: 'no_credentials' | 'error' | null
}

// ── Atlassian Document Format (ADF) text extractor ────────────────────────

/**
 * Recursively extracts plain text from an Atlassian Document Format node.
 * Returns a flat string with all text content joined by spaces.
 */
function extractAdfText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>

  let text = ''

  if (n.type === 'text' && typeof n.text === 'string') {
    text += n.text
  }

  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      const childText = extractAdfText(child)
      if (childText) {
        text += (text ? ' ' : '') + childText
      }
    }
  }

  return text
}

// ── Issue mapper ───────────────────────────────────────────────────────────

function mapIssue(issue: Record<string, unknown>, baseUrl: string): JiraIssue {
  const key = issue.key as string
  const fields = (issue.fields ?? {}) as Record<string, unknown>

  const statusObj = (fields.status ?? {}) as Record<string, unknown>
  const status = (statusObj.name as string | undefined) ?? 'Unknown'

  const assigneeObj = (fields.assignee ?? null) as Record<string, unknown> | null
  const assignee = assigneeObj?.displayName as string | null ?? null

  const priorityObj = (fields.priority ?? null) as Record<string, unknown> | null
  const priority = priorityObj?.name as string | null ?? null

  const rawDescription = fields.description ?? null
  let description: string | null = null
  if (rawDescription !== null) {
    const extracted = extractAdfText(rawDescription).replace(/\s+/g, ' ').trim()
    description = extracted.slice(0, 500) || null
  }

  return {
    key,
    summary: (fields.summary as string | undefined) ?? '',
    status,
    url: `${baseUrl}/browse/${key}`,
    description,
    assignee,
    priority
  }
}

// ── Main search function ───────────────────────────────────────────────────

/**
 * Search Jira for issues matching the given query string.
 *
 * If credentials is null, returns immediately with skipped:true and no network
 * call — this is intentional design so missing credentials never block grooming.
 */
export async function searchJira(
  query: string,
  credentials: JiraCredentials | null
): Promise<JiraSearchResponse> {
  // Gate 1: missing credentials — skip immediately, no network call
  if (credentials === null) {
    return { results: [], skipped: true, reason: 'no_credentials' }
  }

  try {
    const { baseUrl, email, apiToken, projects } = credentials
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    // Gate 2: direct Jira key lookup (e.g. "PROJ-123")
    const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/
    if (JIRA_KEY_PATTERN.test(query.trim())) {
      const key = query.trim()
      const url = `${baseUrl}/rest/api/3/issue/${key}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        return { results: [], skipped: true, reason: 'error' }
      }

      const issue = (await response.json()) as Record<string, unknown>
      return {
        results: [mapIssue(issue, baseUrl)],
        skipped: false,
        reason: null
      }
    }

    // Gate 3: JQL text search
    let jql: string
    if (projects.length > 0) {
      jql = `project IN (${projects.join(', ')}) AND text ~ "${query}"`
    } else {
      jql = `text ~ "${query}"`
    }

    const response = await fetch(`${baseUrl}/rest/api/3/issue/search`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql,
        maxResults: 5,
        fields: ['summary', 'status', 'description', 'assignee', 'priority']
      }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { results: [], skipped: true, reason: 'error' }
    }

    const data = (await response.json()) as Record<string, unknown>
    const issues = (data.issues as Record<string, unknown>[] | undefined) ?? []
    const results = issues.map((issue) => mapIssue(issue, baseUrl))

    return { results, skipped: false, reason: null }
  } catch {
    return { results: [], skipped: true, reason: 'error' }
  }
}
