/**
 * DeleteConfirmDialog -- Modal confirmation dialog for note deletion.
 *
 * Overlay dialog with warning icon, message, and Cancel/Delete buttons.
 * Closes on Escape key. Focus trap on the dialog.
 */

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  noteTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmDialog({
  isOpen,
  noteTitle,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Close on Escape and focus trap
  useEffect(() => {
    if (!isOpen) return

    // Focus the cancel button when dialog opens
    cancelRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel()
      }
      // Simple focus trap: Tab cycles within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const displayTitle = noteTitle || 'Untitled'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div
        ref={dialogRef}
        className="bg-surface-elevated border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full"
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <h3 id="delete-dialog-title" className="text-sm font-semibold text-text-primary">
            Delete note?
          </h3>
          <p id="delete-dialog-desc" className="mt-2 text-xs text-text-secondary leading-relaxed">
            Are you sure you want to delete &lsquo;{displayTitle}&rsquo;? This action cannot be
            undone.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
