import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Ruler, Calculator, BarChart3, HelpCircle, ArrowRight, Info,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslation } from '@/lib/i18n';
import { themeForMarket, themeVars, headerBackground } from '@/lib/marketTheme';
import { getMarketContent } from '@/lib/marketTypesContent';
import {
  TVCryptoScreener, TVStockScreener, TVForexCrossRates, TVMarketOverview,
  TVTechnicalAnalysis,
} from '@/components/charts/TVWidget';

/**
 * MarketTypeModal — the full fact sheet behind each "Market Types" card.
 *
 * Six blocks: what it is · how it is measured · worked example · live
 * calculator · real data (TradingView) · Q&A.
 *
 * Language: the body comes from lib/marketTypesContent.js, which ships es + en
 * and falls back to English for the other six locales. The chrome below follows
 * the SAME language as the body so a German reader doesn't get Spanish headings
 * over English prose. See docs/EXAMEN_FINAL_2026-07-26.md §M-45.
 */

const UI = {
  es: {
    what: 'Qué es', measure: 'Cómo se mide', example: 'Ejemplo resuelto',
    calc: 'Calcúlalo tú', data: 'Datos reales ahora mismo', faq: 'Preguntas y respuestas',
    openTool: 'Abrir la calculadora completa', source: 'Datos de TradingView',
    langNote: 'Ficha ampliada disponible en español e inglés.',
  },
  en: {
    what: 'What it is', measure: 'How it is measured', example: 'Worked example',
    calc: 'Run the numbers', data: 'Real data right now', faq: 'Questions & answers',
    openTool: 'Open the full calculator', source: 'Data by TradingView',
    langNote: 'Extended fact sheet available in Spanish and English.',
  },
};

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

const fmtBig = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e12) return `${fmt(n / 1e12)} T`;
  if (a >= 1e9) return `${fmt(n / 1e9)} B`;
  if (a >= 1e6) return `${fmt(n / 1e6)} M`;
  return fmt(n);
};

/* ── Small field + result primitives shared by every mini calculator ── */

const Field = ({ label, value, onChange, suffix, step = 'any' }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="relative mt-1">
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 font-mono text-sm pr-10"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </label>
);

const Out = ({ label, value, hint, accent = false }) => (
  <div className={`rounded-lg border p-3 ${accent ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'}`}>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`font-mono font-bold ${accent ? 'text-primary text-lg' : 'text-base'}`}>{value}</div>
    {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
  </div>
);

const Grid = ({ children, cols = 3 }) => (
  <div className={`grid grid-cols-2 ${cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-3`}>{children}</div>
);

/* ── One mini calculator per market family ───────────────────────── */

// Crypto: market cap, FDV and the dilution nobody computes (100-rules PDF).
const DilutionCalc = ({ L }) => {
  const [price, setPrice] = useState('20');
  const [circ, setCirc] = useState('200');
  const [total, setTotal] = useState('1000');
  const p = num(price), c = num(circ) * 1e6, t = num(total) * 1e6;
  const mcap = p * c;
  const fdv = p * t;
  const pct = t > 0 ? (c / t) * 100 : 0;
  const implied = t > 0 ? mcap / t : 0;
  const drop = p > 0 ? ((implied - p) / p) * 100 : 0;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid>
        <Field label={es ? 'Precio' : 'Price'} value={price} onChange={setPrice} suffix="$" />
        <Field label={es ? 'Oferta circulante' : 'Circulating supply'} value={circ} onChange={setCirc} suffix="M" />
        <Field label={es ? 'Oferta total' : 'Total supply'} value={total} onChange={setTotal} suffix="M" />
      </Grid>
      <Grid cols={4}>
        <Out label={es ? 'Capitalización' : 'Market cap'} value={`$${fmtBig(mcap)}`} />
        <Out label="FDV" value={`$${fmtBig(fdv)}`} />
        <Out label={es ? '% circulando' : '% circulating'} value={`${fmt(pct, 1)}%`} />
        <Out
          accent
          label={es ? 'Precio tras dilución' : 'Price after dilution'}
          value={`$${fmt(implied, implied < 1 ? 4 : 2)}`}
          hint={`${drop >= 0 ? '+' : ''}${fmt(drop, 1)}%`}
        />
      </Grid>
    </div>
  );
};

