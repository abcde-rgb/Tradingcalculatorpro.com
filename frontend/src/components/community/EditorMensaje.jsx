import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FichaAnalisis from './FichaAnalisis';

/**
 * Escribir un hilo o una respuesta, con un análisis opcional adjunto.
 *
 * El adjunto NO se calcula aquí. Se mandan los precios y **el servidor
 * devuelve el R:R**; si el usuario no pone stop, la ficha publicada dirá «—»
 * con su motivo. Calcularlo en el cliente sería una segunda implementación de
 * la misma fórmula, y dos implementaciones acaban discrepando.
 *
 * La previsualización de abajo usa un R:R local *marcado como provisional* por
 * la misma razón: es una ayuda visual mientras escribes, no la cifra que se
 * publica.
 */
const PRODUCTOS_ETIQUETA = {
  stock: 'comunidadProductoStock',
  crypto_spot: 'comunidadProductoCryptoSpot',
  crypto_perp: 'comunidadProductoCryptoPerp',
  futures: 'comunidadProductoFutures',
  cfd: 'comunidadProductoCfd',
  forex: 'comunidadProductoForex',
  option: 'comunidadProductoOption',
  spot: 'comunidadProductoSpot',
};

export const CATEGORIA_ETIQUETA = {
  dimensionar: 'comunidadCatDimensionar',
  diario: 'comunidadCatDiario',
  analisis: 'comunidadCatAnalisis',
  opciones: 'comunidadCatOpciones',
  estructura: 'comunidadCatEstructura',
  psicologia: 'comunidadCatPsicologia',
  producto: 'comunidadCatProducto',
};

export { PRODUCTOS_ETIQUETA };

const vacio = { symbol: '', side: 'long', product: '', entry: '', stop: '', target: '', timeframe: '', note: '' };

