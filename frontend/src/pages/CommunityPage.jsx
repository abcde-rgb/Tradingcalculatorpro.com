import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, DEMO_TOKEN } from '@/lib/store';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FichaAnalisis from '@/components/community/FichaAnalisis';
import SeudonimoDialogo from '@/components/community/SeudonimoDialogo';
import EditorMensaje, {
  CATEGORIA_ETIQUETA, PRODUCTOS_ETIQUETA,
} from '@/components/community/EditorMensaje';
import {
  createThread, deleteThread, followMember, getForumMeta, getMyForumProfile,
  getThread, listThreads, replyToThread, reportMessage, toggleLike, translateMessage,
} from '@/services/forumApi';

/**
 * La comunidad.
 *
 * Se lee sin cuenta —cada hilo es una URL indexable y ésa es la única forma de
 * que una comunidad nueva la encuentre alguien— y se escribe con cuenta y con
 * seudónimo.
 *
 * **Arranca vacía y así se queda hasta que alguien escriba.** No hay contenido
 * sembrado ni mensajes de ejemplo: un foro con conversaciones inventadas es una
 * mentira que se descubre el primer día y se lleva por delante la confianza en
 * todo lo demás, incluidos los números de las calculadoras. Por eso el estado
 * vacío no es un hueco tapado con una caja de puntos: es una pantalla diseñada
 * que dice que está vacía y propone el primer mensaje.
 *
 * ── Sobre el registro visual ──────────────────────────────────────────────
 * Esta pantalla va un paso por delante del resto del producto a petición del
 * dueño (2026-09-03): tipografía de portada, aire, profundidad y movimiento de
 * entrada. Lo que NO hace es caer en el degradado morado genérico: la
 * profundidad es una **retícula de marcas de calibre** (`.tc-campo`), la misma
 * escala que la regleta, y el único halo de la pantalla lo lleva la ficha de la
 * operación, que es el objeto que importa. Ver `docs/DECISIONES.md`.
 */

const ORDEN_ETIQUETA = {
  actividad: 'comunidadOrdenActividad',
  nuevo: 'comunidadOrdenNuevo',
  tendencia: 'comunidadOrdenTendencia',
  vistas: 'comunidadOrdenVistas',
  likes: 'comunidadOrdenLikes',
  respuestas: 'comunidadOrdenRespuestas',
};

const IDIOMA_NOMBRE = {
  es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano',
  pt: 'Português', ru: 'Русский', zh: '中文', ja: '日本語', ar: 'العربية',
};

function useForumIdentity() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // El modo demo no habla con el backend: sus guardas evitan llamadas que
  // siempre fallarían (CLAUDE.md § Autenticación pt. 4).
  const enDemo = token === DEMO_TOKEN;
  return { conectado: Boolean(isAuthenticated) && !enDemo, enDemo };
}

const numero = (n, locale) => (Number.isFinite(n) ? n.toLocaleString(locale) : '—');

/* ── Piezas ───────────────────────────────────────────────────────────────── */

/**
 * Un hilo puede sobrevivir a su autor: la cuenta se borra y el hilo se queda
 * porque debajo hay respuestas de otras personas. Sin esto, la fila pintaba un
 * «@» suelto y un círculo vacío, que se lee como un fallo de carga.
 */
function autorVisible(autor, t) {
  const handle = autor?.handle || '';
  return handle
    ? { handle, etiqueta: `@${handle}`, existe: true }
    : { handle: '', etiqueta: t('comunidadCuentaEliminada'), existe: false };
}

