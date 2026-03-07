/**
 * Credential manager for Bitbucket App Password authentication.
 *
 * Persists credentials via Electron safeStorage (encrypted) in a dedicated
 * electron-store instance. Provides Basic Auth header for API calls.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { StoredCredentials } from './types'
import { basicAuthHeader } from './api'

const CREDENTIALS_KEY = 'bitbucket-credentials'

/**
 * Manages Bitbucket App Password credential storage and retrieval.
 *
 * Credentials are encrypted via safeStorage before being written to the
 * credentials store. Provides a Basic Auth header for API calls.
 */
export class TokenManager {
  private credentials: StoredCredentials | null = null
  private credentialsStore: Store

  constructor() {
    this.credentialsStore = new Store({ name: 'zenith-credentials' })
    this.loadCredentials()
  }

  /**
   * Load encrypted credentials from the credentials store on startup.
   * Silently fails if no credentials exist or decryption is unavailable.
   */
  private loadCredentials(): void {
    try {
      const encrypted = this.credentialsStore.get(CREDENTIALS_KEY) as string | undefined
      if (!encrypted || !safeStorage.isEncryptionAvailable()) {
        this.credentials = null
        return
      }
      const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      this.credentials = JSON.parse(decrypted) as StoredCredentials
    } catch {
      this.credentials = null
    }
  }

  /**
   * Encrypts and persists App Password credentials.
   */
  storeCredentials(username: string, appPassword: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system')
    }

    this.credentials = { username, appPassword }

    const encrypted = safeStorage.encryptString(JSON.stringify(this.credentials))
    this.credentialsStore.set(CREDENTIALS_KEY, encrypted.toString('base64'))
  }

  /**
   * Returns the Basic Auth header for API calls.
   * Throws if no credentials are stored.
   */
  getAuthHeader(): string {
    if (!this.credentials) {
      throw new Error('No Bitbucket credentials stored. Please connect first.')
    }
    return basicAuthHeader(this.credentials.username, this.credentials.appPassword)
  }

  /**
   * Removes all stored credentials from memory and the credentials store.
   */
  clearCredentials(): void {
    this.credentials = null
    this.credentialsStore.delete(CREDENTIALS_KEY)
    // Also clear legacy OAuth tokens if any
    this.credentialsStore.delete('bitbucket-tokens')
  }

  /**
   * Returns whether credentials exist in storage.
   */
  hasCredentials(): boolean {
    return this.credentials !== null
  }

  /**
   * Returns whether the user is connected (has stored credentials).
   */
  isConnected(): boolean {
    return this.credentials !== null
  }
}