// Forex: position size from risk, in lots, plus the notional it really controls.
const PipCalc = ({ L }) => {
  const [account, setAccount] = useState('5000');
  const [risk, setRisk] = useState('1');
  const [stop, setStop] = useState('25');
  const [pipValue, setPipValue] = useState('10');
  const a = num(account), r = num(risk), s = num(stop), pv = num(pipValue);
  const riskMoney = (a * r) / 100;
  const lots = s > 0 && pv > 0 ? riskMoney / (s * pv) : 0;
  const notional = lots * 100000;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid cols={4}>
        <Field label={es ? 'Cuenta' : 'Account'} value={account} onChange={setAccount} suffix="€" />
        <Field label={es ? 'Riesgo' : 'Risk'} value={risk} onChange={setRisk} suffix="%" />
        <Field label="Stop" value={stop} onChange={setStop} suffix="pips" />
        <Field label={es ? 'Valor del pip' : 'Pip value'} value={pipValue} onChange={setPipValue} suffix="$" />
      </Grid>
      <Grid>
        <Out label={es ? 'Riesgo' : 'Risk'} value={`${fmt(riskMoney)} €`} />
        <Out accent label={es ? 'Tamaño' : 'Size'} value={`${fmt(lots, 2)} ${es ? 'lotes' : 'lots'}`} />
        <Out
          label={es ? 'Nocional' : 'Notional'}
          value={fmtBig(notional)}
          hint={a > 0 ? `${fmt(notional / a, 1)}× ${es ? 'tu cuenta' : 'your account'}` : undefined}
        />
      </Grid>
    </div>
  );
};

// Commodities / futures / indices: notional, leverage and what one move costs.
const TickCalc = ({ L, preset }) => {
  const [price, setPrice] = useState(preset?.price ?? '3');
  const [size, setSize] = useState(preset?.size ?? '10000');
  const [margin, setMargin] = useState(preset?.margin ?? '2500');
  const [move, setMove] = useState('10');
  const p = num(price), sz = num(size), m = num(margin), mv = num(move);
  const notional = p * sz;
  const lev = m > 0 ? notional / m : 0;
  const pnl = (notional * mv) / 100;
  const pctMargin = m > 0 ? (pnl / m) * 100 : 0;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid cols={4}>
        <Field label={es ? 'Precio' : 'Price'} value={price} onChange={setPrice} />
        <Field label={es ? 'Tamaño contrato' : 'Contract size'} value={size} onChange={setSize} />
        <Field label={es ? 'Margen' : 'Margin'} value={margin} onChange={setMargin} suffix="$" />
        <Field label={es ? 'Movimiento' : 'Move'} value={move} onChange={setMove} suffix="%" />
      </Grid>
      <Grid>
        <Out label={es ? 'Nocional' : 'Notional'} value={`$${fmtBig(notional)}`} />
        <Out label={es ? 'Apalancamiento' : 'Leverage'} value={`${fmt(lev, 1)}×`} />
        <Out
          accent
          label={es ? 'P&L del movimiento' : 'P&L on that move'}
          value={`$${fmtBig(pnl)}`}
          hint={`${fmt(pctMargin, 0)}% ${es ? 'del margen' : 'of margin'}`}
        />
      </Grid>
    </div>
  );
};

// CFDs: the overnight financing that quietly eats the account.
const CarryCalc = ({ L }) => {
  const [notional, setNotional] = useState('20000');
  const [margin, setMargin] = useState('1000');
  const [rate, setRate] = useState('4.5');
  const [days, setDays] = useState('30');
  const n = num(notional), m = num(margin), r = num(rate), d = num(days);
  const perDay = (n * (r / 100)) / 365;
  const total = perDay * d;
  const pctMargin = m > 0 ? (total / m) * 100 : 0;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid cols={4}>
        <Field label={es ? 'Nocional' : 'Notional'} value={notional} onChange={setNotional} suffix="€" />
        <Field label={es ? 'Margen' : 'Margin'} value={margin} onChange={setMargin} suffix="€" />
        <Field label={es ? 'Tipo anual' : 'Annual rate'} value={rate} onChange={setRate} suffix="%" />
        <Field label={es ? 'Días' : 'Days'} value={days} onChange={setDays} />
      </Grid>
      <Grid>
        <Out label={es ? 'Coste diario' : 'Daily cost'} value={`${fmt(perDay)} €`} />
        <Out accent label={es ? 'Coste total' : 'Total cost'} value={`${fmt(total)} €`} />
        <Out
          label={es ? 'Sobre tu margen' : 'Of your margin'}
          value={`${fmt(pctMargin, 1)}%`}
          hint={es ? 'antes de que el precio se mueva' : 'before the price moves at all'}
        />
      </Grid>
    </div>
  );
};

