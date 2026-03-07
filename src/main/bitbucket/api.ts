/**
 * Bitbucket REST API v2.0 client for pull requests, diffs, and inline comments.
 *
 * All functions run in the Electron main process (unrestricted network access).
 * The renderer never makes direct Bitbucket API calls -- it goes through IPC.
 *
 * Uses HTTP Basic Auth with username + app_password (Bitbucket App Passwords).
 */

import type { BitbucketPR, BitbucketPRListResponse } from './types'

const BB_API = 'https://api.bitbucket.org/2.0'

/**
 * Build a Basic Auth header from username and app password.
 */
export function basicAuthHeader(username: string, appPassword: string): string {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
}

/**
 * Tests Bitbucket credentials by calling the /user endpoint.
 * Returns the authenticated user's display name on success, throws on failure.
 */
export async function testCredentials(authHeader: string): Promise<string> {
  const response = await fetch(`${BB_API}/user`, {
    headers: { Authorization: authHeader }
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 401) {
      throw new Error('Invalid credentials. Check your username and app password.')
    }
    throw new Error(`Credential test failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as { display_name: string; username: string }
  return data.display_name || data.username
}

/**
 * Paginated response returned to the renderer.
 */
export interface PaginatedPRResult {
  prs: BitbucketPR[]
  page: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Lists open pull requests for a repository with pagination.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param authHeader - HTTP Basic Auth header string
 * @param page - 1-based page number (default 1)
 * @param pagelen - Results per page (default 10, max 50)
 * @returns Paginated PR result with metadata
 */
export async function listOpenPRs(
  workspace: string,
  repoSlug: string,
  authHeader: string,
  page: number = 1,
  pagelen: number = 10
): Promise<PaginatedPRResult> {
  // Note: Bitbucket returns PRs sorted by most recently updated by default.
  // The sort parameter is omitted to avoid potential API compatibility issues.
  const url =
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests?state=OPEN&page=${page}&pagelen=${pagelen}`

  console.log(`[bitbucket-api] listOpenPRs: GET ${url}`)

  const response = await fetch(url, {
    headers: { Authorization: authHeader }
  })

  console.log(`[bitbucket-api] listOpenPRs: status=${response.status}`)

  if (!response.ok) {
    const body = await response.text()
    console.error(`[bitbucket-api] listOpenPRs error body:`, body.slice(0, 500))
    throw new Error(`Failed to list PRs (${response.status}): ${body}`)
  }

  const data = (await response.json()) as BitbucketPRListResponse
  const values = Array.isArray(data.values) ? data.values : []
  const totalCount = data.size ?? values.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pagelen))

  console.log(`[bitbucket-api] listOpenPRs: ${values.length} PRs on page ${data.page ?? page}, total=${totalCount}, totalPages=${totalPages}`)

  return {
    prs: values,
    page: data.page ?? page,
    totalPages,
    totalCount,
    hasNext: !!data.next,
    hasPrev: page > 1
  }
}

/**
 * Fetches the raw unified diff for a pull request.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param prId - Pull request ID
 * @param authHeader - HTTP Basic Auth header string
 * @returns Raw unified diff string
 */
export async function getPRDiff(
  workspace: string,
  repoSlug: string,
  prId: number,
  authHeader: string
): Promise<string> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`,
    {
      headers: { Authorization: authHeader }
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to fetch PR diff (${response.status}): ${body}`)
  }

  return response.text()
}

/**
 * Posts an inline comment on a specific file and line in a pull request.
 *
 * Uses `to` for the line number (new/modified lines). Per Bitbucket API:
 * - `to` = new-file line number (for added/modified lines)
 * - `from` = old-file line number (for deleted lines)
 * Never send both to avoid ambiguous placement.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param prId - Pull request ID
 * @param authHeader - HTTP Basic Auth header string
 * @param filePath - File path within the repository
 * @param line - Line number in the new file
 * @param comment - Comment text (Markdown supported)
 */
export async function postInlineComment(
  workspace: string,
  repoSlug: string,
  prId: number,
  authHeader: string,
  filePath: string,
  line: number,
  comment: string
): Promise<void> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: { raw: comment },
        inline: { path: filePath, to: line }
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to post inline comment (${response.status}): ${body}`)
  }
}

/**
 * Posts a top-level (non-inline) comment on a pull request.
 * Used for review summary comments that are not tied to a specific file/line.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param prId - Pull request ID
 * @param authHeader - HTTP Basic Auth header string
 * @param comment - Comment text (Markdown supported)
 */
export async function postTopLevelComment(
  workspace: string,
  repoSlug: string,
  prId: number,
  authHeader: string,
  comment: string
): Promise<void> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: { raw: comment }
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to post top-level comment (${response.status}): ${body}`)
  }
}
