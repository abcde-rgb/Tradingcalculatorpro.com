import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, CornerDownLeft, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { buildEduIndex, searchEdu, clearEduIndex } from '@/lib/eduIndex';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Pregúntale a la Academia dónde está lo que buscas.
 *
 * El buscador de la barra lateral filtra títulos, así que sólo encuentra lo
 * que ya sabes cómo se llama — justo lo contrario de lo que necesita quien
 * entra a aprender. Aquí se escribe la pregunta como se piensa ("¿cuánto
 * arriesgo por operación?", "por qué me liquidan antes del stop") y sale
 * **dónde está** la respuesta: el módulo, el apartado y un botón que lleva.
 *
 * Dos capas, y el orden importa:
 *
 *   1. **El índice local decide.** Se construye sobre el contenido real de los
 *      módulos (`lib/eduIndex.js`) y funciona sin red, sin backend y sin clave
 *      de IA. Es lo que permite prometer que siempre responde algo.
 *   2. **La IA sólo redacta**, y sólo sobre los módulos que ya ha encontrado el
 *      índice. No elige destino ni puede citar una sección que no exista: se le
 *      manda la lista de candidatos y se le pide que explique cuál mirar
 *      primero. Si no hay clave, si falla la llamada o si el usuario no está
 *      autenticado, los resultados locales siguen en pantalla exactamente
 *      igual — la IA es un extra, nunca el camino crítico.
 *
 * Esa separación es la que evita el fallo clásico de estos buscadores: un
 * modelo que se inventa un módulo que suena plausible y manda al usuario a una
 * página que no existe.
 */
export default function EduAssistant({ onGoToTopic }) {
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(null);
  const [hits, setHits] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const reqRef = useRef(0);

  // El índice se construye con los textos del idioma activo: al cambiarlo hay
  // que rehacerlo o el buscador respondería en el idioma anterior.
  useEffect(() => { clearEduIndex(); }, [locale]);
  const index = useMemo(() => buildEduIndex(t, locale), [t, locale]);

  const ask = async (raw) => {
    const q = String(raw ?? question).trim();
    if (!q) return;
    const id = ++reqRef.current;

    // 1 · Lo local, ya. Antes de cualquier red: si la IA tarda dos segundos,
    // el usuario ya tiene sus enlaces delante.
    const found = searchEdu(index, q, { limit: 5 });
    setAsked(q);
    setHits(found);
    setAnswer(null);
    setAiFailed(false);
    if (!found.results.length) return;

    // 2 · La redacción, sobre lo que ya se ha encontrado.
    if (!API || !isAuthenticated) return;
    setThinking(true);
    try {
      const res = await fetch(`${API}/api/education/assistant`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({
          question: q,
          locale,
          // Sólo los candidatos del índice. El backend valida que lo que
          // devuelva el modelo esté en esta lista.
          candidates: found.results.map((r) => ({
            id: r.id, title: r.title, sections: r.sections,
          })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (id !== reqRef.current) return;   // llegó tarde: hay otra pregunta
      if (data?.answer) setAnswer(data.answer);
      else setAiFailed(true);
    } catch (_) {
      if (id === reqRef.current) setAiFailed(true);
    } finally {
      if (id === reqRef.current) setThinking(false);
    }
  };

  const EXAMPLES = [
    t('eduAskExample1'),
    t('eduAskExample2'),
    t('eduAskExample3'),
  ];

  return (
    <section
      className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4"
      data-testid="edu-assistant"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Sparkles className="w-4 h-4 text-primary" />
        {t('eduAskTitle')}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
        {t('eduAskSubtitle')}
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); ask(); }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('eduAskPlaceholder')}
            className="pl-9"
            data-testid="edu-ask-input"
          />
        </div>
        <Button type="submit" disabled={!question.trim()} className="gap-2" data-testid="edu-ask-submit">
          <CornerDownLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('eduAskButton')}</span>
        </Button>
      </form>

      {/* Ejemplos: sin ellos, la caja se queda vacía porque nadie sabe qué se
          le puede preguntar a un buscador que no ha usado nunca. */}
      {!asked && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="edu-ask-examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setQuestion(ex); ask(ex); }}
              className="px-2.5 py-1 rounded-full border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* ── La respuesta ────────────────────────────────────────── */}
      {hits && (
        <div className="mt-4" data-testid="edu-ask-results">
          {hits.results.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed" data-testid="edu-ask-empty">
              {t('eduAskNoResults').replace('{q}', asked)}
            </p>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {t('eduAskFoundIn').replace('{n}', String(hits.results.length))}
              </p>

              <ol className="mt-2 space-y-1.5">
                {hits.results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onGoToTopic?.(r.id)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group"
                      data-testid={`edu-ask-hit-${r.id}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary/70 tabular-nums">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {r.title}
                        </span>
                        {r.evidence && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#f59e0b]/15 text-[#fbbf24]">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {t(r.evidence === 'disputed' ? 'eduEvidenceDisputed' : 'eduEvidenceCaution')}
                          </span>
                        )}
                      </span>
                      {r.sections.length > 0 && (
                        <span className="mt-1 block text-[11px] text-muted-foreground leading-snug">
                          {t('eduAskInSection')}: {r.sections.join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>

              {/* La redacción de la IA va DEBAJO de los enlaces, no encima: los
                  enlaces son la respuesta y esto es el comentario. */}
              {thinking && (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground" data-testid="edu-ask-thinking">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('eduAskThinking')}
                </p>
              )}
              {answer && (
                <div
                  className="mt-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  data-testid="edu-ask-answer"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                    <Sparkles className="w-3 h-3" /> {t('eduAskAnswerLabel')}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed whitespace-pre-line">{answer}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                    {t('eduAskAnswerDisclaimer')}
                  </p>
                </div>
              )}
              {aiFailed && (
                <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed" data-testid="edu-ask-ai-off">
                  {t('eduAskAiUnavailable')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
