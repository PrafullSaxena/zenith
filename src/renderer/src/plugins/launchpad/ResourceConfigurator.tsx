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
import { useLaunchpadStore } from '../../stores/launchpad-store'
import { getCatalog } from '../../data/cloud-pricing/index'
import type { ResourceConfig, ConfigField, SelectOption } from '../../types/launchpad'

export default function ResourceConfigurator(): React.JSX.Element {
  const provider = useLaunchpadStore((s) => s.provider)
  const selectedServices = useLaunchpadStore((s) => s.selectedServices)
  const updateServiceConfig = useLaunchpadStore((s) => s.updateServiceConfig)

  if (selectedServices.length === 0) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-xs text-text-secondary/60 italic">
          Select services from the catalog to configure
        </p>
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
    rawValue: string | SelectOption
  ) => {
    updateServiceConfig(serviceId, { ...currentConfig, [fieldKey]: rawValue })
  }

  return (
    <div className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
        Resource Configuration
      </p>

      <div className="flex flex-col gap-3">
        {selectedServices.map((sel) => {
          const service = findService(sel.serviceId)
          if (!service) return null

          return (
            <div
              key={sel.serviceId}
              className="rounded-lg border border-border bg-bg-secondary p-4"
            >
              {/* Card header */}
              <p className="mb-3 text-sm font-semibold text-text-primary border-b border-border pb-2">
                {service.name}
              </p>

              {/* Config fields */}
              <div className="flex flex-col gap-3">
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
                              selectedOption ?? e.target.value
                            )
                          }}
                          className="w-full rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary transition focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
                        <input
                          type="number"
                          value={numValue}
                          min={field.min}
                          max={field.max}
                          onChange={(e) =>
                            handleFieldChange(
                              sel.serviceId,
                              sel.config,
                              key,
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary transition focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
