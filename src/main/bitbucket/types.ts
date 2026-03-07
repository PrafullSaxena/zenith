/**
 * Bitbucket API response types for pull requests, inline comments, and credentials.
 * Used by api.ts and token-manager.ts in the main process.
 */

/** OAuth 2.0 token pair returned by Bitbucket token endpoint (legacy — kept for type compat) */
export interface BitbucketTokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
  scopes: string
  token_type: string
}

/** Pull request object from Bitbucket REST API v2.0 */
export interface BitbucketPR {
  id: number
  title: string
  description: string
  state: string
  author: {
    display_name: string
    uuid: string
  }
  source: {
    branch: {
      name: string
    }
  }
  destination: {
    branch: {
      name: string
    }
  }
  created_on: string
  updated_on: string
  links: {
    html: {
      href: string
    }
  }
}

/** Paginated PR list response from Bitbucket */
export interface BitbucketPRListResponse {
  values: BitbucketPR[]
  page?: number
  size?: number       // Total count of matching items
  pagelen?: number    // Items per page
  next?: string       // URL for next page (absent on last page)
  previous?: string   // URL for previous page
}

/** Inline comment payload for posting to a PR */
export interface BitbucketInlineComment {
  content: {
    raw: string
  }
  inline: {
    path: string
    to?: number
    from?: number
  }
}

/** App Password credentials stored locally via safeStorage + electron-store */
export interface StoredCredentials {
  username: string
  appPassword: string
}

/** Legacy OAuth token storage (kept for migration) */
export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  clientId: string
  clientSecret: string
}
