import React, { useMemo, useRef, useState } from 'react';
import { Brain, Repeat, Eye, Hand, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { getSessionPhases } from '@/lib/tradingEducationContent';

// "El proceso emocional de una sesión" — la psicología ordenada por el momento
// en que aparece. El resto de la academia la ordena por concepto (sesgo a sesgo
// en getTradingPsychology, arreglo a arreglo en getPsychSolutions); esto añade
// el eje que faltaba: el tiempo.
//
// Cada fase se lee en cuatro capas, y el orden importa: lo deliberado, el hábito
// que lo pisa, la señal que puedes ver EN TI, y la interrupción. Las dos últimas
// son las que convierten el módulo en herramienta; sin ellas es otra lista de
// sesgos que el lector ya se sabe.
//
// Color: son colores de ESTADO (neutro / problema / aviso / acción), como en
// PreTradeProtocol.jsx, y cada uno viaja SIEMPRE con icono y etiqueta de texto.
// Nunca sólo color. No son `--long`/`--short`: eso es P&L y esto no lo es.
const NEUTRAL = '#94a3b8';  // lo deliberado: contexto, no destaca
const PROBLEM = '#ef4444';  // el automatismo: aquí es donde se pierde dinero
const NOTICE = '#f59e0b';   // la señal observable: mírate, todavía estás a tiempo
const ACTION = '#22c55e';   // la interrupción: lo único que se ejecuta

// El icono de cada capa es de dominio, no decorativo: una cabeza que razona, un
// bucle de hábito, un ojo que observa, una mano que corta.
const LAYERS = [
  { key: 'conscious', Icon: Brain, color: NEUTRAL },
  { key: 'auto', Icon: Repeat, color: PROBLEM },
  { key: 'signal', Icon: Eye, color: NOTICE },
  { key: 'fix', Icon: Hand, color: ACTION },
];

function Layer({ Icon, color, label, text }) {
  return (
    <div className="flex gap-2.5" data-testid={`sph-layer-${label}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} aria-hidden="true" />
      <div className="min-w-0">
        <p
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color }}
        >
          {label}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{text}</p>
      </div>
    </div>
  );
}

export default function SessionPhasesTimeline() {
  const { t } = useTranslation();
  const c = useMemo(() => getSessionPhases(t), [t]);
  const refs = useRef([]);
  const [active, setActive] = useState(0);

  // El salto entre fases usa scrollIntoView nativo: no hace falta una librería de
  // scroll suave para nueve anclas, y así respeta prefers-reduced-motion solo.
  const goTo = (i) => {
    setActive(i);
    const el = refs.current[i];
    if (!el) return;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-8" data-testid="session-phases">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-unbounded text-2xl">{c.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">{c.intro}</p>
        </CardContent>
      </Card>

      {/* Raíl de fases: la navegación del documento original (los puntos del
          mini-timeline) sin GSAP ni Lenis — nueve botones y scrollIntoView. */}
      <nav
        className="flex flex-wrap gap-1.5"
        aria-label={c.title}
        data-testid="sph-rail"
      >
        {c.phases.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={active === i ? 'true' : undefined}
            className={`rounded-sharp border px-2.5 py-1.5 text-xs transition-colors ${
              active === i
                ? 'border-primary text-primary'
                : 'border-rule text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
            data-testid={`sph-rail-${p.id}`}
          >
            <span className="font-mono tabular-nums mr-1.5">
              {String(i).padStart(2, '0')}
            </span>
            {p.name}
          </button>
        ))}
      </nav>

      {/* Línea temporal. El filete vertical es el separador (1px, --rule): ni
          sombra ni degradado. En móvil no cambia de lado — el original alternaba
          izquierda/derecha y en pantalla estrecha eso sólo produce saltos. */}
      <ol className="relative space-y-4 pl-11 sm:pl-14 list-none">
        <span
          className="absolute left-[15px] sm:left-[19px] top-2 bottom-2 w-px bg-rule"
          aria-hidden="true"
        />
        {c.phases.map((p, i) => (
          <li
            key={p.id}
            ref={(el) => { refs.current[i] = el; }}
            className="relative scroll-mt-24"
            data-testid={`sph-phase-${p.id}`}
          >
            <span
              className={`absolute -left-11 sm:-left-14 top-4 grid place-items-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border bg-background font-mono tabular-nums text-xs sm:text-sm ${
                active === i ? 'border-primary text-primary' : 'border-rule text-muted-foreground'
              }`}
              aria-hidden="true"
            >
              {String(i).padStart(2, '0')}
            </span>

            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3.5">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                {LAYERS.map(({ key, Icon, color }) => (
                  <Layer
                    key={key}
                    Icon={Icon}
                    color={color}
                    label={c.labels[key]}
                    text={p[key]}
                  />
                ))}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {/* Matriz resultado × ejecución. Es la idea que el diario necesita para que
          `emotion` y el P&L dejen de ser la misma columna: una ganancia sucia es
          un error, y esta tabla es donde se dice. */}
      <Card className="bg-card border-border" data-testid="sph-matrix">
        <CardHeader>
          <CardTitle className="text-xl">{c.matrix.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {c.matrix.intro}
          </p>

          <div className="overflow-x-auto rounded-sharp border border-rule">
            <table className="w-full min-w-[34rem]">
              <thead>
                <tr className="border-b border-rule">
                  {[c.matrix.colResult, c.matrix.colExec, c.matrix.colRead].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.matrix.rows.map((r) => {
                  const win = r.result === 'win';
                  const good = r.exec === 'good';
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-rule last:border-0"
                      data-testid={`sph-mx-${r.id}`}
                    >
                      {/* Resultado y ejecución llevan icono + palabra: el color
                          no es el único canal, que es la regla de accesibilidad
                          que ya sigue el resto de veredictos del proyecto. */}
                      <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5"
                          style={{ color: win ? ACTION : PROBLEM }}
                        >
                          {win
                            ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            : <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {win ? c.matrix.win : c.matrix.loss}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5"
                          style={{ color: good ? ACTION : PROBLEM }}
                        >
                          {good
                            ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            : <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {good ? c.matrix.good : c.matrix.bad}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-muted-foreground leading-relaxed">
                        {r.read}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-sharp bg-primary/5 border border-primary/20">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted-foreground leading-relaxed">{c.note}</p>
      </div>
    </div>
  );
}
