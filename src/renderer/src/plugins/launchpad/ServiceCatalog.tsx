/**
 * ServiceCatalog — Browsable cloud service catalog with category grouping.
 *
 * Renders services grouped by category with collapsible sections.
 * Each service has a toggle checkbox to add/remove it from the estimation.
 * Selected services are highlighted with an accent border.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CloudProvider } from '../../types/launchpad'
import { getCatalog } from '../../data/cloud-pricing/index'
import { useLaunchpadStore } from '../../stores/launchpad-store'

interface ServiceCatalogProps {
  provider: CloudProvider
}

export default function ServiceCatalog({ provider }: ServiceCatalogProps): React.JSX.Element {
  const catalog = getCatalog(provider)

  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const addService = useLaunchpadStore((s) => s.addService)
  const removeService = useLaunchpadStore((s) => s.removeService)

  // Track which categories are expanded; default all open
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const cat of catalog.categories) {
      initial[cat.id] = true
    }
    return initial
  })

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

  return (
    <div className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
        Service Catalog
      </p>

      <div className="flex flex-col gap-2">
        {catalog.categories.map((category) => {
          const isOpen = expanded[category.id] ?? true
          const selectedCount = category.services.filter((s) => isSelected(s.id)).length

          return (
            <div key={category.id} className="rounded-lg border border-border overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center justify-between bg-bg-secondary px-3 py-2 text-left transition-colors hover:bg-bg-secondary/80"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown size={14} className="text-text-secondary shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-text-secondary shrink-0" />
                  )}
                  <span className="text-sm font-medium text-text-primary">{category.name}</span>
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary/50">
                  {category.services.length} services
                </span>
              </button>

              {/* Service rows */}
              {isOpen && (
                <div className="divide-y divide-border">
                  {category.services.map((service) => {
                    const selected = isSelected(service.id)

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleToggle(category.id, service.id)}
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-l-2 border-l-accent bg-accent/5 hover:bg-accent/10'
                            : 'hover:bg-bg-secondary/60'
                        }`}
                      >
                        {/* Checkbox visual */}
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            selected
                              ? 'border-accent bg-accent text-white'
                              : 'border-border bg-bg-primary'
                          }`}
                        >
                          {selected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Service info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              selected ? 'text-accent' : 'text-text-primary'
                            }`}
                          >
                            {service.name}
                          </p>
                          <p className="text-xs text-text-secondary leading-relaxed mt-0.5 truncate">
                            {service.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
