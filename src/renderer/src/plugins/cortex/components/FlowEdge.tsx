/**
 * FlowEdge -- Custom animated edge with gradient stroke, animated dash, and inline label.
 * Uses getSmoothStepPath for clean hierarchical layout edges.
 * Supports type-based styles: 'inject', 'inferred', 'import', default (call).
 */
import { memo } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

const GRADIENT_ID = 'cortex-edge-gradient'
const ARROW_ID = 'cortex-edge-arrow'

const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12
  })

  const label = data?.label as string | undefined
  const edgeType = data?.type as string | undefined

  // Unique IDs per edge to avoid SVG defs collisions
  const gradientId = `${GRADIENT_ID}-${id}`
  const arrowId = `${ARROW_ID}-${id}`
  const glowId = `edge-glow-${id}`

  // Type-based style config
  const isInject = edgeType === 'inject'
  const isInferred = edgeType === 'inferred'
  const isImport = edgeType === 'import'
  const isDefault = !isInject && !isInferred && !isImport

  return (
    <>
      {/* SVG defs: gradient + arrowhead + glow filter */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(72% 0.15 195)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(72% 0.15 195)" stopOpacity="0.8" />
        </linearGradient>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="oklch(72% 0.15 195 / 0.6)" />
        </marker>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* inject: purple, 2px, animated dashes */}
      {isInject && (
        <>
          <path
            d={edgePath}
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="none"
            strokeOpacity={0.4}
            filter={`url(#${glowId})`}
          />
          <path
            d={edgePath}
            className="cortex-animated-edge"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="none"
            strokeDasharray="5 5"
          />
          <circle r={2.5} fill="#8b5cf6" opacity={0.75}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {/* inferred: thin dotted gray, 1px, no flowing dot */}
      {isInferred && (
        <path
          d={edgePath}
          stroke="#475569"
          strokeWidth={1}
          fill="none"
          strokeOpacity={0.6}
          strokeDasharray="2 4"
          filter={`url(#${glowId})`}
        />
      )}

      {/* import: dashed blue, 1px */}
      {isImport && (
        <>
          <path
            d={edgePath}
            stroke="#3b82f6"
            strokeWidth={1}
            fill="none"
            strokeOpacity={0.4}
            filter={`url(#${glowId})`}
          />
          <path
            d={edgePath}
            className="cortex-animated-edge"
            stroke="#3b82f6"
            strokeWidth={1}
            fill="none"
            strokeDasharray="5 5"
          />
        </>
      )}

      {/* default (call): gradient + flowing dot */}
      {isDefault && (
        <>
          {/* Base path (subtle, full opacity for hit area) */}
          <path
            d={edgePath}
            stroke={`url(#${gradientId})`}
            strokeWidth={1.5}
            fill="none"
            strokeOpacity={0.35}
            filter={`url(#${glowId})`}
          />

          {/* Animated dashed overlay */}
          <path
            d={edgePath}
            className="cortex-animated-edge"
            stroke={`url(#${gradientId})`}
            strokeWidth={1.5}
            fill="none"
            markerEnd={`url(#${arrowId})`}
            strokeDasharray="5 5"
          />

          {/* Flowing dot */}
          <circle r={2.5} fill="oklch(72% 0.15 195)" opacity={0.75}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {/* Edge label */}
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-secondary"
          style={{ fontSize: 8, pointerEvents: 'none' }}
        >
          <tspan
            dx="0"
            dy="0"
            style={{
              backgroundColor: 'transparent',
              paintOrder: 'stroke',
              stroke: 'var(--color-surface, #0f1117)',
              strokeWidth: 3,
              strokeLinejoin: 'round'
            }}
          >
            {label}
          </tspan>
          {label}
        </text>
      )}
    </>
  )
})

export default FlowEdge
