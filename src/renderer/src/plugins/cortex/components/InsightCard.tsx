/**
 * InsightCard -- Reusable card with gradient border, staggered entrance animation,
 * and consistent heading with icon + title. Used in the Architecture Dashboard.
 */
import { motion } from 'framer-motion'

interface InsightCardProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  delay?: number // stagger animation delay
}

export default function InsightCard({
  title,
  icon: Icon,
  children,
  delay = 0
}: InsightCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-xl border border-white/5 bg-black/20 backdrop-blur-md transition-shadow hover:shadow-[0_0_24px_rgba(var(--primary-rgb,99,102,241),0.08)]"
    >
      {/* Heading */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <Icon size={14} className="text-primary" />
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>

      {/* Content */}
      <div className="relative p-4">{children}</div>
    </motion.div>
  )
}
