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

export default function CapturePopup(): React.JSX.Element {
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [fromClipboard, setFromClipboard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalClipboardText = useRef<string>('')

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

  // Detect multiline purely from text content — no el.style manipulation needed.
  // The card's explicit CSS height transition handles the visual expansion.
  useEffect(() => {
    setExpanded(text.includes('\n') || text.length > 60)
  }, [text])

  const handleClose = useCallback(() => window.api.capture.close(), [])

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

  const cardClass = [
    'capture-card',
    expanded ? 'is-expanded' : '',
    submitting ? 'is-submitting' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className="capture-overlay" onClick={handleClose}>
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="capture-header">
          <div className="capture-icon"><BoltIcon /></div>
          <div className="capture-title-row">
            <span className="capture-title">Quick Capture</span>
            {fromClipboard && <span className="capture-badge">clipboard</span>}
          </div>
          <div className="capture-shortcuts">
            <span className="capture-shortcut"><kbd>↵</kbd> capture</span>
            <span className="capture-shortcut"><kbd>esc</kbd> dismiss</span>
          </div>
        </div>

        {/* Body — flex:1 fills remaining card height */}
        <div className="capture-body">
          <textarea
            ref={textareaRef}
            className="capture-input"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="What needs doing?"
            disabled={submitting}
          />
        </div>

      </div>
    </div>
  )
}
