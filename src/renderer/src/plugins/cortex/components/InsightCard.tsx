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
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-xl border border-border/60 bg-secondary/70"
    >
      {/* Subtle gradient border overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-transparent bg-gradient-to-br from-accent/10 via-transparent to-accent/5 opacity-60" />

      {/* Heading */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <Icon size={14} className="text-primary" />
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>

      {/* Content */}
      <div className="relative p-4">{children}</div>
    </motion.div>
  )
}
