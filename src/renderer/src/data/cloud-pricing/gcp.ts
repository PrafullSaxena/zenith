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
        },
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
        },
        {
          id: 'gke',
          name: 'GKE',
          description: 'Google Kubernetes Engine — managed Kubernetes with Autopilot or Standard mode',
          configSchema: {
            clusters: {
              type: 'number',
              label: 'Number of clusters',
              default: 1,
              min: 1,
              max: 100
            },
            nodeInstanceType: {
              type: 'select',
              label: 'Node Machine Type',
              options: [
                // As of 2026-01, GKE Standard cluster management: $0.10/hr ($73/month)
                // Node costs are Compute Engine on-demand prices
                { label: 'e2-standard-2 (2 vCPU, 8 GB)  — $0.067/hr', value: 'e2-standard-2', pricePerHour: 0.067 },
                { label: 'e2-standard-4 (4 vCPU, 16 GB) — $0.134/hr', value: 'e2-standard-4', pricePerHour: 0.134 },
                { label: 'n2-standard-2 (2 vCPU, 8 GB)  — $0.097/hr', value: 'n2-standard-2', pricePerHour: 0.097 },
                { label: 'n2-standard-4 (4 vCPU, 16 GB) — $0.194/hr', value: 'n2-standard-4', pricePerHour: 0.194 },
                { label: 'n2-standard-8 (8 vCPU, 32 GB) — $0.388/hr', value: 'n2-standard-8', pricePerHour: 0.388 }
              ]
            },
            nodeCount: {
              type: 'number',
              label: 'Worker nodes per cluster',
              default: 3,
              min: 1,
              max: 500
            }
            // GKE Standard cluster: $0.10/hr per cluster ($73/month)
            // GKE Autopilot: per-pod pricing (vCPU + memory), simplified here as Standard
          }
        },
        {
          id: 'cloud-run-jobs',
          name: 'Cloud Run (Jobs)',
          description: 'Serverless containers for batch jobs without cluster management',
          configSchema: {
            tasks: {
              type: 'number',
              label: 'Number of container instances',
              default: 5,
              min: 1,
              max: 10000
            },
            vcpu: {
              type: 'select',
              label: 'vCPU per instance',
              options: [
                // As of 2026-01, source: https://cloud.google.com/run/pricing
                { label: '1 vCPU  — $0.02400/hr', value: '1',  pricePerHour: 0.02400 },
                { label: '2 vCPU  — $0.04800/hr', value: '2',  pricePerHour: 0.04800 },
                { label: '4 vCPU  — $0.09600/hr', value: '4',  pricePerHour: 0.09600 },
                { label: '8 vCPU  — $0.19200/hr', value: '8',  pricePerHour: 0.19200 }
              ]
            },
            memoryGb: {
              type: 'select',
              label: 'Memory per instance (GB)',
              options: [
                { label: '0.5 GB — $0.00250/hr', value: '0.5', pricePerHour: 0.00250 },
                { label: '1 GB   — $0.00250/hr', value: '1',   pricePerHour: 0.00250 },
                { label: '2 GB   — $0.00500/hr', value: '2',   pricePerHour: 0.00500 },
                { label: '4 GB   — $0.01000/hr', value: '4',   pricePerHour: 0.01000 },
                { label: '8 GB   — $0.02000/hr', value: '8',   pricePerHour: 0.02000 }
              ]
            },
            hoursPerMonth: {
              type: 'number',
              label: 'Hours running per month',
              default: 730,
              min: 1,
              max: 744
            }
          }
        },
        {
          id: 'app-engine',
          name: 'App Engine',
          description: 'Fully managed PaaS for web app deployment and scaling',
          configSchema: {
            instances: {
              type: 'number',
              label: 'Instances',
              default: 1,
              min: 1,
              max: 100
            }
            // app_engine_instance_hr: $0.05/instance-hour
          }
        },
        {
          id: 'cloud-batch',
          name: 'Cloud Batch',
          description: 'Fully managed batch job scheduling and execution',
          configSchema: {
            vcpuHours: {
              type: 'number',
              label: 'vCPU-hours/mo',
              default: 100,
              min: 1,
              max: 100000
            }
            // batch_vcpu_hr: $0.048/vCPU-hour
          }
        },
        {
          id: 'artifact-registry',
          name: 'Artifact Registry',
          description: 'Managed repository for container images and artifacts',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 10,
              min: 1,
              max: 10000
            }
            // artifact_gb: $0.10/GB/month
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
        },
        {
          id: 'filestore',
          name: 'Filestore',
          description: 'Managed NFS file system for GCP workloads',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 1024,
              min: 1024,
              max: 100000
            }
            // filestore_gb: $0.20/GB/month
          }
        },
        {
          id: 'cloud-backup',
          name: 'Cloud Backup',
          description: 'Centralized backup storage for GCP resources',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Backup storage (GB)',
              default: 100,
              min: 1,
              max: 1000000
            }
            // backup_gb: $0.023/GB/month
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
        },
        {
          id: 'bigtable',
          name: 'Bigtable',
          description: 'Scalable wide-column NoSQL for high-throughput workloads',
          configSchema: {
            nodes: {
              type: 'number',
              label: 'Nodes',
              default: 1,
              min: 1,
              max: 100
            },
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 1,
              max: 1000000
            }
            // bigtable_node_hr: $0.65/node-hour, bigtable_gb: $0.017/GB/month
          }
        },
        {
          id: 'spanner',
          name: 'Cloud Spanner',
          description: 'Globally distributed, strongly consistent relational database',
          configSchema: {
            processingUnits: {
              type: 'number',
              label: 'Processing Units',
              default: 100,
              min: 100,
              max: 10000
            }
            // spanner_pu_hr: $0.09/processing-unit-hour
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
        },
        {
          id: 'cloud-nat',
          name: 'Cloud NAT',
          description: 'Managed NAT for private subnet outbound internet access',
          configSchema: {
            gatewayHours: {
              type: 'number',
              label: 'Gateway hours/mo',
              default: 730,
              min: 1,
              max: 730
            },
            dataGB: {
              type: 'number',
              label: 'Data processed (GB)',
              default: 100,
              min: 0,
              max: 100000
            }
            // nat_hr: $0.044/hr, nat_data_gb: $0.045/GB
          }
        },
        {
          id: 'cloud-dns',
          name: 'Cloud DNS',
          description: 'Scalable, reliable and managed DNS service',
          configSchema: {
            zones: {
              type: 'number',
              label: 'Managed Zones',
              default: 1,
              min: 1,
              max: 10000
            },
            queriesMillions: {
              type: 'number',
              label: 'Queries (millions/mo)',
              default: 1,
              min: 0.1,
              max: 100000
            }
            // dns_zone: $0.20/zone/month, dns_m_queries: $0.40/million
          }
        }
      ]
    },
    {
      id: 'mlai',
      name: 'ML/AI',
      services: [
        {
          id: 'vertex-ai',
          name: 'Vertex AI',
          description: 'Unified ML platform for training and serving models',
          configSchema: {
            machineType: {
              type: 'select',
              label: 'Machine Type',
              options: [
                { label: 'n1-standard-4             — $0.19/hr',  value: 'n1-std-4',     pricePerHour: 0.19  },
                { label: 'n1-highmem-8              — $0.57/hr',  value: 'n1-highmem-8', pricePerHour: 0.57  },
                { label: 'a2-highgpu-1g (A100 GPU)  — $3.67/hr',  value: 'a2-highgpu-1g', pricePerHour: 3.67 }
              ]
            },
            usageHoursPerMonth: {
              type: 'number',
              label: 'Usage hours/mo',
              default: 100,
              min: 1,
              max: 730
            }
          }
        },
        {
          id: 'vision-ai',
          name: 'Vision AI',
          description: 'ML-powered image analysis and content classification',
          configSchema: {
            unitsThousands: {
              type: 'number',
              label: 'Images (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // vision_k: $1.50/thousand images
          }
        },
        {
          id: 'natural-language-ai',
          name: 'Natural Language AI',
          description: 'NLP API for text analysis, sentiment, and entity recognition',
          configSchema: {
            unitsThousands: {
              type: 'number',
              label: 'Text units (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // nlp_k: $1.00/thousand units
          }
        },
        {
          id: 'translation-ai',
          name: 'Translation AI',
          description: 'Neural machine translation for 100+ languages',
          configSchema: {
            charsMillions: {
              type: 'number',
              label: 'Characters (millions/mo)',
              default: 1,
              min: 0.1,
              max: 10000
            }
            // translate_m_chars: $20.00/million characters
          }
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Streaming',
      services: [
        {
          id: 'bigquery',
          name: 'BigQuery',
          description: 'Serverless, highly scalable data warehouse and analytics engine',
          configSchema: {
            queryTB: {
              type: 'number',
              label: 'Query data scanned (TB/mo)',
              default: 1,
              min: 0.01,
              max: 1000
            },
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 1,
              max: 1000000
            }
            // bq_query_tb: $5.00/TB, bq_storage_gb: $0.02/GB/month
          }
        },
        {
          id: 'pub-sub',
          name: 'Pub/Sub',
          description: 'Asynchronous messaging service for event-driven systems',
          configSchema: {
            dataGB: {
              type: 'number',
              label: 'Message data (GB/mo)',
              default: 10,
              min: 0.1,
              max: 100000
            }
            // pubsub_gb: $0.04/GB
          }
        },
        {
          id: 'dataflow',
          name: 'Dataflow',
          description: 'Managed stream and batch data processing with Apache Beam',
          configSchema: {
            vcpuHours: {
              type: 'number',
              label: 'vCPU-hours/mo',
              default: 100,
              min: 1,
              max: 100000
            }
            // dataflow_vcpu_hr: $0.056/vCPU-hour
          }
        },
        {
          id: 'looker-studio',
          name: 'Looker Studio',
          description: 'Free BI and data visualization tool (Looker Studio Pro for advanced features)',
          configSchema: {
            reportCount: {
              type: 'number',
              label: 'Reports',
              default: 1,
              min: 1,
              max: 1000
            }
            // Free tier — $0/report for standard use
          }
        }
      ]
    },
    {
      id: 'messaging',
      name: 'Messaging/Integration',
      services: [
        {
          id: 'cloud-tasks',
          name: 'Cloud Tasks',
          description: 'Managed task queue for asynchronous workload distribution',
          configSchema: {
            tasksMillions: {
              type: 'number',
              label: 'Tasks (millions/mo)',
              default: 10,
              min: 0.1,
              max: 100000
            }
            // cloud_tasks_m: $0.40/million tasks
          }
        },
        {
          id: 'cloud-scheduler',
          name: 'Cloud Scheduler',
          description: 'Fully managed cron job service for triggering workloads',
          configSchema: {
            jobs: {
              type: 'number',
              label: 'Jobs',
              default: 3,
              min: 1,
              max: 1000
            }
            // scheduler_job: $0.10/job/month
          }
        },
        {
          id: 'eventarc',
          name: 'Eventarc',
          description: 'Event routing service for connecting Google Cloud services',
          configSchema: {
            eventsMillions: {
              type: 'number',
              label: 'Events (millions/mo)',
              default: 1,
              min: 0.1,
              max: 100000
            }
            // eventarc_m: $0.40/million events
          }
        },
        {
          id: 'workflows',
          name: 'Workflows',
          description: 'Serverless workflow orchestration for Google Cloud services',
          configSchema: {
            stepsThousands: {
              type: 'number',
              label: 'Steps executed (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // workflows_k_steps: $0.01/thousand steps
          }
        }
      ]
    },
    {
      id: 'security',
      name: 'Security & Identity',
      services: [
        {
          id: 'cloud-armor',
          name: 'Cloud Armor',
          description: 'DDoS protection and WAF for Google Cloud applications',
          configSchema: {
            policies: {
              type: 'number',
              label: 'Security Policies',
              default: 1,
              min: 1,
              max: 100
            },
            requestsMillions: {
              type: 'number',
              label: 'Requests (millions/mo)',
              default: 10,
              min: 0.1,
              max: 100000
            }
            // armor_policy: $5.00/policy/month, armor_m_req: $0.75/million requests
          }
        },
        {
          id: 'secret-manager',
          name: 'Secret Manager',
          description: 'Secure secret storage with versioning and access control',
          configSchema: {
            secrets: {
              type: 'number',
              label: 'Secrets stored',
              default: 10,
              min: 1,
              max: 100000
            },
            accessesThousands: {
              type: 'number',
              label: 'Secret accesses (thousands/mo)',
              default: 10,
              min: 0,
              max: 1000000
            }
            // secret_version: $0.06/version/month, secret_k_access: $0.03/thousand accesses
          }
        },
        {
          id: 'cloud-kms',
          name: 'Cloud KMS',
          description: 'Cloud-hosted key management service for cryptographic operations',
          configSchema: {
            keyVersions: {
              type: 'number',
              label: 'Key versions',
              default: 5,
              min: 1,
              max: 10000
            },
            operationsThousands: {
              type: 'number',
              label: 'Crypto operations (thousands/mo)',
              default: 10,
              min: 0,
              max: 1000000
            }
            // kms_version: $0.06/version/month, kms_k_ops: $0.03/thousand operations
          }
        },
        {
          id: 'identity-platform',
          name: 'Identity Platform',
          description: 'Customer identity and access management for web and mobile',
          configSchema: {
            mau: {
              type: 'number',
              label: 'Monthly Active Users',
              default: 1000,
              min: 0,
              max: 10000000
            }
            // idp_mau: $0.0055/MAU
          }
        }
      ]
    }
  ]
}