// Options: notional vs delta-adjusted (effective) leverage — the order-book PDF.
const OptionLeverageCalc = ({ L }) => {
  const [spot, setSpot] = useState('100');
  const [mult, setMult] = useState('100');
  const [premium, setPremium] = useState('2');
  const [delta, setDelta] = useState('0.5');
  const s = num(spot), mu = num(mult), pr = num(premium), de = num(delta);
  const notional = s * mu;
  const cost = pr * mu;
  const nominalLev = cost > 0 ? notional / cost : 0;
  const effLev = nominalLev * de;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid cols={4}>
        <Field label={es ? 'Subyacente' : 'Underlying'} value={spot} onChange={setSpot} />
        <Field label={es ? 'Multiplicador' : 'Multiplier'} value={mult} onChange={setMult} />
        <Field label={es ? 'Prima' : 'Premium'} value={premium} onChange={setPremium} />
        <Field label="Delta" value={delta} onChange={setDelta} step="0.01" />
      </Grid>
      <Grid cols={4}>
        <Out label={es ? 'Nocional' : 'Notional'} value={fmtBig(notional)} />
        <Out label={es ? 'Coste' : 'Cost'} value={fmtBig(cost)} />
        <Out label={es ? 'Apal. nocional' : 'Notional leverage'} value={`${fmt(nominalLev, 1)}×`} />
        <Out accent label={es ? 'Apal. efectivo' : 'Effective leverage'} value={`${fmt(effLev, 1)}×`} />
      </Grid>
    </div>
  );
};

// Stocks: market cap and P/E from the three numbers that define a share.
const MarketCapCalc = ({ L }) => {
  const [price, setPrice] = useState('180');
  const [shares, setShares] = useState('15000');
  const [eps, setEps] = useState('6.5');
  const p = num(price), sh = num(shares) * 1e6, e = num(eps);
  const mcap = p * sh;
  const pe = e > 0 ? p / e : 0;
  const earnings = e * sh;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <Grid>
        <Field label={es ? 'Precio' : 'Price'} value={price} onChange={setPrice} suffix="$" />
        <Field label={es ? 'Acciones' : 'Shares'} value={shares} onChange={setShares} suffix="M" />
        <Field label="BPA / EPS" value={eps} onChange={setEps} suffix="$" />
      </Grid>
      <Grid>
        <Out accent label={es ? 'Capitalización' : 'Market cap'} value={`$${fmtBig(mcap)}`} />
        <Out label="PER / P·E" value={fmt(pe, 1)} hint={es ? 'media S&P 500 ≈ 16-18' : 'S&P 500 avg ≈ 16-18'} />
        <Out label={es ? 'Beneficio anual' : 'Annual earnings'} value={`$${fmtBig(earnings)}`} />
      </Grid>
    </div>
  );
};

// ETFs / bonds: what a fee difference compounds into.
const TerCalc = ({ L }) => {
  const [amount, setAmount] = useState('10000');
  const [ret, setRet] = useState('7');
  const [years, setYears] = useState('20');
  const [cheap, setCheap] = useState('0.07');
  const [pricey, setPricey] = useState('0.70');
  const a = num(amount), r = num(ret), y = num(years);
  const grow = (ter) => a * Math.pow(1 + (r - num(ter)) / 100, y);
  const vCheap = grow(cheap), vPricey = grow(pricey);
  const diff = vCheap - vPricey;
  const es = L === UI.es;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label={es ? 'Inversión' : 'Investment'} value={amount} onChange={setAmount} suffix="€" />
        <Field label={es ? 'Rentab. bruta' : 'Gross return'} value={ret} onChange={setRet} suffix="%" />
        <Field label={es ? 'Años' : 'Years'} value={years} onChange={setYears} />
        <Field label={es ? 'TER barato' : 'Cheap TER'} value={cheap} onChange={setCheap} suffix="%" step="0.01" />
        <Field label={es ? 'TER caro' : 'Expensive TER'} value={pricey} onChange={setPricey} suffix="%" step="0.01" />
      </div>
      <Grid>
        <Out label={es ? 'ETF barato' : 'Cheap ETF'} value={`${fmtBig(vCheap)} €`} />
        <Out label={es ? 'ETF caro' : 'Expensive ETF'} value={`${fmtBig(vPricey)} €`} />
        <Out
          accent
          label={es ? 'Diferencia' : 'Difference'}
          value={`${fmtBig(diff)} €`}
          hint={vCheap > 0 ? `${fmt((diff / vCheap) * 100, 1)}% ${es ? 'de tu resultado' : 'of your result'}` : undefined}
        />
      </Grid>
    </div>
  );
};

