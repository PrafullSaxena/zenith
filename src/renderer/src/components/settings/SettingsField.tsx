import { useState } from 'react'
import { Eye, EyeOff, FolderOpen, X } from 'lucide-react'
import type { SettingsField as SettingsFieldType } from '../../types/plugin'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Textarea } from '@renderer/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
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
          <Input
            type="text"
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'password':
        return (
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              className={`pr-10 ${error ? 'border-destructive' : ''}`}
              value={(value as string) ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'boolean':
        return (
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
          />
        )

      case 'select':
        return (
          <Select value={(value as string) ?? ''} onValueChange={(val) => onChange(val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder ?? 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'textarea':
        return (
          <Textarea
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            className="min-h-[120px] resize-y font-mono text-xs"
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
            <Input
              type="text"
              className="flex-1"
              value={(value as string) ?? ''}
              placeholder={field.placeholder ?? 'Default (OS Downloads folder)'}
              readOnly
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await window.api.app.selectDirectory((value as string) || undefined)
                if (!result.canceled && result.path) {
                  onChange(result.path)
                }
              }}
            >
              <FolderOpen size={14} className="mr-1" />
              Browse
            </Button>
            {!!value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                title="Reset to default"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="-mx-2 mb-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/3">
      {/* Label -- skip for boolean (toggle has its own inline label) */}
      {field.type !== 'boolean' ? (
        <Label className="mb-1.5 block text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      ) : (
        <div className="flex items-center gap-3">
          {renderInput()}
          <Label className="text-sm font-medium">{field.label}</Label>
        </div>
      )}

      {/* Input -- rendered inline for boolean above, block for others */}
      {field.type !== 'boolean' && renderInput()}

      {/* Description */}
      {field.description && (
        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
