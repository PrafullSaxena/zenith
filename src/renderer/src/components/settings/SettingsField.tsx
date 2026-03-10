import { useState } from 'react'
import { Eye, EyeOff, FolderOpen, X } from 'lucide-react'
import type { SettingsField as SettingsFieldType } from '../../types/plugin'
import { RepoListEditor } from './RepoListEditor'
import type { RepoEntry } from './RepoListEditor'
import { ConnectionListEditor } from './ConnectionListEditor'
import type { ConnectionEntry } from './ConnectionListEditor'

interface SettingsFieldProps {
  field: SettingsFieldType
  value: unknown
  onChange: (value: unknown) => void
  error?: string | null
}

const inputClass =
  'w-full rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition'

const selectClass =
  'w-full rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition appearance-none'

export function SettingsField({ field, value, onChange, error }: SettingsFieldProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false)

  const renderInput = (): React.JSX.Element => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={inputClass}
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'password':
        return (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className={`${inputClass} pr-10`}
              value={(value as string) ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            className={inputClass}
            value={(value as number) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        )

      case 'boolean':
        return (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
              value ? 'bg-accent' : 'bg-surface-elevated border border-border'
            }`}
            onClick={() => onChange(!value)}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition ${
                value ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        )

      case 'select':
        return (
          <select
            className={selectClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            className={`${inputClass} min-h-[120px] resize-y font-mono text-xs`}
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
          />
        )

      case 'repo-list':
        return (
          <RepoListEditor
            value={(value as RepoEntry[]) ?? []}
            onChange={(repos) => onChange(repos)}
          />
        )

      case 'connection-list':
        return (
          <ConnectionListEditor
            value={(value as ConnectionEntry[]) ?? []}
            onChange={(connections) => onChange(connections)}
          />
        )

      case 'directory':
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              className={`${inputClass} flex-1`}
              value={(value as string) ?? ''}
              placeholder={field.placeholder ?? 'Default (OS Downloads folder)'}
              readOnly
            />
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition"
              onClick={async () => {
                const result = await window.api.app.selectDirectory((value as string) || undefined)
                if (!result.canceled && result.path) {
                  onChange(result.path)
                }
              }}
            >
              <FolderOpen size={14} />
              Browse
            </button>
            {value && (
              <button
                type="button"
                className="rounded-lg border border-border/50 bg-surface px-2 py-1.5 text-sm text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition"
                onClick={() => onChange('')}
                title="Reset to default"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            className={inputClass}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="-mx-2 mb-5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-elevated/30">
      {/* Label — skip for boolean (toggle has its own inline label) */}
      {field.type !== 'boolean' ? (
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          {field.label}
          {field.required && <span className="ml-0.5 text-red-400">*</span>}
        </label>
      ) : (
        <div className="flex items-center gap-3">
          {renderInput()}
          <label className="text-sm font-medium text-text-primary">{field.label}</label>
        </div>
      )}

      {/* Input — rendered inline for boolean above, block for others */}
      {field.type !== 'boolean' && renderInput()}

      {/* Description */}
      {field.description && (
        <p className="mt-1 text-xs text-text-secondary">{field.description}</p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
