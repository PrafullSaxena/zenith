/**
 * Cloud cost calculation engine.
 * Pure TypeScript arithmetic — no external dependencies.
 *
 * All calculations return monthly and yearly estimates.
 * Yearly is always monthly * 12.
 */

import type { ResourceConfig, ServiceCostResult, ServiceSelection, CostLineItem } from '../../types/launchpad'
import type { ProviderCatalog, SelectOption } from './types'

/**
 * Shared constant for hours per month (AWS standard assumption).
 * Used consistently across all per-hour pricing calculations.
 * Source: https://aws.amazon.com/ec2/pricing/on-demand/ (pricing documentation)
 */
export const HOURS_PER_MONTH = 730

// ─── Helper: find a service definition in a catalog by its id ───────────────

function findService(catalog: ProviderCatalog, serviceId: string) {
  for (const category of catalog.categories) {
    const service = category.services.find((s) => s.id === serviceId)
    if (service) return service
  }
  return null
}

// ─── Helper: safely cast config values ───────────────────────────────────────

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return isFinite(n) ? n : fallback
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

// ─── Helper: zero-cost result ─────────────────────────────────────────────────

function zeroCost(): ServiceCostResult {
  return { monthly: 0, yearly: 0, breakdown: [] }
}

// ─── Service-specific calculation functions ───────────────────────────────────

/**
 * Compute instances: EC2 / Compute Engine / Azure VM / App Service
 * Formula: pricePerHour * usageHoursPerMonth * quantity
 */
