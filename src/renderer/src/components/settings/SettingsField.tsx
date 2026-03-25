import { useState } from 'react'
import { Eye, EyeOff, FolderOpen, X } from 'lucide-react'
import type { SettingsField as SettingsFieldType } from '../../types/plugin'
import { GlassInput, GlassSelect, GlassButton } from '@renderer/components/ui'
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

export function SettingsField({ field, value, onChange, error }: SettingsFieldProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false)

  const renderInput = (): React.JSX.Element => {
    switch (field.type) {
      case 'text':
        return (
          <GlassInput
            type="text"
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            errorMessage={error ?? undefined}
          />
        )

      case 'password':
        return (
          <div className="relative">
            <GlassInput
              type={showPassword ? 'text' : 'password'}
              className="pr-10"
              value={(value as string) ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
              error={!!error}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )

      case 'number':
        return (
          <GlassInput
            type="number"
            value={(value as number) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            error={!!error}
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
          <GlassSelect
            options={field.options?.map((opt) => ({ value: opt.value, label: opt.label })) ?? []}
            value={(value as string) ?? ''}
            onChange={(val) => onChange(val)}
          />
        )

      case 'textarea':
        return (
          <textarea
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 transition-colors duration-[var(--duration-fast)] focus:outline-none focus:shadow-[var(--glass-glow)] min-h-[120px] resize-y font-mono text-xs"
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
            <GlassInput
              type="text"
              className="flex-1"
              value={(value as string) ?? ''}
              placeholder={field.placeholder ?? 'Default (OS Downloads folder)'}
              readOnly
            />
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await window.api.app.selectDirectory((value as string) || undefined)
                if (!result.canceled && result.path) {
                  onChange(result.path)
                }
              }}
            >
              <FolderOpen size={14} />
              Browse
            </GlassButton>
            {value && (
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                title="Reset to default"
                className="text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10"
              >
                <X size={14} />
              </GlassButton>
            )}
          </div>
        )

      default:
        return (
          <GlassInput
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="-mx-2 mb-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--glass-bg)]">
      {/* Label -- skip for boolean (toggle has its own inline label) */}
      {field.type !== 'boolean' ? (
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          {field.label}
          {field.required && <span className="ml-0.5 text-red-400">*</span>}
        </label>
      ) : (
        <div className="flex items-center gap-3">
          {renderInput()}
          <label className="text-sm font-medium text-[var(--text-primary)]">{field.label}</label>
        </div>
      )}

      {/* Input -- rendered inline for boolean above, block for others */}
      {field.type !== 'boolean' && renderInput()}

      {/* Description */}
      {field.description && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{field.description}</p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>
      )}
    </div>
  )
}
