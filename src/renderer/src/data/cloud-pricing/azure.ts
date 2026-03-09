/**
 * Azure curated pricing catalog.
 * Representative pay-as-you-go pricing for East US as of 2026-01.
 * Source: https://azure.microsoft.com/pricing/details/
 */

import type { ProviderCatalog, SelectOption } from './types'

export const AZURE_REGIONS: SelectOption[] = [
  { label: 'East US — eastus', value: 'eastus' },
  { label: 'West US 2 — westus2', value: 'westus2' },
  { label: 'West Europe — westeurope', value: 'westeurope' },
  { label: 'Southeast Asia — southeastasia', value: 'southeastasia' }
]

export const AZURE_CATALOG: ProviderCatalog = {
  provider: 'azure',
  regions: AZURE_REGIONS,
  categories: [
    {
      id: 'compute',
      name: 'Compute',
      services: [
        {
          id: 'azure-vm',
          name: 'Azure Virtual Machines',
          description: 'Scalable, on-demand VMs for Linux and Windows',
          configSchema: {
            vmSize: {
              type: 'select',
              label: 'VM Size',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/virtual-machines/linux/
                { label: 'B2s   (2 vCPU,  4 GB RAM)  — $0.042/hr', value: 'B2s',    pricePerHour: 0.042 },
                { label: 'B4ms  (4 vCPU, 16 GB RAM)  — $0.166/hr', value: 'B4ms',   pricePerHour: 0.166 },
                { label: 'D2s_v3 (2 vCPU, 8 GB RAM)  — $0.096/hr', value: 'D2s_v3', pricePerHour: 0.096 },
                { label: 'D4s_v3 (4 vCPU, 16 GB RAM) — $0.192/hr', value: 'D4s_v3', pricePerHour: 0.192 },
                { label: 'D8s_v3 (8 vCPU, 32 GB RAM) — $0.384/hr', value: 'D8s_v3', pricePerHour: 0.384 },
                { label: 'F2s_v2 (2 vCPU,  4 GB RAM) — $0.085/hr', value: 'F2s_v2', pricePerHour: 0.085 }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of VMs',
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
              options: AZURE_REGIONS
            }
          }
        },
        {
          id: 'azure-functions',
          name: 'Azure Functions',
          description: 'Event-driven serverless compute service',
          configSchema: {
            requests: {
              type: 'number',
              label: 'Executions per month (millions)',
              default: 1,
              min: 0
            },
            durationGbSeconds: {
              type: 'number',
              label: 'Avg GB-seconds per execution',
              default: 0.2,
              min: 0
            }
            // As of 2026-01, source: https://azure.microsoft.com/pricing/details/functions/
            // $0.20 per million executions (after 1M free/month)
            // $0.000016 per GB-second (after 400,000 free GB-seconds/month)
          }
        }
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      services: [
        {
          id: 'blob-storage',
          name: 'Blob Storage Hot',
          description: 'Azure Blob Storage — Hot access tier for frequently accessed data',
          configSchema: {
            storageGb: {
              type: 'number',
              label: 'Storage capacity (GB)',
              default: 100,
              min: 0
            },
            transferOutGb: {
              type: 'number',
              label: 'Data egress (GB/month)',
              default: 10,
              min: 0
            }
            // As of 2026-01, source: https://azure.microsoft.com/pricing/details/storage/blobs/
            // Hot tier storage: $0.018/GB/month (first 50 TB)
            // Data egress: $0.087/GB (first 10 TB)
          }
        },
        {
          id: 'managed-disk',
          name: 'Premium SSD Managed Disk',
          description: 'High-performance SSD persistent disk for Azure VMs',
          configSchema: {
            diskSize: {
              type: 'select',
              label: 'Disk Size',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/managed-disks/
                // Premium SSD sizes (P-series): fixed monthly pricing
                { label: 'P10 — 128 GB — $19.71/month',  value: 'P10',  pricePerHour: 19.71  / 730 },
                { label: 'P20 — 512 GB — $73.22/month',  value: 'P20',  pricePerHour: 73.22  / 730 },
                { label: 'P30 — 1 TB   — $135.17/month', value: 'P30',  pricePerHour: 135.17 / 730 },
                { label: 'P40 — 2 TB   — $261.48/month', value: 'P40',  pricePerHour: 261.48 / 730 }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of disks',
              default: 1,
              min: 1,
              max: 1000
            }
          }
        }
      ]
    },
    {
      id: 'database',
      name: 'Database',
      services: [
        {
          id: 'azure-sql',
          name: 'Azure SQL Database',
          description: 'Fully managed SQL database service built on SQL Server',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Service Tier',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/azure-sql-database/single/
                // DTU-based pricing (S-tier)
                { label: 'S1 — 10 DTU   — $30/month',   value: 'S1',  pricePerHour: 30   / 730 },
                { label: 'S2 — 50 DTU   — $75/month',   value: 'S2',  pricePerHour: 75   / 730 },
                { label: 'S3 — 100 DTU  — $150/month',  value: 'S3',  pricePerHour: 150  / 730 },
                { label: 'P1 — 125 DTU  — $465/month',  value: 'P1',  pricePerHour: 465  / 730 }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of databases',
              default: 1,
              min: 1,
              max: 100
            }
          }
        },
        {
          id: 'cosmos-db',
          name: 'Azure Cosmos DB',
          description: 'Globally distributed, multi-model NoSQL database',
          configSchema: {
            readUnits: {
              type: 'number',
              label: 'Request units (RU/s) for reads (thousands)',
              default: 1,
              min: 0
            },
            writeUnits: {
              type: 'number',
              label: 'Request units (RU/s) for writes (thousands)',
              default: 1,
              min: 0
            }
            // As of 2026-01, source: https://azure.microsoft.com/pricing/details/cosmos-db/autoscale-provisioned/
            // Provisioned throughput: $0.008 per RU/s per hour (100 RU/s = $0.80/hour or $58.40/month minimum)
            // Simplified: $0.00008/RU-hour for reads and writes combined
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
          description: 'Outbound data transfer from Azure to the internet',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Data transferred out (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://azure.microsoft.com/pricing/details/bandwidth/
            // $0.087/GB egress (first 10 TB/month)
          }
        },
        {
          id: 'azure-cdn',
          name: 'Azure CDN',
          description: 'Content Delivery Network for fast, reliable global delivery',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Data transferred (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://azure.microsoft.com/pricing/details/cdn/
            // Standard Microsoft CDN: $0.087/GB (first 10 TB from North America/Europe)
          }
        }
      ]
    },
    {
      id: 'serverless',
      name: 'Serverless',
      services: [
        {
          id: 'app-service',
          name: 'App Service',
          description: 'Fully managed platform for building, deploying, and scaling web apps',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Pricing Tier',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/app-service/linux/
                { label: 'B1 (1 core, 1.75 GB) — $0.018/hr',  value: 'B1', pricePerHour: 0.018 },
                { label: 'B2 (2 core, 3.5 GB)  — $0.036/hr',  value: 'B2', pricePerHour: 0.036 },
                { label: 'B3 (4 core, 7 GB)    — $0.072/hr',  value: 'B3', pricePerHour: 0.072 },
                { label: 'P1v3 (2 core, 8 GB)  — $0.151/hr',  value: 'P1v3', pricePerHour: 0.151 },
                { label: 'P2v3 (4 core, 16 GB) — $0.302/hr',  value: 'P2v3', pricePerHour: 0.302 }
              ]
            },
            instances: {
              type: 'number',
              label: 'Number of instances',
              default: 1,
              min: 1,
              max: 100
            }
          }
        }
      ]
    }
  ]
}
