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
import { Card } from '@renderer/components/ui/card'
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
      <div className="sticky top-0 z-10 bg-[hsl(var(--card))] p-3 border-b border-white/[0.06]">
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
            className="pl-7 pr-7 py-1.5 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--foreground))] transition-colors z-10"
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
                <Card key={category.id} className="p-0 overflow-hidden rounded-xl">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-1.5">
                      {isOpen ? (
                        <ChevronDown
                          size={12}
                          className="text-[hsl(var(--muted-foreground))] shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={12}
                          className="text-[hsl(var(--muted-foreground))] shrink-0"
                        />
                      )}
                      <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                        {category.name}
                      </span>
                      {selectedCount > 0 && (
                        <Badge variant="default">{selectedCount}</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]/40">
                      {category.services.length}
                    </span>
                  </button>

                  {/* Service rows */}
                  {isOpen && (
                    <div className="divide-y divide-white/[0.04]">
                      {category.services.map((service: ServiceDefinition) => {
                        const selected = isSelected(service.id)

                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleToggle(category.id, service.id)}
                            className={`flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors ${
                              selected
                                ? 'border-l-2 border-l-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Checkbox visual */}
                            <div
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                selected
                                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                                  : 'border-white/[0.12] bg-white/[0.04]'
                              }`}
                            >
                              {selected && (
                                <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
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
                                className={`text-xs font-medium leading-tight ${
                                  selected
                                    ? 'text-[var(--primary)]'
                                    : 'text-[hsl(var(--foreground))]'
                                }`}
                              >
                                {service.name}
                              </p>
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60 leading-snug mt-0.5 line-clamp-2">
                                {service.description}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
