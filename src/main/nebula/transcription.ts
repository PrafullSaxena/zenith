/**
 * Nebula voice transcription module.
 *
 * Supports multiple providers:
 *  - OpenAI (SDK): Dedicated Whisper / gpt-4o-transcribe API
 *  - Gemini / Claude / other SDK providers: Vercel AI SDK generateText with audio file part
 *  - CLI agents (gemini, claude, etc.): Spawn CLI with audio file attachment
 *
 * Provider resolution:
 *  1. If provider has an API key → use SDK-based transcription
 *  2. If provider has a CLI command → pipe through CLI with -f <audioFile>
 *  3. Fallback → error with helpful message
 *
 * This module runs ONLY in the main process.
 */

import OpenAI from 'openai'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { generateText } from 'ai'
import { createModel } from '../ai/providers'
import { getShellEnv } from '../ai/cli-stream'

// ── Local interfaces (no renderer imports) ───────────────────────────

interface TranscriptionSegment {
  speaker: string
  text: string
  start: number
  end: number
}

interface DiarizedTranscript {
  text: string
  segments: TranscriptionSegment[]
}

// ── Default transcription models per provider ────────────────────────

const TRANSCRIPTION_MODELS: Record<string, string> = {
  gemini: 'gemini-2.0-flash',
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini'
}

// ── Transcription prompt for non-OpenAI providers ────────────────────

const TRANSCRIPTION_PROMPT = `Transcribe this audio recording with speaker diarization.
Identify different speakers and label them as "Speaker 1", "Speaker 2", etc.

Return ONLY a JSON object in this exact format (no markdown, no code fences, no extra text):
{"text": "full transcript text here", "segments": [{"speaker": "Speaker 1", "text": "what they said", "start": 0, "end": 1}]}

If there is only one speaker, use "Speaker 1". If you cannot determine speaker boundaries, return a single segment with all text.`

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Transcribe an audio file using the configured AI provider.
 *
 * @param audioPath  - Absolute path to the audio file
 * @param providerId - Provider identifier (e.g. 'openai', 'gemini', 'claude')
 * @param apiKey     - Optional API key (from credentials store)
 * @param command    - Optional CLI command (for CLI-type agents)
 * @returns Diarized transcript with speaker-labeled segments
 */
export async function transcribeAudio(
  audioPath: string,
  providerId: string,
  apiKey?: string,
  command?: string
): Promise<DiarizedTranscript> {
  // OpenAI with API key: use dedicated Whisper / gpt-4o-transcribe API
  if (providerId === 'openai' && apiKey) {
    return transcribeWithOpenAI(audioPath, apiKey)
  }

  // SDK providers with API key: use Vercel AI SDK generateText with audio content
  if (apiKey) {
    return transcribeWithAISDK(audioPath, providerId, apiKey)
  }

  // CLI providers: pipe through CLI with file attachment
  if (command) {
    return transcribeWithCLI(audioPath, command)
  }

  throw new Error(
    `No API key or CLI tool available for "${providerId}". Configure it in Settings → AI Agents.`
  )
}

// ── OpenAI (dedicated Whisper API) ───────────────────────────────────

async function transcribeWithOpenAI(
  audioPath: string,
  apiKey: string
): Promise<DiarizedTranscript> {
  const client = new OpenAI({ apiKey })

  const response = await client.audio.transcriptions.create({
    model: 'gpt-4o-transcribe',
    file: fs.createReadStream(audioPath),
    response_format: 'verbose_json'
  })

  const raw = response as unknown as {
    text: string
    segments?: Array<{ speaker?: string; text: string; start: number; end: number }>
  }

  return {
    text: raw.text,
    segments: (raw.segments || []).map((seg) => ({
      speaker: seg.speaker ?? 'Speaker 1',
      text: seg.text,
      start: seg.start,
      end: seg.end
    }))
  }
}

// ── Vercel AI SDK (Gemini, Claude, etc.) ─────────────────────────────

async function transcribeWithAISDK(
  audioPath: string,
  providerId: string,
  apiKey: string
): Promise<DiarizedTranscript> {
  const modelName = TRANSCRIPTION_MODELS[providerId] || providerId
  const model = createModel(providerId, modelName, apiKey)
  const audioData = fs.readFileSync(audioPath)

  const result = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', data: audioData, mimeType: 'audio/webm' },
          { type: 'text', text: TRANSCRIPTION_PROMPT }
        ]
      }
    ]
  })

  return parseTranscriptJSON(result.text)
}

// ── CLI-based transcription ──────────────────────────────────────────

async function transcribeWithCLI(
  audioPath: string,
  command: string
): Promise<DiarizedTranscript> {
  // Strip trailing stdin redirect (" -") from the command since we'll pass prompt as argument
  const baseCmd = command.replace(/\s+-\s*$/, '').trim()

  // Construct command with file attachment
  // Most AI CLIs support --file or -f for file attachments (gemini, claude, etc.)
  const escapedPrompt = TRANSCRIPTION_PROMPT.replace(/"/g, '\\"').replace(/\n/g, ' ')
  const fullCommand = `${baseCmd} "${escapedPrompt}" --file "${audioPath}"`

  return new Promise((resolve, reject) => {
    const child = spawn(fullCommand, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: getShellEnv()
    })

    let stdout = ''
    let stderr = ''

    child.stdin.on('error', () => {
      /* ignore stdin errors */
    })
    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(
          new Error(
            `CLI transcription failed (exit ${code}): ${stderr.trim() || 'Unknown error'}`
          )
        )
        return
      }

      resolve(parseTranscriptJSON(stdout))
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to start CLI for transcription: ${err.message}`))
    })
  })
}

// ── JSON parsing helper ──────────────────────────────────────────────

/**
 * Parse transcription JSON from AI model output.
 * Handles markdown code fences, extra text around JSON, and malformed responses.
 */
function parseTranscriptJSON(output: string): DiarizedTranscript {
  const trimmed = output.trim()

  // Strip markdown code fences if present
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  try {
    // Try to find and parse the JSON object
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        text: typeof parsed.text === 'string' ? parsed.text : stripped,
        segments: Array.isArray(parsed.segments)
          ? parsed.segments.map(
              (s: { speaker?: string; text?: string; start?: number; end?: number }) => ({
                speaker: s.speaker || 'Speaker 1',
                text: s.text || '',
                start: s.start || 0,
                end: s.end || 0
              })
            )
          : [{ speaker: 'Speaker 1', text: parsed.text || stripped, start: 0, end: 0 }]
      }
    }
  } catch {
    /* JSON parse failed — fall through to plain text */
  }

  // Fallback: treat entire output as plain text transcription
  const text = stripped || trimmed
  return {
    text,
    segments: [{ speaker: 'Speaker 1', text, start: 0, end: 0 }]
  }
}
