import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@renderer/components/ui/command'
import {
  Dialog,
  DialogContent
} from '@renderer/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandPaletteItem {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  shortcut?: string
  onSelect: () => void
  group?: string
}

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  registerItems: (items: CommandPaletteItem[]) => void
  unregisterItems: (ids: string[]) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: false,
  setOpen: () => {},
  registerItems: () => {},
  unregisterItems: () => {}
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

// ---------------------------------------------------------------------------
// Shortcut rendering
// ---------------------------------------------------------------------------

function ShortcutKeys({ shortcut }: { shortcut: string }) {
  const keys = shortcut.split('+').map((k) => k.trim())
  return (
    <div className="ml-auto flex items-center gap-0.5">
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="text-xs bg-secondary px-1.5 py-0.5 rounded border border-border font-mono text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CommandPalette (internal)
// ---------------------------------------------------------------------------

function CommandPalette({
  items,
  open,
  setOpen,
  placeholder = 'Type a command or search...'
}: {
  items: CommandPaletteItem[]
  open: boolean
  setOpen: (open: boolean) => void
  placeholder?: string
}) {
  // Group items
  const groups = useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>()
    for (const item of items) {
      const group = item.group ?? 'Commands'
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(item)
    }
    return map
  }, [items])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-xl [&>button]:hidden">
        <Command className="rounded-xl">
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Array.from(groups.entries()).map(([group, groupItems]) => (
              <CommandGroup key={group} heading={group}>
                {groupItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => {
                        item.onSelect()
                        setOpen(false)
                      }}
                    >
                      {Icon && <Icon size={16} className="mr-2 shrink-0" />}
                      <span className="flex-1">{item.label}</span>
                      {item.description && (
                        <span className="text-sm text-muted-foreground mr-2">
                          {item.description}
                        </span>
                      )}
                      {item.shortcut && <ShortcutKeys shortcut={item.shortcut} />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CommandPaletteProvider({
  children,
  defaultItems = [],
  placeholder
}: {
  children: React.ReactNode
  defaultItems?: CommandPaletteItem[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [dynamicItems, setDynamicItems] = useState<CommandPaletteItem[]>([])

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const registerItems = useCallback((items: CommandPaletteItem[]) => {
    setDynamicItems((prev) => {
      const ids = new Set(items.map((i) => i.id))
      return [...prev.filter((i) => !ids.has(i.id)), ...items]
    })
  }, [])

  const unregisterItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setDynamicItems((prev) => prev.filter((i) => !idSet.has(i.id)))
  }, [])

  const allItems = useMemo(
    () => [...defaultItems, ...dynamicItems],
    [defaultItems, dynamicItems]
  )

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({ open, setOpen, registerItems, unregisterItems }),
    [open, registerItems, unregisterItems]
  )

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        items={allItems}
        open={open}
        setOpen={setOpen}
        placeholder={placeholder}
      />
    </CommandPaletteContext.Provider>
  )
}
