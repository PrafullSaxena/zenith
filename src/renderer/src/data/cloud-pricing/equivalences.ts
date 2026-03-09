/**
 * Cross-provider service equivalence map.
 * Links corresponding services across AWS, GCP, and Azure.
 * Used by the comparison view (LNCH-10) to build parallel estimates.
 */

import type { CloudProvider } from './types'

/**
 * Maps a canonical service name (AWS-centric) to equivalent service IDs
 * across all three cloud providers.
 *
 * Canonical ID (the key) is the AWS service ID.
 */
export const SERVICE_EQUIVALENCES: Record<string, Record<CloudProvider, string>> = {
  ec2:           { aws: 'ec2',           gcp: 'compute-engine',  azure: 'azure-vm'         },
  s3:            { aws: 's3',            gcp: 'cloud-storage',   azure: 'blob-storage'     },
  rds:           { aws: 'rds',           gcp: 'cloud-sql',       azure: 'azure-sql'        },
  lambda:        { aws: 'lambda',        gcp: 'cloud-functions', azure: 'azure-functions'  },
  dynamodb:      { aws: 'dynamodb',      gcp: 'firestore',       azure: 'cosmos-db'        },
  ebs:           { aws: 'ebs',           gcp: 'persistent-disk', azure: 'managed-disk'     },
  cloudfront:    { aws: 'cloudfront',    gcp: 'cloud-cdn',       azure: 'azure-cdn'        },
  'data-transfer':{ aws: 'data-transfer', gcp: 'data-transfer',  azure: 'data-transfer'   },
  'api-gateway': { aws: 'api-gateway',   gcp: 'cloud-run',       azure: 'app-service'      },
  eks:           { aws: 'eks',           gcp: 'gke',             azure: 'aks'              },
  fargate:       { aws: 'fargate',       gcp: 'cloud-run-jobs',  azure: 'azure-container-instances' }
}

/**
 * Given a service ID from any provider, returns the equivalent service ID
 * for the target provider. Returns null if no equivalent is found.
 *
 * @param sourceServiceId - Service ID from any provider (e.g., 'ec2', 'compute-engine', 'azure-vm')
 * @param targetProvider - The provider to map to
 * @returns Equivalent service ID in the target provider, or null
 */
export function getEquivalentServiceId(
  sourceServiceId: string,
  targetProvider: CloudProvider
): string | null {
  // Check if it's a canonical (AWS-centric) key directly
  const directEntry = SERVICE_EQUIVALENCES[sourceServiceId]
  if (directEntry) {
    return directEntry[targetProvider]
  }

  // Reverse lookup: find which canonical key this serviceId belongs to
  const canonicalId = findCanonicalId(sourceServiceId)
  if (canonicalId) {
    return SERVICE_EQUIVALENCES[canonicalId][targetProvider]
  }

  return null
}

/**
 * Given any provider-specific service ID, returns the canonical (AWS-centric) key.
 * Returns null if the service ID is not in the equivalence map.
 *
 * @param serviceId - Service ID from any provider
 * @returns Canonical key (AWS service ID), or null
 */
export function findCanonicalId(serviceId: string): string | null {
  // If the key itself is a canonical ID, return it directly
  if (SERVICE_EQUIVALENCES[serviceId]) {
    return serviceId
  }

  // Search all equivalence entries
  for (const [canonicalId, providerMap] of Object.entries(SERVICE_EQUIVALENCES)) {
    const values = Object.values(providerMap)
    if (values.includes(serviceId)) {
      return canonicalId
    }
  }

  return null
}

/**
 * Returns all canonical service IDs available in the equivalence map.
 */
export function getAllCanonicalIds(): string[] {
  return Object.keys(SERVICE_EQUIVALENCES)
}

/**
 * Returns the equivalent service IDs for all providers given a source service ID.
 * Returns null if the source service is not in the equivalence map.
 *
 * @param sourceServiceId - Service ID from any provider
 * @returns Record mapping all three providers to their equivalent service IDs, or null
 */
export function getAllEquivalents(
  sourceServiceId: string
): Record<CloudProvider, string> | null {
  const canonicalId = findCanonicalId(sourceServiceId)
  return canonicalId ? SERVICE_EQUIVALENCES[canonicalId] : null
}
