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
    window.api.capture.getClipboard().then((clipText) => {
      if (clipText) {
        setText(clipText)
        originalClipboardText.current = clipText
        setFromClipboard(true)
      }
    })
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const scrollH = el.scrollHeight
    el.style.height = ''
    setExpanded(scrollH > SINGLE_LINE_H || text.includes('\n'))
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

  return (
    <div className="capture-overlay" onClick={handleClose}>
      <div
        className={`capture-card${submitting ? ' is-submitting' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — icon + title left, keyboard hints right */}
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

        {/* Textarea — expands with CSS transition, no footer */}
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
      </div>
    </div>
  )
}
