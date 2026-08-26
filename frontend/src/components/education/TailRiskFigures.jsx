import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { getTailRiskFigures } from '@/lib/tradingEducationContent';
import {
  SIGMAS, CAIDAS, EVENTOS_COLA, EDAD_UNIVERSO_ANIOS,
  colaNormal, frecuenciaNormal, subidaParaRecuperar, pctDe,
} from '@/lib/tailRiskData';

/**
 * Las tres tablas que le faltaban a `tail-risk`.
 *
 * El módulo tenía 1.096 palabras y ninguna cifra, que es lo peor que le puede
 * pasar justo a éste: sin «−20,47 % en una sesión» ni «el VIX de 17,31 a
 * 37,32», el riesgo de cola queda como una advertencia genérica que nadie
 * interioriza. Ninguna de estas cifras está escrita a mano en el render: las
 * teóricas se calculan y las reales viven en `lib/tailRiskData.js` con su
 * fecha, para que se puedan comprobar una a una.
 *
 * Los rótulos y las diez líneas salen de `getTailRiskFigures`, en el contenido
 * de la academia, para que `split-i18n-edu` los difiera con el resto en vez de
 * mandarlos en `main.js` a quien sólo abre la portada.
 */

const SUPER = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const exponente = (n) => String(n).split('').map((c) => SUPER[c] ?? c).join('');

/** 2,7 × 10⁻³. La notación científica es la única legible entre 10⁻³ y 10⁻⁸⁹. */
function cientifica(x, locale, dec = 1) {
  if (x == null || !Number.isFinite(x) || x === 0) return '—';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${m.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })} × 10${exponente(e)}`;
}

/**
 * −77,9 % en castellano, −77.9% en inglés.
 *
 * El menos es U+2212, no un guion: en una columna de cifras monoespaciadas el
 * guion se alinea mal y se lee como separador. El signo lo pone esta función y
 * NO el dato, porque `toLocaleString` usa el menos de cada locale.
 */
function porcentaje(x, locale, dec) {
  if (x == null || !Number.isFinite(x)) return '—';
  // Sin decimales forzados donde no los hay: «+250 %» dice lo mismo que
  // «+250,0 %» y no finge una precisión que la fuente no tiene.
  const d = dec ?? (Number.isInteger(x) ? 0 : 1);
  const n = Math.abs(x).toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${x < 0 ? '−' : '+'}${n} %`;
}

/** Por debajo de cien mil, la cifra entera se lee mejor que el exponente. */
function magnitud(x, locale) {
  if (x == null || !Number.isFinite(x)) return '—';
  if (x < 10) return x.toLocaleString(locale, { maximumFractionDigits: 1 });
  if (x < 1e5) return Math.round(x).toLocaleString(locale);
  return cientifica(x, locale);
}

export function TailRiskFigures() {
  const { t, locale } = useTranslation();
  const c = getTailRiskFigures(t);

  const filasSigma = useMemo(() => SIGMAS.map((s) => ({
    s,
    p: colaNormal(s),
    anios: frecuenciaNormal(s),
  })), []);

  const filasCaida = useMemo(() => CAIDAS.map((d) => ({
    d,
    subida: subidaParaRecuperar(d),
  })), []);

  // La fila de 1987 sólo significa algo comparada con algo. El universo sirve.
  const universos = filasSigma[filasSigma.length - 1].anios / EDAD_UNIVERSO_ANIOS;

  const th = 'py-2 px-3 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground';
  const td = 'py-2 px-3 font-mono text-sm';

  return (
    <div className="space-y-8" data-testid="tail-figures">
      {/* ── Lo que promete la campana ─────────────────────────────────── */}
      <div>
        <h3 className="font-unbounded text-lg font-bold mb-1">{c.sigma.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 max-w-3xl">{c.sigma.intro}</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[24rem]">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>{c.sigma.move}</th>
                <th className={`${th} text-right`}>{c.sigma.prob}</th>
                <th className={`${th} text-right`}>{c.sigma.freq}</th>
              </tr>
            </thead>
            <tbody>
              {filasSigma.map(({ s, p, anios }, i) => {
                const ultima = i === filasSigma.length - 1;
                return (
                  <tr key={s}
                      className={`border-t border-border/60 ${ultima ? 'bg-destructive/10' : ''}`}
                      data-testid={`tail-sigma-${s}`}>
                    <td className={td}>
                      ±{s} σ <span className="text-muted-foreground">(≈ {s} %)</span>
                    </td>
                    <td className={`${td} text-right text-muted-foreground`}>{cientifica(p, locale)}</td>
                    <td className={`${td} text-right ${ultima ? 'font-bold text-destructive' : ''}`}>
                      {magnitud(anios, locale)} {c.sigma.years}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2" data-testid="tail-universos">
          {cientifica(universos, locale)} {c.sigma.universes}
        </p>
      </div>

      {/* ── Las colas, con fecha y nombre ─────────────────────────────── */}
      <div>
        <h3 className="font-unbounded text-lg font-bold mb-3">{c.events.title}</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[42rem]">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>{c.events.when}</th>
                <th className={th}>{c.events.asset}</th>
                <th className={`${th} text-right`}>{c.events.size}</th>
                <th className={th}>{c.events.what}</th>
              </tr>
            </thead>
            <tbody>
              {EVENTOS_COLA.map((e) => {
                const p = pctDe(e);
                return (
                  <tr key={e.id} className="border-t border-border/60 align-top" data-testid={`tail-ev-${e.id}`}>
                    <td className={`${td} whitespace-nowrap text-muted-foreground`}>{e.cuando}</td>
                    <td className={`${td} whitespace-nowrap font-semibold`}>{e.activo}</td>
                    <td className={`${td} text-right whitespace-nowrap ${p < 0 ? 'text-destructive' : 'text-amber-500'}`}>
                      {porcentaje(p, locale, e.dec)}
                    </td>
                    <td className="py-2 px-3 text-xs leading-relaxed text-muted-foreground min-w-[18rem]">
                      {c.events.lines[e.id]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{c.events.note}</p>
      </div>

      {/* ── Lo que cuesta volver ──────────────────────────────────────── */}
      <div>
        <h3 className="font-unbounded text-lg font-bold mb-1">{c.recovery.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 max-w-3xl">{c.recovery.intro}</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[20rem]">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>{c.recovery.fall}</th>
                <th className={`${th} text-right`}>{c.recovery.need}</th>
              </tr>
            </thead>
            <tbody>
              {filasCaida.map(({ d, subida }) => (
                <tr key={d} className="border-t border-border/60" data-testid={`tail-rec-${Math.round(d * 100)}`}>
                  <td className={`${td} text-destructive`}>{porcentaje(-d * 100, locale)}</td>
                  {/* Un decimal donde lo hay: recuperar un −10 % son 11,1 %, y
                      redondear a 11 empieza a suavizar justo lo que se enseña. */}
                  <td className={`${td} text-right font-semibold`}>
                    {porcentaje(subida * 100, locale, subida * 100 < 100 ? 1 : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 max-w-3xl">{c.recovery.note}</p>
      </div>
    </div>
  );
}

export default TailRiskFigures;
