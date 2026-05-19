/**
 * credentials.ts — safeStorage wrappers for Integration (Jira / Confluence) credentials.
 *
 * Uses electron's safeStorage for OS-level encryption and a dedicated
 * electron-store instance (zenith-integrations-credentials) isolated from
 * the credential stores used by other plugins.
 *
 * This module runs ONLY in the main process.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'

// ── Dedicated credentials store ────────────────────────────────────────

/**
 * Separate electron-store instance to keep Integration credentials
 * isolated from other plugin credentials (e.g. zenith-launchpad-credentials).
 */
const integrationCredStore = new Store({ name: 'zenith-integrations-credentials' })

// ── Credential key constants ────────────────────────────────────────────

export const CRED_JIRA_BASE_URL = 'integrations.jira.baseUrl'
export const CRED_JIRA_EMAIL = 'integrations.jira.email'
export const CRED_JIRA_API_TOKEN = 'integrations.jira.apiToken'
/** Not a secret — stored as plaintext via saveIntegrationSetting / getIntegrationSetting. */
export const CRED_JIRA_PROJECTS = 'integrations.jira.projects'
export const CRED_CONFLUENCE_BASE_URL = 'integrations.confluence.baseUrl'
export const CRED_CONFLUENCE_EMAIL = 'integrations.confluence.email'
export const CRED_CONFLUENCE_API_TOKEN = 'integrations.confluence.apiToken'

// ── Encrypted helpers ──────────────────────────────────────────────────

/**
 * Encrypt and store a credential value under the given key.
 * Throws if safeStorage encryption is not available on this system.
 */
export function saveIntegrationCredential(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage not available')
  }
  const encrypted = safeStorage.encryptString(value)
  integrationCredStore.set(key, encrypted.toString('base64'))
}

/**
 * Retrieve and decrypt a stored credential.
 * Returns null if the key has not been stored.
 */
export function getIntegrationCredential(key: string): string | null {
  if (!integrationCredStore.has(key)) return null
  const encoded = integrationCredStore.get(key) as string
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}

/**
 * Returns true if an encrypted credential exists for the given key.
 */
export function hasIntegrationCredential(key: string): boolean {
  return integrationCredStore.has(key)
}

/**
 * Delete a stored credential by key.
 */
export function deleteIntegrationCredential(key: string): void {
  integrationCredStore.delete(key)
}

/**
 * Retrieve a credential and return it masked (last 4 chars visible).
 * Returns null if the key has not been stored.
 */
export function getIntegrationCredentialMasked(key: string): string | null {
  const value = getIntegrationCredential(key)
  if (!value) return null
  if (value.length <= 4) return value
  return '•'.repeat(value.length - 4) + value.slice(-4)
}

// ── Plaintext helpers (for non-secret settings) ────────────────────────

/**
 * Store a non-secret setting directly (no encryption).
 * Use this for CRED_JIRA_PROJECTS and similar non-sensitive values.
 */
export function saveIntegrationSetting(key: string, value: string): void {
  integrationCredStore.set(key, value)
}

/**
 * Retrieve a non-secret setting stored via saveIntegrationSetting.
 * Returns null if the key has not been set.
 */
export function getIntegrationSetting(key: string): string | null {
  if (!integrationCredStore.has(key)) return null
  return integrationCredStore.get(key) as string
}
