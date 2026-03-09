/**
 * VoiceRecorder -- MediaRecorder-based audio capture with transcription trigger.
 *
 * Features:
 *  - Start/stop audio recording via MediaRecorder API
 *  - Compact bar at the bottom of the note editor area
 *  - Red pulsing dot + elapsed time counter during recording
 *  - Processing state with spinner while transcription runs
 *  - Sends captured audio to main process for OpenAI transcription via IPC
 *
 * Security: Audio buffer sent as number[] array across contextBridge (sandbox=true).
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { useNebulaStore } from '../../stores/nebula-store'
import type { DiarizedTranscript } from '../../types/nebula'

export default function VoiceRecorder(): React.JSX.Element {
  const voiceState = useNebulaStore((s) => s.voiceState)
  const setVoiceState = useNebulaStore((s) => s.setVoiceState)
  const setLastTranscript = useNebulaStore((s) => s.setLastTranscript)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

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
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Determine best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

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
          const result = await window.api.nebula.transcribeAudio(
            Array.from(new Uint8Array(buffer))
          )
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
  }, [setVoiceState, setLastTranscript])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-2">
      {/* Idle state: show mic button */}
      {voiceState === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors hover:bg-accent/20"
          title="Start voice recording"
        >
          <Mic size={14} />
        </button>
      )}

      {/* Recording state: show stop button + pulsing dot + timer */}
      {voiceState === 'recording' && (
        <>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
            title="Stop recording"
          >
            <Square size={12} />
          </button>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-xs tabular-nums text-red-400">{formatTime(elapsed)}</span>
          <span className="text-xs text-text-secondary">Recording...</span>
        </>
      )}

      {/* Processing state: show spinner */}
      {voiceState === 'processing' && (
        <>
          <Loader2 size={16} className="animate-spin text-accent" />
          <span className="text-xs text-text-secondary">Transcribing...</span>
        </>
      )}

      {/* Label when idle */}
      {voiceState === 'idle' && (
        <span className="text-xs text-text-secondary">Voice note</span>
      )}
    </div>
  )
}
