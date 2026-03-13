/**
 * Zustand store for the TextCraft AI text refinement plugin.
 *
 * Manages input text, refinement options, AI streaming sessions,
 * and history persistence. Follows the same patterns as launchpad-store.ts:
 *  - AI streaming via window.api.ai.startAnalysis + IPC event listeners
 *  - Session-scoped listeners with cleanup on done/error/cancel
 *  - History persistence via window.api.settings.set/get
 *  - Token tracking via useTokenStore
 */

import { create } from 'zustand'
import type {
  RefinementOptions,
  RefinementSession,
  TextCraftHistoryEntry
} from '../types/textcraft'
import { useTokenStore } from './token-store'

// -- Constants ---------------------------------------------------------------

const HISTORY_STORAGE_KEY = 'textcraft.history'
const MAX_HISTORY_ENTRIES = 50

// -- System Prompt Builder ---------------------------------------------------

const toneDescriptions: Record<string, string> = {
  professional:
    'Use professional, clear, and polished language suitable for business communication.',
  casual: 'Use a relaxed, friendly, and conversational tone.',
  technical:
    'Use precise technical language with appropriate jargon for a technical audience.',
  friendly: 'Use warm, approachable language that builds rapport.',
  concise: 'Be extremely brief and to the point. Remove all filler words.',
  instructive:
    'Use clear, directive language optimized for instructing an AI model. Be explicit and unambiguous.'
}

const formatInstructions: Record<string, string> = {
  email: 'Format as a professional email with greeting, body paragraphs, and sign-off.',
  'one-pager':
    'Format as a structured one-pager with clear headings and bullet points.',
  'technical-doc':
    'Format as technical documentation with sections, code references where appropriate, and precise language.',
  rca: `Format as a Root Cause Analysis (RCA) document with these sections:
1. **Problem Statement** — concise description of the incident or issue
2. **Impact** — scope, affected users/systems, severity, and business impact
3. **Timeline** — chronological sequence of key events (use bullet points with timestamps if the text provides them)
4. **Root Cause** — the primary underlying cause(s) identified
5. **Contributing Factors** — secondary factors that enabled or worsened the issue
6. **Corrective Actions** — immediate fixes applied or recommended (use a numbered list)
7. **Preventive Measures** — long-term changes to prevent recurrence
8. **Lessons Learned** — key takeaways for the team
Use markdown headers (##) for each section. Be precise and factual.`,
  general: 'Format as clean, well-structured prose.',
  prompt: `You are an expert prompt engineer. Transform the user's text into the best possible AI prompt.
Structure the prompt with:
1. **Role/Context** — Define the AI's role and expertise
2. **Task** — Clear, specific instruction of what to do
3. **Input Details** — Key information and constraints from the original text
4. **Output Format** — Expected format, length, and structure
5. **Quality Criteria** — What makes a good response
Use markdown formatting. Make the prompt specific, unambiguous, and actionable.
Do NOT execute the prompt — only generate it.`
}

/**
 * Builds a structured system prompt from the user's refinement options.
 * Encodes tone(s), format, and any custom instructions into clear AI directives.
 */
export function buildSystemPrompt(options: RefinementOptions): string {
  const tones = options.tones.length > 0 ? options.tones : ['professional']
  const toneText = tones.map((t) => toneDescriptions[t] || toneDescriptions.professional).join(' ')

  return `You are an expert writing assistant. Rewrite the user's text according to these specifications:

TONE: ${toneText}
FORMAT: ${formatInstructions[options.format] || formatInstructions.general}
${options.customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${options.customInstructions}` : ''}