const CALCS = {
  dilution: DilutionCalc,
  lotsize: PipCalc,
  futures: TickCalc,
  leverage: CarryCalc,
  options: OptionLeverageCalc,
  position: MarketCapCalc,
  compound: TerCalc,
};

// Deep-links into the real calculator suite for each market.
const CALC_ROUTE = {
  dilution: null,
  lotsize: '/dashboard?tab=lotsize',
  futures: '/dashboard?tab=futures',
  leverage: '/dashboard?tab=leverage',
  options: '/options',
  position: '/dashboard?tab=position',
  compound: '/dashboard?tab=compound',
};

/* ── The live-data widget for each market ────────────────────────── */

function MarketWidget({ widget }) {
  switch (widget) {
    case 'crypto-screener':
      return <TVCryptoScreener />;
    case 'stock-screener':
      return <TVStockScreener />;
    case 'stock-screener-etf':
      return <TVStockScreener market="america" />;
    case 'forex-cross-rates':
      return <TVForexCrossRates />;
    case 'technical':
      return <TVTechnicalAnalysis symbol="NASDAQ:AAPL" />;
    case 'market-overview-indices':
      return (
        <TVMarketOverview
          tabs={[{
            title: 'Indices',
            symbols: [
              { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
              { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' },
              { s: 'FOREXCOM:DJI', d: 'Dow 30' },
              { s: 'INDEX:DEU40', d: 'DAX' },
              { s: 'FOREXCOM:UKXGBP', d: 'FTSE 100' },
              { s: 'INDEX:IBC', d: 'IBEX 35' },
              { s: 'INDEX:NKY', d: 'Nikkei 225' },
            ],
          }]}
        />
      );
    case 'market-overview-commodities':
      return (
        <TVMarketOverview
          tabs={[{
            title: 'Commodities',
            symbols: [
              { s: 'TVC:USOIL', d: 'WTI Crude' },
              { s: 'TVC:UKOIL', d: 'Brent Crude' },
              { s: 'NYMEX:NG1!', d: 'Natural Gas' },
              { s: 'TVC:GOLD', d: 'Gold' },
              { s: 'TVC:SILVER', d: 'Silver' },
              { s: 'COMEX:HG1!', d: 'Copper' },
              { s: 'CBOT:ZW1!', d: 'Wheat' },
            ],
          }]}
        />
      );
    case 'market-overview-futures':
      return (
        <TVMarketOverview
          tabs={[{
            title: 'Futures',
            symbols: [
              { s: 'CME_MINI:ES1!', d: 'E-mini S&P 500' },
              { s: 'CME_MINI:NQ1!', d: 'E-mini Nasdaq' },
              { s: 'CBOT_MINI:YM1!', d: 'E-mini Dow' },
              { s: 'NYMEX:CL1!', d: 'WTI Crude' },
              { s: 'COMEX:GC1!', d: 'Gold' },
              { s: 'CBOT:ZN1!', d: '10Y T-Note' },
            ],
          }]}
        />
      );
    case 'market-overview-bonds':
      return (
        <TVMarketOverview
          tabs={[{
            title: 'Bonds',
            symbols: [
              { s: 'TVC:US10Y', d: 'US 10Y' },
              { s: 'TVC:US02Y', d: 'US 2Y' },
              { s: 'TVC:DE10Y', d: 'Germany 10Y' },
              { s: 'TVC:ES10Y', d: 'Spain 10Y' },
              { s: 'TVC:GB10Y', d: 'UK 10Y' },
              { s: 'TVC:JP10Y', d: 'Japan 10Y' },
            ],
          }]}
        />
      );
    case 'market-overview-cfd':
      return (
        <TVMarketOverview
          tabs={[{
            title: 'CFD underlyings',
            symbols: [
              { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
              { s: 'FX:EURUSD', d: 'EUR/USD' },
              { s: 'TVC:GOLD', d: 'Gold' },
              { s: 'TVC:USOIL', d: 'WTI Crude' },
              { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' },
            ],
          }]}
        />
      );
    default:
      return null;
  }
}

/* ── The modal itself ────────────────────────────────────────────── */

export default function MarketTypeModal({ market, open, onOpenChange }) {
  const { locale } = useTranslation();
  const L = UI[locale] || UI.en;
  const bodyLocale = locale === 'es' ? 'es' : 'en';
  const content = useMemo(
    () => (market ? getMarketContent(market.id, bodyLocale) : null),
    [market, bodyLocale]
  );

  if (!market || !content) return null;

  const Calc = CALCS[content.calc];
  const route = CALC_ROUTE[content.calc];
  const calcUI = bodyLocale === 'es' ? UI.es : UI.en;

  const Section = ({ icon: Icon, title, children, tone = 'text-primary' }) => (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 font-unbounded text-sm font-bold uppercase tracking-wide">
        <Icon className={`w-4 h-4 ${tone}`} />
        {title}
      </h3>
      {children}
    </section>
  );

  const mkTheme = themeForMarket(market.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
        data-testid={`market-modal-${market.id}`}
        /* Identidad visual por mercado: el oro no puede verse igual que los
           bonos. Va como variables CSS porque una clase de Tailwind construida
           en ejecución no existe en el bundle compilado. */
        style={themeVars(mkTheme)}
      >
        <DialogHeader>
          <div
            className="-mx-6 -mt-6 mb-1 px-6 pt-6 pb-4 rounded-t-lg border-b border-[color:var(--mk-accent)]/25"
            style={{ background: headerBackground(mkTheme) }}
          >
            <DialogTitle className="flex items-center gap-3 font-unbounded text-2xl">
              <span
                className="text-3xl w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--mk-soft)', boxShadow: `0 0 24px var(--mk-glow)` }}
                aria-hidden="true"
              >
                {mkTheme.emoji || market.icon}
              </span>
              <span style={mkTheme.metallic ? {
                backgroundImage: mkTheme.metallic,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              } : { color: 'var(--mk-accent)' }}>
                {market.name}
              </span>
              {market.volume && (
                <Badge variant="secondary" className="text-[10px] font-normal">{market.volume}</Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-7 pt-2">
          {/* 1 · What it is */}
          <Section icon={BookOpen} title={calcUI.what}>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.what}</p>
          </Section>

          {/* 2 · How it is measured — the units block */}
          <Section icon={Ruler} title={calcUI.measure} tone="text-[color:var(--mk-accent)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {content.measure.map((m) => (
                <div key={m.k} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs font-bold text-foreground mb-1">{m.k}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{m.v}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* 3 · Worked example */}
          <Section icon={Calculator} title={content.example.title} tone="text-amber-500">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <table className="w-full text-sm">
                  <tbody>
                    {content.example.rows.map(([k, v], i) => (
                      <tr key={k} className={i % 2 ? 'bg-muted/20' : ''}>
                        <td className="py-1.5 pr-4 text-muted-foreground align-top">{k}</td>
                        <td className="py-1.5 font-mono text-right font-semibold whitespace-nowrap">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {content.example.note && (
                  <p className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground leading-relaxed flex gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>{content.example.note}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </Section>

          {/* 4 · Live calculator */}
          {Calc && (
            <Section icon={Calculator} title={calcUI.calc} tone="text-emerald-500">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <Calc L={calcUI} />
                  {route && (
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link to={route}>
                          {calcUI.openTool} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Section>
          )}

          {/* 5 · Real data */}
          {content.tv?.widget && (
            <Section icon={BarChart3} title={calcUI.data} tone="text-violet-500">
              <MarketWidget widget={content.tv.widget} />
              <p className="text-[10px] text-muted-foreground text-right font-mono">{calcUI.source}</p>
            </Section>
          )}

          {/* 6 · Q&A — the same content indexed as FAQPage on /markets/<id>/ */}
          <Section icon={HelpCircle} title={calcUI.faq} tone="text-sky-500">
            <Accordion type="single" collapsible className="w-full">
              {content.faq.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i}`}>
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Section>

          {locale !== 'es' && locale !== 'en' && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">{L.langNote}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
