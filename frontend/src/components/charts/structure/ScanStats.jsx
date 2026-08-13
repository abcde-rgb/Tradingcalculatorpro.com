import React from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Detalle técnico del escaneo: con cuántas velas se ha trabajado, cuántos
 * niveles se han encontrado frente a cuántos se han analizado a fondo, y con
 * qué ATR y qué tolerancia se agrupó.
 *
 * Va al final y plegado, pero no se elimina: es lo que permite reproducir a
 * mano cualquier número de la pantalla. Sin esto, "resistencia confirmada" es
 * un adjetivo; con esto es una cuenta.
 */
export default function ScanStats({ data }) {
  const { t } = useTranslation();
  if (!data) return null;
  const c = data.counts || {};
  const analysed = data.levelsAnalysed;

  return (
    <div className="text-xs text-muted-foreground font-mono space-y-1" data-testid="struct-stats">
      <div>
        {t('structScanStats')
          .replace('{rows}', String(data.rowsScanned ?? 0))
          .replace('{swings}', String(c.swings ?? 0))
          .replace('{bos}', String(c.bos ?? 0))
          .replace('{choch}', String(c.choch ?? 0))}
      </div>
      <div className="text-[10px]">
        {t('structLevelsStats')
          .replace('{levels}', String(c.levels ?? 0))
          .replace('{res}', String(c.resistances ?? 0))
          .replace('{sup}', String(c.supports ?? 0))
          .replace('{conf}', String(c.confirmedLevels ?? 0))}
      </div>
      {/* Solo los niveles más cercanos reciben el análisis caro por vela. El
          total sigue publicándose: no se esconde lo que no se ha mirado. */}
      {analysed != null && c.levels > analysed && (
        <div className="text-[10px]">
          {t('structAnalysedNote')
            .replace('{n}', String(analysed))
            .replace('{total}', String(c.levels))}
        </div>
      )}
      {c.repeatedBreaks > 0 && (
        <div className="text-[10px]">
          {t('structRepeatedNote').replace('{n}', String(c.repeatedBreaks))}
        </div>
      )}
      {c.fvgSessionGap > 0 && (
        <div className="text-[10px]">
          {t('structSessionGapNote').replace('{n}', String(c.fvgSessionGap))}
        </div>
      )}
      {data.atr != null && (
        <div className="text-[10px]">
          {t('structAtrLine')
            .replace('{atr}', String(data.atr))
            .replace('{atrPct}', String(data.atrPct ?? '—'))
            .replace('{tol}', String(data.tolerancePct ?? '—'))}
        </div>
      )}
    </div>
  );
}
