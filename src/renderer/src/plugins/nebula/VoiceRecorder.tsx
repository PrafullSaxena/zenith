/**
 * VoiceRecorder -- Floating Action Button (FAB) with animated expansion for voice recording.
 *
 * Features:
 *  - Round FAB in bottom-right corner with Mic icon (idle state)
 *  - Expands into recording card with animated equalizer bars, timer, and stop button
 *  - Processing state with spinner while transcription runs in the background
 *  - Background transcription: user can continue editing while transcription processes
 *  - Saves audio via IPC for later playback in TranscriptionBlock
 *
 * Uses framer-motion AnimatePresence for smooth FAB <-> card transitions.
 * Security: Audio buffer sent as number[] array across contextBridge (sandbox=true).
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNebulaStore } from '../../stores/nebula-store'
import type { DiarizedTranscript } from '../../types/nebula'

interface VoiceRecorderProps {
  noteId: string | null
}

export default function VoiceRecorder({ noteId }: VoiceRecorderProps): React.JSX.Element | null {
  const voiceState = useNebulaStore((s) => s.voiceState)
  const setVoiceState = useNebulaStore((s) => s.setVoiceState)
  const setLastTranscript = useNebulaStore((s) => s.setLastTranscript)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')

  // Elapsed time counter
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start elapsed time counter when recording
  useEffect(() => {
    if (voiceState === 'recording') {
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [voiceState])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Determine best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      mimeTypeRef.current = mimeType
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        setVoiceState('processing')

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const buffer = await blob.arrayBuffer()
          const audioArray = Array.from(new Uint8Array(buffer))

          // Save audio for later playback (fire-and-forget)
          if (noteId) {
            window.api.nebula.saveAudio(noteId, audioArray).catch((err) => {
              console.error('[VoiceRecorder] Failed to save audio:', err)
            })
          }

          // Send for transcription (background processing)
          const result = await window.api.nebula.transcribeAudio(audioArray)
          setLastTranscript(result as DiarizedTranscript)
        } catch (err) {
          console.error('[VoiceRecorder] Transcription failed:', err)
        } finally {
          setVoiceState('idle')
        }
      }

      recorder.start(1000) // 1-second chunks for visual feedback
      setVoiceState('recording')
    } catch (err) {
      console.error('[VoiceRecorder] Failed to start recording:', err)
      setVoiceState('idle')
    }
  }, [setVoiceState, setLastTranscript, noteId])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Don't render FAB when no note is selected
  if (!noteId) return null

  return (
    <div className="absolute bottom-6 right-6 z-40">
      <AnimatePresence mode="wait">
        {/* Idle state: Round FAB button */}
        {voiceState === 'idle' && (
          <motion.button
            key="fab-idle"
            type="button"
            onClick={startRecording}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-lg transition-colors hover:bg-accent/90"
            title="Start voice recording"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Mic size={20} className="text-surface" />
          </motion.button>
        )}

        {/* Recording state: Expanded card */}
        {voiceState === 'recording' && (
          <motion.div
            key="fab-recording"
            className="flex items-center gap-3 rounded-2xl bg-surface-elevated border border-border px-4 shadow-xl"
            initial={{ width: 48, height: 48, borderRadius: 24 }}
            animate={{ width: 280, height: 80, borderRadius: 16 }}
            exit={{ width: 48, height: 48, borderRadius: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
          >
            {/* Equalizer bars */}
            <div className="flex items-end gap-[3px] h-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-accent"
                  style={{
                    animation: `equalizer-${i} ${0.4 + i * 0.1}s ease-in-out infinite`,
                    height: '8px'
                  }}
                />
              ))}
            </div>

            {/* Timer */}
            <span className="text-sm font-medium tabular-nums text-text-primary min-w-[48px]">
              {formatTime(elapsed)}
            </span>

            {/* Recording label */}
            <span className="text-xs text-red-400 flex-1">Recording...</span>

            {/* Stop button */}
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
              title="Stop recording"
            >
              <Square size={14} />
            </button>
          </motion.div>
        )}

        {/* Processing state: Compact card with spinner */}
        {voiceState === 'processing' && (
          <motion.div
            key="fab-processing"
            className="flex items-center gap-3 rounded-2xl bg-surface-elevated border border-border px-4 shadow-xl"
            initial={{ width: 280, height: 80, borderRadius: 16 }}
            animate={{ width: 220, height: 56, borderRadius: 16 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
          >
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-xs text-text-secondary">Transcribing...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
