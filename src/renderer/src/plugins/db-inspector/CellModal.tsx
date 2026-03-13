import { useEffect, useCallback } from 'react'
import { X, Copy } from 'lucide-react'

interface CellModalProps {
  value: unknown
  fieldName: string
  isOpen: boolean
  onClose: () => void
}

function formatValue(value: unknown): { display: string; isJson: boolean } {
  if (value === null || value === undefined) {
    return { display: 'NULL', isJson: false }
  }
  if (typeof value === 'object') {
    return { display: JSON.stringify(value, null, 2), isJson: true }
  }
  const str = String(value)
  // Try to detect JSON strings
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const parsed = JSON.parse(str)
      return { display: JSON.stringify(parsed, null, 2), isJson: true }
    } catch {
      return { display: str, isJson: false }
    }
  }
  return { display: str, isJson: false }
}

export default function CellModal({ value, fieldName, isOpen, onClose }: CellModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const isNull = value === null || value === undefined
  const { display, isJson } = formatValue(value)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(display)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-surface rounded-lg border border-border max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="font-medium text-text-primary text-sm">{fieldName}</span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {isNull ? (
            <span className="italic text-text-secondary/50 text-sm">NULL</span>
          ) : isJson ? (
            <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
              {display}
            </pre>
          ) : (
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{display}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy value
          </button>
        </div>
      </div>
    </div>
  )
}
