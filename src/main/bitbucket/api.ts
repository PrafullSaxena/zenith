/**
 * Bitbucket REST API v2.0 client for pull requests, diffs, and inline comments.
 *
 * All functions run in the Electron main process (unrestricted network access).
 * The renderer never makes direct Bitbucket API calls -- it goes through IPC.
 */

import type { BitbucketPR, BitbucketPRListResponse } from './types'

const BB_API = 'https://api.bitbucket.org/2.0'

/**
 * Lists all open pull requests for a repository, handling pagination.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param accessToken - Valid Bitbucket access token
 * @returns Array of all open PRs (across all pages)
 */
export async function listOpenPRs(
  workspace: string,
  repoSlug: string,
  accessToken: string
): Promise<BitbucketPR[]> {
  const allPRs: BitbucketPR[] = []
  let url: string | undefined =
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests?state=OPEN`

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Failed to list PRs (${response.status}): ${body}`)
    }

    const data = (await response.json()) as BitbucketPRListResponse
    allPRs.push(...data.values)

    // Follow pagination if more pages exist
    url = data.next
  }

  return allPRs
}

/**
 * Fetches the raw unified diff for a pull request.
 *
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param prId - Pull request ID
 * @param accessToken - Valid Bitbucket access token
 * @returns Raw unified diff string
 */
export async function getPRDiff(
  workspace: string,
  repoSlug: string,
  prId: number,
  accessToken: string
): Promise<string> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
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
 * @param accessToken - Valid Bitbucket access token
 * @param filePath - File path within the repository
 * @param line - Line number in the new file
 * @param comment - Comment text (Markdown supported)
 */
export async function postInlineComment(
  workspace: string,
  repoSlug: string,
  prId: number,
  accessToken: string,
  filePath: string,
  line: number,
  comment: string
): Promise<void> {
  const response = await fetch(
    `${BB_API}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
