import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { SettingsField as SettingsFieldType } from '../../types/plugin'
import { RepoListEditor } from './RepoListEditor'
import type { RepoEntry } from './RepoListEditor'

interface SettingsFieldProps {
  field: SettingsFieldType
  value: unknown
  onChange: (value: unknown) => void
  error?: string | null
}

const inputClass =
  'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition'

const selectClass =
  'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition appearance-none'

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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              value ? 'bg-accent' : 'bg-surface-elevated border border-border'
            }`}
            onClick={() => onChange(!value)}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition ${
                value ? 'translate-x-6' : 'translate-x-1'
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
    <div className="mb-5">
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