function calcComputeInstance(config: ResourceConfig, instanceTypeKey: string, quantityKey: string, usageKey: string): ServiceCostResult {
  try {
    const instanceTypeValue = config[instanceTypeKey]
    const pricePerHour = (instanceTypeValue as SelectOption)?.pricePerHour ?? num(str(config[instanceTypeKey]))
    const quantity = num(config[quantityKey], 1)
    const usageHours = num(config[usageKey], HOURS_PER_MONTH)

    if (pricePerHour <= 0) return zeroCost()

    const monthly = pricePerHour * usageHours * quantity
    const breakdown: CostLineItem[] = [
      {
        label: `${quantity}x instance @ $${pricePerHour.toFixed(4)}/hr × ${usageHours} hrs`,
        unitPrice: pricePerHour,
        quantity,
        monthly
      }
    ]
    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Object storage: S3 / Cloud Storage / Blob Storage
 * Formula: storageGb * storagePricePerGb + transferOutGb * transferPricePerGb
 */
function calcObjectStorage(config: ResourceConfig, storagePricePerGb: number, transferPricePerGb: number): ServiceCostResult {
  try {
    const storageGb = num(config['storageGb'], 0)
    const transferOutGb = num(config['transferOutGb'], 0)

    const storageCost = storageGb * storagePricePerGb
    const transferCost = transferOutGb * transferPricePerGb
    const monthly = storageCost + transferCost

    const breakdown: CostLineItem[] = []
    if (storageGb > 0) {
      breakdown.push({
        label: `${storageGb} GB storage @ $${storagePricePerGb}/GB`,
        unitPrice: storagePricePerGb,
        quantity: storageGb,
        monthly: storageCost
      })
    }
    if (transferOutGb > 0) {
      breakdown.push({
        label: `${transferOutGb} GB data transfer out @ $${transferPricePerGb}/GB`,
        unitPrice: transferPricePerGb,
        quantity: transferOutGb,
        monthly: transferCost
      })
    }

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Serverless functions: Lambda / Cloud Functions / Azure Functions
 * Formula: (requestsMillions * requestPricePerMillion) + (gbSeconds * durationPricePerGbSecond)
 */
function calcServerlessFunction(config: ResourceConfig, requestPricePerMillion: number, durationPricePerGbSecond: number): ServiceCostResult {
  try {
    const requestsMillions = num(config['requests'], 0)
    const durationGbSeconds = num(config['durationGbSeconds'], 0)

    // Total GB-seconds = requests (millions) * 1M * durationGbSeconds per request
    const totalGbSeconds = requestsMillions * 1_000_000 * durationGbSeconds
    const requestCost = requestsMillions * requestPricePerMillion
    const durationCost = totalGbSeconds * durationPricePerGbSecond
    const monthly = requestCost + durationCost

    const breakdown: CostLineItem[] = []
    if (requestsMillions > 0) {
      breakdown.push({
        label: `${requestsMillions}M requests @ $${requestPricePerMillion}/M`,
        unitPrice: requestPricePerMillion,
        quantity: requestsMillions,
        monthly: requestCost
      })
    }
    if (totalGbSeconds > 0) {
      breakdown.push({
        label: `${totalGbSeconds.toFixed(0)} GB-seconds @ $${durationPricePerGbSecond}/GB-s`,
        unitPrice: durationPricePerGbSecond,
        quantity: totalGbSeconds,
        monthly: durationCost
      })
    }

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Managed database (RDS / Cloud SQL): pricePerHour * HOURS_PER_MONTH * quantity
 * Optionally doubled for multi-AZ / high-availability.
 */
function calcManagedDatabase(config: ResourceConfig, tierKey: string, quantityKey: string, haKey: string | null): ServiceCostResult {
  try {
    const tierValue = config[tierKey]
    const pricePerHour = (tierValue as SelectOption)?.pricePerHour ?? 0
    const quantity = num(config[quantityKey], 1)
    const haMultiplier = haKey && (config[haKey] === 'multi' || config[haKey] === 'ha') ? 2 : 1

    if (pricePerHour <= 0) return zeroCost()

    const monthlyPerInstance = pricePerHour * HOURS_PER_MONTH * haMultiplier
    const monthly = monthlyPerInstance * quantity

    const breakdown: CostLineItem[] = [
      {
        label: `${quantity}x instance @ $${pricePerHour.toFixed(4)}/hr × ${HOURS_PER_MONTH} hrs${haMultiplier > 1 ? ' × 2 (HA)' : ''}`,
        unitPrice: pricePerHour,
        quantity,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * NoSQL / capacity-unit databases: DynamoDB / Firestore / Cosmos DB
 */
function calcCapacityUnits(config: ResourceConfig, readPricePerMillion: number, writePricePerMillion: number): ServiceCostResult {
  try {
    const readUnits = num(config['readUnits'], 0)
    const writeUnits = num(config['writeUnits'], 0)

    const readCost = readUnits * readPricePerMillion
    const writeCost = writeUnits * writePricePerMillion
    const monthly = readCost + writeCost

    const breakdown: CostLineItem[] = []
    if (readUnits > 0) {
      breakdown.push({
        label: `${readUnits}M read units @ $${readPricePerMillion}/M`,
        unitPrice: readPricePerMillion,
        quantity: readUnits,
        monthly: readCost
      })
    }
    if (writeUnits > 0) {
      breakdown.push({
        label: `${writeUnits}M write units @ $${writePricePerMillion}/M`,
        unitPrice: writePricePerMillion,
        quantity: writeUnits,
        monthly: writeCost
      })
    }

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Block storage: EBS / Persistent Disk / Managed Disk
 * Formula: sizeGb * pricePerGb (monthly)
 */
function calcBlockStorage(config: ResourceConfig, pricePerGb: number): ServiceCostResult {
  try {
    const sizeGb = num(config['sizeGb'], 0)
    const monthly = sizeGb * pricePerGb

    const breakdown: CostLineItem[] = [
      {
        label: `${sizeGb} GB @ $${pricePerGb}/GB/month`,
        unitPrice: pricePerGb,
        quantity: sizeGb,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Managed disk with fixed tier pricing (Azure Premium SSD).
 * Each tier has a fixed monthly price encoded as pricePerHour on the option.
 */
function calcManagedDisk(config: ResourceConfig): ServiceCostResult {
  try {
    const diskSizeValue = config['diskSize']
    // pricePerHour stored as monthly/730 for convenience in the catalog
    const pricePerHourEncoded = (diskSizeValue as SelectOption)?.pricePerHour ?? 0
    const monthlyPerDisk = pricePerHourEncoded * HOURS_PER_MONTH
    const quantity = num(config['quantity'], 1)
    const monthly = monthlyPerDisk * quantity

    const breakdown: CostLineItem[] = [
      {
        label: `${quantity}x disk @ $${monthlyPerDisk.toFixed(2)}/month each`,
        unitPrice: monthlyPerDisk,
        quantity,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * Data transfer / CDN: gb * pricePerGb
 */
function calcDataTransfer(config: ResourceConfig, pricePerGb: number): ServiceCostResult {
  try {
    const gb = num(config['gb'], 0)
    const monthly = gb * pricePerGb

    const breakdown: CostLineItem[] = [
      {
        label: `${gb} GB @ $${pricePerGb}/GB`,
        unitPrice: pricePerGb,
        quantity: gb,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

/**
 * API Gateway / Cloud Run requests
 */
function calcApiGateway(config: ResourceConfig, pricePerMillion: number): ServiceCostResult {
  try {
    const requestsMillions = num(config['requestsPerMonth'], 0)
    const monthly = requestsMillions * pricePerMillion

    const breakdown: CostLineItem[] = [
      {
        label: `${requestsMillions}M requests @ $${pricePerMillion}/M`,
        unitPrice: pricePerMillion,
        quantity: requestsMillions,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

// ─── Cloud Run composite pricing (vCPU + memory + requests) ──────────────────

function calcCloudRun(config: ResourceConfig): ServiceCostResult {
  try {
    const requestsMillions = num(config['requestsPerMonth'], 0)
    // Simplified: $0.40 per million requests (first 2M free, ignored here)
    const monthly = requestsMillions * 0.40

    const breakdown: CostLineItem[] = [
      {
        label: `${requestsMillions}M requests @ $0.40/M`,
        unitPrice: 0.40,
        quantity: requestsMillions,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

// ─── Cosmos DB pricing (RU/s provisioned throughput) ─────────────────────────

function calcCosmosDb(config: ResourceConfig): ServiceCostResult {
  try {
    // readUnits and writeUnits are in thousands of RU/s
    const readRus = num(config['readUnits'], 0) * 1000
    const writeRus = num(config['writeUnits'], 0) * 1000
    const totalRus = readRus + writeRus

    // $0.008 per RU/s per hour, billed monthly
    // Minimum 400 RU/s
    const effectiveRus = Math.max(totalRus, 400)
    const monthly = effectiveRus * 0.008 * HOURS_PER_MONTH / 100 // $0.008/RU/hr = $0.00008/RU/hr

    const breakdown: CostLineItem[] = [
      {
        label: `${effectiveRus} RU/s provisioned (min 400) @ $0.008/RU/hr × ${HOURS_PER_MONTH} hrs`,
        unitPrice: 0.008,
        quantity: effectiveRus,
        monthly
      }
    ]

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

// ─── Kubernetes cluster pricing (control plane + worker nodes) ────────────────

/**
 * Managed Kubernetes: EKS / GKE / AKS
 * Formula: (controlPlanePricePerHour * HOURS_PER_MONTH * clusters) + (nodePrice * HOURS_PER_MONTH * nodeCount * clusters)
 * AKS control plane is free ($0.00), EKS/GKE: $0.10/hr
 */
function calcKubernetesCluster(config: ResourceConfig, nodeTypeKey: string, nodeCountKey: string, clusterCountKey: string, controlPlanePricePerHour: number): ServiceCostResult {
  try {
    const nodeTypeValue = config[nodeTypeKey]
    const nodePricePerHour = (nodeTypeValue as SelectOption)?.pricePerHour ?? 0
    const nodeCount = num(config[nodeCountKey], 3)
    const clusters = num(config[clusterCountKey], 1)

    const controlPlaneCost = controlPlanePricePerHour * HOURS_PER_MONTH * clusters
    const nodeCost = nodePricePerHour * HOURS_PER_MONTH * nodeCount * clusters
    const monthly = controlPlaneCost + nodeCost

    const breakdown: CostLineItem[] = []
    if (controlPlanePricePerHour > 0) {
      breakdown.push({
        label: `${clusters}x cluster control plane @ $${controlPlanePricePerHour}/hr × ${HOURS_PER_MONTH} hrs`,
        unitPrice: controlPlanePricePerHour,
        quantity: clusters,
        monthly: controlPlaneCost
      })
    }
    if (nodePricePerHour > 0) {
      breakdown.push({
        label: `${nodeCount * clusters} worker nodes @ $${nodePricePerHour.toFixed(4)}/hr × ${HOURS_PER_MONTH} hrs`,
        unitPrice: nodePricePerHour,
        quantity: nodeCount * clusters,
        monthly: nodeCost
      })
    }

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

// ─── Serverless container pricing (vCPU + memory per task) ───────────────────

/**
 * Serverless containers: Fargate / Cloud Run containers / Azure Container Instances
 * Formula: (vcpuPrice + memoryPrice) * hoursPerMonth * tasks
 */
function calcServerlessContainer(config: ResourceConfig): ServiceCostResult {
  try {
    const tasks = num(config['tasks'], 1)
    const vcpuValue = config['vcpu']
    const memoryValue = config['memoryGb']
    const hoursPerMonth = num(config['hoursPerMonth'], HOURS_PER_MONTH)

    const vcpuPricePerHour = (vcpuValue as SelectOption)?.pricePerHour ?? 0
    const memoryPricePerHour = (memoryValue as SelectOption)?.pricePerHour ?? 0

    const vcpuCost = vcpuPricePerHour * hoursPerMonth * tasks
    const memoryCost = memoryPricePerHour * hoursPerMonth * tasks
    const monthly = vcpuCost + memoryCost

    const breakdown: CostLineItem[] = []
    if (vcpuPricePerHour > 0) {
      breakdown.push({
        label: `${tasks} tasks × vCPU @ $${vcpuPricePerHour.toFixed(5)}/hr × ${hoursPerMonth} hrs`,
        unitPrice: vcpuPricePerHour,
        quantity: tasks,
        monthly: vcpuCost
      })
    }
    if (memoryPricePerHour > 0) {
      breakdown.push({
        label: `${tasks} tasks × memory @ $${memoryPricePerHour.toFixed(5)}/hr × ${hoursPerMonth} hrs`,
        unitPrice: memoryPricePerHour,
        quantity: tasks,
        monthly: memoryCost
      })
    }

    return { monthly, yearly: monthly * 12, breakdown }
  } catch {
    return zeroCost()
  }
}

// ─── Main export: calculateServiceCost ───────────────────────────────────────

/**
 * Calculate the monthly and yearly cost for a single service selection.
 *
 * Dispatches to service-specific calculation logic based on serviceId.
 * Never throws — returns zero cost on unknown serviceId or invalid config.
 *
 * @param serviceId - The service identifier (e.g., 'ec2', 's3', 'rds')
 * @param config - User-specified resource configuration values
 * @param catalog - The provider catalog (used for service lookup, not pricing dispatch)
 * @returns ServiceCostResult with monthly, yearly, and breakdown
 */
export function calculateServiceCost(
  serviceId: string,
  config: ResourceConfig,
  catalog: ProviderCatalog
): ServiceCostResult {
  try {
    const service = findService(catalog, serviceId)
    if (!service) return zeroCost()

    switch (serviceId) {
      // ── AWS Compute ─────────────────────────────────────────────────────────
      case 'ec2':
        return calcComputeInstance(config, 'instanceType', 'quantity', 'usageHoursPerMonth')

      case 'lambda':
        // $0.20 per 1M requests, $0.0000166667 per GB-second
        return calcServerlessFunction(config, 0.20, 0.0000166667)

      // ── AWS Containers ───────────────────────────────────────────────────────
      case 'eks':
        // EKS control plane: $0.10/hr + worker node EC2 costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.10)

      case 'fargate':
        return calcServerlessContainer(config)

      // ── AWS Storage ─────────────────────────────────────────────────────────
      case 's3':
        // $0.023/GB storage, $0.09/GB transfer out
        return calcObjectStorage(config, 0.023, 0.09)

      case 'ebs':
        // gp3: $0.08/GB/month
        return calcBlockStorage(config, 0.08)

      // ── AWS Database ────────────────────────────────────────────────────────
      case 'rds':
        return calcManagedDatabase(config, 'instanceClass', 'quantity', 'multiAz')

      case 'dynamodb':
        // $0.25 per million read units, $1.25 per million write units
        return calcCapacityUnits(config, 0.25, 1.25)

      // ── AWS Networking ──────────────────────────────────────────────────────
      case 'cloudfront':
        // $0.085/GB first 10 TB
        return calcDataTransfer(config, 0.085)

      // ── AWS Serverless ──────────────────────────────────────────────────────
      case 'api-gateway':
        // HTTP API: $1.00 per million calls
        return calcApiGateway(config, 1.00)

      // ── GCP Compute ─────────────────────────────────────────────────────────
      case 'compute-engine':
        return calcComputeInstance(config, 'machineType', 'quantity', 'usageHoursPerMonth')

      case 'cloud-functions':
        // $0.40 per million invocations, $0.0000025 per GB-second
        return calcServerlessFunction(config, 0.40, 0.0000025)

      // ── GCP Containers ───────────────────────────────────────────────────────
      case 'gke':
        // GKE Standard cluster: $0.10/hr per cluster + node Compute Engine costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.10)

      case 'cloud-run-jobs':
        return calcServerlessContainer(config)

      // ── GCP Storage ─────────────────────────────────────────────────────────
      case 'cloud-storage':
        // $0.020/GB storage, $0.08/GB egress
        return calcObjectStorage(config, 0.020, 0.08)

      case 'persistent-disk':
        // pd-ssd: $0.17/GB/month
        return calcBlockStorage(config, 0.17)

      // ── GCP Database ────────────────────────────────────────────────────────
      case 'cloud-sql':
        return calcManagedDatabase(config, 'tier', 'quantity', 'highAvailability')

      case 'firestore':
        // $0.06 per 100K reads = $0.60 per million reads
        // $0.18 per 100K writes = $1.80 per million writes
        return calcCapacityUnits(config, 0.60, 1.80)

      // ── GCP Networking ──────────────────────────────────────────────────────
      case 'cloud-cdn':
        // $0.08/GB from North America
        return calcDataTransfer(config, 0.08)

      // ── GCP Serverless ──────────────────────────────────────────────────────
      case 'cloud-run':
        return calcCloudRun(config)

      // ── Azure Compute ────────────────────────────────────────────────────────
      case 'azure-vm':
        return calcComputeInstance(config, 'vmSize', 'quantity', 'usageHoursPerMonth')

      case 'azure-functions':
        // $0.20 per million executions, $0.000016 per GB-second
        return calcServerlessFunction(config, 0.20, 0.000016)

      // ── Azure Containers ─────────────────────────────────────────────────────
      case 'aks':
        // AKS control plane is free ($0.00/hr) + node Azure VM costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.00)

      case 'azure-container-instances':
        return calcServerlessContainer(config)

      // ── Azure Storage ────────────────────────────────────────────────────────
      case 'blob-storage':
        // Hot tier: $0.018/GB storage, $0.087/GB egress
        return calcObjectStorage(config, 0.018, 0.087)

      case 'managed-disk':
        return calcManagedDisk(config)

      // ── Azure Database ───────────────────────────────────────────────────────
      case 'azure-sql':
        return calcManagedDatabase(config, 'tier', 'quantity', null)

      case 'cosmos-db':
        return calcCosmosDb(config)

      // ── Azure Networking ─────────────────────────────────────────────────────
      case 'azure-cdn':
        // $0.087/GB from North America/Europe
        return calcDataTransfer(config, 0.087)

      // ── Azure Serverless ─────────────────────────────────────────────────────
      case 'app-service':
        return calcComputeInstance(config, 'tier', 'instances', 'usageHoursPerMonth')

      // ── Shared: data-transfer (all providers use same key) ──────────────────
      case 'data-transfer': {
        // Use provider-specific price based on catalog
        const provider = catalog.provider
        const pricePerGb = provider === 'aws' ? 0.09
          : provider === 'gcp' ? 0.08
          : 0.087 // azure
        return calcDataTransfer(config, pricePerGb)
      }

      default:
        return zeroCost()
    }
  } catch {
    return zeroCost()
  }
}

// ─── Main export: calculateTotalCost ─────────────────────────────────────────

/**
 * Calculate the total cost across all selected services.
 *
 * @param selections - Array of service selections with configs
 * @param catalog - Provider catalog for service lookup
 * @returns Total monthly/yearly cost with per-service breakdown
 */
export function calculateTotalCost(
  selections: ServiceSelection[],
  catalog: ProviderCatalog
): {
  totalMonthly: number
  totalYearly: number
  items: Array<{ serviceId: string; serviceName: string } & ServiceCostResult>
} {
  try {
    let totalMonthly = 0
    let totalYearly = 0
    const items: Array<{ serviceId: string; serviceName: string } & ServiceCostResult> = []

    for (const selection of selections) {
      const result = calculateServiceCost(selection.serviceId, selection.config, catalog)
      const service = findService(catalog, selection.serviceId)

      totalMonthly += result.monthly
      totalYearly += result.yearly

      items.push({
        serviceId: selection.serviceId,
        serviceName: service?.name ?? selection.serviceId,
        ...result
      })
    }

    return { totalMonthly, totalYearly, items }
  } catch {
    return { totalMonthly: 0, totalYearly: 0, items: [] }
  }
}
