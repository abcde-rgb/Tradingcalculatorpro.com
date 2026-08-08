import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // `rounded-sharp` (2px): los campos y las celdas de datos llevan la
        // esquina viva; el radio suave queda para cards y modales.
        // `tabular-nums` es obligatorio en un campo donde se teclea un precio:
        // sin él las cifras bailan de ancho al escribir.
        "flex h-9 w-full rounded-sharp border border-input bg-transparent px-3 py-1 text-base tabular-nums transition-[color,background-color,border-color] duration-tick ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "[&[type=number]]:font-mono",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
