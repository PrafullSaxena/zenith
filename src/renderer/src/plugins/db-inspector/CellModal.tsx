/**
 * CellModal — Full-view modal for long cell values in query results.
 *
 * Migrated to Obsidian Glass design system using GlassModal and GlassButton.
 */
import { Copy } from 'lucide-react'
import { GlassModal, GlassButton } from '../../components/ui'

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
  const isNull = value === null || value === undefined
  const { display, isJson } = formatValue(value)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(display)
  }

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={fieldName} size="lg">
      {/* Body */}
      <div className="max-h-[60vh] overflow-auto">
        {isNull ? (
          <span className="italic text-[var(--text-secondary)]/50 text-sm">NULL</span>
        ) : isJson ? (
          <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap break-words">
            {display}
          </pre>
        ) : (
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">{display}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-4 border-t border-[var(--glass-border)] mt-4">
        <GlassButton variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="w-3 h-3" />
          Copy value
        </GlassButton>
      </div>
    </GlassModal>
  )
}
