/**
 * FlowEdge -- Custom animated edge with flowing dot animation.
 * Uses getSmoothStepPath for clean hierarchical layout edges.
 */
import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12
  })

  const label = data?.label as string | undefined

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: 'oklch(72% 0.15 195 / 0.4)',
          strokeWidth: 1.5
        }}
      />
      {/* Flowing dot animation */}
      <circle r={3} fill="oklch(72% 0.15 195)" className="opacity-80">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      {/* Optional label */}
      {label && (
        <text>
          <textPath
            href={`#${id}`}
            startOffset="50%"
            textAnchor="middle"
            className="fill-text-secondary/50 text-[8px]"
          >
            {label}
          </textPath>
        </text>
      )}
    </>
  )
})

export default FlowEdge
