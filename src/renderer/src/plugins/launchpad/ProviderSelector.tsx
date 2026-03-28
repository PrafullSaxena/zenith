/**
 * ProviderSelector — Cloud provider selection cards with brand-colored hover glow.
 *
 * Renders 3 clickable Cards for AWS, GCP, and Azure with stagger animation.
 * Each card has a brand-specific hover glow color.
 * Calls onSelect with the chosen CloudProvider when a card is clicked.
 */
import { Cloud, Globe, Server, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'
import { EmptyState } from '@renderer/components/ui/EmptyState'
import { staggerContainer, staggerItem } from '@renderer/lib/motion'
import type { CloudProvider } from '../../types/launchpad'
import { PROVIDER_INFO } from '../../data/cloud-pricing/index'

interface ProviderSelectorProps {
  onSelect: (provider: CloudProvider) => void
}

const BRAND_COLORS: Record<string, string> = {
  aws: 'rgba(255,153,0,0.15)',
  gcp: 'rgba(66,133,244,0.15)',
  azure: 'rgba(0,188,212,0.15)'
}

const ACCENT_TEXT: Record<string, string> = {
  aws: 'text-amber-400',
  gcp: 'text-blue-400',
  azure: 'text-cyan-400'
}

const PROVIDER_CARDS: Array<{
  id: CloudProvider
  icon: typeof Cloud
  description: string
}> = [
  {
    id: 'aws',
    icon: Cloud,
    description:
      'The largest cloud provider with the broadest set of services, global reach, and mature tooling for any workload.'
  },
  {
    id: 'gcp',
    icon: Globe,
    description:
      "Google's cloud platform, known for big data analytics, Kubernetes, AI/ML, and competitive per-second billing."
  },
  {
    id: 'azure',
    icon: Server,
    description:
      "Microsoft's enterprise cloud with deep Active Directory integration, hybrid cloud, and Office 365 ecosystem."
  }
]

export default function ProviderSelector({ onSelect }: ProviderSelectorProps): React.JSX.Element {
  if (PROVIDER_CARDS.length === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="Select a Provider"
        description="Choose a cloud provider to start estimating"
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))] mb-2">
          Select Cloud Provider
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Choose the cloud platform you want to estimate costs for
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl"
      >
        {PROVIDER_CARDS.map((card) => {
          const Icon = card.icon
          const info = PROVIDER_INFO[card.id]
          const brandColor = BRAND_COLORS[card.id]
          const accentText = ACCENT_TEXT[card.id]

          return (
            <motion.div key={card.id} variants={staggerItem}>
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="cursor-pointer p-6 text-left h-full rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md shadow-lg transition-colors relative overflow-hidden group"
                onClick={() => onSelect(card.id)}
              >
                {/* Background glow injected safely */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" 
                  style={{ backgroundColor: brandColor }} 
                />
                
                <div className="flex flex-col items-start gap-4 relative z-10">
                  <div
                    className={`rounded-xl p-3 bg-white/5 border border-white/10 ${accentText} shadow-inner`}
                  >
                    <Icon size={26} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${accentText}`}>{info.shortName}</span>
                    <span className="text-xl font-bold text-foreground">
                      {info.displayName}
                    </span>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed mt-2">
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
