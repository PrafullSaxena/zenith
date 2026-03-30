/**
 * Cloud cost calculation engine.
 * Pure TypeScript arithmetic — no external dependencies.
 *
 * All calculations return monthly and yearly estimates.
 * Yearly is always monthly * 12.
 *
 * API:
 *   calculateServiceCost(serviceId, config, rates: ServiceRates, region): ServiceCostResult
 *   calculateTotalCost(selections, rates: RateMap, region): { totalMonthly, totalYearly, items }
 *
 * RateMap is keyed by serviceId → { rateKey → numeric value }.
 * Rates are loaded from pricing.db at runtime; this module never imports catalog files.
 */

import type { ResourceConfig, ServiceCostResult, ServiceSelection, CostLineItem } from '../../types/launchpad'
import type { SelectOption } from './types'

// ─── RateMap types ────────────────────────────────────────────────────────────

// ServiceRates: rateKey → numeric value (from pricing_rates DB table)
type ServiceRates = Record<string, number>

// RateMap: serviceId → ServiceRates
// Re-exported so launchpad-store and other callers can import the type.
export type RateMap = Record<string, ServiceRates>

/**
 * Shared constant for hours per month (AWS standard assumption).
 * Used consistently across all per-hour pricing calculations.
 * Source: https://aws.amazon.com/ec2/pricing/on-demand/ (pricing documentation)
 */
export const HOURS_PER_MONTH = 730

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
 * Primary price source: SelectOption.pricePerHour on the config value.
 * Fallback: rates['pricePerHour']
 */
