import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@renderer/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/13 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/13 text-destructive",
        success: "bg-[hsl(var(--success)/0.13)] text-[hsl(var(--success))]",
        warning: "bg-[hsl(var(--warning)/0.13)] text-[hsl(var(--warning))]",
        info: "bg-[hsl(var(--info)/0.13)] text-[hsl(var(--info))]",
        outline: "border border-border text-foreground",
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
