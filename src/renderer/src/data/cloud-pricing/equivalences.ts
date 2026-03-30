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
  fargate:       { aws: 'fargate',       gcp: 'cloud-run-jobs',  azure: 'azure-container-instances' },
  elasticache:   { aws: 'elasticache',   gcp: 'bigtable',        azure: 'azure-cache-redis'          },
  redshift:      { aws: 'redshift',      gcp: 'bigquery',        azure: 'azure-synapse'              },
  sagemaker:     { aws: 'sagemaker',     gcp: 'vertex-ai',       azure: 'azure-machine-learning'     },
  bedrock:       { aws: 'bedrock',       gcp: 'vertex-ai',       azure: 'azure-openai'               },
  rekognition:   { aws: 'rekognition',   gcp: 'vision-ai',       azure: 'cognitive-services'         },
  kinesis:       { aws: 'kinesis',       gcp: 'pub-sub',         azure: 'event-hubs'                 },
  glue:          { aws: 'glue',          gcp: 'dataflow',        azure: 'azure-data-factory'         },
  sns:           { aws: 'sns',           gcp: 'pub-sub',         azure: 'azure-notification-hubs'    },
  sqs:           { aws: 'sqs',           gcp: 'cloud-tasks',     azure: 'service-bus'                },
  'step-functions': { aws: 'step-functions', gcp: 'workflows',   azure: 'logic-apps'                },
  cognito:       { aws: 'cognito',       gcp: 'identity-platform', azure: 'azure-active-directory'  },
  waf:           { aws: 'waf',           gcp: 'cloud-armor',     azure: 'azure-firewall'             },
  'secrets-manager': { aws: 'secrets-manager', gcp: 'secret-manager', azure: 'azure-key-vault'     },
  ecr:           { aws: 'ecr',           gcp: 'artifact-registry', azure: 'azure-container-registry' }
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
 * Human-readable display names for each canonical service family key.
 */
export const FAMILY_LABELS: Record<string, string> = {
  ec2:              'Virtual Machines',
  s3:               'Object Storage',
  rds:              'Relational Database',
  lambda:           'Serverless Functions',
  dynamodb:         'NoSQL Database',
  ebs:              'Block Storage',
  cloudfront:       'CDN',
  'data-transfer':  'Data Transfer',
  'api-gateway':    'API Gateway',
  eks:              'Kubernetes',
  fargate:          'Serverless Containers',
  elasticache:      'In-Memory Cache',
  redshift:         'Data Warehouse',
  sagemaker:        'ML Training & Inference',
  bedrock:          'Generative AI',
  rekognition:      'Image/Vision AI',
  kinesis:          'Event Streaming',
  glue:             'ETL / Data Integration',
  sns:              'Push Notifications',
  sqs:              'Message Queue',
  'step-functions': 'Workflow Orchestration',
  cognito:          'Identity & Auth',
  waf:              'Web Application Firewall',
  'secrets-manager':'Secrets Management',
  ecr:              'Container Registry',
}

/**
 * Returns a short display name for a provider's equivalent service,
 * or null if the canonical ID is not in the equivalence map.
 *
 * @param canonicalId - Canonical service family key (AWS-centric)
 * @param provider - Target cloud provider
 * @returns Short display name string, or null
 */
export function getProviderServiceName(canonicalId: string, provider: CloudProvider): string | null {
  const entry = SERVICE_EQUIVALENCES[canonicalId]
  if (!entry) return null
  const serviceId = entry[provider]
  if (!serviceId) return null
  // Map known serviceIds to short display names
  const DISPLAY_NAMES: Record<string, string> = {
    // AWS
    ec2: 'EC2', s3: 'S3', rds: 'RDS', lambda: 'Lambda', dynamodb: 'DynamoDB',
    ebs: 'EBS', cloudfront: 'CloudFront', 'data-transfer': 'Data Transfer',
    'api-gateway': 'API Gateway', eks: 'EKS', fargate: 'Fargate',
    elasticache: 'ElastiCache', redshift: 'Redshift', sagemaker: 'SageMaker',
    bedrock: 'Bedrock', rekognition: 'Rekognition', kinesis: 'Kinesis',
    glue: 'Glue', sns: 'SNS', sqs: 'SQS', 'step-functions': 'Step Functions',
    cognito: 'Cognito', waf: 'WAF', 'secrets-manager': 'Secrets Manager', ecr: 'ECR',
    // GCP
    'compute-engine': 'Compute Engine', 'cloud-storage': 'Cloud Storage',
    'cloud-sql': 'Cloud SQL', 'cloud-functions': 'Cloud Functions',
    firestore: 'Firestore', 'persistent-disk': 'Persistent Disk',
    'cloud-cdn': 'Cloud CDN', 'gcp-data-transfer-out': 'Data Transfer',
    'cloud-run': 'Cloud Run', gke: 'GKE', 'cloud-run-jobs': 'Cloud Run Jobs',
    bigtable: 'Bigtable', bigquery: 'BigQuery', 'vertex-ai': 'Vertex AI',
    'vertex-ai-genai': 'Vertex AI', 'vision-ai': 'Vision AI',
    'pub-sub': 'Pub/Sub', dataflow: 'Dataflow', 'cloud-tasks': 'Cloud Tasks',
    workflows: 'Workflows', 'identity-platform': 'Identity Platform',
    'cloud-armor': 'Cloud Armor', 'secret-manager': 'Secret Manager',
    'artifact-registry': 'Artifact Registry',
    // Azure
    'azure-vm': 'Azure VMs', 'blob-storage': 'Blob Storage', 'azure-sql': 'Azure SQL',
    'azure-functions': 'Azure Functions', 'cosmos-db': 'Cosmos DB',
    'premium-ssd': 'Premium SSD', 'azure-cdn': 'Azure CDN',
    'azure-data-transfer-out': 'Data Transfer', 'app-service': 'App Service',
    aks: 'AKS', 'azure-container-instances': 'Container Instances',
    'azure-cache-redis': 'Azure Cache (Redis)', 'azure-synapse': 'Azure Synapse',
    'azure-machine-learning': 'Azure ML', 'azure-openai': 'Azure OpenAI',
    'cognitive-services': 'Cognitive Services', 'event-hubs': 'Event Hubs',
    'azure-data-factory': 'Data Factory', 'service-bus': 'Service Bus',
    'logic-apps': 'Logic Apps', 'azure-active-directory': 'Azure AD',
    'azure-firewall': 'Azure Firewall', 'azure-key-vault': 'Key Vault',
    'azure-container-registry': 'Container Registry',
    'azure-notification-hubs': 'Notification Hubs',
    // Legacy IDs preserved in azure.ts
    'managed-disk': 'Managed Disk',
  }
  return DISPLAY_NAMES[serviceId] ?? serviceId
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
