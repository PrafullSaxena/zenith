/**
 * credentials.ts — safeStorage wrappers for Launchpad API keys.
 *
 * Uses electron's safeStorage for OS-level encryption and a dedicated
 * electron-store instance (zenith-launchpad-credentials) isolated from
 * the main credentials store used by other plugins.
 *
 * This module runs ONLY in the main process.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'

// ── Dedicated credentials store ────────────────────────────────────────

/**
 * Separate electron-store instance to keep Launchpad credentials
 * isolated from other plugin credentials (zenith-credentials).
 */
const launchpadCredStore = new Store({ name: 'zenith-launchpad-credentials' })

// ── Credential key constants ────────────────────────────────────────────

export const CRED_GCP_API_KEY = 'launchpad.credentials.gcp.apiKey'
export const CRED_AWS_ACCESS_KEY_ID = 'launchpad.credentials.aws.accessKeyId'
export const CRED_AWS_SECRET_ACCESS_KEY = 'launchpad.credentials.aws.secretAccessKey'
export const CRED_GCP_BILLING_ACCOUNT_ID = 'launchpad.credentials.gcp.billingAccountId'

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Encrypt and store a credential value under the given key.
 * Throws if safeStorage encryption is not available on this system.
 */
export function saveCredential(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage not available')
  }
  const encrypted = safeStorage.encryptString(value)
  launchpadCredStore.set(key, encrypted.toString('base64'))
}

/**
 * Retrieve and decrypt a stored credential.
 * Returns null if the key has not been stored.
 */
export function getCredential(key: string): string | null {
  if (!launchpadCredStore.has(key)) return null
  const encoded = launchpadCredStore.get(key) as string
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}

/**
 * Returns true if a credential exists for the given key.
 */
export function hasCredential(key: string): boolean {
  return launchpadCredStore.has(key)
}

/**
 * Delete a stored credential by key.
 */
export function deleteCredential(key: string): void {
  launchpadCredStore.delete(key)
}

/**
 * Retrieve a credential and return it masked (last 4 chars visible).
 * Returns null if the key has not been stored.
 */
export function getCredentialMasked(key: string): string | null {
  const value = getCredential(key)
  if (!value) return null
  if (value.length <= 4) return value
  return '\u2022'.repeat(value.length - 4) + value.slice(-4)
}
