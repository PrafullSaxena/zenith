/**
 * Type definitions for the TextCraft AI text refinement plugin.
 *
 * Covers tone/format options, refinement session state,
 * and history entry shapes for persistence.
 */

/** Available writing tone options for AI refinement. */
export type ToneOption = 'professional' | 'casual' | 'technical' | 'friendly' | 'concise'

/** Available output format options for AI refinement. */
export type FormatOption = 'email' | 'one-pager' | 'technical-doc' | 'rca' | 'general'

/** User-selected options that control how the AI refines text. */
export interface RefinementOptions {
  /** One or more tones to blend (e.g., professional + concise) */
  tones: ToneOption[]
  format: FormatOption
  /** Per-request freeform instructions (e.g., "make it shorter") */
  customInstructions: string
}

/** Tracks the state of a single AI refinement streaming session. */
export interface RefinementSession {
  sessionId: string
  status: 'idle' | 'streaming' | 'complete' | 'error'
  /** Accumulated AI output (markdown) */
  rawText: string
  /** Original user input (for reference) */
  inputText: string
  /** Options used for this refinement */
  options: RefinementOptions
}

/** A completed refinement saved to history for later recall. */
export interface TextCraftHistoryEntry {
  /** Unique ID (e.g., `textcraft-${Date.now()}`) */
  id: string
  inputText: string
  outputText: string
  options: RefinementOptions
  /** ISO date string */
  createdAt: string
}
