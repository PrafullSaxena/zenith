/**
 * LinkDialog -- Small popup for Cmd+K link insertion in the Nebula editor.
 *
 * Features:
 *  - URL text input with "Apply" and "Remove" buttons
 *  - Positioned near cursor with viewport edge detection
 *  - Closes on Escape key or click outside
 *  - Pre-fills URL when editing an existing link
 *
 * Migrated to Obsidian Glass design system with Input, Button,
 * and Card styling.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Link, X } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

interface LinkDialogProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
}

export default function LinkDialog({
  editor,
  isOpen,
  onClose,
  position
}: LinkDialogProps): React.JSX.Element | null {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const hasExistingLink = editor.isActive('link')

  // Pre-fill URL from existing link mark
  useEffect(() => {
    if (isOpen) {
      const existingHref = editor.getAttributes('link').href as string | undefined
      setUrl(existingHref || '')
      // Focus the input after a brief delay for the dialog to render
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, editor])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent): void => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use a timeout so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleApply = useCallback(() => {
    if (!url.trim()) return
    const href = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    onClose()
  }, [url, editor, onClose])

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run()
    onClose()
  }, [editor, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleApply()
      }
    },
    [handleApply]
  )

  if (!isOpen) return null

  // Viewport edge detection: flip position if dialog would overflow
  const dialogWidth = 288 // w-72 = 18rem = 288px
  const dialogHeight = 100 // approximate height
  const adjustedX =
    position.x + dialogWidth > window.innerWidth ? position.x - dialogWidth : position.x
  const adjustedY =
    position.y + dialogHeight > window.innerHeight ? position.y - dialogHeight - 10 : position.y

  return (
    <div
      ref={dialogRef}
      className="fixed z-50 w-72 rounded-xl bg-secondary/80 backdrop-blur-xl border border-white/[0.08] p-3 shadow-xl"
      style={{
        left: Math.max(8, adjustedX),
        top: Math.max(8, adjustedY)
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Link size={14} className="text-primary" />
        <span className="text-xs font-medium text-foreground">Insert Link</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <Input
        ref={inputRef}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://example.com"
        className="mb-2 w-full"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={!url.trim()}
        >
          Apply
        </Button>
        {hasExistingLink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-red-400 hover:bg-red-400/10"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
