import React, { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { fmtPrice } from './scannerMeta';

/**
 * La TIRA DE PRUEBA: las velas que el escáner ha leído de verdad, con encima
 * lo que afirma haber encontrado.
 *
 * POR QUÉ EXISTE
 * El escáner decía «resistencia en 4.512,30, zona ±0,4 %, tres toques» y no
 * había una sola imagen en toda la herramienta. Para comprobarlo tenías que ir
 * al gráfico y trazar la línea a mano, y si no la veías no podías distinguir
 * «no está» de «no la he encontrado». Ahí es donde se pierde la confianza.
 *
 * NO ES UN GRÁFICO PARA OPERAR — para eso está el de arriba, que tiene
 * herramientas, zoom e indicadores. Esto es una prueba: la afirmación dibujada
 * sobre su propia evidencia, para poder decir «sí, es mi gráfico» de un
 * vistazo. Por eso se pintan las MISMAS velas que se escanearon y no una serie
 * pedida aparte: si las dos no coinciden, esta tira lo enseña.
 *
 * Los swings traen su índice en la serie completa, así que se restan
 * `barsOffset` para situarlos. Sin eso salen corridos, que es peor que no
 * pintarlos: un pivote mal puesto invalida la tira entera.
 */
export default function ProofStrip({ data }) {
  const { t } = useTranslation();

  const bars = Array.isArray(data?.bars) ? data.bars : [];
  const offset = Number(data?.barsOffset) || 0;

  const geo = useMemo(() => {
    if (bars.length < 2) return null;
    /* La relación de aspecto se elige cerca de la del contenedor real: con
       un viewBox cuadrado el SVG se dibujaba centrado y dejaba dos franjas
       muertas a los lados, que en una tira de velas se lee como que faltan
       datos. */
    const W = 1100, H = 250, ML = 6, MR = 74, MT = 12, MB = 16;
    const iw = W - ML - MR, ih = H - MT - MB;

    let lo = Infinity, hi = -Infinity;
    for (const b of bars) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }

    // Los niveles dentro del encuadre también estiran la escala: una
    // resistencia que cae fuera del recorte se dibujaría pegada al borde y
    // parecería tocada cuando no lo está.
    const niveles = (data.levels || []).filter((n) => n.price >= lo * 0.985 && n.price <= hi * 1.015);
    for (const n of niveles) { if (n.price < lo) lo = n.price; if (n.price > hi) hi = n.price; }

    const pad = (hi - lo) * 0.06 || Math.max(hi * 0.002, 0.01);
    lo -= pad; hi += pad;

    const x = (i) => ML + (i / Math.max(bars.length - 1, 1)) * iw;
    const y = (v) => MT + ih - ((v - lo) / Math.max(hi - lo, 1e-9)) * ih;
    const cw = Math.max(1.5, Math.min(9, (iw / bars.length) * 0.62));

    return { W, H, ML, MR, MT, ih, iw, x, y, cw, niveles, lo, hi };
  }, [bars, data]);

  if (!geo) return null;

  const { W, H, ML, MR, MT, ih, x, y, cw, niveles } = geo;

  const swings = (data.swings || [])
    .map((s) => ({ ...s, i: s.index - offset }))
    .filter((s) => s.i >= 0 && s.i < bars.length);

  const fvgs = (data.fvgs || [])
    .filter((f) => !f.filled && f.top != null && f.bottom != null
      && f.top <= geo.hi && f.bottom >= geo.lo);

  const last = bars[bars.length - 1];

  return (
    <figure className="m-0" data-testid="proof-strip">
      <div className="rounded-lg border border-border bg-muted/25 px-2 pt-2 pb-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('structProofAria')
            .replace('{n}', String(bars.length))
            .replace('{tf}', data.interval || '')}
        >
          {/* Desequilibrios abiertos: el fondo, para que no tapen las velas. */}
          {fvgs.map((f, k) => (
            <rect
              key={`f${k}`}
              x={ML} width={W - ML - MR}
              y={y(f.top)} height={Math.max(1, y(f.bottom) - y(f.top))}
              fill="hsl(var(--primary))" opacity="0.07"
            />
          ))}

          {/* Niveles: la línea y su ZONA, que es lo que el escáner mide. */}
          {niveles.map((n, k) => {
            const col = n.type === 'resistance' ? 'hsl(var(--short))' : 'hsl(var(--long))';
            const zHi = n.zone?.high ?? n.price;
            const zLo = n.zone?.low ?? n.price;
            return (
              <g key={`n${k}`}>
                <rect
                  x={ML} width={W - ML - MR}
                  y={y(zHi)} height={Math.max(1, y(zLo) - y(zHi))}
                  fill={col} opacity="0.10"
                />
                <line
                  x1={ML} x2={W - MR} y1={y(n.price)} y2={y(n.price)}
                  stroke={col} strokeWidth="1" strokeDasharray="5 4" opacity="0.85"
                />
                <text
                  x={W - MR + 5} y={y(n.price) + 3.5}
                  fontSize="9" fontFamily="ui-monospace, Menlo, monospace" fill={col}
                >
                  {fmtPrice(n.price)}
                </text>
              </g>
            );
          })}

          {/* Velas. */}
          {bars.map((b, i) => {
            const up = b.c >= b.o;
            const col = up ? 'hsl(var(--long))' : 'hsl(var(--short))';
            const bodyTop = y(Math.max(b.o, b.c));
            const bodyBot = y(Math.min(b.o, b.c));
            return (
              <g key={i} stroke={col} fill={col}>
                <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} strokeWidth="1" />
                <rect
                  x={x(i) - cw / 2} y={bodyTop}
                  width={cw} height={Math.max(1, bodyBot - bodyTop)}
                />
              </g>
            );
          })}

          {/* Pivotes: el esqueleto del que sale todo lo demás. */}
          {swings.map((s, k) => (
            <circle
              key={`s${k}`}
              cx={x(s.i)} cy={y(s.price)} r="1.9"
              fill="hsl(var(--foreground))" opacity="0.55"
            />
          ))}

          {/* Precio actual. */}
          {last && (
            <g>
              <line
                x1={ML} x2={W - MR} y1={y(last.c)} y2={y(last.c)}
                stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.45"
              />
              <text
                x={W - MR + 5} y={y(last.c) + 3.5}
                fontSize="9" fontFamily="ui-monospace, Menlo, monospace"
                fill="hsl(var(--foreground))" fontWeight="700"
              >
                {fmtPrice(last.c)}
              </text>
            </g>
          )}

          <text x={ML} y={H - 3} fontSize="8.5" fill="hsl(var(--muted-foreground))"
                fontFamily="ui-monospace, Menlo, monospace">
            {bars[0]?.t}
          </text>
          <text x={W - MR} y={H - 3} fontSize="8.5" textAnchor="end"
                fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, Menlo, monospace">
            {last?.t}
          </text>
        </svg>
      </div>
      <figcaption className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
        {t('structProofCaption')
          .replace('{n}', String(bars.length))
          .replace('{tf}', data.interval || '')}
      </figcaption>
    </figure>
  );
}
