/**
 * ResourceConfigurator — Per-service dynamic configuration forms.
 *
 * Renders a configuration card for each selected service using Card sections.
 * Form fields are driven by the service's configSchema:
 *  - 'select': Select dropdown with options (instance types, regions, etc.)
 *  - 'number': Input number field with min/max bounds
 *
 * Reads selected services from the store; writes config changes back via updateServiceConfig.
 */
import { useState, useCallback, useEffect } from 'react'
import { Settings2 } from 'lucide-react'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { SimpleSelect } from '@renderer/components/ui/select'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { getCatalog } from '../../data/cloud-pricing/index'
import type { ResourceConfig, ConfigField, SelectOption } from '../../types/launchpad'

/**
 * NumberInput — controlled number field with local string state.
 * Uses Input for glass styling.
 * Allows natural typing (clearing, decimal entry) while syncing
 * the parsed numeric value to the store on change.
 */
function NumberInput({
  value,
  min,
  max,
  label: _label,
  onChange
}: {
  value: number
  min?: number
  max?: number
  label?: string
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
        let clamped = parsed
        if (min !== undefined && clamped < min) clamped = min
        if (max !== undefined && clamped > max) clamped = max
        onChange(clamped)
      }
    },
    [onChange, min, max]
  )

  const handleBlur = useCallback(() => {
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
    <Input
      type="number"
      value={localValue}
      min={min}
      max={max}
     
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}

export default function ResourceConfigurator(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const updateServiceConfig = useLaunchpadStore((s) => s.updateServiceConfig)

  if (selectedServices.length === 0) {
    return (
      <EmptyState
        icon={Settings2}
        title="No services selected"
        description="Select services from the catalog on the left to configure their resources"
      />
    )
  }

  if (!provider) return <></>

  const catalog = getCatalog(provider)

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
      <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider pb-3">
        Resource Configuration
      </div>

      <div className="flex flex-col gap-4">
        {selectedServices.map((sel) => {
          const service = findService(sel.serviceId)
          if (!service) return null

          return (
            <Card key={sel.serviceId}>
              {/* Card header */}
              <p className="mb-3 text-sm font-semibold text-[hsl(var(--foreground))] border-b border-white/[0.06] pb-2">
                {service.name}
                <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]/50">
                  {service.description}
                </span>
              </p>

              {/* Config fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(service.configSchema).map(([key, field]: [string, ConfigField]) => {
                  const currentValue = sel.config[key]

                  if (field.type === 'select' && field.options) {
                    const currentOptionValue =
                      typeof currentValue === 'object' && currentValue !== null
                        ? (currentValue as SelectOption).value
                        : typeof currentValue === 'string'
                          ? currentValue
                          : field.options[0]?.value ?? ''

                    return (
                      <div key={key} className="flex flex-col gap-1">
                        {field.label && (
                          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                            {field.label}
                          </label>
                        )}
                        <SimpleSelect
                          options={field.options.map((opt: SelectOption) => ({
                            value: opt.value,
                            label: opt.label
                          }))}
                          value={currentOptionValue}
                          onChange={(newValue) => {
                            const selectedOption = field.options!.find(
                              (o) => o.value === newValue
                            )
                            handleFieldChange(
                              sel.serviceId,
                              sel.config,
                              key,
                              selectedOption ??
                                ({ value: newValue, label: newValue } as SelectOption)
                            )
                          }}
                        />
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
                      <NumberInput
                        key={key}
                        value={numValue}
                        min={field.min}
                        max={field.max}
                        label={field.label}
                        onChange={(n) =>
                          handleFieldChange(sel.serviceId, sel.config, key, n)
                        }
                      />
                    )
                  }

                  return null
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