RULES:
- Fix all spelling and grammatical errors
- Preserve the original meaning and intent
- Improve clarity and readability
- Match the requested tone consistently
- Apply the requested format structure
- Do NOT add information that wasn't in the original
- Output the refined text directly — no preamble like "Here is the refined version"
- Use markdown formatting for structure (headers, lists, bold) when appropriate`
}

// -- Store Interface ---------------------------------------------------------

interface TextCraftStore {
  // State
  inputText: string
  options: RefinementOptions
  session: RefinementSession | null
  history: TextCraftHistoryEntry[]
  error: string | null

  // Actions
  setInputText: (text: string) => void
  setOptions: (partial: Partial<RefinementOptions>) => void
  startRefinement: (agentId: string, model: string, command?: string) => Promise<void>
  cancelRefinement: () => void
  saveToHistory: (entry: TextCraftHistoryEntry) => Promise<void>
  loadHistory: () => Promise<void>
  loadFromHistory: (entry: TextCraftHistoryEntry) => void
  deleteHistoryEntry: (id: string) => Promise<void>
  clearSession: () => void
}

// -- Store Creation ----------------------------------------------------------

export const useTextCraftStore = create<TextCraftStore>((set, get) => ({
  // -- Initial state ---------------------------------------------------------

  inputText: '',
  options: {
    tones: ['professional'],
    format: 'email',
    customInstructions: ''
  },
  session: null,
  history: [],
  error: null,

  // -- Actions ---------------------------------------------------------------

  setInputText: (text) => {
    set({ inputText: text })
  },

  setOptions: (partial) => {
    set({ options: { ...get().options, ...partial } })
  },

  startRefinement: async (agentId, model, command) => {
    const { inputText, options } = get()
    if (!inputText.trim()) return

    const sessionId = `textcraft-${Date.now()}`
    const session: RefinementSession = {
      sessionId,
      status: 'streaming',
      rawText: '',
      inputText,
      options: { ...options }
    }
    set({ session, error: null })

    const systemPrompt = buildSystemPrompt(options)

    try {
      // Set up session-scoped streaming listeners
      window.api.ai.onStreamChunk((data) => {
        const current = get().session
        if (!current || current.sessionId !== data.sessionId) return
        set({ session: { ...current, rawText: current.rawText + data.chunk } })
      })

      window.api.ai.onStreamDone((data) => {
        const current = get().session
        if (!current || current.sessionId !== data.sessionId) return

        set({ session: { ...current, status: 'complete' } })

        // Auto-save to history
        const historyEntry: TextCraftHistoryEntry = {
          id: `textcraft-${Date.now()}`,
          inputText: current.inputText,
          outputText: current.rawText,
          options: current.options,
          createdAt: new Date().toISOString()
        }
        get().saveToHistory(historyEntry)

        // Capture token usage
        const tokensUsed = data.usage
          ? data.usage.totalTokens
          : Math.max(1, Math.ceil(current.rawText.length / 4))
        const isEstimated = data.usage ? data.usage.isEstimated : true
        useTokenStore.getState().addEntry({
          sessionId: data.sessionId,
          providerId: agentId,
          providerName: model,
          tokensUsed,
          isEstimated
        })

        window.api.ai.removeStreamListeners()
      })

      window.api.ai.onStreamError((data) => {
        const current = get().session
        if (!current || current.sessionId !== data.sessionId) return
        set({
          session: { ...current, status: 'error' },
          error: data.error
        })
        window.api.ai.removeStreamListeners()
      })

      // Start AI analysis with textcraft-specific system prompt
      await window.api.ai.startAnalysis(
        agentId,
        model,
        systemPrompt,
        inputText,
        sessionId,
        command
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start refinement'
      set({ session: { ...session, status: 'error' }, error: message })
    }
  },

  cancelRefinement: () => {
    const current = get().session
    if (current && current.status === 'streaming') {
      window.api.ai.cancelAnalysis(current.sessionId)
      set({ session: { ...current, status: 'idle' } })
      window.api.ai.removeStreamListeners()
    }
  },

  saveToHistory: async (entry) => {
    const updated = [entry, ...get().history].slice(0, MAX_HISTORY_ENTRIES)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  },

  loadHistory: async () => {
    try {
      const raw = await window.api.settings.get(HISTORY_STORAGE_KEY)
      const history = Array.isArray(raw)
        ? (raw as TextCraftHistoryEntry[])
        : []
      set({ history: history.slice(0, MAX_HISTORY_ENTRIES) })
    } catch {
      set({ history: [] })
    }
  },

  loadFromHistory: (entry) => {
    // Backward compat: old entries may have `tone` (string) instead of `tones` (array)
    const raw = entry.options as Record<string, unknown>
    const tones = Array.isArray(raw.tones)
      ? (raw.tones as RefinementOptions['tones'])
      : typeof raw.tone === 'string'
        ? [raw.tone as RefinementOptions['tones'][number]]
        : ['professional' as const]

    const options: RefinementOptions = {
      tones,
      format: entry.options.format,
      customInstructions: entry.options.customInstructions
    }

    set({
      inputText: entry.inputText,
      options,
      session: {
        sessionId: `textcraft-history-${Date.now()}`,
        status: 'complete',
        rawText: entry.outputText,
        inputText: entry.inputText,
        options
      },
      error: null
    })
  },

  deleteHistoryEntry: async (id) => {
    const updated = get().history.filter((e) => e.id !== id)
    set({ history: updated })
    await window.api.settings.set(HISTORY_STORAGE_KEY, updated)
  },

  clearSession: () => {
    set({ session: null, error: null })
  }
}))
