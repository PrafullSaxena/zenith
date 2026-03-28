import React from 'react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@renderer/lib/utils'

interface SplitPanelProps {
  direction?: 'horizontal' | 'vertical'
  sizes?: number[]
  minSizes?: number[]
  children: React.ReactNode[]
  className?: string
  onResize?: (sizes: number[]) => void
}

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  const isHorizontal = direction === 'horizontal'

  return (
    <PanelResizeHandle
      className={cn(
        'relative bg-transparent transition-colors',
        'hover:bg-primary/20 active:bg-primary/40',
        isHorizontal ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      )}
    >
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border',
          isHorizontal ? 'w-0.5 h-6' : 'h-0.5 w-6'
        )}
      />
    </PanelResizeHandle>
  )
}

export function SplitPanel({
  direction = 'horizontal',
  sizes,
  minSizes,
  children,
  className,
  onResize
}: SplitPanelProps): React.JSX.Element {
  const childArray = React.Children.toArray(children)

  return (
    <PanelGroup
      orientation={direction}
      className={cn('h-full', className)}
      onLayoutChange={onResize ? (layout) => onResize(Object.values(layout)) : undefined}
    >
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ResizeHandle direction={direction} />}
          <Panel
            defaultSize={sizes?.[index] != null ? `${sizes[index]}%` : undefined}
            minSize={`${minSizes?.[index] ?? 10}%`}
          >
            {child}
          </Panel>
        </React.Fragment>
      ))}
    </PanelGroup>
  )
}
