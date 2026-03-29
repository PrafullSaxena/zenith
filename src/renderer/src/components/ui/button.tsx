import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@renderer/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 hover:border-primary/35 hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]",
        destructive:
          "bg-destructive/12 text-[hsl(0,80%,70%)] border border-destructive/20 hover:bg-destructive/20 hover:border-destructive/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.12)] focus-visible:ring-destructive/30",
        outline:
          "border border-white/8 text-foreground bg-white/2 hover:bg-white/6 hover:border-white/14",
        secondary:
          "bg-white/6 text-secondary-foreground border border-white/8 hover:bg-white/10 hover:border-white/14",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-white/6 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        solid:
          "bg-linear-to-b from-[hsl(263,75%,62%)] to-[hsl(263,70%,50%)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] hover:from-[hsl(263,75%,66%)] hover:to-[hsl(263,70%,54%)] hover:shadow-[0_2px_10px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
      },
      size: {
        default: "h-8 px-3 py-1.5 has-[>svg]:px-2.5",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2",
        lg: "h-9 px-5 has-[>svg]:px-4",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = VariantProps<typeof buttonVariants> & {
  asChild?: boolean
  /** Scale factor on hover (AnimateUI-style). Set to 1 to disable. Default: 1.02 */
  hoverScale?: number
  /** Scale factor on tap/press (AnimateUI-style). Set to 1 to disable. Default: 0.97 */
  tapScale?: number
  /** Disable motion animations entirely (for nested motion contexts). */
  disableMotion?: boolean
} & Omit<HTMLMotionProps<"button">, "variants">

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      hoverScale = 1.02,
      tapScale = 0.97,
      disableMotion = false,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot.Root
          data-slot="button"
          data-variant={variant}
          data-size={size}
          className={cn(buttonVariants({ variant, size, className }))}
          {...(props as React.ComponentProps<typeof Slot.Root>)}
        />
      )
    }

    if (disableMotion || variant === "link") {
      return (
        <button
          ref={ref}
          data-slot="button"
          data-variant={variant}
          data-size={size}
          className={cn(buttonVariants({ variant, size, className }))}
          {...(props as React.ComponentProps<"button">)}
        />
      )
    }

    return (
      <motion.button
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: tapScale }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
