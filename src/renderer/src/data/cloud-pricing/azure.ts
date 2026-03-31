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
        },
        {
          id: 'aks',
          name: 'AKS',
          description: 'Azure Kubernetes Service — managed Kubernetes with free control plane',
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
              label: 'Node VM Size',
              options: [
                // As of 2026-01, AKS control plane is free; node costs are Azure VM prices
                { label: 'B2s   (2 vCPU, 4 GB)   — $0.042/hr', value: 'B2s',    pricePerHour: 0.042 },
                { label: 'D2s_v3 (2 vCPU, 8 GB)  — $0.096/hr', value: 'D2s_v3', pricePerHour: 0.096 },
                { label: 'D4s_v3 (4 vCPU, 16 GB) — $0.192/hr', value: 'D4s_v3', pricePerHour: 0.192 },
                { label: 'D8s_v3 (8 vCPU, 32 GB) — $0.384/hr', value: 'D8s_v3', pricePerHour: 0.384 },
                { label: 'F4s_v2 (4 vCPU, 8 GB)  — $0.170/hr', value: 'F4s_v2', pricePerHour: 0.170 }
              ]
            },
            nodeCount: {
              type: 'number',
              label: 'Worker nodes per cluster',
              default: 3,
              min: 1,
              max: 500
            }
            // AKS control plane: free for standard tier
            // Node costs are Azure VM on-demand prices
          }
        },
        {
          id: 'azure-container-instances',
          name: 'Azure Container Instances',
          description: 'Serverless containers — run containers without managing VMs or orchestrators',
          configSchema: {
            tasks: {
              type: 'number',
              label: 'Number of container groups',
              default: 5,
              min: 1,
              max: 10000
            },
            vcpu: {
              type: 'select',
              label: 'vCPU per container',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/container-instances/
                { label: '1 vCPU  — $0.04850/hr', value: '1',  pricePerHour: 0.04850 },
                { label: '2 vCPU  — $0.09700/hr', value: '2',  pricePerHour: 0.09700 },
                { label: '4 vCPU  — $0.19400/hr', value: '4',  pricePerHour: 0.19400 }
              ]
            },
            memoryGb: {
              type: 'select',
              label: 'Memory per container (GB)',
              options: [
                { label: '0.5 GB — $0.00265/hr', value: '0.5', pricePerHour: 0.00265 },
                { label: '1 GB   — $0.00530/hr', value: '1',   pricePerHour: 0.00530 },
                { label: '2 GB   — $0.01060/hr', value: '2',   pricePerHour: 0.01060 },
                { label: '4 GB   — $0.02120/hr', value: '4',   pricePerHour: 0.02120 },
                { label: '8 GB   — $0.04240/hr', value: '8',   pricePerHour: 0.04240 }
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
          id: 'app-service',
          name: 'App Service',
          description: 'Fully managed platform for building, deploying, and scaling web apps',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Pricing Tier',
              options: [
                // As of 2026-01, source: https://azure.microsoft.com/pricing/details/app-service/linux/
                { label: 'B1 (1 core, 1.75 GB) — $0.018/hr',  value: 'B1',   pricePerHour: 0.018 },
                { label: 'B2 (2 core, 3.5 GB)  — $0.036/hr',  value: 'B2',   pricePerHour: 0.036 },
                { label: 'B3 (4 core, 7 GB)    — $0.072/hr',  value: 'B3',   pricePerHour: 0.072 },
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
        },
        {
          id: 'azure-spring-apps',
          name: 'Azure Spring Apps',
          description: 'Fully managed Java PaaS for Spring Boot applications',
          configSchema: {
            instances: {
              type: 'number',
              label: 'Instances',
              default: 1,
              min: 1,
              max: 100
            }
            // spring_apps_hr: $0.05/instance-hour
          }
        },
        {
          id: 'azure-batch',
          name: 'Azure Batch',
          description: 'Cloud-scale job scheduling for parallel and HPC workloads',
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
          id: 'azure-container-registry',
          name: 'Azure Container Registry',
          description: 'Managed private container registry for Docker images',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 10,
              min: 1,
              max: 10000
            }
            // acr_gb: $0.10/GB/month
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
        },
        {
          id: 'azure-files',
          name: 'Azure Files',
          description: 'Fully managed SMB file shares in the cloud',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 1,
              max: 1000000
            }
            // files_gb: $0.20/GB/month (hot tier)
          }
        },
        {
          id: 'archive-storage',
          name: 'Archive Storage',
          description: 'Ultra-low-cost cold tier storage for rarely accessed data',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 500,
              min: 1,
              max: 10000000
            }
            // archive_gb: $0.002/GB/month
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
        },
        {
          id: 'azure-cache-redis',
          name: 'Azure Cache for Redis',
          description: 'Fully managed in-memory data store based on Redis',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Tier',
              options: [
                { label: 'Basic C0 (250 MB)  — $0.017/hr', value: 'c0', pricePerHour: 0.017  },
                { label: 'Standard C1 (1 GB) — $0.05/hr',  value: 'c1', pricePerHour: 0.05   },
                { label: 'Premium P1 (6 GB)  — $0.323/hr', value: 'p1', pricePerHour: 0.323  }
              ]
            }
          }
        },
        {
          id: 'azure-synapse',
          name: 'Azure Synapse Analytics',
          description: 'Analytics service for enterprise data warehousing and big data',
          configSchema: {
            dwu: {
              type: 'select',
              label: 'DWU',
              options: [
                { label: 'DW100c  — $1.51/hr',  value: 'dw100c',  pricePerHour: 1.51  },
                { label: 'DW300c  — $4.52/hr',  value: 'dw300c',  pricePerHour: 4.52  },
                { label: 'DW1000c — $15.07/hr', value: 'dw1000c', pricePerHour: 15.07 }
              ]
            }
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
        },
        {
          id: 'azure-nat-gateway',
          name: 'Azure NAT Gateway',
          description: 'Managed NAT for outbound internet connectivity from virtual networks',
          configSchema: {
            quantity: {
              type: 'number',
              label: 'Gateways',
              default: 1,
              min: 1,
              max: 10
            },
            dataGB: {
              type: 'number',
              label: 'Data processed (GB/mo)',
              default: 100,
              min: 0,
              max: 100000
            }
            // nat_hr: $0.045/hr, nat_data_gb: $0.045/GB
          }
        },
        {
          id: 'azure-dns',
          name: 'Azure DNS',
          description: 'Reliable, secure DNS hosting within Azure infrastructure',
          configSchema: {
            zones: {
              type: 'number',
              label: 'DNS Zones',
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
            // dns_zone: $0.50/zone/month, dns_m_queries: $0.40/million
          }
        }
      ]
    },
    {
      id: 'mlai',
      name: 'ML/AI',
      services: [
        {
          id: 'azure-openai',
          name: 'Azure OpenAI',
          description: 'OpenAI models (GPT-4, DALL-E, etc.) via Azure infrastructure',
          configSchema: {
            model: {
              type: 'select',
              label: 'Model',
              options: [
                { label: 'GPT-3.5 Turbo', value: 'gpt35',  pricePerHour: 0 },
                { label: 'GPT-4',         value: 'gpt4',   pricePerHour: 0 },
                { label: 'GPT-4o',        value: 'gpt4o',  pricePerHour: 0 }
              ]
            },
            inputTokensMillions: {
              type: 'number',
              label: 'Input tokens (millions/mo)',
              default: 1,
              min: 0.1,
              max: 10000
            },
            outputTokensMillions: {
              type: 'number',
              label: 'Output tokens (millions/mo)',
              default: 0.5,
              min: 0.1,
              max: 10000
            }
            // openai_input_m: $0.50/million input tokens, openai_output_m: $1.50/million output tokens
          }
        },
        {
          id: 'azure-machine-learning',
          name: 'Azure Machine Learning',
          description: 'End-to-end ML platform for model development and deployment',
          configSchema: {
            computeHours: {
              type: 'number',
              label: 'Compute hours/mo',
              default: 100,
              min: 1,
              max: 730
            }
            // aml_hr: $0.18/compute-hour
          }
        },
        {
          id: 'cognitive-services',
          name: 'Azure Cognitive Services',
          description: 'Pre-built Vision, Speech, and NLP APIs for intelligent apps',
          configSchema: {
            callsThousands: {
              type: 'number',
              label: 'API calls (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // cog_k_calls: $1.50/thousand calls
          }
        },
        {
          id: 'azure-bot-service',
          name: 'Azure Bot Service',
          description: 'Managed platform for building and deploying intelligent bots',
          configSchema: {
            messagesThousands: {
              type: 'number',
              label: 'Messages (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // bot_k_msg: $0.50/thousand messages
          }
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Streaming',
      services: [
        {
          id: 'event-hubs',
          name: 'Event Hubs',
          description: 'Big data streaming platform and event ingestion service (Kafka-compatible)',
          configSchema: {
            throughputUnits: {
              type: 'number',
              label: 'Throughput Units',
              default: 1,
              min: 1,
              max: 40
            }
            // eh_tu_hr: $0.028/TU-hour, eh_ingress_m: $0.028/million events
          }
        },
        {
          id: 'stream-analytics',
          name: 'Stream Analytics',
          description: 'Real-time analytics processing on streaming data',
          configSchema: {
            streamingUnits: {
              type: 'number',
              label: 'Streaming Units',
              default: 1,
              min: 1,
              max: 192
            }
            // sa_su_hr: $0.031/streaming-unit-hour
          }
        },
        {
          id: 'azure-data-factory',
          name: 'Azure Data Factory',
          description: 'Cloud ETL and data integration service for pipeline orchestration',
          configSchema: {
            pipelineRuns: {
              type: 'number',
              label: 'Pipeline runs/mo',
              default: 100,
              min: 1,
              max: 100000
            }
            // adf_run: $0.001/pipeline run
          }
        },
        {
          id: 'hdinsight',
          name: 'HDInsight',
          description: 'Managed Hadoop, Spark, and Kafka cluster service',
          configSchema: {
            nodeHours: {
              type: 'number',
              label: 'Node-hours/mo',
              default: 200,
              min: 1,
              max: 100000
            }
            // hdi_node_hr: $0.192/node-hour
          }
        }
      ]
    },
    {
      id: 'messaging',
      name: 'Messaging/Integration',
      services: [
        {
          id: 'service-bus',
          name: 'Service Bus',
          description: 'Enterprise message broker for reliable asynchronous messaging',
          configSchema: {
            messagesMillions: {
              type: 'number',
              label: 'Messages (millions/mo)',
              default: 1,
              min: 0.1,
              max: 100000
            }
            // sb_m_msg: $0.80/million messages
          }
        },
        {
          id: 'azure-notification-hubs',
          name: 'Azure Notification Hubs',
          description: 'Cross-platform push notification service at scale',
          configSchema: {
            pushesMillions: {
              type: 'number',
              label: 'Pushes (millions/mo)',
              default: 1,
              min: 0.1,
              max: 10000
            }
            // anh_m_push: $0.50/million pushes
          }
        },
        {
          id: 'logic-apps',
          name: 'Logic Apps',
          description: 'Automated workflow integration across apps and services',
          configSchema: {
            actionsThousands: {
              type: 'number',
              label: 'Actions (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // logic_apps_k_actions: $0.25/thousand actions
          }
        },
        {
          id: 'api-management',
          name: 'API Management',
          description: 'Full lifecycle API gateway for publishing and securing APIs',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Tier',
              options: [
                { label: 'Developer  — $0.07/hr',  value: 'developer', pricePerHour: 0.07  },
                { label: 'Basic      — $0.21/hr',  value: 'basic',     pricePerHour: 0.21  },
                { label: 'Standard   — $0.95/hr',  value: 'standard',  pricePerHour: 0.95  }
              ]
            }
          }
        }
      ]
    },
    {
      id: 'security',
      name: 'Security & Identity',
      services: [
        {
          id: 'azure-active-directory',
          name: 'Azure Active Directory',
          description: 'Cloud identity and access management for users and applications',
          configSchema: {
            mau: {
              type: 'number',
              label: 'MAU (Premium P1)',
              default: 1000,
              min: 0,
              max: 10000000
            }
            // aad_mau: $0.006/MAU
          }
        },
        {
          id: 'azure-key-vault',
          name: 'Azure Key Vault',
          description: 'Safeguard secrets, keys, and certificates in the cloud',
          configSchema: {
            operations: {
              type: 'number',
              label: 'Operations (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // kv_k_ops: $0.03/thousand operations
          }
        },
        {
          id: 'microsoft-defender',
          name: 'Microsoft Defender for Cloud',
          description: 'Unified security management and threat protection for cloud workloads',
          configSchema: {
            servers: {
              type: 'number',
              label: 'Servers protected',
              default: 10,
              min: 1,
              max: 10000
            }
            // defender_server: $15.00/server/month
          }
        },
        {
          id: 'azure-firewall',
          name: 'Azure Firewall',
          description: 'Managed cloud-native network security for virtual networks',
          configSchema: {
            deploymentHours: {
              type: 'number',
              label: 'Deployment hours/mo',
              default: 730,
              min: 1,
              max: 730
            },
            dataGB: {
              type: 'number',
              label: 'Data processed (GB/mo)',
              default: 100,
              min: 0,
              max: 100000
            }
            // fw_hr: $1.25/hr, fw_data_gb: $0.016/GB
          }
        }
      ]
    },
    {
      id: 'observability',
      name: 'Observability',
      services: [
        {
          id: 'azure-monitor',
          name: 'Azure Monitor',
          description: 'Full-stack monitoring and diagnostics',
          configSchema: {
            logIngestionGb: {
              type: 'number',
              label: 'Log ingestion (GB/mo)',
              default: 50,
              min: 0,
              max: 100000
            }
            // First 5 GB free, $2.76/GB after (Log Analytics)
          }
        },
        {
          id: 'application-insights',
          name: 'Application Insights',
          description: 'Application performance monitoring (APM)',
          configSchema: {
            dataIngestionGb: {
              type: 'number',
              label: 'Data ingestion (GB/mo)',
              default: 5,
              min: 0,
              max: 100000
            }
            // First 5 GB free, $2.76/GB after
          }
        }
      ]
    },
    {
      id: 'data-services',
      name: 'Data Services',
      services: [
        {
          id: 'databricks',
          name: 'Azure Databricks',
          description: 'Unified analytics platform based on Apache Spark',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Pricing tier',
              default: 'standard',
              options: [
                { label: 'Standard (Jobs)', value: 'standard-jobs', pricePerHour: 0.15 },
                { label: 'Standard (All-purpose)', value: 'standard-all', pricePerHour: 0.40 },
                { label: 'Premium (Jobs)', value: 'premium-jobs', pricePerHour: 0.30 },
                { label: 'Premium (All-purpose)', value: 'premium-all', pricePerHour: 0.55 }
              ]
            },
            dbuHours: {
              type: 'number',
              label: 'DBU hours/mo',
              default: 500,
              min: 0,
              max: 100000
            }
          }
        },
        {
          id: 'azure-redis-cache',
          name: 'Azure Cache for Redis',
          description: 'Fully managed in-memory data store',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Cache tier',
              default: 'standard-c1',
              options: [
                { label: 'Basic C0 (250 MB)', value: 'basic-c0', pricePerHour: 0.022 },
                { label: 'Standard C1 (1 GB)', value: 'standard-c1', pricePerHour: 0.063 },
                { label: 'Standard C2 (2.5 GB)', value: 'standard-c2', pricePerHour: 0.126 },
                { label: 'Premium P1 (6 GB)', value: 'premium-p1', pricePerHour: 0.377 }
              ]
            }
          }
        },
        {
          id: 'azure-search',
          name: 'Azure AI Search',
          description: 'AI-powered cloud search service',
          configSchema: {
            tier: {
              type: 'select',
              label: 'Search tier',
              default: 'basic',
              options: [
                { label: 'Free', value: 'free', pricePerHour: 0 },
                { label: 'Basic', value: 'basic', pricePerHour: 0.101 },
                { label: 'Standard S1', value: 'standard-s1', pricePerHour: 0.339 },
                { label: 'Standard S2', value: 'standard-s2', pricePerHour: 1.356 }
              ]
            }
          }
        },
        {
          id: 'azure-devops',
          name: 'Azure DevOps',
          description: 'Developer collaboration and CI/CD pipelines',
          configSchema: {
            users: {
              type: 'number',
              label: 'Basic plan users',
              default: 5,
              min: 1,
              max: 10000
            },
            parallelJobs: {
              type: 'number',
              label: 'Paid parallel CI/CD jobs',
              default: 1,
              min: 0,
              max: 100
            }
            // First 5 users free, $6/user/month; $40/parallel job/month
          }
        }
      ]
    }
  ]
}
