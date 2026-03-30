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
        },
        {
          id: 'eks',
          name: 'EKS',
          description: 'Elastic Kubernetes Service — managed Kubernetes control plane',
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
              label: 'Node Instance Type',
              options: [
                // As of 2026-01, EKS cluster: $0.10/hr + node EC2 costs
                { label: 't3.medium (2 vCPU, 4 GB)  — $0.0416/hr', value: 't3.medium', pricePerHour: 0.0416 },
                { label: 't3.large  (2 vCPU, 8 GB)  — $0.0832/hr', value: 't3.large',  pricePerHour: 0.0832 },
                { label: 'm5.large  (2 vCPU, 8 GB)  — $0.096/hr',  value: 'm5.large',  pricePerHour: 0.096  },
                { label: 'm5.xlarge (4 vCPU, 16 GB) — $0.192/hr',  value: 'm5.xlarge', pricePerHour: 0.192  },
                { label: 'm5.2xlarge (8 vCPU, 32 GB) — $0.384/hr', value: 'm5.2xlarge', pricePerHour: 0.384 }
              ]
            },
            nodeCount: {
              type: 'number',
              label: 'Worker nodes per cluster',
              default: 3,
              min: 1,
              max: 500
            }
            // EKS control plane: $0.10/hr per cluster ($73/month)
            // Node costs are EC2 on-demand prices
          }
        },
        {
          id: 'fargate',
          name: 'Fargate',
          description: 'Serverless compute for ECS/EKS — run containers without managing servers',
          configSchema: {
            tasks: {
              type: 'number',
              label: 'Number of tasks',
              default: 5,
              min: 1,
              max: 10000
            },
            vcpu: {
              type: 'select',
              label: 'vCPU per task',
              options: [
                // As of 2026-01, source: https://aws.amazon.com/fargate/pricing/
                { label: '0.25 vCPU — $0.04048/hr', value: '0.25', pricePerHour: 0.04048 },
                { label: '0.50 vCPU — $0.04856/hr', value: '0.5',  pricePerHour: 0.04856 },
                { label: '1 vCPU    — $0.04856/hr', value: '1',    pricePerHour: 0.04856 },
                { label: '2 vCPU    — $0.09712/hr', value: '2',    pricePerHour: 0.09712 },
                { label: '4 vCPU    — $0.19424/hr', value: '4',    pricePerHour: 0.19424 }
              ]
            },
            memoryGb: {
              type: 'select',
              label: 'Memory per task (GB)',
              options: [
                { label: '0.5 GB — $0.004445/hr', value: '0.5', pricePerHour: 0.004445 },
                { label: '1 GB   — $0.004445/hr', value: '1',   pricePerHour: 0.004445 },
                { label: '2 GB   — $0.008890/hr', value: '2',   pricePerHour: 0.008890 },
                { label: '4 GB   — $0.017780/hr', value: '4',   pricePerHour: 0.017780 },
                { label: '8 GB   — $0.035560/hr', value: '8',   pricePerHour: 0.035560 }
              ]
            },
            hoursPerMonth: {
              type: 'number',
              label: 'Hours running per month',
              default: 730,
              min: 1,
              max: 744
            }
            // Fargate pricing: per-vCPU-hour + per-GB-memory-hour
          }
        },
        {
          id: 'elastic-beanstalk',
          name: 'Elastic Beanstalk',
          description: 'PaaS for deploying apps; compute billed via underlying EC2',
          configSchema: {
            quantity: {
              type: 'number',
              label: 'Environments',
              default: 1,
              min: 1,
              max: 50
            }
            // Environment itself is free; underlying EC2/RDS costs billed separately
          }
        },
        {
          id: 'lightsail',
          name: 'Lightsail',
          description: 'Simplified VMs with predictable monthly pricing',
          configSchema: {
            plan: {
              type: 'select',
              label: 'Plan',
              options: [
                { label: '$5/mo (1 vCPU, 1 GB)',  value: 'nano',  pricePerHour: 0.00685 },
                { label: '$10/mo (1 vCPU, 2 GB)', value: 'micro', pricePerHour: 0.0137  },
                { label: '$20/mo (2 vCPU, 4 GB)', value: 'small', pricePerHour: 0.0274  }
              ]
            }
          }
        },
        {
          id: 'ecr',
          name: 'ECR',
          description: 'Elastic Container Registry — managed Docker image repository',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 10,
              min: 1,
              max: 10000
            },
            dataTransferGB: {
              type: 'number',
              label: 'Data Transfer Out (GB/mo)',
              default: 10,
              min: 0,
              max: 10000
            }
            // ecr_gb: $0.10/GB/month, ecr_transfer_gb: $0.09/GB
          }
        },
        {
          id: 'app-runner',
          name: 'App Runner',
          description: 'Managed application runner for containerized web apps',
          configSchema: {
            vcpu: {
              type: 'number',
              label: 'vCPU',
              default: 0.25,
              min: 0.25,
              max: 4
            },
            memoryGB: {
              type: 'number',
              label: 'Memory (GB)',
              default: 0.5,
              min: 0.5,
              max: 12
            }
            // app_runner_vcpu: $0.064/vCPU-hr, app_runner_gb: $0.007/GB-hr
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
        },
        {
          id: 'glacier',
          name: 'S3 Glacier',
          description: 'Low-cost archival storage for infrequently accessed data',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 100,
              min: 1,
              max: 1000000
            }
            // glacier_gb: $0.004/GB/month
          }
        },
        {
          id: 'efs',
          name: 'EFS',
          description: 'Elastic File System — scalable managed NFS for EC2',
          configSchema: {
            storageGB: {
              type: 'number',
              label: 'Storage (GB)',
              default: 50,
              min: 1,
              max: 1000000
            }
            // efs_gb: $0.30/GB/month (Standard storage class)
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
        },
        {
          id: 'elasticache',
          name: 'ElastiCache',
          description: 'In-memory Redis/Memcached for sub-millisecond caching',
          configSchema: {
            nodeType: {
              type: 'select',
              label: 'Node Type',
              options: [
                { label: 'cache.t3.micro  — $0.017/hr', value: 'micro',  pricePerHour: 0.017  },
                { label: 'cache.t3.small  — $0.034/hr', value: 'small',  pricePerHour: 0.034  },
                { label: 'cache.m5.large  — $0.156/hr', value: 'large',  pricePerHour: 0.156  }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Nodes',
              default: 1,
              min: 1,
              max: 20
            }
          }
        },
        {
          id: 'redshift',
          name: 'Redshift',
          description: 'Petabyte-scale cloud data warehouse for analytics',
          configSchema: {
            nodeType: {
              type: 'select',
              label: 'Node Type',
              options: [
                { label: 'dc2.large  (2 vCPU, 15 GB)  — $0.25/hr',   value: 'dc2.large',  pricePerHour: 0.25   },
                { label: 'ra3.xlplus (4 vCPU, 32 GB)  — $1.086/hr',  value: 'ra3.xlplus', pricePerHour: 1.086  }
              ]
            },
            quantity: {
              type: 'number',
              label: 'Nodes',
              default: 2,
              min: 1,
              max: 32
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
        },
        {
          id: 'vpc-nat-gateway',
          name: 'NAT Gateway',
          description: 'Managed NAT for private subnet outbound internet access',
          configSchema: {
            quantity: {
              type: 'number',
              label: 'NAT Gateways',
              default: 1,
              min: 1,
              max: 20
            },
            dataProcessedGB: {
              type: 'number',
              label: 'Data processed (GB/mo)',
              default: 100,
              min: 0,
              max: 100000
            }
            // nat_gateway_hourly: $0.045/hr, nat_data_gb: $0.045/GB
          }
        },
        {
          id: 'route53',
          name: 'Route 53',
          description: 'Scalable and highly available DNS service',
          configSchema: {
            hostedZones: {
              type: 'number',
              label: 'Hosted Zones',
              default: 1,
              min: 1,
              max: 500
            },
            queriesMillions: {
              type: 'number',
              label: 'DNS Queries (millions/mo)',
              default: 1,
              min: 0,
              max: 10000
            }
            // zone: $0.50/zone/month, query_m: $0.40/million
          }
        }
      ]
    },
    {
      id: 'mlai',
      name: 'ML/AI',
      services: [
        {
          id: 'sagemaker',
          name: 'SageMaker',
          description: 'Fully managed ML training and inference platform',
          configSchema: {
            instanceType: {
              type: 'select',
              label: 'Instance Type',
              options: [
                { label: 'ml.t3.medium      — $0.0464/hr', value: 'ml.t3.medium',  pricePerHour: 0.0464 },
                { label: 'ml.m5.xlarge      — $0.23/hr',   value: 'ml.m5.xlarge',  pricePerHour: 0.23   },
                { label: 'ml.p3.2xlarge (GPU) — $3.825/hr',value: 'ml.p3.2xlarge', pricePerHour: 3.825  }
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
          id: 'bedrock',
          name: 'Bedrock',
          description: 'Fully managed generative AI API for foundation models',
          configSchema: {
            model: {
              type: 'select',
              label: 'Model',
              options: [
                { label: 'Claude 3 Haiku',      value: 'haiku',  pricePerHour: 0 },
                { label: 'Claude 3 Sonnet',     value: 'sonnet', pricePerHour: 0 },
                { label: 'Titan Text Express',  value: 'titan',  pricePerHour: 0 }
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
            // bedrock_input_m: $0.25/million input tokens, bedrock_output_m: $1.25/million output tokens
          }
        },
        {
          id: 'rekognition',
          name: 'Rekognition',
          description: 'Automated image and video analysis with ML',
          configSchema: {
            imagesThousands: {
              type: 'number',
              label: 'Images analyzed (thousands/mo)',
              default: 10,
              min: 1,
              max: 100000
            }
            // rekognition_k_images: $1.00/thousand images
          }
        },
        {
          id: 'comprehend',
          name: 'Comprehend',
          description: 'Natural language processing for text analysis',
          configSchema: {
            unitsThousands: {
              type: 'number',
              label: 'Text units (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // comprehend_k_units: $0.10/thousand units
          }
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Streaming',
      services: [
        {
          id: 'kinesis',
          name: 'Kinesis',
          description: 'Real-time data streaming and processing at scale',
          configSchema: {
            shards: {
              type: 'number',
              label: 'Shards',
              default: 1,
              min: 1,
              max: 200
            },
            dataGB: {
              type: 'number',
              label: 'Data throughput (GB/mo)',
              default: 10,
              min: 1,
              max: 10000
            }
            // kinesis_shard_hr: $0.015/shard-hour, kinesis_gb: $0.085/GB
          }
        },
        {
          id: 'emr',
          name: 'EMR',
          description: 'Managed Hadoop/Spark cluster for big data processing',
          configSchema: {
            instanceType: {
              type: 'select',
              label: 'Master Instance',
              options: [
                { label: 'm5.xlarge  — $0.192/hr', value: 'm5.xlarge',  pricePerHour: 0.192 },
                { label: 'r5.2xlarge — $0.504/hr', value: 'r5.2xlarge', pricePerHour: 0.504 }
              ]
            },
            coreNodes: {
              type: 'number',
              label: 'Core Nodes',
              default: 2,
              min: 1,
              max: 50
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
          id: 'athena',
          name: 'Athena',
          description: 'Serverless SQL query engine for S3 data',
          configSchema: {
            dataScannedTB: {
              type: 'number',
              label: 'Data scanned (TB/mo)',
              default: 0.1,
              min: 0.01,
              max: 1000
            }
            // athena_tb: $5.00/TB scanned
          }
        },
        {
          id: 'glue',
          name: 'Glue',
          description: 'Serverless ETL service for data integration',
          configSchema: {
            dpuHours: {
              type: 'number',
              label: 'DPU hours/mo',
              default: 10,
              min: 1,
              max: 10000
            }
            // glue_dpu_hr: $0.44/DPU-hour
          }
        }
      ]
    },
    {
      id: 'messaging',
      name: 'Messaging/Integration',
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
        },
        {
          id: 'sqs',
          name: 'SQS',
          description: 'Fully managed message queuing service',
          configSchema: {
            requestsMillions: {
              type: 'number',
              label: 'Requests (millions/mo)',
              default: 10,
              min: 0.1,
              max: 100000
            }
            // sqs_m_requests: $0.40/million requests
          }
        },
        {
          id: 'sns',
          name: 'SNS',
          description: 'Fully managed pub/sub messaging and push notifications',
          configSchema: {
            requestsMillions: {
              type: 'number',
              label: 'Publishes (millions/mo)',
              default: 1,
              min: 0.1,
              max: 100000
            }
            // sns_m_pub: $0.50/million publishes
          }
        },
        {
          id: 'eventbridge',
          name: 'EventBridge',
          description: 'Serverless event bus for application integration',
          configSchema: {
            eventsMillions: {
              type: 'number',
              label: 'Events (millions/mo)',
              default: 1,
              min: 0.1,
              max: 100000
            }
            // eventbridge_m: $1.00/million events
          }
        },
        {
          id: 'step-functions',
          name: 'Step Functions',
          description: 'Serverless workflow orchestration for distributed apps',
          configSchema: {
            transitionsThousands: {
              type: 'number',
              label: 'State transitions (thousands/mo)',
              default: 10,
              min: 1,
              max: 1000000
            }
            // step_fn_k_transitions: $0.025/thousand transitions
          }
        }
      ]
    },
    {
      id: 'security',
      name: 'Security & Identity',
      services: [
        {
          id: 'cognito',
          name: 'Cognito',
          description: 'User authentication and authorization for web and mobile apps',
          configSchema: {
            mau: {
              type: 'number',
              label: 'Monthly Active Users',
              default: 1000,
              min: 0,
              max: 10000000
            }
            // cognito_mau: $0.0055/MAU (first 50k free)
          }
        },
        {
          id: 'waf',
          name: 'WAF',
          description: 'Web Application Firewall for protecting web resources',
          configSchema: {
            webACLs: {
              type: 'number',
              label: 'Web ACLs',
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
            // waf_acl: $5.00/ACL/month, waf_m_requests: $0.60/million
          }
        },
        {
          id: 'secrets-manager',
          name: 'Secrets Manager',
          description: 'Managed secrets storage with automatic rotation',
          configSchema: {
            secrets: {
              type: 'number',
              label: 'Secrets stored',
              default: 10,
              min: 1,
              max: 100000
            },
            apiCallsThousands: {
              type: 'number',
              label: 'API calls (thousands/mo)',
              default: 10,
              min: 0,
              max: 1000000
            }
            // sm_secret: $0.40/secret/month, sm_k_calls: $0.05/thousand calls
          }
        },
        {
          id: 'kms',
          name: 'KMS',
          description: 'Key Management Service for encryption key management',
          configSchema: {
            keys: {
              type: 'number',
              label: 'Customer Managed Keys',
              default: 1,
              min: 1,
              max: 10000
            },
            apiCallsThousands: {
              type: 'number',
              label: 'API calls (thousands/mo)',
              default: 20,
              min: 0,
              max: 1000000
            }
            // kms_key: $1.00/key/month, kms_k_calls: $0.03/thousand calls
          }
        }
      ]
    }
  ]
}
