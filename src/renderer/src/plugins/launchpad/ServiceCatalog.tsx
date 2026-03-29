/**
 * ServiceCatalog — Browsable cloud service catalog with category grouping and fuzzy search.
 *
 * Renders services grouped by category with collapsible sections.
 * Each service has a toggle checkbox to add/remove it from the estimation.
 * Selected services are highlighted with an accent border.
 * Uses Card for category containers, Badge for selected count,
 * Skeleton for loading, and Input for search.
 */
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Input } from '@renderer/components/ui/input'
import type { CloudProvider } from '../../types/launchpad'
import type { ServiceDefinition } from '../../data/cloud-pricing/types'
import { getCatalog } from '../../data/cloud-pricing/index'
import { useLaunchpadStore } from '../../stores/launchpad-store'

interface ServiceCatalogProps {
  provider: CloudProvider
}

/**
 * Simple fuzzy match: checks if all characters of the query appear in order
 * within the target string (case-insensitive).
 */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  if (t.includes(q)) return true

  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export default function ServiceCatalog({ provider }: ServiceCatalogProps): React.JSX.Element {
  const catalog = getCatalog(provider)

  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const addService = useLaunchpadStore((s) => s.addService)
  const removeService = useLaunchpadStore((s) => s.removeService)

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading] = useState(false)

  // Track which categories are expanded; default all open
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const cat of catalog.categories) {
      initial[cat.id] = true
    }
    return initial
  })

  // Filter services based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return catalog.categories

    return catalog.categories
      .map((category) => {
        const matchingServices = category.services.filter(
          (service: ServiceDefinition) =>
            fuzzyMatch(searchQuery, service.name) ||
            fuzzyMatch(searchQuery, service.description) ||
            fuzzyMatch(searchQuery, service.id)
        )
        return { ...category, services: matchingServices }
      })
      .filter((category) => category.services.length > 0)
  }, [catalog.categories, searchQuery])

  const totalServices = catalog.categories.reduce((sum, cat) => sum + cat.services.length, 0)

  const toggleCategory = (categoryId: string) => {
    setExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const isSelected = (serviceId: string) =>
    selectedServices.some((s) => s.serviceId === serviceId)

  const handleToggle = (categoryId: string, serviceId: string) => {
    if (isSelected(serviceId)) {
      removeService(serviceId)
    } else {
      addService(categoryId, serviceId)
    }
  }

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="sticky top-0 z-10 bg-[hsl(var(--card))] p-3 border-b border-white/6">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]/60">
          Service Catalog
          <span className="ml-1 text-[hsl(var(--muted-foreground))]/40">({totalServices})</span>
        </p>

        {/* Search input */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]/40 z-10 pointer-events-none"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="pl-7 pr-7 py-1.5 text-xs bg-black/40 border-white/5 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors z-10"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Service list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-[hsl(var(--muted-foreground))]/50 italic">
              No services match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredCategories.map((category) => {
              const isOpen = expanded[category.id] ?? true
              const selectedCount = category.services.filter((s: ServiceDefinition) =>
                isSelected(s.id)
              ).length

              return (
                <div key={category.id} className="overflow-hidden rounded-xl border border-white/5 bg-black/20 backdrop-blur-md shadow-lg">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        {category.name}
                      </span>
                      {selectedCount > 0 && (
                        <Badge variant="default" className="scale-90">{selectedCount}</Badge>
                      )}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground/60">
                      {category.services.length}
                    </span>
                  </button>

                  {/* Service rows */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="divide-y divide-white/5 border-t border-white/5"
                      >
                        {category.services.map((service: ServiceDefinition) => {
                          const selected = isSelected(service.id)

                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleToggle(category.id, service.id)}
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                selected
                                  ? 'border-l-2 border-l-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm'
                                  : 'border-l-2 border-l-transparent hover:bg-white/5'
                              }`}
                            >
                              {/* Checkbox visual */}
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all ${
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]'
                                    : 'border-white/20 bg-black/40 shadow-inner'
                                }`}
                              >
                                {selected && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path
                                      d="M1 4L3.5 6.5L9 1"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>

                              {/* Service info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs font-semibold tracking-wide ${
                                    selected
                                      ? 'text-primary'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {service.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-0.5 line-clamp-2">
                                  {service.description}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
