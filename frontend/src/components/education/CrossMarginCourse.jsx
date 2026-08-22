import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Check, X, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { getCrossMargin } from '@/lib/tradingEducationContent';

/**
 * Curso de margen cruzado: once módulos con su comprobación y la tabla de
 * creencias que corrigen.
 *
 * Se pinta con su propio componente y no con la plantilla plana de los cinco
 * módulos compactos porque aquí el orden es una SECUENCIA —cada módulo se apoya
 * en el anterior— y porque cada uno declara dos cosas que la plantilla no sabe
 * enseñar: el error concreto que corrige y la idea que hay que llevarse. Un
 * catálogo de tarjetas equiparables las escondería.
 *
 * El quiz es por módulo y de una sola pregunta, deliberadamente: un examen al
 * final se contesta de memoria del examen; una pregunta pegada al texto que la
 * responde se contesta del texto. La correcta rota de posición entre módulos
 * (`correct` va de 0 a 3 a lo largo del curso) para que pulsar siempre el
 * primer botón no puntúe.
 *
 * Cada cifra del curso se reproduce en el simulador de la pestaña
 * `cross-margin` del panel, al que enlaza la cabecera, y está fijada en
 * `scripts/engine-check.js`.
 */
export default function CrossMarginCourse() {
  const { t } = useTranslation();
  const C = getCrossMargin(t);
  const [answers, setAnswers] = useState({});

  const pick = (moduleId, index) => setAnswers((prev) => (
    prev[moduleId] !== undefined ? prev : { ...prev, [moduleId]: index }
  ));

  return (
    <div className="space-y-6" data-testid="cross-margin-course">
      {/* ── Cabecera: qué es y a dónde lleva ─────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
            <Layers className="w-6 h-6 text-primary" aria-hidden />
            {C.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">{C.intro}</p>
          <div className="border-l-2 border-primary pl-4">
            <p className="text-sm text-foreground leading-relaxed">{C.promise}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="sm" className="rounded-sharp" data-testid="xm-course-open-sim">
              <Link to="/dashboard?tab=cross-margin">
                {t('xmEduOpenSim')}
                <ArrowRight className="ml-2 w-3.5 h-3.5" aria-hidden />
              </Link>
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              <span className="font-mono tabular-nums">
                {C.modules.reduce((a, m) => a + m.minutes, 0)}
              </span>
              {' '}{t('xmEduMinutes')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Los módulos ──────────────────────────────────────────────── */}
      {C.modules.map((m, i) => {
        const chosen = answers[m.id];
        const answered = chosen !== undefined;
        return (
          <Card key={m.id} className="bg-card border-border" data-testid={`xm-module-${m.id}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start gap-3 text-base">
                <span className="font-mono tabular-nums text-sm text-muted-foreground pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1">{m.name}</span>
                <span className="font-mono tabular-nums text-xs text-muted-foreground font-normal pt-1">
                  {m.minutes}′
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Qué creencia desmonta y qué hay que llevarse. Las dos juntas y
                  arriba: si sólo se lee esto, ya se ha leído lo importante. */}
              <div className="space-y-2 border-l-2 border-rule pl-4">
                <p className="text-xs text-muted-foreground">
                  <span className="uppercase tracking-wider">{t('xmEduCorrects')}</span>
                  {' '}{m.corrects}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="uppercase tracking-wider text-xs text-primary">{t('xmEduKeyIdea')}</span>
                  {' '}{m.keyIdea}
                </p>
              </div>

              {m.sections.map((s) => (
                <div key={s.name} className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  {s.formula && (
                    <p className="inline-block rounded-sharp border border-rule bg-muted/40 px-2.5 py-1
                                  font-mono text-xs tabular-nums text-foreground">
                      {s.formula}
                    </p>
                  )}
                </div>
              ))}

              {/* Comprobación */}
              <div className="rounded-sharp border border-rule p-4 space-y-3">
                <p className="text-sm text-foreground">{m.quiz.q}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {m.quiz.options.map((opt, oi) => {
                    const isCorrect = oi === m.quiz.correct;
                    let cls = 'border-rule text-muted-foreground hover:border-primary/40';
                    if (answered && isCorrect) cls = 'border-long/60 bg-long/10 text-long';
                    else if (answered && oi === chosen) cls = 'border-short/60 bg-short/10 text-short';
                    else if (answered) cls = 'border-rule/60 text-muted-foreground/60';
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={answered}
                        onClick={() => pick(m.id, oi)}
                        data-testid={`xm-quiz-${m.id}-${oi}`}
                        className={`flex items-start gap-2 rounded-sharp border px-3 py-2 text-left text-sm
                          transition-[border-color,color] duration-tick ease-out ${cls}`}
                      >
                        {answered && isCorrect && <Check className="mt-0.5 w-3.5 h-3.5 shrink-0" aria-hidden />}
                        {answered && !isCorrect && oi === chosen && (
                          <X className="mt-0.5 w-3.5 h-3.5 shrink-0" aria-hidden />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`xm-why-${m.id}`}>
                    <span className={chosen === m.quiz.correct ? 'text-long' : 'text-short'}>
                      {t(chosen === m.quiz.correct ? 'xmEduQuizRight' : 'xmEduQuizWrong')}
                    </span>
                    {' '}{m.quiz.why}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ── Creencias corregidas ─────────────────────────────────────── */}
      <Card className="bg-card border-border" data-testid="xm-misconceptions">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('xmEduMisconceptions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-normal">{t('xmEduClaim')}</th>
                  <th scope="col" className="py-2 font-normal">{t('xmEduReality')}</th>
                </tr>
              </thead>
              <tbody>
                {C.misconceptions.map((mc) => (
                  <tr key={mc.id} className="border-b border-rule/60 align-top">
                    <td className="py-3 pr-4 text-muted-foreground line-through decoration-short/60">
                      {mc.claim}
                    </td>
                    <td className="py-3 text-foreground leading-relaxed">{mc.reality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-5">
          <p className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-short" aria-hidden />
            {C.note}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
