import React, { useEffect, useRef, useState, useCallback } from 'react'
import './capture.css'

// Inline bolt SVG — no external dependency needed in this standalone window
function BoltIcon(): React.JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(167,139,250,0.95)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

const MAX_CHARS = 500

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalClipboardText = useRef<string>('')

  // Auto-focus and clipboard check on mount
  useEffect(() => {
    textareaRef.current?.focus()

    window.api.capture.getClipboard().then((clipText) => {
      if (clipText) {
        setText(clipText)
        originalClipboardText.current = clipText
        setFromClipboard(true)
      }
    })
  }, [])

  // Auto-resize textarea as content grows
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
      // Shift+Enter: newline
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

          {/* Divider */}
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
