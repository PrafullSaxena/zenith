/**
 * TypeScript types for the Launchpad cloud cost estimator plugin.
 * All UI components and the Zustand store depend on these types.
 */

/**
 * Supported cloud providers for cost estimation.
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure'

/**
 * A single option for a select-type config field.
 * pricePerHour is present for compute instance type selects.
 */
export interface SelectOption {
  label: string
  value: string
  pricePerHour?: number
}

/**
 * Describes a single field in a service's resource configuration form.
 * - 'select': renders a dropdown with predefined options
 * - 'number': renders a numeric input with optional min/max bounds
 */
export interface ConfigField {
  type: 'select' | 'number'
  label?: string
  default?: number | string
  min?: number
  max?: number
  options?: SelectOption[]
}

/**
 * Schema describing all configurable fields for a given service.
 */
export type ConfigSchema = Record<string, ConfigField>

/**
 * A single cloud service offering (e.g., EC2, S3, RDS).
 */
export interface ServiceDefinition {
  id: string
  name: string
  description: string
  configSchema: ConfigSchema
}

/**
 * A logical grouping of related services (e.g., Compute, Storage).
 */
export interface ServiceCategory {
  id: string
  name: string
  services: ServiceDefinition[]
}

/**
 * Complete pricing catalog for a single cloud provider.
 * Contains all available regions and service categories.
 */
export interface ProviderCatalog {
  provider: CloudProvider
  regions: SelectOption[]
  categories: ServiceCategory[]
}

/**
 * User-specified configuration values for a single service instance.
 * Keys correspond to ConfigField keys in the service's configSchema.
 */
export type ResourceConfig = Record<string, unknown>

/**
 * A selected service with its provider and user-configured resource settings.
 */
export interface ServiceSelection {
  serviceId: string
  categoryId: string
  config: ResourceConfig
}

/**
 * A single line item in a cost breakdown (e.g., "Storage: 100 GB @ $0.023/GB").
 */
export interface CostLineItem {
  label: string
  unitPrice: number
  quantity: number
  monthly: number
}

/**
 * The computed cost result for a single service selection.
 */
export interface ServiceCostResult {
  monthly: number
  yearly: number
  breakdown: CostLineItem[]
}

/**
 * A saved estimation entry in the history store.
 */
export interface EstimationEntry {
  id: string
  name: string
  provider: CloudProvider
  savedAt: string
  services: ServiceSelection[]
  totalMonthly: number
  totalYearly: number
}

/**
 * Serializable estimation data for PDF export.
 * Includes pre-computed line items and optional AI recommendations.
 */
export interface EstimationExport {
  name: string
  provider: CloudProvider
  lineItems: Array<{
    serviceName: string
    configSummary: string
    monthly: number
    yearly: number
  }>
  totalMonthly: number
  totalYearly: number
  aiRecommendations?: string
}

/**
 * AI advisor chat session state.
 */
export interface AiAdvisorSession {
  sessionId: string
  status: 'idle' | 'streaming' | 'complete' | 'error'
  rawText: string
  question: string
  error?: string
}

/**
 * A structured suggestion from the AI advisor.
 * Contains a provider and list of services with configs to apply to the estimator.
 */
export interface AiSuggestion {
  provider: CloudProvider
  services: Array<{
    serviceId: string
    config: ResourceConfig
  }>
}

/**
 * Available tabs in the Launchpad plugin view.
 */
export type LaunchpadTab = 'estimator' | 'ai-advisor' | 'history' | 'compare'