function calcComputeInstance(config: ResourceConfig, instanceTypeKey: string, quantityKey: string, usageKey: string, rates: ServiceRates): ServiceCostResult {
  try {
    const instanceTypeValue = config[instanceTypeKey]
    const pricePerHour = (instanceTypeValue as SelectOption)?.pricePerHour
      ?? num(str(config[instanceTypeKey]))
      ?? (rates['pricePerHour'] ?? 0)
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
 * Rates keys: pricePerGbStorage (storage), pricePerGbTransfer (egress)
 */
function calcObjectStorage(config: ResourceConfig, rates: ServiceRates, defaultStoragePrice: number, defaultTransferPrice: number): ServiceCostResult {
  try {
    const storageGb = num(config['storageGb'], 0)
    const transferOutGb = num(config['transferOutGb'], 0)

    const storagePricePerGb = rates['pricePerGbStorage'] ?? defaultStoragePrice
    const transferPricePerGb = rates['pricePerGbTransfer'] ?? defaultTransferPrice

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
 * Rate keys: pricePerMillionRequests, pricePerGbSecond
 */
function calcServerlessFunction(config: ResourceConfig, rates: ServiceRates, defaultRequestPrice: number, defaultDurationPrice: number): ServiceCostResult {
  try {
    const requestsMillions = num(config['requests'], 0)
    const durationGbSeconds = num(config['durationGbSeconds'], 0)

    const requestPricePerMillion = rates['pricePerMillionRequests'] ?? defaultRequestPrice
    const durationPricePerGbSecond = rates['pricePerGbSecond'] ?? defaultDurationPrice

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
 * Primary price source: SelectOption.pricePerHour on the tier config value.
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
 * Rate keys: pricePerMillionRequests (read), pricePerMillionWrites (write)
 */
function calcCapacityUnits(config: ResourceConfig, rates: ServiceRates, defaultReadPrice: number, defaultWritePrice: number): ServiceCostResult {
  try {
    const readUnits = num(config['readUnits'], 0)
    const writeUnits = num(config['writeUnits'], 0)

    const readPricePerMillion = rates['pricePerMillionRequests'] ?? defaultReadPrice
    const writePricePerMillion = rates['pricePerMillionWrites'] ?? defaultWritePrice

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
 * Rate key: pricePerGb
 */
function calcBlockStorage(config: ResourceConfig, rates: ServiceRates, defaultPrice: number): ServiceCostResult {
  try {
    const sizeGb = num(config['sizeGb'], 0)
    const pricePerGb = rates['pricePerGb'] ?? defaultPrice
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
 * Rate key: pricePerGb
 */
function calcDataTransfer(config: ResourceConfig, rates: ServiceRates, defaultPrice: number): ServiceCostResult {
  try {
    const gb = num(config['gb'], 0)
    const pricePerGb = rates['pricePerGb'] ?? defaultPrice
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
 * Rate key: pricePerMillionRequests
 */
function calcApiGateway(config: ResourceConfig, rates: ServiceRates, defaultPrice: number): ServiceCostResult {
  try {
    const requestsMillions = num(config['requestsPerMonth'], 0)
    const pricePerMillion = rates['pricePerMillionRequests'] ?? defaultPrice
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

function calcCloudRun(config: ResourceConfig, rates: ServiceRates): ServiceCostResult {
  try {
    const requestsMillions = num(config['requestsPerMonth'], 0)
    // $0.40 per million requests (first 2M free, ignored here)
    const pricePerMillion = rates['pricePerMillionRequests'] ?? 0.40
    const monthly = requestsMillions * pricePerMillion

    const breakdown: CostLineItem[] = [
      {
        label: `${requestsMillions}M requests @ $${pricePerMillion.toFixed(2)}/M`,
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
 * Primary node price source: SelectOption.pricePerHour on the node type config value.
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
 * Primary price source: SelectOption.pricePerHour on vcpu and memoryGb config values.
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
 * @param rates - Rate map for this service from pricing DB (empty object is safe)
 * @param _region - Region identifier (reserved for future region-specific rate lookups)
 * @returns ServiceCostResult with monthly, yearly, and breakdown
 */
export function calculateServiceCost(
  serviceId: string,
  config: ResourceConfig,
  rates: ServiceRates,
  _region: string
): ServiceCostResult {
  try {
    switch (serviceId) {
      // ── AWS Compute ─────────────────────────────────────────────────────────
      case 'ec2':
        return calcComputeInstance(config, 'instanceType', 'quantity', 'usageHoursPerMonth', rates)

      case 'lambda':
        // $0.20 per 1M requests, $0.0000166667 per GB-second
        return calcServerlessFunction(config, rates, 0.20, 0.0000166667)

      // ── AWS Containers ───────────────────────────────────────────────────────
      case 'eks':
        // EKS control plane: $0.10/hr + worker node EC2 costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.10)

      case 'fargate':
        return calcServerlessContainer(config)

      // ── AWS Storage ─────────────────────────────────────────────────────────
      case 's3':
        // Default: $0.023/GB storage, $0.09/GB transfer out
        return calcObjectStorage(config, rates, 0.023, 0.09)

      case 'ebs':
        // Default: gp3 $0.08/GB/month
        return calcBlockStorage(config, rates, 0.08)

      // ── AWS Database ────────────────────────────────────────────────────────
      case 'rds':
        return calcManagedDatabase(config, 'instanceClass', 'quantity', 'multiAz')

      case 'dynamodb':
        // Default: $0.25 per million read units, $1.25 per million write units
        return calcCapacityUnits(config, rates, 0.25, 1.25)

      // ── AWS Networking ──────────────────────────────────────────────────────
      case 'cloudfront':
        // Default: $0.085/GB first 10 TB
        return calcDataTransfer(config, rates, 0.085)

      // ── AWS Serverless ──────────────────────────────────────────────────────
      case 'api-gateway':
        // Default: HTTP API $1.00 per million calls
        return calcApiGateway(config, rates, 1.00)

      // ── GCP Compute ─────────────────────────────────────────────────────────
      case 'compute-engine':
        return calcComputeInstance(config, 'machineType', 'quantity', 'usageHoursPerMonth', rates)

      case 'cloud-functions':
        // Default: $0.40 per million invocations, $0.0000025 per GB-second
        return calcServerlessFunction(config, rates, 0.40, 0.0000025)

      // ── GCP Containers ───────────────────────────────────────────────────────
      case 'gke':
        // GKE Standard cluster: $0.10/hr per cluster + node Compute Engine costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.10)

      case 'cloud-run-jobs':
        return calcServerlessContainer(config)

      // ── GCP Storage ─────────────────────────────────────────────────────────
      case 'cloud-storage':
        // Default: $0.020/GB storage, $0.08/GB egress
        return calcObjectStorage(config, rates, 0.020, 0.08)

      case 'persistent-disk':
        // Default: pd-ssd $0.17/GB/month
        return calcBlockStorage(config, rates, 0.17)

      // ── GCP Database ────────────────────────────────────────────────────────
      case 'cloud-sql':
        return calcManagedDatabase(config, 'tier', 'quantity', 'highAvailability')

      case 'firestore':
        // Default: $0.60/million reads, $1.80/million writes
        return calcCapacityUnits(config, rates, 0.60, 1.80)

      // ── GCP Networking ──────────────────────────────────────────────────────
      case 'cloud-cdn':
        // Default: $0.08/GB from North America
        return calcDataTransfer(config, rates, 0.08)

      // ── GCP Serverless ──────────────────────────────────────────────────────
      case 'cloud-run':
        return calcCloudRun(config, rates)

      // ── Azure Compute ────────────────────────────────────────────────────────
      case 'azure-vm':
        return calcComputeInstance(config, 'vmSize', 'quantity', 'usageHoursPerMonth', rates)

      case 'azure-functions':
        // Default: $0.20 per million executions, $0.000016 per GB-second
        return calcServerlessFunction(config, rates, 0.20, 0.000016)

      // ── Azure Containers ─────────────────────────────────────────────────────
      case 'aks':
        // AKS control plane is free ($0.00/hr) + node Azure VM costs
        return calcKubernetesCluster(config, 'nodeInstanceType', 'nodeCount', 'clusters', 0.00)

      case 'azure-container-instances':
        return calcServerlessContainer(config)

      // ── Azure Storage ────────────────────────────────────────────────────────
      case 'blob-storage':
        // Default: Hot tier $0.018/GB storage, $0.087/GB egress
        return calcObjectStorage(config, rates, 0.018, 0.087)

      case 'managed-disk':
        return calcManagedDisk(config)

      // ── Azure Database ───────────────────────────────────────────────────────
      case 'azure-sql':
        return calcManagedDatabase(config, 'tier', 'quantity', null)

      case 'cosmos-db':
        return calcCosmosDb(config)

      // ── Azure Networking ─────────────────────────────────────────────────────
      case 'azure-cdn':
        // Default: $0.087/GB from North America/Europe
        return calcDataTransfer(config, rates, 0.087)

      // ── Azure Serverless ─────────────────────────────────────────────────────
      case 'app-service':
        return calcComputeInstance(config, 'tier', 'instances', 'usageHoursPerMonth', rates)

      // ── Shared: data-transfer (provider-neutral lookup from rates) ──────────
      case 'data-transfer':
        // Default $0.09/GB (AWS standard); actual rate supplied via DB rates map
        return calcDataTransfer(config, rates, 0.09)

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
 * @param rates - RateMap: serviceId → ServiceRates (from pricing DB; empty object is safe)
 * @param region - Region identifier (used for rate lookup; empty string falls back to defaults)
 * @returns Total monthly/yearly cost with per-service breakdown
 */
export function calculateTotalCost(
  selections: ServiceSelection[],
  rates: RateMap,
  region: string
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
      const serviceRates: ServiceRates = rates[selection.serviceId] ?? {}
      const result = calculateServiceCost(selection.serviceId, selection.config, serviceRates, region)

      totalMonthly += result.monthly
      totalYearly += result.yearly

      items.push({
        serviceId: selection.serviceId,
        serviceName: selection.serviceId,
        ...result
      })
    }

    return { totalMonthly, totalYearly, items }
  } catch {
    return { totalMonthly: 0, totalYearly: 0, items: [] }
  }
}