export default function EditorMensaje({
  meta, modo = 'hilo', enviando, onEnviar, onCancelar, locale = 'es',
}) {
  const { t } = useTranslation();
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [categoria, setCategoria] = useState('analisis');
  const [producto, setProducto] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [conAnalisis, setConAnalisis] = useState(false);
  const [analisis, setAnalisis] = useState(vacio);

  const esHilo = modo === 'hilo';
  const numero = (v) => (v === '' || v == null ? null : Number(v));

  /* Provisional: sólo para ver la ficha mientras escribes. El servidor manda. */
  const previa = (() => {
    if (!conAnalisis || !analisis.symbol) return null;
    const e = numero(analisis.entry);
    const s = numero(analisis.stop);
    const o = numero(analisis.target);
    let rr = null;
    let motivo = null;
    if (!Number.isFinite(e)) motivo = 'sin_entrada';
    else if (!Number.isFinite(s)) motivo = 'sin_stop';
    else if (!Number.isFinite(o)) motivo = 'sin_objetivo';
    else if (Math.abs(e - s) === 0) motivo = 'stop_en_la_entrada';
    else {
      const coherente = analisis.side === 'long' ? (s < e && e < o) : (o < e && e < s);
      if (!coherente) motivo = 'niveles_incoherentes';
      else rr = Math.round((Math.abs(o - e) / Math.abs(e - s)) * 100) / 100;
    }
    return {
      ...analisis, entry: e, stop: s, target: o, rr, rrUndefinedReason: motivo,
    };
  })();

  const enviar = (e) => {
    e.preventDefault();
    const payload = { body: cuerpo };
    if (esHilo) {
      payload.title = titulo;
      payload.category = categoria;
      if (producto) payload.product = producto;
      if (analisis.symbol) payload.symbol = analisis.symbol;
      payload.tags = etiquetas.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5);
    }
    if (conAnalisis && analisis.symbol) {
      payload.analysis = {
        symbol: analisis.symbol,
        side: analisis.side,
        product: analisis.product || producto || undefined,
        entry: numero(analisis.entry),
        stop: numero(analisis.stop),
        target: numero(analisis.target),
        timeframe: analisis.timeframe || undefined,
        note: analisis.note || undefined,
      };
    }
    onEnviar(payload);
  };

  const campo = (clave, etiqueta, extra = {}) => (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground" htmlFor={`an-${clave}`}>
        {etiqueta}
      </label>
      <Input
        id={`an-${clave}`}
        value={analisis[clave]}
        onChange={(e) => setAnalisis({ ...analisis, [clave]: e.target.value })}
        className="mt-1 font-mono"
        autoComplete="off"
        {...extra}
      />
    </div>
  );

  const puedeEnviar = esHilo
    ? titulo.trim().length >= 10 && cuerpo.trim().length >= 30
    : cuerpo.trim().length >= 2;

  return (
    <form onSubmit={enviar} className="rounded-lg border border-rule bg-card p-4">
      {esHilo ? (
        <>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t('comunidadTituloPlaceholder')}
            maxLength={160}
            className="text-base"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="an-cat">
                {t('comunidadCategoria')}
              </label>
              <select
                id="an-cat"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1 h-9 w-full rounded-sharp border border-input bg-background px-2 text-sm"
              >
                {(meta?.categories || []).map((c) => (
                  <option key={c} value={c}>{t(CATEGORIA_ETIQUETA[c] || c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="an-prod">
                {t('comunidadProducto')}
              </label>
              <select
                id="an-prod"
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                className="mt-1 h-9 w-full rounded-sharp border border-input bg-background px-2 text-sm"
              >
                <option value="">{t('comunidadTodos')}</option>
                {(meta?.products || []).map((p) => (
                  <option key={p} value={p}>{t(PRODUCTOS_ETIQUETA[p] || p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="an-tags">
                {t('comunidadEtiquetas')}
              </label>
              <Input
                id="an-tags"
                value={etiquetas}
                onChange={(e) => setEtiquetas(e.target.value)}
                placeholder="oro, swing"
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </div>
        </>
      ) : null}

      <Textarea
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        rows={esHilo ? 6 : 3}
        maxLength={8000}
        className="mt-3"
        placeholder={esHilo ? t('comunidadCuerpoPlaceholder') : t('comunidadRespuestaPlaceholder')}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={conAnalisis}
            onChange={(e) => setConAnalisis(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t('comunidadAdjuntarAnalisis')}
        </label>
        <span className="text-[11.5px] text-muted-foreground">{t('comunidadAdjuntarPista')}</span>
      </div>

      {conAnalisis ? (
        <div className="mt-3 rounded-sharp border border-rule p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {campo('symbol', t('comunidadActivo'), { placeholder: 'XAUUSD', maxLength: 24 })}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="an-side">
                {t('comunidadDireccion')}
              </label>
              <select
                id="an-side"
                value={analisis.side}
                onChange={(e) => setAnalisis({ ...analisis, side: e.target.value })}
                className="mt-1 h-9 w-full rounded-sharp border border-input bg-background px-2 text-sm"
              >
                <option value="long">{t('comunidadLargo')}</option>
                <option value="short">{t('comunidadCorto')}</option>
              </select>
            </div>
            {campo('timeframe', t('comunidadMarco'), { placeholder: 'H4', maxLength: 12 })}
            {campo('entry', t('comunidadEntrada'), { inputMode: 'decimal' })}
            {campo('stop', t('comunidadStop'), { inputMode: 'decimal' })}
            {campo('target', t('comunidadObjetivo'), { inputMode: 'decimal' })}
          </div>
          {previa ? (
            <>
              <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {t('comunidadPreviaProvisional')}
              </p>
              <FichaAnalisis analysis={previa} locale={locale} compacta />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2">
        {onCancelar ? (
          <Button type="button" variant="ghost" onClick={onCancelar}>{t('comunidadCancelar')}</Button>
        ) : null}
        <Button type="submit" disabled={enviando || !puedeEnviar}>
          {enviando ? t('comunidadEnviando') : (esHilo ? t('comunidadPublicar') : t('comunidadResponder'))}
        </Button>
      </div>
    </form>
  );
}
