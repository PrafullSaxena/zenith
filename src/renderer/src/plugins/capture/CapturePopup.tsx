import React, { useEffect, useRef, useState, useCallback } from 'react'
import './capture.css'

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalClipboardText = useRef<string>('')

  // Auto-focus and clipboard check on mount
  useEffect(() => {
    textareaRef.current?.focus()

    // Check clipboard once on open
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
        captureSource: fromClipboard && text === originalClipboardText.current ? 'clipboard' : 'typed'
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
      // Shift+Enter: default behavior (newline)
    },
    [handleClose, handleSubmit]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Badge disappears once user edits
    if (fromClipboard) setFromClipboard(false)
  }

  return (
    <div className="capture-overlay" onClick={handleClose}>
      <div
        className="capture-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="capture-header">
          <span className="capture-label">Capture task</span>
          {fromClipboard && (
            <span className="capture-badge">from clipboard</span>
          )}
        </div>
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
        <div className="capture-hint">
          <span>⏎ to capture</span>
          <span>esc to dismiss</span>
        </div>
      </div>
    </div>
  )
}
