import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { motion, LayoutGroup } from "framer-motion"

import { cn } from "@renderer/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsLayoutContext = React.createContext<string>("")

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const layoutId = React.useId()

  return (
    <TabsLayoutContext.Provider value={layoutId}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-xl bg-secondary p-1 text-muted-foreground",
          className
        )}
        {...props}
      >
        <LayoutGroup id={layoutId}>{children}</LayoutGroup>
      </TabsPrimitive.List>
    </TabsLayoutContext.Provider>
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const layoutId = React.useContext(TabsLayoutContext)
  const ref = React.useRef<HTMLButtonElement>(null)
  const [isActive, setIsActive] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new MutationObserver(() => {
      setIsActive(el.getAttribute("data-state") === "active")
    })
    observer.observe(el, { attributes: true, attributeFilter: ["data-state"] })
    setIsActive(el.getAttribute("data-state") === "active")

    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.span
          layoutId={`tab-indicator-${layoutId}`}
          className="absolute inset-0 rounded-lg bg-card shadow-sm"
          style={{ zIndex: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300, duration: 0.25 }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
