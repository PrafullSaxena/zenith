/**
 * AI provider factory.
 * Maps agent store provider IDs to Vercel AI SDK LanguageModel instances.
 * API keys are resolved from the credentials store (safeStorage) in the main process.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'
import { getSetting } from '../settings-store'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOllama } from 'ollama-ai-provider'
import type { LanguageModel } from 'ai'

/**
 * Credentials store instance (same pattern as ipc-handlers.ts).
 * Values are encrypted via safeStorage and stored as base64 strings.
 */
const credentialsStore = new Store({ name: 'zenith-credentials' })

/**
 * Retrieve a decrypted API key for the given provider from the credentials store.
 * Returns undefined if no key is stored or encryption is unavailable.
 */
export async function getApiKeyForProvider(providerId: string): Promise<string | undefined> {
  if (!credentialsStore.has(providerId)) {
    return undefined
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return undefined
  }

  const encrypted = credentialsStore.get(providerId) as string
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

/**
 * Retrieve the base URL configured for a provider from the agents.providers setting.
 * Returns undefined if the provider has no custom base URL set.
 */
export function getBaseUrlForProvider(providerId: string): string | undefined {
  const providers = getSetting('agents.providers') as
    | Array<{ id: string; baseUrl?: string }>
    | undefined
  if (!Array.isArray(providers)) return undefined
  const match = providers.find((p) => p.id === providerId)
  return match?.baseUrl || undefined
}

/**
 * Create a Vercel AI SDK LanguageModel from a provider ID and model name.
 *
 * @param providerId - Provider identifier from agent store (e.g. 'claude', 'gemini', 'ollama')
 * @param modelName  - Model identifier (e.g. 'claude-sonnet-4-20250514', 'gemini-2.0-flash')
 * @param apiKey     - Optional API key (overrides credentials store lookup)
 * @param baseUrl    - Optional custom base URL for the provider
 * @returns A LanguageModel instance ready for streamText() / generateText()
 */
export function createModel(
  providerId: string,
  modelName: string,
  apiKey?: string,
  baseUrl?: string
): LanguageModel {
  switch (providerId) {
    case 'claude': {
      const provider = createAnthropic({
        ...(apiKey ? { apiKey } : {})
      })
      return provider(modelName)
    }

    case 'gemini': {
      const provider = createGoogleGenerativeAI({
        ...(apiKey ? { apiKey } : {})
      })
      return provider(modelName)
    }

    case 'ollama': {
      // ollama-ai-provider exports LanguageModelV1; cast is safe because
      // the ai package's streamText/generateText accept V1 models at runtime.
      const provider = createOllama({
        ...(baseUrl ? { baseURL: baseUrl } : {})
      })
      return provider(modelName) as unknown as LanguageModel
    }

    case 'cursor-agent': {
      // Cursor API uses Bearer auth and the Chat Completions endpoint
      // at api2.cursor.sh (/v1/chat/completions).
      // In @ai-sdk/openai v3+, provider(model) defaults to Responses API;
      // use provider.chat(model) to explicitly select Chat Completions.
      const cursorBaseUrl = baseUrl || 'https://api2.cursor.sh/v1'
      const provider = createOpenAI({
        compatibility: 'compatible',
        apiKey: apiKey || 'unused',
        baseURL: cursorBaseUrl,
        ...(apiKey
          ? { headers: { Authorization: `Bearer ${apiKey}` } }
          : {})
      })
      return provider.chat(modelName)
    }

    case 'codex':
    case 'opencode':
    default: {
      if (
        providerId !== 'codex' &&
        providerId !== 'opencode' &&
        !providerId.startsWith('custom-')
      ) {
        throw new Error(`Unsupported provider: ${providerId}`)
      }

      const provider = createOpenAI({
        ...(apiKey ? { apiKey } : {}),
        ...(baseUrl ? { baseURL: baseUrl } : {})
      })
      return provider(modelName)
    }
  }
}
