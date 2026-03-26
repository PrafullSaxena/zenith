import { Toaster as Sonner, toast } from "sonner"

function Toaster({ ...props }: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-[hsl(var(--success)/0.3)] group-[.toaster]:text-[hsl(var(--success))]",
          error:
            "group-[.toaster]:border-[hsl(var(--destructive)/0.3)] group-[.toaster]:text-[hsl(var(--destructive))]",
          warning:
            "group-[.toaster]:border-[hsl(var(--warning)/0.3)] group-[.toaster]:text-[hsl(var(--warning))]",
          info:
            "group-[.toaster]:border-[hsl(var(--info)/0.3)] group-[.toaster]:text-[hsl(var(--info))]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
