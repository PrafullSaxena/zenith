/**
 * ResourceConfigurator — Per-service dynamic configuration forms.
 *
 * Renders a configuration card for each selected service.
 * Form fields are driven by the service's configSchema:
 *  - 'select': dropdown with options (instance types, regions, etc.)
 *  - 'number': number input with min/max bounds
 *
 * Reads selected services from the store; writes config changes back via updateServiceConfig.
 */
import { useState, useCallback, useEffect } from 'react'
import { Settings2 } from 'lucide-react'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { getCatalog } from '../../data/cloud-pricing/index'
import type { ResourceConfig, ConfigField, SelectOption } from '../../types/launchpad'

/**
 * NumberInput — controlled number field with local string state.
 * Allows natural typing (clearing, decimal entry) while syncing
 * the parsed numeric value to the store on change.
 */
function NumberInput({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}): React.JSX.Element {
  const [localValue, setLocalValue] = useState<string>(String(value))

  // Sync external value changes (e.g., AI advisor applying suggestions)
  useEffect(() => {
    setLocalValue(String(value))
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setLocalValue(raw)

      const parsed = parseFloat(raw)
      if (!isNaN(parsed) && isFinite(parsed)) {
        // Clamp to bounds if provided
        let clamped = parsed
        if (min !== undefined && clamped < min) clamped = min
        if (max !== undefined && clamped > max) clamped = max
        onChange(clamped)
      }
    },
    [onChange, min, max]
  )

  const handleBlur = useCallback(() => {
    // On blur, normalize the display value
    const parsed = parseFloat(localValue)
    if (isNaN(parsed) || !isFinite(parsed)) {
      const fallback = min ?? 0
      setLocalValue(String(fallback))
      onChange(fallback)
    } else {
      let clamped = parsed
      if (min !== undefined && clamped < min) clamped = min
      if (max !== undefined && clamped > max) clamped = max
      setLocalValue(String(clamped))
      onChange(clamped)
    }
  }, [localValue, min, max, onChange])

  return (
    <input
      type="number"
      value={localValue}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary transition focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
    />
  )
}

export default function ResourceConfigurator(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const updateServiceConfig = useLaunchpadStore((s) => s.updateServiceConfig)

  if (selectedServices.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-xs">
          <Settings2 size={28} className="mx-auto mb-3 text-text-secondary/20" />
          <p className="text-sm text-text-secondary/60">No services selected</p>
          <p className="mt-1 text-xs text-text-secondary/40">
            Select services from the catalog on the left to configure their resources
          </p>
        </div>
      </div>
    )
  }

  if (!provider) return <></>

  const catalog = getCatalog(provider)

  // Find a service definition in catalog by id
  const findService = (serviceId: string) => {
    for (const category of catalog.categories) {
      const service = category.services.find((s) => s.id === serviceId)
      if (service) return service
    }
    return null
  }

  const handleFieldChange = (
    serviceId: string,
    currentConfig: ResourceConfig,
    fieldKey: string,
    rawValue: number | SelectOption
  ) => {
    updateServiceConfig(serviceId, { ...currentConfig, [fieldKey]: rawValue })
  }

  return (
    <div className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
        Resource Configuration
      </p>

      <div className="flex flex-col gap-4">
        {selectedServices.map((sel) => {
          const service = findService(sel.serviceId)
          if (!service) return null

          return (
            <div
              key={sel.serviceId}
              className="rounded-lg border border-border bg-surface p-4"
            >
              {/* Card header */}
              <p className="mb-3 text-sm font-semibold text-text-primary border-b border-border pb-2">
                {service.name}
                <span className="ml-2 text-xs font-normal text-text-secondary/50">
                  {service.description}
                </span>
              </p>

              {/* Config fields — grid layout for better space usage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(service.configSchema).map(([key, field]: [string, ConfigField]) => {
                  const currentValue = sel.config[key]

                  if (field.type === 'select' && field.options) {
                    // Find selected option — currentValue may be a SelectOption or a string value
                    const currentOptionValue =
                      typeof currentValue === 'object' && currentValue !== null
                        ? (currentValue as SelectOption).value
                        : typeof currentValue === 'string'
                          ? currentValue
                          : field.options[0]?.value ?? ''

                    return (
                      <div key={key} className="flex flex-col gap-1">
                        {field.label && (
                          <label className="text-xs font-medium text-text-secondary">
                            {field.label}
                          </label>
                        )}
                        <select
                          value={currentOptionValue}
                          onChange={(e) => {
                            const selectedOption = field.options!.find(
                              (o) => o.value === e.target.value
                            )
                            handleFieldChange(
                              sel.serviceId,
                              sel.config,
                              key,
                              selectedOption ?? ({ value: e.target.value, label: e.target.value } as SelectOption)
                            )
                          }}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary transition focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        >
                          {field.options.map((opt: SelectOption) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }

                  if (field.type === 'number') {
                    const numValue =
                      typeof currentValue === 'number'
                        ? currentValue
                        : typeof field.default === 'number'
                          ? field.default
                          : 0

                    return (
                      <div key={key} className="flex flex-col gap-1">
                        {field.label && (
                          <label className="text-xs font-medium text-text-secondary">
                            {field.label}
                          </label>
                        )}
                        <NumberInput
                          value={numValue}
                          min={field.min}
                          max={field.max}
                          onChange={(n) =>
                            handleFieldChange(sel.serviceId, sel.config, key, n)
                          }
                        />
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
