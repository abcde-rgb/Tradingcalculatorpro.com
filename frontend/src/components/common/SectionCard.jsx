import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Sección plegable con cabecera. Es la pieza con la que se ordena el panel de
 * opciones de arriba abajo por importancia.
 *
 * Antes, lo secundario (explicación, coach, griegas detalladas, Kelly, cartera,
 * costes) se repartía entre tres botones de toggle sueltos y dos paneles
 * siempre abiertos, cada uno con su propio marco y su propio estilo. El
 * resultado era una pared donde nada parecía más importante que otra cosa.
 * Ahora todo lo accesorio usa este mismo contenedor, cerrado por defecto: la
 * pantalla arranca con lo principal y el resto se abre bajo demanda.
 *
 * Props:
 *   icon        — elemento ya renderizado (no el componente)
 *   title       — texto de la cabecera
 *   subtitle    — una línea que explica PARA QUÉ sirve la sección
 *   badge       — contenido opcional a la derecha del título
 *   defaultOpen — si arranca desplegada (por defecto: no)
 *   accent      — color del icono: 'primary' | 'blue' | 'purple' | 'amber' | 'muted'
 */
const ACCENTS = {
  primary: 'text-primary bg-primary/10',
  blue: 'text-[#60a5fa] bg-[#3b82f6]/10',
  purple: 'text-[#c084fc] bg-[#a855f7]/10',
  amber: 'text-[#fbbf24] bg-[#f59e0b]/10',
  muted: 'text-muted-foreground bg-muted',
};

export default function SectionCard({
  icon,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  accent = 'muted',
  testid,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-testid={testid}
    >
      <h3 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          data-testid={testid ? `${testid}-toggle` : undefined}
        >
          {icon && (
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENTS[accent] || ACCENTS.muted}`}>
              {icon}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{title}</span>
              {badge}
            </span>
            {subtitle && (
              <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>

      {open && (
        <div id={panelId} className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Encabezado de un bloque PRINCIPAL (no plegable). Numerado, para que el orden
 * de lectura del panel sea explícito: 1 configura → 2 resultado → 3 gráfico.
 */
export function SectionHeading({ step, title, hint, right }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      {step != null && (
        <span className="w-5 h-5 rounded-md bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </span>
      )}
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
      {hint && <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">— {hint}</span>}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
