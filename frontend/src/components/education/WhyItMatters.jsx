import React from 'react';
import { Lightbulb, AlertTriangle, Wrench } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { themeVars } from '@/lib/marketTheme';

/**
 * "Por qué importa" — el bloque que convierte una explicación en algo accionable.
 *
 * El material educativo ya contaba QUÉ es cada cosa. Lo que faltaba, y es lo
 * que separa aprender de memorizar, son las otras tres preguntas:
 *
 *   · por qué importa
 *   · QUÉ TE CUESTA ignorarlo  ← la que de verdad fija el concepto
 *   · qué haces con ello mañana
 *
 * El coste va deliberadamente en concreto (un número, un escenario), no en
 * abstracto. "Es importante gestionar el riesgo" no enseña nada; "con un 2 %
 * por operación, ocho pérdidas seguidas te dejan al 85 % — con un 10 %, al
 * 43 %" sí. Un consejo sin consecuencia cuantificada se olvida antes de bajar
 * a la siguiente sección.
 *
 * `cost` es opcional pero muy recomendable: sin él, esto es una tarjeta bonita.
 */
const WhyItMatters = ({ what, why, cost, use, theme, compact = false }) => {
  const { t } = useTranslation();
  const style = theme ? themeVars(theme) : undefined;

  const Row = ({ Icon, label, text, danger }) => {
    if (!text) return null;
    return (
      <div className="flex gap-2.5">
        <Icon
          className={`w-4 h-4 shrink-0 mt-0.5 ${danger ? 'text-[#f59e0b]' : ''}`}
          style={danger ? undefined : { color: 'var(--mk-accent, hsl(var(--primary)))' }}
        />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
          <div className="text-[13px] leading-relaxed text-foreground/90">{text}</div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={style}
      className={`rounded-xl border bg-[color:var(--mk-soft,transparent)] border-[color:var(--mk-accent,hsl(var(--primary)))]/30 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}
      data-testid="why-it-matters"
    >
      <Row Icon={Lightbulb} label={t('whyWhatIs')} text={what} />
      <Row Icon={Lightbulb} label={t('whyItMatters')} text={why} />
      {/* El coste va en ámbar a propósito: es una advertencia, no un dato más. */}
      <Row Icon={AlertTriangle} label={t('whyCostOfIgnoring')} text={cost} danger />
      <Row Icon={Wrench} label={t('whyHowToUse')} text={use} />
    </div>
  );
};

export default WhyItMatters;
