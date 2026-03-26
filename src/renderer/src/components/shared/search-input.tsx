import { useState, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Input } from '@renderer/components/ui/input'

interface SearchInputProps {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
  icon?: LucideIcon
  shortcut?: string
  className?: string
  autoFocus?: boolean
}

export function SearchInput({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  icon: Icon = Search,
  shortcut,
  className,
  autoFocus
}: SearchInputProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      const trimmed = newValue.trim()
      if (!trimmed) {
        // Clear search instantly
        onSearch('')
        return
      }

      timeoutRef.current = setTimeout(() => {
        onSearch(trimmed)
      }, debounceMs)
    },
    [onSearch, debounceMs]
  )

  return (
    <div className={cn('relative', className)}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        className={cn('pl-10', shortcut && 'pr-16')}
      />
      {shortcut && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
