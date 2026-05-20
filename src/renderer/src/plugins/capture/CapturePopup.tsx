import React, { useEffect, useRef, useState, useCallback } from 'react'
import './capture.css'

function BoltIcon(): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

const MAX_CHARS = 500
// Two fixed window heights. CSS transitions the textarea between them.
const COMPACT_H  = 172  // header + 1-line textarea + footer
const EXPANDED_H = 276  // header + 130px textarea + footer
// Single-line scrollHeight at font-size 15px / line-height 1.55 ≈ 24px
const SINGLE_LINE_H = 28

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalClipboardText = useRef<string>('')

  useEffect(() => {
    textareaRef.current?.focus()
    window.api.capture.resize(COMPACT_H)

    window.api.capture.getClipboard().then((clipText) => {
      if (clipText) {
        setText(clipText)
        originalClipboardText.current = clipText
        setFromClipboard(true)
      }
    })
  }, [])

  // Detect multiline and toggle expanded state + resize window
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    // Measure natural scroll height (reset height first so it reflects content)
    el.style.height = 'auto'
    const scrollH = el.scrollHeight
    el.style.height = '' // let CSS control the height

    const isMultiLine = scrollH > SINGLE_LINE_H || text.includes('\n')

    if (isMultiLine && !expanded) {
      setExpanded(true)
      window.api.capture.resize(EXPANDED_H)
    } else if (!isMultiLine && expanded) {
      setExpanded(false)
      // Delay window shrink so CSS transition finishes first
      setTimeout(() => window.api.capture.resize(COMPACT_H), 230)
    }
  }, [text, expanded])

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
      if (e.key === 'Escape') { e.preventDefault(); handleClose() }
      else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
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
      <div
        className={`capture-card${submitting ? ' is-submitting' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────── */}
        <div className="capture-header">
          <div className="capture-icon">
            <BoltIcon />
          </div>
          <div className="capture-header-meta">
            <span className="capture-title">Quick Capture</span>
            {fromClipboard && <span className="capture-badge">from clipboard</span>}
          </div>
        </div>

        {/* ── Body / Textarea ───────────────────────── */}
        <div className="capture-body">
          <textarea
            ref={textareaRef}
            className={`capture-input${expanded ? ' is-expanded' : ''}`}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="What needs doing?"
            disabled={submitting}
          />
        </div>

        {/* ── Footer ───────────────────────────────── */}
        <div className="capture-footer">
          <div className="capture-hints">
            <span className="capture-hint">
              <kbd>↵</kbd> capture
            </span>
            <span className="capture-hint">
              <kbd>shift ↵</kbd> new line
            </span>
            <span className="capture-hint">
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
              className="capture-btn"
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              aria-label="Capture task"
            >
              {submitting ? (
                <><span className="capture-spinner" /> Capturing</>
              ) : (
                <>Capture <span className="capture-btn-enter">↵</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
