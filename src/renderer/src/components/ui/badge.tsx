import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@renderer/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/15",
        secondary: "bg-white/6 text-secondary-foreground border border-white/8",
        destructive: "bg-destructive/10 text-destructive border border-destructive/15",
        success: "bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.15)]",
        warning: "bg-[hsl(var(--warning)/0.10)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.15)]",
        info: "bg-[hsl(var(--info)/0.10)] text-[hsl(var(--info))] border border-[hsl(var(--info)/0.15)]",
        outline: "border border-white/10 text-foreground bg-white/3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
