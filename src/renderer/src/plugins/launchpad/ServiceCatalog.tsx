/**
 * ServiceCatalog — DB-driven, virtualized cloud service catalog.
 *
 * Loads catalog from DB via IPC (window.api.launchpad.getCatalog).
 * Uses @tanstack/react-virtual for virtualized list rendering — only visible rows in DOM.
 * In-memory search index built once on catalog load — no DB query per keystroke.
 * Horizontal filter chips (All + category chips) for category filtering.
 * Row-tint selection with checkmark indicator.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, X, Check } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import type { CloudProvider } from '../../types/launchpad'

interface ServiceCatalogProps {
  provider: CloudProvider
}

export default function ServiceCatalog({ provider }: ServiceCatalogProps): React.JSX.Element {
  const dbCatalog = useLaunchpadStore(s => s.dbCatalog)
  const loadDbCatalog = useLaunchpadStore(s => s.loadDbCatalog)
  const selectedServices = useLaunchpadStore(s => s.selectedServices)
  const addService = useLaunchpadStore(s => s.addService)
  const removeService = useLaunchpadStore(s => s.removeService)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const parentRef = useRef<HTMLDivElement>(null)

  // Load catalog on provider change
  useEffect(() => {
    loadDbCatalog(provider)
    setSearchQuery('')
    setActiveCategory('All')
  }, [provider, loadDbCatalog])

  // Filtered items derived from in-memory search index
  const filteredItems = useMemo(() => {
    const { services, searchIndex } = dbCatalog
    let items = services

    if (searchQuery.trim()) {
      // Search overrides category chip — flat results
      const q = searchQuery.toLowerCase().trim()
      items = services.filter((_, i) => searchIndex[i]?.includes(q))
    } else if (activeCategory !== 'All') {
      items = services.filter(s => s.category === activeCategory)
    }
    return items
  }, [dbCatalog, searchQuery, activeCategory])

  // Virtualizer setup — row height 40px
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header: search + filter chips */}
      <div className="shrink-0 sticky top-0 z-10 bg-[hsl(var(--card))] border-b border-white/6 p-3 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="pl-7 pr-7 py-1.5 text-xs bg-black/40 border-white/5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {['All', ...dbCatalog.categories].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => { setActiveCategory(cat); setSearchQuery('') }}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                activeCategory === cat && !searchQuery
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Virtualized list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {dbCatalog.status === 'loading' ? (
          <div className="p-2 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 p-4">
            {searchQuery ? `No services match "${searchQuery}"` : 'No services available.'}
          </p>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualItem => {
              const service = filteredItems[virtualItem.index]
              const selected = selectedServices.some(s => s.serviceId === service.id)
              return (
                <button
                  key={virtualItem.key}
                  type="button"
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                  onClick={() => selected ? removeService(service.id) : addService(service.category, service.id)}
                  className={`flex items-center gap-2 px-3 text-left w-full transition-colors border-b border-white/4 ${
                    selected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Category badge */}
                  <Badge
                    variant="outline"
                    className="text-[9px] shrink-0 px-1.5 py-0 h-4 leading-4 border-white/10 text-muted-foreground/60 font-normal"
                  >
                    {service.category}
                  </Badge>
                  {/* Service name */}
                  <span className={`flex-1 text-xs font-medium truncate ${selected ? 'text-primary' : 'text-foreground/90'}`}>
                    {service.name}
                  </span>
                  {/* Checkmark — only when selected */}
                  {selected && <Check size={11} className="shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
