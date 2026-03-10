/**
 * ProviderSelector — Cloud provider selection cards.
 *
 * Renders 3 clickable cards for AWS, GCP, and Azure.
 * Calls onSelect with the chosen CloudProvider when a card is clicked.
 */
import { Cloud, Globe, Server } from 'lucide-react'
import type { CloudProvider } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'

interface ProviderSelectorProps {
  onSelect: (provider: CloudProvider) => void
}

const PROVIDER_CARDS: Array<{
  id: CloudProvider
  icon: typeof Cloud
  accentClass: string
  borderClass: string
  description: string
}> = [
  {
    id: 'aws',
    icon: Cloud,
    accentClass: 'text-amber-400',
    borderClass: 'hover:border-amber-400/60 hover:bg-amber-400/5',
    description: 'The largest cloud provider with the broadest set of services, global reach, and mature tooling for any workload.'
  },
  {
    id: 'gcp',
    icon: Globe,
    accentClass: 'text-blue-400',
    borderClass: 'hover:border-blue-400/60 hover:bg-blue-400/5',
    description: 'Google\'s cloud platform, known for big data analytics, Kubernetes, AI/ML, and competitive per-second billing.'
  },
  {
    id: 'azure',
    icon: Server,
    accentClass: 'text-cyan-400',
    borderClass: 'hover:border-cyan-400/60 hover:bg-cyan-400/5',
    description: 'Microsoft\'s enterprise cloud with deep Active Directory integration, hybrid cloud, and Office 365 ecosystem.'
  }
]

export default function ProviderSelector({ onSelect }: ProviderSelectorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Select Cloud Provider</h2>
        <p className="text-sm text-text-secondary">
          Choose the cloud platform you want to estimate costs for
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
        {PROVIDER_CARDS.map((card) => {
          const Icon = card.icon
          const info = PROVIDER_INFO[card.id]

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              className={`
                flex flex-col items-start gap-4 rounded-xl border border-border bg-surface
                p-6 text-left transition-all duration-150
                hover:scale-[1.02] hover:shadow-lg
                ${card.borderClass}
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background
              `}
            >
              <div className={`rounded-lg p-2.5 bg-background border border-border ${card.accentClass}`}>
                <Icon size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <span className={`text-sm font-bold ${card.accentClass}`}>
                  {info.shortName}
                </span>
                <span className="text-base font-semibold text-text-primary">
                  {info.displayName}
                </span>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  {card.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
