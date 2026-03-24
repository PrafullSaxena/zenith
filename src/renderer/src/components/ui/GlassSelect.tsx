import { forwardRef, useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from './glass-utils'
import { DURATION, EASE } from '@renderer/lib/motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassSelectOption {
  value: string
  label: string
}

export interface GlassSelectProps {
  options: GlassSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlassSelect = forwardRef<HTMLDivElement, GlassSelectProps>(
  ({ options, value, onChange, placeholder = 'Select...', disabled, error, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find((o) => o.value === value)
    const selectedIndex = options.findIndex((o) => o.value === value)

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return

      const handleMouseDown = (e: MouseEvent): void => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleMouseDown)
      return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [isOpen])

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!isOpen) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(true)
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
          }
          return
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev))
            break
          case 'ArrowUp':
            e.preventDefault()
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
              onChange(options[highlightedIndex].value)
              setIsOpen(false)
            }
            break
          case 'Escape':
            e.preventDefault()
            setIsOpen(false)
            break
        }
      },
      [isOpen, highlightedIndex, options, onChange, selectedIndex]
    )

    const handleTriggerClick = (): void => {
      if (disabled) return
      setIsOpen((prev) => !prev)
      if (!isOpen) {
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
      }
    }

    const handleOptionClick = (optionValue: string): void => {
      onChange(optionValue)
      setIsOpen(false)
    }

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn('relative', className)}
        onKeyDown={handleKeyDown}
      >
        {/* Trigger */}
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-left transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:shadow-[var(--glass-glow)]',
            disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
            error && 'border-[var(--color-error)]/60',
            !disabled && !error && 'hover:border-white/[0.12]'
          )}
        >
          <span className={selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'text-[var(--text-secondary)] transition-transform duration-[var(--duration-fast)]',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.fast, ease: EASE.out as unknown as number[] }}
              className="absolute left-0 right-0 mt-1 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden"
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left cursor-pointer transition-colors',
                    option.value === value
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : 'text-[var(--text-primary)]',
                    highlightedIndex === index && option.value !== value && 'bg-white/[0.06]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

GlassSelect.displayName = 'GlassSelect'
