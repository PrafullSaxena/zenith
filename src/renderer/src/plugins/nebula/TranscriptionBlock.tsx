/**
 * TranscriptionBlock -- Inline collapsible transcription display with speaker labels.
 *
 * Features:
 *  - Collapsible block with header toggle (starts expanded)
 *  - Colored speaker labels as small pills with deterministic color assignment
 *  - Editable speaker names: click to rename, updates all instances in the transcript
 *  - Audio playback button loads saved audio via IPC and plays via Audio element
 *  - Framer-motion animations for collapse/expand
 *
 * Rendered below the Tiptap editor content in NoteEditor when transcription data exists.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Play, Pause } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNebulaStore } from '../../stores/nebula-store'
import type { TranscriptionSegment } from '../../types/nebula'

// ── Deterministic speaker color palette ────────────────────────────────

const SPEAKER_COLORS = [
  { bg: 'oklch(0.85 0.1 195)', text: 'oklch(0.35 0.1 195)' },   // cyan
  { bg: 'oklch(0.85 0.1 340)', text: 'oklch(0.35 0.1 340)' },   // pink
  { bg: 'oklch(0.85 0.1 145)', text: 'oklch(0.35 0.1 145)' },   // green
  { bg: 'oklch(0.85 0.1 80)', text: 'oklch(0.35 0.1 80)' },     // amber
  { bg: 'oklch(0.85 0.1 290)', text: 'oklch(0.35 0.1 290)' },   // purple
  { bg: 'oklch(0.85 0.1 250)', text: 'oklch(0.35 0.1 250)' }    // blue
]

/**
 * Simple string hash to assign a deterministic color index to a speaker name.
 */
function speakerColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % SPEAKER_COLORS.length
}

// ── Props ──────────────────────────────────────────────────────────────

interface TranscriptionBlockProps {
  noteId: string
  segments: TranscriptionSegment[]
  audioPath?: string | null
}

// ── Component ──────────────────────────────────────────────────────────

export default function TranscriptionBlock({
  noteId,
  segments,
  audioPath
}: TranscriptionBlockProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)

  const updateSpeakerName = useNebulaStore((s) => s.updateSpeakerName)

  // Clean up audio resources on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingSpeaker && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingSpeaker])

  // Build a map of unique speakers for color assignment
  const speakerColorMap = new Map<string, typeof SPEAKER_COLORS[number]>()
  for (const seg of segments) {
    if (!speakerColorMap.has(seg.speaker)) {
      speakerColorMap.set(seg.speaker, SPEAKER_COLORS[speakerColorIndex(seg.speaker)])
    }
  }

  const handlePlayAudio = useCallback(async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    try {
      // Load audio via IPC
      const audioData = await window.api.nebula.loadAudio(noteId)
      if (!audioData) {
        console.warn('[TranscriptionBlock] No audio data found for note:', noteId)
        return
      }

      // Clean up previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      // Convert number[] back to Uint8Array and create blob
      const uint8Array = new Uint8Array(audioData)
      const blob = new Blob([uint8Array], { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
      }
      audio.onerror = () => {
        console.error('[TranscriptionBlock] Audio playback error')
        setIsPlaying(false)
      }

      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      console.error('[TranscriptionBlock] Failed to play audio:', err)
      setIsPlaying(false)
    }
  }, [noteId, isPlaying])

  const handleStartEdit = useCallback((speaker: string) => {
    setEditingSpeaker(speaker)
    setEditValue(speaker)
  }, [])

  const handleFinishEdit = useCallback(() => {
    if (!editingSpeaker) return
    const newName = editValue.trim()
    if (newName && newName !== editingSpeaker) {
      updateSpeakerName(noteId, editingSpeaker, newName)
    }
    setEditingSpeaker(null)
    setEditValue('')
  }, [editingSpeaker, editValue, noteId, updateSpeakerName])

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleFinishEdit()
      } else if (e.key === 'Escape') {
        setEditingSpeaker(null)
        setEditValue('')
      }
    },
    [handleFinishEdit]
  )

  if (segments.length === 0) return <></>

  return (
    <div className="mx-4 mb-4 rounded-lg border border-border bg-secondary/50">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>Transcription</span>
        <span className="text-muted-foreground/50">({segments.length} segments)</span>

        {/* Play button */}
        {(audioPath || noteId) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePlayAudio()
            }}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            title={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} />}
          </button>
        )}
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="transcription-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 px-3 pb-3">
              {segments.map((seg, i) => {
                const color = speakerColorMap.get(seg.speaker) ?? SPEAKER_COLORS[0]
                const isEditing = editingSpeaker === seg.speaker

                return (
                  <div key={`${seg.speaker}-${i}`} className="flex items-start gap-2 text-sm">
                    {/* Speaker label pill */}
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleFinishEdit}
                        onKeyDown={handleEditKeyDown}
                        className="w-20 shrink-0 rounded-full border border-primary px-2 py-0.5 text-xs font-medium outline-none bg-transparent"
                        style={{ color: color.text }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(seg.speaker)}
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                        style={{
                          backgroundColor: color.bg,
                          color: color.text
                        }}
                        title="Click to rename speaker"
                      >
                        {seg.speaker}
                      </button>
                    )}

                    {/* Segment text */}
                    <span className="text-foreground/90 leading-relaxed">{seg.text}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
