import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CandlestickChart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import CandleSVG from './CandleSVG';

/**
 * "Anatomy of a Japanese candle" — visual primer card placed at the top
 * of the Candlestick Patterns tab. Renders ONE bullish + ONE bearish
 * SVG candle side-by-side with labelled body / wicks / O-H-L-C points.
 */
const CandleAnatomy = () => {
  const { t } = useTranslation();

  // Reference candles in 0..100 price space.
  const bull = { o: 35, h: 90, l: 20, c: 75 };
  const bear = { o: 75, h: 90, l: 20, c: 35 };

  const Annotated = ({ candle, type }) => {
    const isBull = type === 'bull';
    const accent = isBull ? 'text-long' : 'text-short';
    return (
      <div className="flex items-center gap-3">
        {/* SVG candle (compact) */}
        <CandleSVG
          o={candle.o} h={candle.h} l={candle.l} c={candle.c}
          width={36} height={150}
          showLabels
          labels={{
            open: 'O',
            close: 'C',
            high: 'H',
            low: 'L',
          }}
        />
        {/* Inline tags */}
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground/80"></span>
            <span className="text-muted-foreground">{t('candleUpperWickLabel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-2 rounded-sm ${isBull ? 'bg-long' : 'bg-short'}`}></span>
            <span className={accent}>{t('candleBodyLabel')}</span>
            <span className="text-muted-foreground">
              ({isBull ? t('bullish') : t('bearish')})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground/80"></span>
            <span className="text-muted-foreground">{t('candleLowerWickLabel')}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card
      className="bg-gradient-to-br from-green-500/5 to-red-500/5 border-foreground/10"
      data-testid="candle-anatomy"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <CandlestickChart className="w-5 h-5 text-primary" />
          {t('candleAnatomyTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('candleAnatomyIntro')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Annotated candle={bull} type="bull" />
          <Annotated candle={bear} type="bear" />
        </div>

        {/* OHLC legend (compact) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-border/40 text-[11px] font-mono">
          <span className="text-muted-foreground"><span className="font-bold text-foreground">O</span> {t('candleOpenPrice')}</span>
          <span className="text-muted-foreground"><span className="font-bold text-foreground">H</span> {t('high')}</span>
          <span className="text-muted-foreground"><span className="font-bold text-foreground">L</span> {t('low')}</span>
          <span className="text-muted-foreground"><span className="font-bold text-foreground">C</span> {t('candleClosePrice')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandleAnatomy;
