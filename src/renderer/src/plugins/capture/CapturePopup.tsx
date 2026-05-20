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
const OVERLAY_PADDING = 14 // 7px top + 7px bottom in .capture-overlay
const MIN_H = 190
const MAX_H = 420

// Quantize to 24px steps (≈1 line) for discrete animation feel.
// Prevents IPC spam on every sub-pixel layout shift.
function quantize(px: number): number {
  const STEP = 24
  return Math.min(MAX_H, Math.max(MIN_H, Math.ceil(px / STEP) * STEP))
}

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const originalClipboardText = useRef<string>('')
  const lastSentH = useRef<number>(0)

  // Auto-focus and clipboard check on mount
  useEffect(() => {
    textareaRef.current?.focus()
    window.api.capture.resize(MIN_H)
    lastSentH.current = MIN_H

    window.api.capture.getClipboard().then((clipText) => {
      if (clipText) {
        setText(clipText)
        originalClipboardText.current = clipText
        setFromClipboard(true)
      }
    })
  }, [])

  // ResizeObserver: measure the actual rendered card height and resize window to fit exactly.
  // Since .capture-card has overflow:visible, content is always fully rendered regardless
  // of window size — no clipping race between layout and IPC.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (!h) return
      const target = quantize(h + OVERLAY_PADDING)
      if (target !== lastSentH.current) {
        lastSentH.current = target
        window.api.capture.resize(target)
      }
    })

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  // Auto-resize textarea height as content grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
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
        <div ref={cardRef} className={`capture-card-inner${submitting ? ' is-submitting' : ''}`}>

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
