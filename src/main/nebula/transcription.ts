/**
 * Nebula voice transcription module.
 *
 * Uses the OpenAI `openai` client package to transcribe audio files
 * with speaker diarization via the gpt-4o-transcribe model family.
 *
 * This module runs ONLY in the main process.
 */

import OpenAI from 'openai'
import fs from 'node:fs'

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

// ── Transcription function ───────────────────────────────────────────

/**
 * Transcribe an audio file using OpenAI with speaker diarization.
 *
 * Attempts the `gpt-4o-transcribe` model first. The API returns segments
 * with optional speaker labels when verbose_json response format is used.
 *
 * @param audioPath - Absolute path to the audio file (webm, mp3, wav, etc.)
 * @param apiKey - OpenAI API key
 * @returns Diarized transcript with speaker-labeled segments
 */
export async function transcribeAudio(
  audioPath: string,
  apiKey: string
): Promise<DiarizedTranscript> {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Settings > AI Agents.')
  }

  const client = new OpenAI({ apiKey })

  const response = await client.audio.transcriptions.create({
    model: 'gpt-4o-transcribe',
    file: fs.createReadStream(audioPath),
    response_format: 'verbose_json'
  })

  // The verbose_json response includes a segments array with optional speaker labels
  const raw = response as unknown as { text: string; segments?: Array<{ speaker?: string; text: string; start: number; end: number }> }

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
