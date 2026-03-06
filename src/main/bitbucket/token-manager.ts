/**
 * Token lifecycle manager for Bitbucket OAuth tokens.
 *
 * Persists tokens via Electron safeStorage (encrypted) in a dedicated
 * electron-store instance. Automatically refreshes access tokens before
 * they expire (5-minute buffer before the 1-hour expiry).
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { BitbucketTokenPair, StoredTokens } from './types'

const BITBUCKET_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token'
const CREDENTIALS_KEY = 'bitbucket-tokens'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before expiry

/**
 * Manages Bitbucket OAuth token storage, retrieval, and auto-refresh.
 *
 * Tokens are encrypted via safeStorage before being written to the
 * credentials store. The access token is automatically refreshed if
 * it will expire within the next 5 minutes.
 */
export class TokenManager {
  private tokens: StoredTokens | null = null
  private credentialsStore: Store
  private refreshPromise: Promise<void> | null = null

  constructor() {
    this.credentialsStore = new Store({ name: 'zenith-credentials' })
    this.loadTokens()
  }

  /**
   * Load encrypted tokens from the credentials store on startup.
   * Silently fails if no tokens exist or decryption is unavailable.
   */
  private loadTokens(): void {
    try {
      const encrypted = this.credentialsStore.get(CREDENTIALS_KEY) as string | undefined
      if (!encrypted || !safeStorage.isEncryptionAvailable()) {
        this.tokens = null
        return
      }
      const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      this.tokens = JSON.parse(decrypted) as StoredTokens
    } catch {
      this.tokens = null
    }
  }

  /**
   * Encrypts and persists tokens from an OAuth token pair response.
   * Calculates the absolute expiry timestamp from the relative expires_in.
   */
  storeTokens(
    tokenPair: BitbucketTokenPair,
    clientId: string,
    clientSecret: string
  ): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }

    this.tokens = {
      accessToken: tokenPair.access_token,
      refreshToken: tokenPair.refresh_token,
      expiresAt: Date.now() + tokenPair.expires_in * 1000,
      clientId,
      clientSecret
    }

    const encrypted = safeStorage.encryptString(JSON.stringify(this.tokens))
    this.credentialsStore.set(CREDENTIALS_KEY, encrypted.toString('base64'))
  }

  /**
   * Returns a valid access token, auto-refreshing if within 5 minutes of expiry.
   * Throws if no tokens are stored.
   *
   * Concurrent callers share the same refresh promise to avoid duplicate
   * refresh requests.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No Bitbucket tokens stored. Please connect first.')
    }

    // Auto-refresh if within 5-minute buffer of expiry
    if (this.tokens.expiresAt - Date.now() < REFRESH_BUFFER_MS) {
      await this.refreshTokens()
    }

    return this.tokens.accessToken
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Updates both in-memory and persisted token state.
   *
   * Uses a shared promise so concurrent callers don't trigger parallel refreshes.
   */
  async refreshTokens(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens to refresh')
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.doRefresh()

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async doRefresh(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens to refresh')
    }

    const response = await fetch(BITBUCKET_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.tokens.clientId}:${this.tokens.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken
      })
    })

    if (!response.ok) {
      const body = await response.text()
      // Clear tokens on refresh failure -- user needs to re-authenticate
      this.clearTokens()
      throw new Error(`Token refresh failed (${response.status}): ${body}`)
    }

    const newTokenPair = (await response.json()) as BitbucketTokenPair

    // Re-store with updated tokens (clientId/clientSecret stay the same)
    this.storeTokens(newTokenPair, this.tokens.clientId, this.tokens.clientSecret)
  }

  /**
   * Removes all stored tokens from memory and the credentials store.
   */
  clearTokens(): void {
    this.tokens = null
    this.credentialsStore.delete(CREDENTIALS_KEY)
  }

  /**
   * Returns whether tokens exist in storage.
   */
  hasTokens(): boolean {
    return this.tokens !== null
  }

  /**
   * Returns whether the user is connected with non-expired tokens.
   */
  isConnected(): boolean {
    return this.tokens !== null && this.tokens.expiresAt > Date.now()
  }
}
