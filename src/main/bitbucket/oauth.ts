/**
 * Bitbucket OAuth 2.0 authorization code grant flow via BrowserWindow popup.
 *
 * Opens a popup window for Bitbucket login, intercepts the loopback redirect
 * to extract the authorization code, then exchanges it for tokens. No local
 * HTTP server is needed -- webRequest.onBeforeRequest catches the redirect.
 */

import { BrowserWindow } from 'electron'
import type { BitbucketTokenPair } from './types'

const BITBUCKET_AUTH_URL = 'https://bitbucket.org/site/oauth2/authorize'
const BITBUCKET_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token'
const REDIRECT_URI = 'http://127.0.0.1/oauth/bitbucket/callback'

/**
 * Exchanges an authorization code for an access/refresh token pair.
 * Uses HTTP Basic auth with client credentials per Bitbucket OAuth 2.0 spec.
 */
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<BitbucketTokenPair> {
  const response = await fetch(BITBUCKET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${body}`)
  }

  return response.json() as Promise<BitbucketTokenPair>
}

/**
 * Initiates the Bitbucket OAuth 2.0 authorization code grant flow.
 *
 * Opens an 800x600 BrowserWindow popup with the Bitbucket authorization page.
 * Intercepts the loopback redirect via webRequest.onBeforeRequest to capture
 * the authorization code without needing a local HTTP server.
 *
 * @param clientId - Bitbucket OAuth consumer key
 * @param clientSecret - Bitbucket OAuth consumer secret
 * @returns Token pair containing access_token, refresh_token, and expiry info
 */
export function startOAuthFlow(
  clientId: string,
  clientSecret: string
): Promise<BitbucketTokenPair> {
  return new Promise((resolve, reject) => {
    const parentWindow = BrowserWindow.getFocusedWindow()

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      ...(parentWindow ? { parent: parentWindow } : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    const authUrl = `${BITBUCKET_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`

    // Track whether we've already resolved/rejected to avoid double-firing
    let settled = false

    // Intercept the loopback redirect before the browser tries to navigate to it
    const filter = { urls: [`${REDIRECT_URI}*`] }
    authWindow.webContents.session.webRequest.onBeforeRequest(
      filter,
      async ({ url }, callback) => {
        // Cancel the navigation -- we don't need the redirect to actually load
        callback({ cancel: true })

        if (settled) return
        settled = true

        const parsedUrl = new URL(url)
        const code = parsedUrl.searchParams.get('code')
        const error = parsedUrl.searchParams.get('error')

        authWindow.close()

        if (error) {
          reject(new Error(`OAuth error: ${error}`))
          return
        }

        if (!code) {
          reject(new Error('No authorization code received in redirect'))
          return
        }

        try {
          const tokens = await exchangeCodeForTokens(code, clientId, clientSecret)
          resolve(tokens)
        } catch (err) {
          reject(err)
        }
      }
    )

    // Handle user manually closing the window before auth completes
    authWindow.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new Error('Authentication cancelled: window closed by user'))
      }
    })

    authWindow.loadURL(authUrl)
    authWindow.focus()
  })
}
