/**
 * DeleteConfirmDialog -- Modal confirmation dialog for note deletion.
 *
 * Uses GlassModal overlay with warning icon, message, and Cancel/Delete buttons.
 * Migrated to Obsidian Glass design system.
 */

import { AlertTriangle } from 'lucide-react'
import { GlassModal, GlassButton } from '../../components/ui'

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
  const displayTitle = noteTitle || 'Untitled'

  return (
    <GlassModal isOpen={isOpen} onClose={onCancel} title="Delete Note">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Are you sure you want to delete &lsquo;{displayTitle}&rsquo;? This action cannot be
          undone.
        </p>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <GlassButton variant="ghost" onClick={onCancel}>
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onClick={onConfirm}
          className="bg-red-500/80 hover:bg-red-500 text-white"
        >
          Delete
        </GlassButton>
      </div>
    </GlassModal>
  )
}
