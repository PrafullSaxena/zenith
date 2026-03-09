/**
 * AWS curated pricing catalog.
 * Representative on-demand pricing for us-east-1 as of 2026-01.
 * Source: https://aws.amazon.com/pricing/
 */

import type { ProviderCatalog, SelectOption } from './types'

// As of 2026-01, source: https://aws.amazon.com/ec2/pricing/on-demand/
const HOURS_PER_MONTH = 730

export const AWS_REGIONS: SelectOption[] = [
  { label: 'US East (N. Virginia) — us-east-1', value: 'us-east-1' },
  { label: 'US West (Oregon) — us-west-2', value: 'us-west-2' },
  { label: 'EU (Ireland) — eu-west-1', value: 'eu-west-1' },
  { label: 'Asia Pacific (Singapore) — ap-southeast-1', value: 'ap-southeast-1' }
]

// Suppress unused variable warning — HOURS_PER_MONTH is the shared constant
// defined in calculator.ts; referenced here for documentation purposes only.
void HOURS_PER_MONTH

export const AWS_CATALOG: ProviderCatalog = {
  provider: 'aws',
  regions: AWS_REGIONS,
  categories: [
    {
      id: 'compute',
      name: 'Compute',
      services: [
        {
          id: 'ec2',
          name: 'EC2',
          description: 'Elastic Compute Cloud — virtual machines for any workload',
          configSchema: {
            instanceType: {
              type: 'select',
              label: 'Instance Type',
              options: [
                // As of 2026-01, source: https://aws.amazon.com/ec2/pricing/on-demand/
                { label: 't3.micro  (2 vCPU,  1 GB RAM)  — $0.0104/hr', value: 't3.micro',  pricePerHour: 0.0104 },
                { label: 't3.small  (2 vCPU,  2 GB RAM)  — $0.0208/hr', value: 't3.small',  pricePerHour: 0.0208 },
                { label: 't3.medium (2 vCPU,  4 GB RAM)  — $0.0416/hr', value: 't3.medium', pricePerHour: 0.0416 },
                { label: 't3.large  (2 vCPU,  8 GB RAM)  — $0.0832/hr', value: 't3.large',  pricePerHour: 0.0832 },
                { label: 'm5.large  (2 vCPU,  8 GB RAM)  — $0.096/hr',  value: 'm5.large',  pricePerHour: 0.096  },
                { label: 'm5.xlarge (4 vCPU, 16 GB RAM)  — $0.192/hr',  value: 'm5.xlarge', pricePerHour: 0.192  },
                { label: 'c5.large  (2 vCPU,  4 GB RAM)  — $0.085/hr',  value: 'c5.large',  pricePerHour: 0.085  },
                { label: 'c5.xlarge (4 vCPU,  8 GB RAM)  — $0.170/hr',  value: 'c5.xlarge', pricePerHour: 0.17   }
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
              options: AWS_REGIONS
            }
          }
        },
        {
          id: 'lambda',
          name: 'Lambda',
          description: 'Serverless compute — run code without provisioning servers',
          configSchema: {
            requests: {
              type: 'number',
              label: 'Requests per month (millions)',
              default: 1,
              min: 0
            },
            durationGbSeconds: {
              type: 'number',
              label: 'Avg GB-seconds per request',
              default: 0.2,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/lambda/pricing/
            // $0.20 per 1M requests + $0.0000166667 per GB-second
            // First 1M requests and 400,000 GB-seconds free per month
          }
        }
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      services: [
        {
          id: 's3',
          name: 'S3 Standard',
          description: 'Simple Storage Service — scalable object storage',
          configSchema: {
            storageGb: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 0
            },
            transferOutGb: {
              type: 'number',
              label: 'Data transfer out (GB/month)',
              default: 10,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/s3/pricing/
            // $0.023/GB storage, $0.09/GB data transfer out (first 10 TB)
          }
        },
        {
          id: 'ebs',
          name: 'EBS gp3',
          description: 'Elastic Block Store — persistent block storage for EC2',
          configSchema: {
            sizeGb: {
              type: 'number',
              label: 'Volume size (GB)',
              default: 100,
              min: 1,
              max: 16384
            }
            // As of 2026-01, source: https://aws.amazon.com/ebs/pricing/
            // gp3: $0.08/GB/month
          }
        }
      ]
    },
    {
      id: 'database',
      name: 'Database',
      services: [
        {
          id: 'rds',
          name: 'RDS',
          description: 'Relational Database Service — managed MySQL, PostgreSQL, and more',
          configSchema: {
            instanceClass: {
              type: 'select',
              label: 'Instance Class',
              options: [
                // As of 2026-01, source: https://aws.amazon.com/rds/mysql/pricing/
                { label: 'db.t3.micro  (2 vCPU,  1 GB RAM) — $0.017/hr', value: 'db.t3.micro',  pricePerHour: 0.017  },
                { label: 'db.t3.small  (2 vCPU,  2 GB RAM) — $0.034/hr', value: 'db.t3.small',  pricePerHour: 0.034  },
                { label: 'db.m5.large  (2 vCPU,  8 GB RAM) — $0.171/hr', value: 'db.m5.large',  pricePerHour: 0.171  }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Number of instances',
              default: 1,
              min: 1,
              max: 100
            },
            multiAz: {
              type: 'select',
              label: 'Multi-AZ deployment',
              options: [
                { label: 'Single-AZ', value: 'single' },
                { label: 'Multi-AZ (2x cost)', value: 'multi' }
              ]
            }
          }
        },
        {
          id: 'dynamodb',
          name: 'DynamoDB',
          description: 'Managed NoSQL database with single-digit millisecond latency',
          configSchema: {
            readUnits: {
              type: 'number',
              label: 'Read capacity units (millions/month)',
              default: 1,
              min: 0
            },
            writeUnits: {
              type: 'number',
              label: 'Write capacity units (millions/month)',
              default: 1,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/dynamodb/pricing/on-demand/
            // $0.25 per million read request units
            // $1.25 per million write request units
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
          description: 'Outbound data transfer from AWS to the internet',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Data transferred out (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/ec2/pricing/on-demand/ (Data Transfer section)
            // $0.09/GB first 10 TB/month out to internet
          }
        },
        {
          id: 'cloudfront',
          name: 'CloudFront',
          description: 'Content Delivery Network — global edge cache',
          configSchema: {
            gb: {
              type: 'number',
              label: 'Data transferred out (GB/month)',
              default: 100,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/cloudfront/pricing/
            // $0.085/GB first 10 TB/month from all edge locations
          }
        }
      ]
    },
    {
      id: 'serverless',
      name: 'Serverless',
      services: [
        {
          id: 'api-gateway',
          name: 'API Gateway',
          description: 'Fully managed API service for REST, HTTP, and WebSocket APIs',
          configSchema: {
            requestsPerMonth: {
              type: 'number',
              label: 'API calls per month (millions)',
              default: 1,
              min: 0
            }
            // As of 2026-01, source: https://aws.amazon.com/api-gateway/pricing/
            // HTTP API: $1.00 per million API calls (first 300M/month)
            // REST API: $3.50 per million API calls
          }
        }
      ]
    }
  ]
}
