import { useMemo, useState } from 'react';
import { Check, Minus, X, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Comparativa de los ocho que recomendamos.
 *
 * Qué compara, y por qué NO compara lo de siempre
 * ----------------------------------------------
 * Una tabla de brókers suele llevar spread, comisión, depósito mínimo y
 * plataformas. Aquí no van, y es una decisión, no un hueco:
 *
 *   · Esas cifras cambian por tipo de cuenta, por par y por semana, así que
 *     una tabla estática las tiene mal a los dos meses.
 *   · La única fuente válida es la web de cada bróker, y desde este proyecto
 *     no se pueden leer (el proxy responde 403 a los ocho dominios).
 *   · Las que circulan por internet salen de webs de afiliados, no de los
 *     brókers. El aviso de Swissquote en `brokers_referidos.py` ya lo decía
 *     antes de que existiera esta tabla.
 *
 * Poner un spread de memoria en una tabla que alguien usa para decidir dónde
 * mete su dinero es inventarse un dato. Y como el contenido del afiliado es
 * responsabilidad legal del bróker, además es meterle a él en el problema.
 *
 * Lo que sí se compara es el RÉGIMEN, que es verificable, cambia poco y es lo
 * que de verdad decide el riesgo: qué se contrata, quién supervisa, cuánto
 * apalancamiento permite la ley, si el saldo negativo está cubierto y qué
 * fondo de garantía hay detrás.
 *
 * ⚠️ La columna de apalancamiento es el **máximo que la norma permite a un
 * minorista**, no el que ofrece la casa. La cabecera lo dice porque un «30:1»
 * a secas se lee como una promesa del bróker, y no lo es.
 */

/**
 * «CySEC · Chipre», con el país en el idioma que se está leyendo.
 *
 * El país llega como código ISO y NO dentro del texto del supervisor, porque
 * metido en la cadena se queda en castellano en los otros nueve idiomas. Se
 * traduce con `Intl.DisplayNames`, igual que en las tarjetas de socios.
 */
function conPais(supervisores, locale) {
  let pais = (c) => c;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    pais = (c) => dn.of(c) || c;
  } catch (_) { /* motor sin Intl.DisplayNames: se queda el código */ }
  // Agrupado por país: «SEC · FINRA · Estados Unidos», no el país dos veces.
  const porPais = new Map();
  for (const s of supervisores) {
    if (!porPais.has(s.pais)) porPais.set(s.pais, []);
    porPais.get(s.pais).push(s.nombre);
  }
  return [...porPais.entries()]
    .map(([c, nombres]) => `${nombres.join(' · ')} · ${pais(c)}`)
    .join(' — ');
}

/**
 * El tope del fondo de garantía, en el formato del idioma que se lee.
 *
 * Llega como número + moneda y no como texto ya compuesto: «20.000 €» es
 * correcto en español y erróneo en inglés, donde toca «€20,000». El separador
 * de miles y la posición del símbolo son del idioma, no del dato.
 */
function importe({ importe: n, moneda, nombre }, locale) {
  let texto = `${n} ${moneda}`;
  try {
    texto = new Intl.NumberFormat(locale, {
      style: 'currency', currency: moneda, maximumFractionDigits: 0,
    }).format(n);
  } catch (_) { /* moneda o locale que el motor no conoce */ }
  return nombre ? `${texto} (${nombre})` : texto;
}

/** Instrumentos de la columna de apalancamiento, en orden de uso real. */
const INSTRUMENTOS = [
  ['fxMayor', 'brokerInstFxMayor'],
  ['indicesMayores', 'brokerInstIndices'],
  ['materiasPrimas', 'brokerInstMaterias'],
  ['acciones', 'brokerInstAcciones'],
  ['cripto', 'brokerInstCripto'],
];

/** Sí / no / no se sabe. El tercero es un estado, no un hueco que rellenar. */
function Marca({ valor, t }) {
  if (valor === true) {
    return (
      <span className="inline-flex items-center gap-1 text-[hsl(var(--long))]">
        <Check className="w-4 h-4" aria-hidden />
        <span className="sr-only">{t('brokerSi')}</span>
      </span>
    );
  }
  if (valor === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[hsl(var(--short))]">
        <X className="w-4 h-4" aria-hidden />
        <span className="sr-only">{t('brokerNo')}</span>
      </span>
    );
  }
  // `null` es «no lo sé», y se pinta como tal. Un guion gris no es un «no»:
  // decir que un bróker NO cubre el saldo negativo cuando simplemente no
  // consta sería una afirmación falsa sobre un tercero.
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title={t('brokerSinDato')}>
      <Minus className="w-4 h-4" aria-hidden />
      <span className="sr-only">{t('brokerSinDato')}</span>
    </span>
  );
}

