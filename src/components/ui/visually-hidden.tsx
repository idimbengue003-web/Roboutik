import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export function VisuallyHidden({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      className={cn(
        "absolute size-px overflow-hidden p-0 m-0 -m-px whitespace-nowrap border-0 clip-[rect(0,0,0,0)]",
        className
      )}
      {...props}
    />
  )
}