function Avatar({ handle, ausente = false, tam = 'md' }) {
  const iniciales = (handle || '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  const medidas = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };
  const tono = ausente
    ? 'border-rule bg-muted/40 text-muted-foreground'
    : 'border-primary/30 bg-primary/[0.07] text-primary';
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-full border font-mono font-medium tracking-tight ${tono} ${medidas[tam]}`}
    >
      {ausente ? '·' : iniciales}
    </span>
  );
}

/** Eyebrow: la etiqueta pequeña en monoespaciada que abre cada bloque. */
function Rotulo({ children, className = '' }) {
  return (
    <span className={`font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground ${className}`}>
      {children}
    </span>
  );
}

/** Cifra grande con su etiqueta. Sólo se pinta si el número EXISTE. */
function Cifra({ valor, etiqueta, locale }) {
  if (!Number.isFinite(valor)) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-2xl leading-none tracking-tight tabular-nums sm:text-[28px]">
        {numero(valor, locale)}
      </span>
      <Rotulo>{etiqueta}</Rotulo>
    </div>
  );
}

function Esqueleto() {
  return (
    <ul className="divide-y divide-rule" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-5 py-7">
          <div className="tc-esqueleto h-9 w-9 flex-none rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="tc-esqueleto h-4 w-3/4" />
            <div className="tc-esqueleto h-3 w-full" />
            <div className="tc-esqueleto h-3 w-2/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Botón-píldora de filtro. Un solo acento, sin relleno de color. */
function Pildora({ activo, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-[color,border-color,background-color,transform] duration-tick ease-out
        ${activo
          ? 'border-primary/60 bg-primary/[0.08] text-primary'
          : 'border-rule text-muted-foreground hover:-translate-y-px hover:border-foreground/25 hover:text-foreground'}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** `select` sin cromo nativo, con su propia flecha. */
function Selector({ valor, onChange, children, testid, etiqueta }) {
  return (
    <span className="relative inline-flex items-center">
      <select
        value={valor}
        onChange={onChange}
        data-testid={testid}
        aria-label={etiqueta}
        className="h-9 appearance-none rounded-sharp border border-input bg-transparent pl-2.5 pr-7
                   font-mono text-[12.5px] transition-colors duration-tick ease-out
                   hover:border-foreground/30 focus:border-primary focus:outline-none"
      >
        {children}
      </select>
      <svg aria-hidden="true" viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2 h-3 w-3 text-muted-foreground">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function EstadoVacio({ conectado, hayFiltros, onEscribir, onLimpiar, t }) {
  return (
    <section className="py-20 text-center">
      <p className="font-mono text-[64px] leading-none tracking-tighter text-muted/70 sm:text-[88px]">00</p>
      <h2 className="mt-6 font-display text-2xl tracking-tight sm:text-3xl">
        {hayFiltros ? t('comunidadVacioFiltrosTitulo') : t('comunidadVacioTitulo')}
      </h2>
      <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
        {hayFiltros ? t('comunidadVacioFiltrosTexto') : t('comunidadVacioTexto')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {hayFiltros ? (
          <Button variant="outline" onClick={onLimpiar}>{t('comunidadLimpiarFiltros')}</Button>
        ) : null}
        {conectado ? (
          <Button size="lg" onClick={onEscribir}>{t('comunidadEscribirPrimero')}</Button>
        ) : (
          <Button size="lg" asChild><Link to="/login">{t('comunidadEntrarParaEscribir')}</Link></Button>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Listado
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CommunityPage() {
  const { t, locale } = useTranslation();
  const { conectado, enDemo } = useForumIdentity();
  const [params, setParams] = useSearchParams();

  const [meta, setMeta] = useState(null);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [perfil, setPerfil] = useState(null);
  const [dialogoSeudonimo, setDialogoSeudonimo] = useState(false);
  const [componiendo, setComponiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState(params.get('q') || '');

  const categoria = params.get('category') || '';
  const producto = params.get('product') || '';
  const activo = params.get('symbol') || '';
  const orden = params.get('order') || 'actividad';
  const soloSeguidos = params.get('following') === '1';
  const consulta = params.get('q') || '';
  const hayFiltros = Boolean(categoria || producto || activo || consulta || soloSeguidos);

  useSEO({
    titleKey: 'seoComunidadTitle',
    descriptionKey: 'seoComunidadDesc',
    canonicalPath: '/community',
  });

  const cambiar = useCallback((clave, valor) => {
    const siguiente = new URLSearchParams(params);
    if (valor) siguiente.set(clave, valor); else siguiente.delete(clave);
    setParams(siguiente, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    let vivo = true;
    getForumMeta().then((m) => { if (vivo) setMeta(m); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!conectado) { setPerfil(null); return undefined; }
    let vivo = true;
    getMyForumProfile()
      .then((r) => { if (vivo) setPerfil(r.configured ? r.profile : null); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [conectado]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await listThreads({
        category: categoria || undefined,
        product: producto || undefined,
        symbol: activo || undefined,
        q: consulta || undefined,
        order: orden,
        following: soloSeguidos,
      }));
    } catch (err) {
      if (err?.response?.status === 401 && soloSeguidos) cambiar('following', '');
      else setError(t('comunidadErrorCarga'));
    } finally {
      setCargando(false);
    }
  }, [categoria, producto, activo, consulta, orden, soloSeguidos, cambiar, t]);

  useEffect(() => { cargar(); }, [cargar]);

  const publicar = async (payload) => {
    setEnviando(true);
    try {
      await createThread(payload);
      setComponiendo(false);
      await cargar();
    } catch (err) {
      if (err.faltaSeudonimo) setDialogoSeudonimo(true);
      else setError(err?.response?.data?.detail || t('comunidadErrorGenerico'));
    } finally {
      setEnviando(false);
    }
  };

  const abrirEditor = () => (perfil ? setComponiendo(true) : setDialogoSeudonimo(true));
  const limpiar = () => setParams(new URLSearchParams(), { replace: true });

  const stats = meta?.stats || {};
  const hilos = datos?.threads || [];

  return (
    <div className="tc-campo">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-6xl px-5 pb-12 pt-16 sm:pt-24">
        <Rotulo>{t('comunidadTitulo')}</Rotulo>
        <h1 className="mt-5 max-w-[17ch] font-display text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.02] tracking-[-0.035em] text-balance">
          {t('comunidadLema')}
        </h1>
        <p className="mt-6 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {t('comunidadIntro')}
        </p>

        {Number.isFinite(stats.threads) ? (
          <div className="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-rule pt-7">
            <Cifra valor={stats.threads} etiqueta={t('comunidadHilos')} locale={locale} />
            <Cifra valor={stats.replies} etiqueta={t('comunidadRespuestas')} locale={locale} />
            <Cifra valor={stats.members} etiqueta={t('comunidadMiembros')} locale={locale} />
            <p className="ml-auto max-w-[30ch] text-[11.5px] leading-snug text-muted-foreground/80">
              {t('comunidadCifrasReales')}
            </p>
          </div>
        ) : null}

        {enDemo ? (
          <p className="mt-8 rounded-sharp border border-warn/40 bg-warn/[0.08] px-4 py-2.5 text-sm text-warn">
            {t('comunidadDemoAviso')}
          </p>
        ) : null}
      </header>

      {/* ── Barra de utilidad, pegajosa ───────────────────────────────── */}
      <div className="sticky top-0 z-30 border-y border-rule bg-background/85 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Pildora activo={!categoria} onClick={() => cambiar('category', '')}>
              {t('comunidadTodos')}
            </Pildora>
            {(meta?.categories || []).map((c) => (
              <Pildora key={c} activo={categoria === c} onClick={() => cambiar('category', c)}>
                {t(CATEGORIA_ETIQUETA[c] || c)}
              </Pildora>
            ))}
            <div className="ml-auto hidden shrink-0 pl-4 lg:block">
              <Button onClick={abrirEditor} disabled={!conectado}>{t('comunidadNuevoHilo')}</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-rule/60 py-3">
            <label className="flex items-center gap-2">
              <Rotulo>{t('comunidadProducto')}</Rotulo>
              <Selector
                valor={producto}
                onChange={(e) => cambiar('product', e.target.value)}
                testid="foro-producto"
                etiqueta={t('comunidadProducto')}
              >
                <option value="">{t('comunidadTodos')}</option>
                {(meta?.products || []).map((p) => (
                  <option key={p} value={p}>{t(PRODUCTOS_ETIQUETA[p] || p)}</option>
                ))}
              </Selector>
            </label>

            <label className="flex items-center gap-2">
              <Rotulo>{t('comunidadActivo')}</Rotulo>
              <Input
                defaultValue={activo}
                onBlur={(e) => cambiar('symbol', e.target.value.trim().toUpperCase())}
                placeholder="XAUUSD"
                aria-label={t('comunidadActivo')}
                data-testid="foro-activo"
                className="h-9 w-28 rounded-sharp bg-transparent font-mono text-[12.5px] uppercase placeholder:text-muted-foreground/45"
                autoComplete="off"
              />
            </label>

            <label className="flex items-center gap-2">
              <Rotulo>{t('comunidadOrdenar')}</Rotulo>
              <Selector
                valor={orden}
                onChange={(e) => cambiar('order', e.target.value)}
                testid="foro-orden"
                etiqueta={t('comunidadOrdenar')}
              >
                {(meta?.orders || Object.keys(ORDEN_ETIQUETA)).map((o) => (
                  <option key={o} value={o}>{t(ORDEN_ETIQUETA[o] || o)}</option>
                ))}
              </Selector>
            </label>

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); cambiar('q', busqueda.trim()); }}
            >
              <Rotulo>{t('comunidadBuscar')}</Rotulo>
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label={t('comunidadBuscar')}
                data-testid="foro-buscar"
                className="h-9 w-40 rounded-sharp bg-transparent text-[13px]"
                autoComplete="off"
              />
            </form>

            {conectado ? (
              <Pildora activo={soloSeguidos} onClick={() => cambiar('following', soloSeguidos ? '' : '1')}>
                {t('comunidadSoloSeguidos')}
              </Pildora>
            ) : null}

            <div className="ml-auto lg:hidden">
              <Button size="sm" onClick={abrirEditor} disabled={!conectado}>
                {t('comunidadNuevoHilo')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-5 pb-24">
        {componiendo ? (
          <div className="tc-entra pt-8">
            <EditorMensaje
              meta={meta} modo="hilo" enviando={enviando} locale={locale}
              onEnviar={publicar} onCancelar={() => setComponiendo(false)}
            />
          </div>
        ) : null}

        {error ? <p className="pt-8 text-sm text-destructive">{error}</p> : null}

        {cargando ? (
          <div className="pt-4"><Esqueleto /></div>
        ) : hilos.length === 0 ? (
          <EstadoVacio
            conectado={conectado} hayFiltros={hayFiltros}
            onEscribir={abrirEditor} onLimpiar={limpiar} t={t}
          />
        ) : (
          <ul className="divide-y divide-rule">
            {hilos.map((h, i) => (
              <li key={h.id} className="tc-entra" style={{ '--i': Math.min(i, 8) }}>
                <Link
                  to={`/community/${h.id}`}
                  className="group -mx-4 flex gap-5 rounded-sharp border-l-2 border-transparent px-4 py-7
                             transition-[border-color,background-color,transform] duration-tick ease-out
                             hover:-translate-y-px hover:border-l-primary hover:bg-card/60"
                >
                  <Avatar handle={autorVisible(h.author, t).handle}
                    ausente={!autorVisible(h.author, t).existe} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`font-mono text-[12.5px] ${autorVisible(h.author, t).existe ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {autorVisible(h.author, t).etiqueta}
                      </span>
                      {h.followingAuthor ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                          {t('comunidadSigues')}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {t(CATEGORIA_ETIQUETA[h.category] || h.category)}
                      </span>
                      {h.symbol ? (
                        <span className="rounded-sharp border border-rule px-1.5 font-mono text-[11px]">
                          {h.symbol}
                        </span>
                      ) : null}
                      {h.lang && h.lang !== locale ? (
                        <span className="font-mono text-[10.5px] text-muted-foreground/80">
                          {IDIOMA_NOMBRE[h.lang] || h.lang}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2.5 text-[19px] font-semibold leading-snug tracking-[-0.015em] transition-colors duration-tick ease-out group-hover:text-primary sm:text-[21px]">
                      {h.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 max-w-[68ch] text-[14.5px] leading-relaxed text-muted-foreground">
                      {h.body}
                    </p>

                    {h.analysis ? <FichaAnalisis analysis={h.analysis} locale={locale} compacta /> : null}
                  </div>

                  <dl className="hidden w-24 flex-none flex-col items-end gap-3 pt-0.5 text-right sm:flex">
                    {[
                      [h.replies, t('comunidadRespuestas')],
                      [h.likes, t('comunidadLikes')],
                      [h.views, t('comunidadVistas')],
                    ].map(([v, etiqueta]) => (
                      <div key={etiqueta}>
                        <dd className="font-mono text-[15px] leading-none tabular-nums">{numero(v, locale)}</dd>
                        <dt className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                          {etiqueta}
                        </dt>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {datos?.windowExhausted ? (
          <p className="mt-10 border-t border-rule pt-5 text-[11.5px] text-muted-foreground">
            {t('comunidadVentanaAgotada')}
          </p>
        ) : null}
      </main>

      <SeudonimoDialogo
        abierto={dialogoSeudonimo}
        perfil={perfil}
        onCerrar={() => setDialogoSeudonimo(false)}
        onGuardado={(p) => { setPerfil(p); setDialogoSeudonimo(false); setComponiendo(true); }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Detalle del hilo
   ═══════════════════════════════════════════════════════════════════════════ */

export function CommunityThreadPage() {
  const { t, locale } = useTranslation();
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { conectado } = useForumIdentity();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [perfil, setPerfil] = useState(null);
  const [dialogoSeudonimo, setDialogoSeudonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [traducciones, setTraducciones] = useState({});
  const [traduciendo, setTraduciendo] = useState('');

  const hilo = datos?.thread;

  useSEO({
    title: hilo?.title,
    description: hilo?.body?.slice(0, 155),
    canonicalPath: `/community/${threadId}`,
    type: 'article',
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await getThread(threadId));
    } catch {
      setError(t('comunidadErrorCarga'));
    } finally {
      setCargando(false);
    }
  }, [threadId, t]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!conectado) return undefined;
    let vivo = true;
    getMyForumProfile()
      .then((r) => { if (vivo) setPerfil(r.configured ? r.profile : null); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [conectado]);

  const responder = async (payload) => {
    setEnviando(true);
    try {
      await replyToThread(threadId, payload);
      await cargar();
    } catch (err) {
      if (err.faltaSeudonimo) setDialogoSeudonimo(true);
      else setError(err?.response?.data?.detail || t('comunidadErrorGenerico'));
    } finally {
      setEnviando(false);
    }
  };

  const alternarLike = async (type, id, liked) => {
    if (!conectado) return;
    try {
      await toggleLike({ type, id, liked });
      await cargar();
    } catch { /* el contador lo manda el servidor; si falla, se queda como estaba */ }
  };

  const traducir = async (type, id) => {
    setTraduciendo(id);
    try {
      // El `await` va FUERA del actualizador: el de `setState` no es async, y
      // meterlo dentro no compila.
      const r = await translateMessage({ type, id, targetLang: locale });
      setTraducciones((prev) => ({ ...prev, [id]: r }));
    } catch {
      setError(t('comunidadErrorTraduccion'));
    } finally {
      setTraduciendo('');
    }
  };

  const denunciar = async (type, id) => {
    try {
      await reportMessage({ type, id, reason: 'otro' });
      setError('');
      toast.success(t('comunidadDenunciaEnviada'));
    } catch { setError(t('comunidadErrorGenerico')); }
  };

  const borrar = async () => {
    // `window.confirm` y no un diálogo propio: borrar un hilo con respuestas de
    // otros no se deshace, y es el mismo freno que ya usa el panel de admin
    // para las acciones irreversibles.
    if (!window.confirm(t('comunidadConfirmarBorrado'))) return;
    try {
      await deleteThread(threadId);
      navigate('/community');
    } catch { setError(t('comunidadErrorGenerico')); }
  };

  const seguir = async () => {
    try {
      await followMember(hilo.author.handle, !hilo.followingAuthor);
      await cargar();
    } catch { /* no-op */ }
  };

  const traducido = (id) => {
    const tr = traducciones[id];
    return tr && tr.translated ? tr : null;
  };

  const accion = 'font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground '
    + 'transition-colors duration-tick ease-out hover:text-primary';

  const BotonTraducir = ({ type, id, lang }) => {
    if (!conectado || !lang || lang === locale) return null;
    if (traducido(id)) {
      return (
        <button type="button" className={accion}
          onClick={() => setTraducciones((p) => ({ ...p, [id]: null }))}>
          {t('comunidadVerOriginal')}
        </button>
      );
    }
    return (
      <button type="button" className={accion} disabled={traduciendo === id}
        onClick={() => traducir(type, id)}>
        {traduciendo === id ? t('comunidadTraduciendo') : t('comunidadTraducir')}
      </button>
    );
  };

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="tc-esqueleto h-10 w-4/5" />
        <div className="tc-esqueleto mt-5 h-4 w-1/3" />
        <div className="tc-esqueleto mt-9 h-32 w-full" />
      </div>
    );
  }

  if (!hilo) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <p className="font-mono text-[64px] leading-none tracking-tighter text-muted/70">404</p>
        <p className="mt-6 text-sm text-muted-foreground">{error || t('comunidadNoEncontrado')}</p>
        <Link to="/community" className="mt-6 inline-block text-sm text-primary hover:underline">
          {t('comunidadVolver')}
        </Link>
      </div>
    );
  }

  return (
    <div className="tc-campo">
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:pt-16">
        <Link to="/community" className={`${accion} inline-block`}>← {t('comunidadVolver')}</Link>

        <h1 className="mt-7 font-display text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.08] tracking-[-0.03em] text-balance">
          {traducido(hilo.id)?.title || hilo.title}
        </h1>

        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-rule py-4">
          <Avatar handle={autorVisible(hilo.author, t).handle}
            ausente={!autorVisible(hilo.author, t).existe} />
          <div className="mr-auto">
            <p className={`font-mono text-[13px] ${autorVisible(hilo.author, t).existe ? '' : 'italic text-muted-foreground'}`}>
              {autorVisible(hilo.author, t).etiqueta}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {t(CATEGORIA_ETIQUETA[hilo.category] || hilo.category)}
              {hilo.symbol ? <span className="ml-2 font-mono">{hilo.symbol}</span> : null}
            </p>
          </div>
          {conectado && !hilo.isMine && autorVisible(hilo.author, t).existe ? (
            <button type="button" onClick={seguir} className={accion}>
              {hilo.followingAuthor ? t('comunidadDejarDeSeguir') : t('comunidadSeguir')}
            </button>
          ) : null}
          <BotonTraducir type="thread" id={hilo.id} lang={hilo.lang} />
        </div>

        {traducido(hilo.id) ? (
          <p className="mt-5 border-l-2 border-info/50 bg-info/[0.06] px-4 py-2.5 text-[12px] text-info">
            {t('comunidadTraduccionAviso', { idioma: IDIOMA_NOMBRE[hilo.lang] || hilo.lang })}
          </p>
        ) : null}

        <div className="mt-7 whitespace-pre-wrap text-[16.5px] leading-[1.72]">
          {traducido(hilo.id)?.body || hilo.body}
        </div>

        {/* El único objeto de la pantalla con halo: es el que importa. */}
        {hilo.analysis ? (
          <div className="tc-halo mt-9 rounded-lg">
            <FichaAnalisis analysis={hilo.analysis} locale={locale} />
          </div>
        ) : null}

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-5">
          <dl className="flex gap-6">
            {[
              [hilo.replies, t('comunidadRespuestas')],
              [hilo.likes, t('comunidadLikes')],
              [hilo.views, t('comunidadVistas')],
            ].map(([v, etiqueta]) => (
              <div key={etiqueta} className="flex items-baseline gap-1.5">
                <dd className="font-mono text-sm tabular-nums">{numero(v, locale)}</dd>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  {etiqueta}
                </dt>
              </div>
            ))}
          </dl>
          <div className="ml-auto flex items-center gap-5">
            {conectado && !hilo.isMine ? (
              <>
                <button type="button" onClick={() => alternarLike('thread', hilo.id, hilo.liked)}
                  className={hilo.liked ? accion.replace('text-muted-foreground', 'text-primary') : accion}>
                  {hilo.liked ? t('comunidadQuitarLike') : t('comunidadDarLike')}
                </button>
                <button type="button" onClick={() => denunciar('thread', hilo.id)}
                  className={`${accion} hover:!text-destructive`}>
                  {t('comunidadDenunciar')}
                </button>
              </>
            ) : null}
            {hilo.isMine ? (
              <button type="button" onClick={borrar} className={`${accion} hover:!text-destructive`}>
                {t('comunidadBorrar')}
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {/* ── Respuestas: hilo con espina de 1 px ─────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="flex items-baseline gap-3">
          <Rotulo>{t('comunidadRespuestas')}</Rotulo>
          <span className="font-mono text-sm tabular-nums">{datos.replies.length}</span>
        </div>

        {datos.replies.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">{t('comunidadSinRespuestas')}</p>
        ) : (
          <ul className="mt-6 space-y-8 border-l border-rule pl-6 sm:pl-8">
            {datos.replies.map((r, i) => (
              <li key={r.id} className="tc-entra relative" style={{ '--i': Math.min(i, 8) }}>
                <span
                  aria-hidden="true"
                  className="absolute -left-[25px] top-3 h-px w-4 bg-rule sm:-left-[33px] sm:w-6"
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Avatar handle={autorVisible(r.author, t).handle}
                    ausente={!autorVisible(r.author, t).existe} tam="sm" />
                  <span className={`font-mono text-[12.5px] ${autorVisible(r.author, t).existe ? '' : 'italic text-muted-foreground'}`}>
                    {autorVisible(r.author, t).etiqueta}
                  </span>
                  {r.isMine ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                      {t('comunidadTuMensaje')}
                    </span>
                  ) : null}
                  <div className="ml-auto"><BotonTraducir type="reply" id={r.id} lang={r.lang} /></div>
                </div>

                <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {traducido(r.id)?.body || r.body}
                </div>
                {r.analysis ? <FichaAnalisis analysis={r.analysis} locale={locale} compacta /> : null}

                <div className="mt-3 flex items-center gap-5">
                  <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    {numero(r.likes, locale)} {t('comunidadLikes')}
                  </span>
                  {conectado && !r.isMine ? (
                    <>
                      <button type="button" onClick={() => alternarLike('reply', r.id, r.liked)}
                        className={r.liked ? accion.replace('text-muted-foreground', 'text-primary') : accion}>
                        {r.liked ? t('comunidadQuitarLike') : t('comunidadDarLike')}
                      </button>
                      <button type="button" onClick={() => denunciar('reply', r.id)}
                        className={`${accion} hover:!text-destructive`}>
                        {t('comunidadDenunciar')}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

        <div className="mt-10">
          {conectado ? (
            <EditorMensaje modo="respuesta" enviando={enviando} locale={locale} onEnviar={responder} />
          ) : (
            <p className="border-t border-rule pt-8 text-center text-sm text-muted-foreground">
              {t('comunidadEntrarParaResponder')}{' '}
              <Link to="/login" className="text-primary hover:underline">{t('comunidadEntrar')}</Link>
            </p>
          )}
        </div>
      </section>

      <SeudonimoDialogo
        abierto={dialogoSeudonimo}
        perfil={perfil}
        onCerrar={() => setDialogoSeudonimo(false)}
        onGuardado={(p) => { setPerfil(p); setDialogoSeudonimo(false); }}
      />
    </div>
  );
}
