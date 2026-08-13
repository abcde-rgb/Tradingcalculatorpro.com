import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * `interactive` marca la card que responde al ratón: borde + fondo + 1px de
 * elevación, todo con el mismo timing. Ese píxel es lo que separa "cambia de
 * color" de "responde"; `hover:scale-105` en una card de 400px son 20px de
 * salto y delata plantilla.
 *
 * Es opt-in a propósito — la mayoría de las cards son contenedores estáticos, y
 * que reaccionara todo al pasar por encima haría que el hover dejara de
 * significar "esto se puede pulsar". Úsalo en vez de escribir a mano
 * `hover:border-primary`, que es lo que hoy hay repetido por el repo.
 *
 * Sin `shadow`: la elevación se comunica con la superficie (`bg-card`) y el
 * filete de 1px, no con sombra.
 */
const Card = React.forwardRef(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground",
      interactive &&
        "transition-[border-color,background-color,transform] duration-tick ease-out hover:border-primary/40 hover:-translate-y-px",
      className
    )}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
