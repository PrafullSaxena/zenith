/**
 * Bitbucket API response types for OAuth tokens, pull requests, and inline comments.
 * Used by oauth.ts, api.ts, and token-manager.ts in the main process.
 */

/** OAuth 2.0 token pair returned by Bitbucket token endpoint */
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
  page: number
  size: number
  next?: string
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

/** Token data stored locally via safeStorage + electron-store */
export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  clientId: string
  clientSecret: string
}
