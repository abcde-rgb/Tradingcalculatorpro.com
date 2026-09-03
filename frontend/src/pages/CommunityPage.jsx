import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore, DEMO_TOKEN } from '@/lib/store';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
 * todo lo demás, incluidos los números de las calculadoras. El estado vacío
 * está diseñado para eso: dice que está vacío y propone el primer mensaje.
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

function Avatar({ handle, grande = false }) {
  const iniciales = (handle || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-full border border-primary/35 bg-primary/10 font-display font-bold text-primary ${
        grande ? 'h-11 w-11 text-base' : 'h-8 w-8 text-xs'
      }`}
    >
      {iniciales}
    </span>
  );
}

function Metricas({ hilo, t }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><span className="font-mono text-foreground">{hilo.replies}</span> {t('comunidadRespuestas')}</span>
      <span><span className="font-mono text-foreground">{hilo.likes}</span> {t('comunidadLikes')}</span>
      <span><span className="font-mono text-foreground">{hilo.views}</span> {t('comunidadVistas')}</span>
    </div>
  );
}

function EstadoVacio({ conectado, hayFiltros, onEscribir, onLimpiar, t }) {
  return (
    <div className="rounded-lg border border-dashed border-rule px-6 py-12 text-center">
      <h2 className="font-display text-xl">
        {hayFiltros ? t('comunidadVacioFiltrosTitulo') : t('comunidadVacioTitulo')}
      </h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
        {hayFiltros ? t('comunidadVacioFiltrosTexto') : t('comunidadVacioTexto')}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hayFiltros ? (
          <Button variant="outline" onClick={onLimpiar}>{t('comunidadLimpiarFiltros')}</Button>
        ) : null}
        {conectado ? (
          <Button onClick={onEscribir}>{t('comunidadEscribirPrimero')}</Button>
        ) : (
          <Button asChild><Link to="/login">{t('comunidadEntrarParaEscribir')}</Link></Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Listado
// ═══════════════════════════════════════════════════════════════════════════

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
      const r = await listThreads({
        category: categoria || undefined,
        product: producto || undefined,
        symbol: activo || undefined,
        q: consulta || undefined,
        order: orden,
        following: soloSeguidos,
      });
      setDatos(r);
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

  const abrirEditor = () => {
    if (!perfil) setDialogoSeudonimo(true);
    else setComponiendo(true);
  };

  const limpiar = () => setParams(new URLSearchParams(), { replace: true });

  const chips = useMemo(() => (meta?.categories || []), [meta]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-3xl tracking-tight">{t('comunidadTitulo')}</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t('comunidadIntro')}</p>
      </header>

      {enDemo ? (
        <p className="mt-4 rounded-sharp border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          {t('comunidadDemoAviso')}
        </p>
      ) : null}

      {/* ── Filtros ─────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => cambiar('category', '')}
          aria-pressed={!categoria}
          className={`rounded-sharp border px-3 py-1.5 text-sm transition-colors duration-tick ease-out ${
            !categoria ? 'border-primary text-primary' : 'border-rule text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('comunidadTodos')}
        </button>
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => cambiar('category', c)}
            aria-pressed={categoria === c}
            className={`rounded-sharp border px-3 py-1.5 text-sm transition-colors duration-tick ease-out ${
              categoria === c ? 'border-primary text-primary' : 'border-rule text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(CATEGORIA_ETIQUETA[c] || c)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-b border-rule pb-5">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="f-producto">
            {t('comunidadProducto')}
          </label>
          <select
            id="f-producto"
            value={producto}
            onChange={(e) => cambiar('product', e.target.value)}
            className="mt-1 h-9 rounded-sharp border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('comunidadTodos')}</option>
            {(meta?.products || []).map((p) => (
              <option key={p} value={p}>{t(PRODUCTOS_ETIQUETA[p] || p)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="f-activo">
            {t('comunidadActivo')}
          </label>
          <Input
            id="f-activo"
            defaultValue={activo}
            onBlur={(e) => cambiar('symbol', e.target.value.trim().toUpperCase())}
            placeholder="XAUUSD"
            className="mt-1 h-9 w-32 font-mono"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="f-orden">
            {t('comunidadOrdenar')}
          </label>
          <select
            id="f-orden"
            value={orden}
            onChange={(e) => cambiar('order', e.target.value)}
            className="mt-1 h-9 rounded-sharp border border-input bg-background px-2 text-sm"
          >
            {(meta?.orders || Object.keys(ORDEN_ETIQUETA)).map((o) => (
              <option key={o} value={o}>{t(ORDEN_ETIQUETA[o] || o)}</option>
            ))}
          </select>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); cambiar('q', busqueda.trim()); }}
        >
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="f-q">
              {t('comunidadBuscar')}
            </label>
            <Input
              id="f-q"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mt-1 h-9 w-44"
              autoComplete="off"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">{t('comunidadBuscar')}</Button>
        </form>

        {conectado ? (
          <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              checked={soloSeguidos}
              onChange={(e) => cambiar('following', e.target.checked ? '1' : '')}
              className="h-4 w-4 accent-primary"
            />
            {t('comunidadSoloSeguidos')}
          </label>
        ) : null}

        <div className="ml-auto pb-1">
          <Button onClick={abrirEditor} disabled={!conectado}>
            {t('comunidadNuevoHilo')}
          </Button>
        </div>
      </div>

      {componiendo ? (
        <div className="mt-5">
          <EditorMensaje
            meta={meta}
            modo="hilo"
            enviando={enviando}
            locale={locale}
            onEnviar={publicar}
            onCancelar={() => setComponiendo(false)}
          />
        </div>
      ) : null}

      {error ? <p className="mt-5 text-sm text-destructive">{error}</p> : null}

      {/* ── Hilos ───────────────────────────────────────────────── */}
      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">{t('comunidadCargando')}</p>
      ) : (datos?.threads || []).length === 0 ? (
        <div className="mt-8">
          <EstadoVacio
            conectado={conectado}
            hayFiltros={hayFiltros}
            onEscribir={abrirEditor}
            onLimpiar={limpiar}
            t={t}
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {datos.threads.map((h) => (
            <li key={h.id} className="py-5">
              <article className="flex gap-4">
                <Avatar handle={h.author.handle} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-medium leading-snug">
                    <Link to={`/community/${h.id}`} className="hover:text-primary">{h.title}</Link>
                  </h2>
                  <p className="mt-1.5 line-clamp-2 max-w-prose text-sm text-muted-foreground">{h.body}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">@{h.author.handle}</span>
                    {h.followingAuthor ? (
                      <span className="rounded-sharp border border-primary/40 px-1.5 text-[10px] text-primary">
                        {t('comunidadSigues')}
                      </span>
                    ) : null}
                    <span>{t(CATEGORIA_ETIQUETA[h.category] || h.category)}</span>
                    {h.symbol ? <span className="font-mono">{h.symbol}</span> : null}
                    {h.product ? <span>{t(PRODUCTOS_ETIQUETA[h.product] || h.product)}</span> : null}
                    {h.lang && h.lang !== locale ? (
                      <span className="rounded-sharp border border-rule px-1.5 text-[10px]">
                        {IDIOMA_NOMBRE[h.lang] || h.lang}
                      </span>
                    ) : null}
                  </div>

                  {h.analysis ? <FichaAnalisis analysis={h.analysis} locale={locale} compacta /> : null}

                  <div className="mt-2.5">
                    <Metricas hilo={h} t={t} />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {datos?.windowExhausted ? (
        <p className="mt-6 text-[11.5px] text-muted-foreground">{t('comunidadVentanaAgotada')}</p>
      ) : null}

      <SeudonimoDialogo
        abierto={dialogoSeudonimo}
        perfil={perfil}
        onCerrar={() => setDialogoSeudonimo(false)}
        onGuardado={(p) => { setPerfil(p); setDialogoSeudonimo(false); setComponiendo(true); }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Detalle del hilo
// ═══════════════════════════════════════════════════════════════════════════

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

  if (cargando) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">{t('comunidadCargando')}</p>;
  }
  if (!hilo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-muted-foreground">{error || t('comunidadNoEncontrado')}</p>
        <Link to="/community" className="mt-4 inline-block text-sm text-primary">{t('comunidadVolver')}</Link>
      </div>
    );
  }

  const traducido = (id) => {
    const tr = traducciones[id];
    return tr && tr.translated ? tr : null;
  };

  const BotonTraducir = ({ type, id, lang }) => {
    if (!conectado || !lang || lang === locale) return null;
    if (traducido(id)) {
      return (
        <button
          type="button"
          onClick={() => setTraducciones((p) => ({ ...p, [id]: null }))}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t('comunidadVerOriginal')}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => traducir(type, id)}
        disabled={traduciendo === id}
        className="text-xs text-muted-foreground hover:text-primary"
      >
        {traduciendo === id ? t('comunidadTraduciendo') : t('comunidadTraducir')}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/community" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t('comunidadVolver')}
      </Link>

      <article className="mt-4 border-b border-rule pb-6">
        <h1 className="font-display text-2xl leading-tight tracking-tight text-balance">
          {traducido(hilo.id)?.title || hilo.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Avatar handle={hilo.author.handle} />
          <span className="font-mono text-foreground">@{hilo.author.handle}</span>
          {conectado && !hilo.isMine ? (
            <button type="button" onClick={seguir} className="text-primary hover:underline">
              {hilo.followingAuthor ? t('comunidadDejarDeSeguir') : t('comunidadSeguir')}
            </button>
          ) : null}
          <span>{t(CATEGORIA_ETIQUETA[hilo.category] || hilo.category)}</span>
          {hilo.symbol ? <span className="font-mono">{hilo.symbol}</span> : null}
          <BotonTraducir type="thread" id={hilo.id} lang={hilo.lang} />
        </div>

        {traducido(hilo.id) ? (
          <p className="mt-3 rounded-sharp border border-info/30 bg-info/10 px-3 py-1.5 text-[11.5px] text-info">
            {t('comunidadTraduccionAviso', { idioma: IDIOMA_NOMBRE[hilo.lang] || hilo.lang })}
          </p>
        ) : null}

        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">
          {traducido(hilo.id)?.body || hilo.body}
        </p>

        {hilo.analysis ? <FichaAnalisis analysis={hilo.analysis} locale={locale} /> : null}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Metricas hilo={hilo} t={t} />
          {conectado && !hilo.isMine ? (
            <>
              <button
                type="button"
                onClick={() => alternarLike('thread', hilo.id, hilo.liked)}
                className={`text-xs ${hilo.liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                {hilo.liked ? t('comunidadQuitarLike') : t('comunidadDarLike')}
              </button>
              <button
                type="button"
                onClick={() => denunciar('thread', hilo.id)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                {t('comunidadDenunciar')}
              </button>
            </>
          ) : null}
          {hilo.isMine ? (
            <button type="button" onClick={borrar} className="text-xs text-destructive hover:underline">
              {t('comunidadBorrar')}
            </button>
          ) : null}
        </div>
      </article>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {t('comunidadRespuestas')} · <span className="font-mono">{datos.replies.length}</span>
      </h2>

      {datos.replies.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('comunidadSinRespuestas')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {datos.replies.map((r) => (
            <li key={r.id} className="flex gap-3 py-4">
              <Avatar handle={r.author.handle} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground">@{r.author.handle}</span>
                  <BotonTraducir type="reply" id={r.id} lang={r.lang} />
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {traducido(r.id)?.body || r.body}
                </p>
                {r.analysis ? <FichaAnalisis analysis={r.analysis} locale={locale} compacta /> : null}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span><span className="font-mono text-foreground">{r.likes}</span> {t('comunidadLikes')}</span>
                  {conectado && !r.isMine ? (
                    <>
                      <button
                        type="button"
                        onClick={() => alternarLike('reply', r.id, r.liked)}
                        className={r.liked ? 'text-primary' : 'hover:text-primary'}
                      >
                        {r.liked ? t('comunidadQuitarLike') : t('comunidadDarLike')}
                      </button>
                      <button
                        type="button"
                        onClick={() => denunciar('reply', r.id)}
                        className="hover:text-destructive"
                      >
                        {t('comunidadDenunciar')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6">
        {conectado ? (
          <EditorMensaje
            modo="respuesta"
            enviando={enviando}
            locale={locale}
            onEnviar={responder}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-sm text-muted-foreground">
            {t('comunidadEntrarParaResponder')}{' '}
            <Link to="/login" className="text-primary hover:underline">{t('comunidadEntrar')}</Link>
          </p>
        )}
      </div>

      <SeudonimoDialogo
        abierto={dialogoSeudonimo}
        perfil={perfil}
        onCerrar={() => setDialogoSeudonimo(false)}
        onGuardado={(p) => { setPerfil(p); setDialogoSeudonimo(false); }}
      />
    </div>
  );
}
