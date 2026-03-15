/**
 * cortex-theme.ts — Shared design tokens for the Cortex plugin.
 * KIND_COLORS are fixed across themes for entity recognition consistency.
 */

export interface KindColorSet {
  bg: string
  border: string
  text: string
  glow: string
}

export const KIND_COLORS: Record<string, KindColorSet> = {
  controller: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#34d399', glow: 'rgba(16,185,129,0.15)' },
  service:    { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', text: '#a78bfa', glow: 'rgba(139,92,246,0.15)' },
  repository: { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
  class:      { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.25)',   text: '#22d3ee', glow: 'rgba(6,182,212,0.15)' },
  component:  { bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)',  text: '#f472b6', glow: 'rgba(236,72,153,0.15)' },
  function:   { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
  middleware: { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)',    text: '#f87171', glow: 'rgba(239,68,68,0.15)' },
  dag:        { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)',   text: '#fbbf24', glow: 'rgba(245,158,11,0.15)' },
  task:       { bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.25)',   text: '#fb923c', glow: 'rgba(251,146,60,0.15)' },
  method:     { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
  route:      { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  text: '#34d399', glow: 'rgba(16,185,129,0.15)' },
  decorator:  { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af', glow: 'rgba(107,114,128,0.15)' },
  default:    { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
}

export function getKindColor(kind: string): KindColorSet {
  return KIND_COLORS[kind] ?? KIND_COLORS.default
}

export interface MethodColorSet {
  bg: string
  text: string
  border: string
}

export const METHOD_COLORS: Record<string, MethodColorSet> = {
  GET:    { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  POST:   { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  PUT:    { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  DELETE: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  PATCH:  { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  ALL:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
}

export function getMethodColor(method: string): MethodColorSet {
  return METHOD_COLORS[method] ?? METHOD_COLORS.ALL
}

/** Glass card class string — use on any surface card */
export const GLASS_CARD = 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl'

/** Glass surface class string — use on panels, toolbars */
export const GLASS_SURFACE = 'bg-surface-elevated/50 backdrop-blur-xl border-b border-border/40'

/** Staggered card entrance variants for framer-motion */
export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  })
}

/** Reduced-motion-aware card variants */
export function useCardVariants(reducedMotion: boolean): typeof cardVariants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0, y: 0, scale: 1 },
      visible: () => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.15 }
      })
    }
  }
  return cardVariants
}

/** Repo type gradient colors for card top borders */
export const REPO_TYPE_GRADIENTS: Record<string, string> = {
  backend: 'from-blue-500 to-cyan-400',
  frontend: 'from-purple-500 to-pink-400',
  'data-engineering': 'from-amber-500 to-orange-400',
  fullstack: 'from-green-500 to-emerald-400',
  unknown: 'from-gray-500 to-slate-400',
}
