import React from 'react';
import { Calculator, Crosshair, Grid3x3, Layers, Lightbulb, Settings2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import SectionCard from './SectionCard';
import PriceIVHeatmap from './PriceIVHeatmap';
import PositioningPanel from './PositioningPanel';
import ExplainTrade from './ExplainTrade';
import AITradeCoach from './AITradeCoach';
import GreeksDisplay from './GreeksDisplay';
import GreeksTimeChart from './GreeksTimeChart';
import KellyPanel from './KellyPanel';
import SavedPositionsPanel from './SavedPositionsPanel';
import PortfolioGreeks from './PortfolioGreeks';
import TradeAdvancedPanel from './TradeAdvancedPanel';

/**
 * Todo lo que NO es la posición ni su resultado, en un solo acordeón y cerrado
 * por defecto.
 *
 * Sustituye a tres sitios distintos que hacían lo mismo de tres maneras:
 *   · `AdvancedToggles` — tres botones sueltos (Kelly / Griegas / Cartera) con
 *     su propio estilo de "▼ mostrar / ▲ ocultar".
 *   · `TradeAdvancedPanel` — siempre montado y abierto al final de la página,
 *     con su propio sistema de plegado interno.
 *   · `ExplainTrade` y `AITradeCoach` — siempre visibles en la columna del
 *     gráfico, empujando hacia abajo cosas más importantes.
 *
 * El orden de las secciones es de mayor a menor impacto en una decisión:
 * entender la operación → contraste con tu histórico → detalle de griegas →
 * cuánto arriesgar → tu cartera → costes y escenarios.
 */
const SecondaryPanels = ({
  legs,
  stock,
  greeks,
  stats,
  breakEvens,
  currentExp,
  ticker,
  contracts,
  accountBalance,
  onAccountBalanceChange,
  onLoadPosition,
  commission,
  onCommissionChange,
  dividendYield,
  onDividendChange,
  chainSynthetic,
  riskFreeRate,
  selectedExpIdx = 3,
}) => {
  const { t } = useTranslation();

  const capPerContract = contracts > 0
    ? (parseFloat(stats.capitalRequired) || 0) / contracts
    : (parseFloat(stats.capitalRequired) || 0);

  const hasPosition = legs && legs.length > 0 && stock;

  return (
    <div className="space-y-2" data-testid="secondary-panels">
      <SectionCard
        icon={<Lightbulb className="w-4 h-4" />}
        accent="amber"
        title={t('optSectionExplain')}
        subtitle={t('optSectionExplainHint')}
        testid="section-explain"
      >
        {hasPosition ? (
          <ExplainTrade legs={legs} stock={stock} breakEvens={breakEvens} stats={stats} />
        ) : (
          <Empty text={t('optSectionNeedsPosition')} />
        )}
      </SectionCard>

      <SectionCard
        icon={<Sparkles className="w-4 h-4" />}
        accent="purple"
        title={t('optSectionCoach')}
        subtitle={t('optSectionCoachHint')}
        testid="section-coach"
      >
        <AITradeCoach
          symbol={ticker}
          stock={stock}
          legs={legs}
          stats={stats}
          greeks={greeks}
          daysToExpiry={currentExp?.daysToExpiry}
          balance={accountBalance}
          synthetic={chainSynthetic}
        />
      </SectionCard>

      <SectionCard
        icon={<span className="font-serif italic font-bold text-base leading-none">Δ</span>}
        accent="blue"
        title={t('optSectionGreeks')}
        subtitle={t('optSectionGreeksHint')}
        testid="section-greeks"
      >
        {hasPosition ? (
          <div className="space-y-4">
            <GreeksDisplay greeks={greeks} legs={legs} stock={stock} />
            <GreeksTimeChart
              legs={legs}
              stockPrice={stock?.price}
              daysToExpiry={currentExp?.daysToExpiry || 30}
            />
          </div>
        ) : (
          <Empty text={t('optSectionNeedsPosition')} />
        )}
      </SectionCard>

      {/* Precio × IV. Va justo detrás de las griegas porque responde la
          pregunta que ellas plantean: vega dice que la posición es sensible a
          la volatilidad, y esta rejilla dice cuánto cuesta esa sensibilidad. */}
      <SectionCard
        icon={<Grid3x3 className="w-4 h-4" />}
        accent="purple"
        title={t('optSectionHeatmap')}
        subtitle={t('optSectionHeatmapHint')}
        testid="section-heatmap"
      >
        {hasPosition ? (
          <PriceIVHeatmap
            legs={legs}
            stockPrice={stock?.price}
            riskFreeRate={riskFreeRate}
            dividendYield={dividendYield}
          />
        ) : (
          <Empty text={t('optSectionNeedsPosition')} />
        )}
      </SectionCard>

      {/* Posicionamiento del mercado. Es lo único de este acordeón que no
          depende de la posición construida: describe el subyacente. */}
      <SectionCard
        icon={<Crosshair className="w-4 h-4" />}
        accent="amber"
        title={t('optSectionPositioning')}
        subtitle={t('optSectionPositioningHint')}
        testid="section-positioning"
      >
        <PositioningPanel
          symbol={ticker}
          expirationIdx={selectedExpIdx}
          stockPrice={stock?.price}
        />
      </SectionCard>

      <SectionCard
        icon={<Calculator className="w-4 h-4" />}
        accent="primary"
        title={t('optSectionKelly')}
        subtitle={t('optSectionKellyHint')}
        testid="section-kelly"
      >
        <KellyPanel
          pop={parseFloat(stats.pop) || 0}
          maxProfit={parseFloat(stats.maxProfit) || 0}
          maxLoss={parseFloat(stats.maxLoss) || 0}
          capitalPerContract={capPerContract}
          isMaxLossUnlimited={stats.isMaxLossUnlimited}
          accountBalance={accountBalance}
          onBalanceChange={onAccountBalanceChange}
        />
      </SectionCard>

      <SectionCard
        icon={<Layers className="w-4 h-4" />}
        accent="purple"
        title={t('optSectionPortfolio')}
        subtitle={t('optSectionPortfolioHint')}
        testid="section-portfolio"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SavedPositionsPanel
            currentLegs={legs}
            currentSymbol={ticker}
            currentExpiration={currentExp?.fullLabel || currentExp?.date}
            onLoadPosition={onLoadPosition}
          />
          <PortfolioGreeks />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Settings2 className="w-4 h-4" />}
        accent="muted"
        title={t('optSectionCosts')}
        subtitle={t('optSectionCostsHint')}
        testid="section-costs"
      >
        <TradeAdvancedPanel
          legs={legs}
          stock={stock}
          feePerContract={commission}
          onFeeChange={onCommissionChange}
          dividendYield={dividendYield}
          onDividendChange={onDividendChange}
        />
      </SectionCard>
    </div>
  );
};

const Empty = ({ text }) => (
  <p className="text-xs text-muted-foreground py-2">{text}</p>
);

export default SecondaryPanels;