export default function TablaComparativa({ filas }) {
  const { t, locale } = useTranslation();
  const [detalle, setDetalle] = useState(false);

  const conDatos = useMemo(() => filas.filter((f) => f.comp), [filas]);
  if (!conDatos.length) return null;

  return (
    <section className="mb-10" data-testid="brokers-comparativa">
      <h2 className="text-xl font-semibold mb-2">{t('brokerComparativaTitulo')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t('brokerComparativaIntro')}</p>

      {/* Scroll propio: una tabla de nueve columnas no cabe en un móvil, y el
          `overflow-x` del documento está a `clip` por regla del proyecto. */}
      {/* `tabIndex={0}` + `role="region"` + nombre: sin ellos, quien navega con
          teclado no puede desplazar la tabla en horizontal y las columnas de la
          derecha quedan fuera de su alcance. Es la regla
          `scrollable-region-focusable` de axe, y no es teórica: en móvil la
          tabla desborda siempre. */}
      <div
        className="overflow-x-auto rounded-lg border border-border"
        tabIndex={0}
        role="region"
        aria-label={t('tablaDesplazable')}
      >
        <table className="w-full text-sm border-collapse min-w-[46rem]">
          <caption className="sr-only">{t('brokerComparativaTitulo')}</caption>
          <thead>
            <tr className="bg-muted/50 text-left">
              <th scope="col" className="p-3 font-semibold sticky left-0 bg-muted/50">
                {t('brokerColBroker')}
              </th>
              <th scope="col" className="p-3 font-semibold">{t('brokerColTipo')}</th>
              <th scope="col" className="p-3 font-semibold">{t('brokerColContrata')}</th>
              <th scope="col" className="p-3 font-semibold">{t('brokerColSupervisor')}</th>
              <th scope="col" className="p-3 font-semibold whitespace-nowrap">
                {t('brokerColApalancamiento')}
              </th>
              <th scope="col" className="p-3 font-semibold text-center">{t('brokerColSaldoNegativo')}</th>
              <th scope="col" className="p-3 font-semibold">{t('brokerColFondo')}</th>
              <th scope="col" className="p-3 font-semibold whitespace-nowrap">{t('brokerColPerdidas')}</th>
            </tr>
          </thead>
          <tbody>
            {conDatos.map(({ id, nombre, comp, perdidaPct, perdidaPctEntidad }) => {
              const apal = comp.apalancamientoRegimen;
              return (
                <tr key={id} className="border-t border-border align-top"
                    data-testid={`comparativa-fila-${id}`}>
                  <th scope="row"
                      className="p-3 font-medium text-left sticky left-0 bg-background whitespace-nowrap">
                    {nombre}
                  </th>
                  <td className="p-3">{comp.tipo ? t(comp.tipo) : <Marca valor={null} t={t} />}</td>
                  <td className="p-3">
                    {comp.queSeContrata ? t(comp.queSeContrata) : <Marca valor={null} t={t} />}
                  </td>
                  <td className="p-3">
                    {comp.supervisores?.length
                      ? conPais(comp.supervisores, locale)
                      : <span className="text-muted-foreground">{t('brokerSinSupervisor')}</span>}
                  </td>
                  <td className="p-3 font-mono whitespace-nowrap">
                    {apal ? (
                      <>
                        <span>{apal.fxMayor}</span>
                        {detalle && (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground font-sans">
                            {INSTRUMENTOS.slice(1).map(([k, clave]) => (
                              apal[k] ? <li key={k}>{t(clave)}: {apal[k]}</li> : null
                            ))}
                          </ul>
                        )}
                      </>
                    ) : comp.apalancamientoDeclarado ? (
                      // Lo dice la casa, no la norma. Se etiqueta: es la
                      // diferencia entre «la ley lo permite» y «ellos lo
                      // anuncian», y en una tabla se confunden solas.
                      <span className="text-muted-foreground">
                        {comp.apalancamientoDeclarado}
                        <span className="block text-[10px] font-sans">{t('brokerSegunLaCasa')}</span>
                      </span>
                    ) : (
                      <span className="font-sans text-muted-foreground text-xs">
                        {t('brokerSinTope')}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Marca valor={comp.saldoNegativoCubierto} t={t} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {comp.fondoGarantia
                      ? importe(comp.fondoGarantia, locale)
                      : <span className="text-muted-foreground text-xs">{t('brokerSinFondo')}</span>}
                  </td>
                  <td className="p-3 font-mono whitespace-nowrap">
                    {/* Regla de honestidad: sin porcentaje publicable no se
                        pone uno. `null` no es 0 %. */}
                    {perdidaPct != null && perdidaPctEntidad
                      ? `${perdidaPct} %`
                      : <span className="font-sans text-muted-foreground text-xs">{t('brokerSinDato')}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={() => setDetalle((v) => !v)}
              className="mt-3 text-sm text-primary hover:underline"
              data-testid="comparativa-detalle">
        {detalle ? t('brokerVerMenos') : t('brokerVerApalancamientoPorInstrumento')}
      </button>

      {/* Qué NO compara la tabla. Va debajo y visible, no en la letra pequeña:
          alguien que busca «spread» tiene que encontrar por qué no está, en vez
          de suponer que se nos olvidó. */}
      <div className="flex items-start gap-2 mt-4 p-4 rounded-lg bg-muted/40 border border-border">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-muted-foreground">{t('brokerComparativaQueNoLleva')}</p>
      </div>
    </section>
  );
}
