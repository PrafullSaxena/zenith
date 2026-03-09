/**
 * GCP curated pricing catalog.
 * Representative on-demand pricing for us-central1 as of 2026-01.
 * Source: https://cloud.google.com/products/calculator
 */

import type { ProviderCatalog, SelectOption } from './types'

export const GCP_REGIONS: SelectOption[] = [
  { label: 'US Central (Iowa) — us-central1', value: 'us-central1' },
  { label: 'US East (South Carolina) — us-east1', value: 'us-east1' },
  { label: 'Europe West (Belgium) — europe-west1', value: 'europe-west1' },
  { label: 'Asia East (Taiwan) — asia-east1', value: 'asia-east1' }
]

export const GCP_CATALOG: ProviderCatalog = {
  provider: 'gcp',
  regions: GCP_REGIONS,
  categories: [
    {
      id: 'compute',
      name: 'Compute',
      services: [
        {
          id: 'compute-engine',
          name: 'Compute Engine',
          description: 'Scalable virtual machines running in Google\'s data centers',
          configSchema: {
            machineType: {
              type: 'select',
              label: 'Machine Type',
              options: [
                // As of 2026-01, source: https://cloud.google.com/compute/vm-instance-pricing
                { label: 'e2-standard-2 (2 vCPU,  8 GB RAM)  — $0.067/hr', value: 'e2-standard-2', pricePerHour: 0.067 },
                { label: 'n2-standard-2 (2 vCPU,  8 GB RAM)  — $0.097/hr', value: 'n2-standard-2', pricePerHour: 0.097 },
                { label: 'n2-standard-4 (4 vCPU, 16 GB RAM)  — $0.194/hr', value: 'n2-standard-4', pricePerHour: 0.194 },
                { label: 'n2-standard-8 (8 vCPU, 32 GB RAM)  — $0.388/hr', value: 'n2-standard-8', pricePerHour: 0.388 },
                { label: 'c2-standard-4 (4 vCPU, 16 GB RAM)  — $0.209/hr', value: 'c2-standard-4', pricePerHour: 0.209 },
                { label: 'c2-standard-8 (8 vCPU, 32 GB RAM)  — $0.418/hr', value: 'c2-standard-8', pricePerHour: 0.418 }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of instances',
              default: 1,
              min: 1,
              max: 1000
            },
            usageHoursPerMonth: {
              type: 'number',
              label: 'Usage hours per month',
              default: 730,
              min: 1,
              max: 744
            },
            region: {
              type: 'select',
              label: 'Region',
              options: GCP_REGIONS
            }
          }
        },
        {
          id: 'cloud-functions',
          name: 'Cloud Functions',
          description: 'Event-driven serverless compute platform',
          configSchema: {
            requests: {
              type: 'number',
              label: 'Invocations per month (millions)',
              default: 1,
              min: 0
            },
            durationGbSeconds: {
              type: 'number',
              label: 'Avg GB-seconds per invocation',
              default: 0.2,
              min: 0
            }
            // As of 2026-01, source: https://cloud.google.com/functions/pricing
            // $0.40 per million invocations (after 2M free/month)
            // $0.0000025 per GB-second (after 400,000 free GB-seconds)
          }
        }
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      services: [
        {
          id: 'cloud-storage',
          name: 'Cloud Storage Standard',
          description: 'Object storage for companies of all sizes — Standard class',
          configSchema: {
            storageGb: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 0
            },
            transferOutGb: {
              type: 'number',
              label: 'Data egress (GB/month)',
              default: 10,
              min: 0
            }
            // As of 2026-01, source: https://cloud.google.com/storage/pricing
            // Standard storage: $0.020/GB/month (us regions)
            // Network egress: $0.08/GB (first 1TB to internet from us)
          }
        },
        {
          id: 'persistent-disk',
          name: 'Persistent Disk SSD',
          description: 'High-performance SSD block storage for Compute Engine',
          configSchema: {
            sizeGb: {
              type: 'number',
              label: 'Disk size (GB)',
              default: 100,
              min: 10,
              max: 65536
            }
            // As of 2026-01, source: https://cloud.google.com/compute/disks-image-pricing
            // pd-ssd: $0.17/GB/month (us regions)
          }
        }
      ]
    },
    {
      id: 'database',
      name: 'Database',
      services: [
        {
          id: 'cloud-sql',
          name: 'Cloud SQL',
          description: 'Fully managed MySQL, PostgreSQL, and SQL Server databases',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Machine Tier',
              options: [
                // As of 2026-01, source: https://cloud.google.com/sql/pricing
                { label: 'db-n1-standard-1 (1 vCPU, 3.75 GB) — $0.105/hr', value: 'db-n1-standard-1', pricePerHour: 0.105 },
                { label: 'db-n1-standard-2 (2 vCPU, 7.5 GB)  — $0.210/hr', value: 'db-n1-standard-2', pricePerHour: 0.210 },
                { label: 'db-n1-standard-4 (4 vCPU, 15 GB)   — $0.420/hr', value: 'db-n1-standard-4', pricePerHour: 0.420 }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of instances',
              default: 1,
              min: 1,
              max: 100
            },
            highAvailability: {
              type: 'select',
              label: 'High Availability',
              options: [
                { label: 'Single zone', value: 'single' },
                { label: 'High availability (2x cost)', value: 'ha' }
              ]
            }
          }
        },
        {
          id: 'firestore',
          name: 'Firestore',
          description: 'Flexible, scalable NoSQL cloud database',
          configSchema: {
            readUnits: {
              type: 'number',
              label: 'Read operations per month (millions)',
              default: 1,
              min: 0
            },
            writeUnits: {
              type: 'number',
              label: 'Write operations per month (millions)',
              default: 1,
              min: 0
            }
            // As of 2026-01, source: https://cloud.google.com/firestore/pricing
            // $0.06 per 100,000 document reads
            // $0.18 per 100,000 document writes
          }
        }
      ]
    },
    {
      id: 'networking',
      name: 'Networking',
      services: [
        {
          id: 'data-transfer',
          name: 'Data Transfer Out',
          description: 'Outbound data transfer from GCP to the internet',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Data egress (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://cloud.google.com/vpc/network-pricing
            // $0.08/GB egress to internet (first 1 TB from us regions)
          }
        },
        {
          id: 'cloud-cdn',
          name: 'Cloud CDN',
          description: 'Content delivery network for Google Cloud',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Cache egress (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://cloud.google.com/cdn/pricing
            // $0.08/GB cache egress from North America
          }
        }
      ]
    },
    {
      id: 'serverless',
      name: 'Serverless',
      services: [
        {
          id: 'cloud-run',
          name: 'Cloud Run',
          description: 'Fully managed serverless platform for containerized applications',
          configSchema: {
            requestsPerMonth: {
              type: 'number',
              label: 'Requests per month (millions)',
              default: 1,
              min: 0
            },
            vcpu: {
              type: 'number',
              label: 'vCPU per instance',
              default: 1,
              min: 0.08,
              max: 8
            },
            memoryGb: {
              type: 'number',
              label: 'Memory per instance (GB)',
              default: 0.5,
              min: 0.128,
              max: 32
            }
            // As of 2026-01, source: https://cloud.google.com/run/pricing
            // $0.00002400 per vCPU-second, $0.00000250 per GB-second
            // $0.40 per million requests (after 2M free)
          }
        }
      ]
    }
  ]
}
