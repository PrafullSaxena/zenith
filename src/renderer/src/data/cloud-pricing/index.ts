/**
 * Central export point for all cloud pricing catalogs.
 * Provides catalog access helpers and provider display metadata.
 */

import type { CloudProvider, ProviderCatalog } from './types'

export { AWS_CATALOG, AWS_REGIONS } from './aws'
export { GCP_CATALOG, GCP_REGIONS } from './gcp'
export { AZURE_CATALOG, AZURE_REGIONS } from './azure'

import { AWS_CATALOG } from './aws'
import { GCP_CATALOG } from './gcp'
import { AZURE_CATALOG } from './azure'

/**
 * Provider display metadata (name, label, icon).
 */
export const PROVIDER_INFO: Record<CloudProvider, { displayName: string; shortName: string; icon: string; color: string }> = {
  aws: {
    displayName: 'Amazon Web Services',
    shortName: 'AWS',
    icon: 'Cloud',
    color: '#FF9900'
  },
  gcp: {
    displayName: 'Google Cloud Platform',
    shortName: 'GCP',
    icon: 'Globe',
    color: '#4285F4'
  },
  azure: {
    displayName: 'Microsoft Azure',
    shortName: 'Azure',
    icon: 'Server',
    color: '#0078D4'
  }
}

const CATALOG_MAP: Record<CloudProvider, ProviderCatalog> = {
  aws: AWS_CATALOG,
  gcp: GCP_CATALOG,
  azure: AZURE_CATALOG
}

/**
 * Returns the pricing catalog for the specified cloud provider.
 */
export function getCatalog(provider: CloudProvider): ProviderCatalog {
  return CATALOG_MAP[provider]
}
