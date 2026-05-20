import React, { useEffect, useRef, useState, useCallback } from 'react'
import './capture.css'

function BoltIcon(): React.JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

const MAX_CHARS = 500

// Fixed height steps — window snaps to these values so resize feels intentional.
// BASE=190 gives comfortable room for header + 1-line textarea + footer.
// Each STEP=52px accommodates ~2 additional lines.
const BASE_H = 190
const STEP_H = 52
const MAX_H = 420

function stepHeight(textareaScrollH: number): number {
  const LINE_H = 23 // 15px font × 1.5 line-height
  const extraLines = Math.max(0, Math.ceil(textareaScrollH / LINE_H) - 1)
  if (extraLines === 0) return BASE_H
  const buckets = Math.ceil(extraLines / 2) // 2 lines per bucket
  return Math.min(MAX_H, BASE_H + buckets * STEP_H)
}

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalClipboardText = useRef<string>('')
  const lastStep = useRef<number>(BASE_H)

  // Auto-focus and clipboard check on mount
  useEffect(() => {
    textareaRef.current?.focus()
    // Set base window height on open
    window.api.capture.resize(BASE_H)

    window.api.capture.getClipboard().then((clipText) => {
      if (clipText) {
        setText(clipText)
        originalClipboardText.current = clipText
        setFromClipboard(true)
      }
    })
  }, [])

  // Auto-resize textarea + snap window height when text changes
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    // Measure current scroll height to determine textarea lines
    el.style.height = 'auto'
    const scrollH = el.scrollHeight
    el.style.height = `${scrollH}px`

    // Only send IPC when the step changes (avoid spamming on every keystroke)
    const step = stepHeight(scrollH)
    if (step !== lastStep.current) {
      lastStep.current = step
      window.api.capture.resize(step)
    }
  }, [text])

  const handleClose = useCallback(() => {
    window.api.capture.close()
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await window.api.taskgroomer.createTask({
        text: trimmed,
        captureSource:
          fromClipboard && text === originalClipboardText.current ? 'clipboard' : 'typed'
      })
    } finally {
      handleClose()
    }
  }, [text, fromClipboard, submitting, handleClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleClose, handleSubmit]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length > MAX_CHARS) return
    setText(val)
    if (fromClipboard) setFromClipboard(false)
  }

  const charCount = text.length
  const nearLimit = charCount > MAX_CHARS * 0.8

  return (
    <div className="capture-overlay" onClick={handleClose}>
      <div className="capture-card" onClick={(e) => e.stopPropagation()}>
        <div className={`capture-card-inner${submitting ? ' is-submitting' : ''}`}>

          {/* Header */}
          <div className="capture-header">
            <div className="capture-icon">
              <BoltIcon />
            </div>
            <div className="capture-header-text">
              <span className="capture-label">Quick capture</span>
              {fromClipboard && <span className="capture-badge">from clipboard</span>}
            </div>
          </div>

          <hr className="capture-divider" />

          {/* Input */}
          <textarea
            ref={textareaRef}
            className="capture-input"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="What needs doing?"
            rows={1}
            disabled={submitting}
          />

          {/* Footer */}
          <div className="capture-footer">
            <div className="capture-hints">
              <span className="capture-hint-key">
                <kbd>shift ↵</kbd> new line
              </span>
              <span className="capture-hint-key">
                <kbd>esc</kbd> dismiss
              </span>
            </div>

            <div className="capture-footer-right">
              {charCount > 0 && (
                <span className={`capture-charcount${nearLimit ? ' warn' : ''}`}>
                  {MAX_CHARS - charCount}
                </span>
              )}
              <button
                type="button"
                className="capture-submit"
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                aria-label="Capture task"
              >
                {submitting ? (
                  <>
                    <span className="capture-spinner" />
                    Capturing
                  </>
                ) : (
                  <>
                    Capture
                    <span className="capture-submit-enter">↵</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
