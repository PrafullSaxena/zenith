/**
 * confluence-client.ts — Confluence REST API v1 client for the Task Groomer integration.
 *
 * CRITICAL: When credentials is null, return the skip sentinel immediately
 * without any network calls. Missing credentials must NEVER block grooming.
 *
 * This module runs ONLY in the main process.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConfluenceCredentials {
  baseUrl: string
  email: string
  apiToken: string
}

export interface ConfluencePage {
  title: string
  url: string
  spaceName: string
  bodyExcerpt: string // first 500 chars, HTML stripped
}

export interface ConfluenceSearchResponse {
  results: ConfluencePage[]
  skipped: boolean
  reason: 'no_credentials' | 'error' | null
}

// ── HTML stripper ──────────────────────────────────────────────────────────

/**
 * Strip HTML tags from a Confluence storage-format body and return up to
 * 500 characters of plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

// ── Internal API response shapes ───────────────────────────────────────────

interface ConfluenceResultItem {
  title: string
  space?: { name?: string }
  _links?: { webui?: string }
  body?: { storage?: { value?: string } }
}

// ── Main search function ───────────────────────────────────────────────────

/**
 * Search Confluence for pages matching the given query string.
 *
 * If credentials is null, returns immediately with skipped:true and no network
 * call — this is intentional design so missing credentials never block grooming.
 */
export async function searchConfluence(
  query: string,
  credentials: ConfluenceCredentials | null
): Promise<ConfluenceSearchResponse> {
  // Gate: missing credentials — skip immediately, no network call
  if (credentials === null) {
    return { results: [], skipped: true, reason: 'no_credentials' }
  }

  try {
    const { baseUrl, email, apiToken } = credentials
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    // Build URL with encoded CQL param
    const cql = `title~"${query}" OR label~"${query}"`
    const params = new URLSearchParams({
      cql,
      expand: 'space,body.storage',
      limit: '3'
    })
    const url = `${baseUrl}/wiki/rest/api/content/search?${params.toString()}`

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

    const data = (await response.json()) as { results?: ConfluenceResultItem[] }
    const items = data.results ?? []

    const results: ConfluencePage[] = items.map((item) => {
      const rawBody = item.body?.storage?.value ?? ''
      return {
        title: item.title,
        url: `${baseUrl}/wiki${item._links?.webui ?? ''}`,
        spaceName: item.space?.name ?? '',
        bodyExcerpt: stripHtml(rawBody)
      }
    })

    return { results, skipped: false, reason: null }
  } catch {
    return { results: [], skipped: true, reason: 'error' }
  }
}
