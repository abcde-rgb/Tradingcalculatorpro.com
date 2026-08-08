import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowRight, Gauge } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Self-contained "try it free" position-size calculator for the landing page.
 * Pure client-side math — no backend, no store, no auth — so prospects can use
 * it without registering. CTA nudges them to create a free account.
 */
export default function LandingDemoCalculator() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState('1000');
  const [risk, setRisk] = useState('1');
  const [entry, setEntry] = useState('100');
  const [stop, setStop] = useState('95');

  const r = useMemo(() => {
    const b = num(balance), rk = num(risk), e = num(entry), s = num(stop);
    const dist = Math.abs(e - s);
    if (b <= 0 || rk <= 0 || e <= 0 || dist <= 0) return { valid: false };
    const riskAmt = b * (rk / 100);
    const units = riskAmt / dist;
    return { valid: true, riskAmt, units, value: units * e };
  }, [balance, risk, entry, stop]);

  const fmt = (n, d = 2) =>
    Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card
          className="border-primary/30 bg-card"
          data-testid="landing-demo-calc"
        >
          <CardContent className="p-6 md:p-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
              <Gauge className="w-3.5 h-3.5" /> {t('dcalcBadge')}
            </div>
            <h2 className="font-unbounded text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" /> {t('dcalcTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('dcalcSubtitle')}</p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <DemoField label={t('dcalcBalance')} value={balance} onChange={setBalance} />
              <DemoField label={t('dcalcRisk')} value={risk} onChange={setRisk} />
              <DemoField label={t('dcalcEntry')} value={entry} onChange={setEntry} />
              <DemoField label={t('dcalcStop')} value={stop} onChange={setStop} />
            </div>

            {r.valid ? (
              <div className="grid grid-cols-3 gap-3 mt-5" data-testid="demo-result">
                <DemoStat label={t('dcalcRiskAmt')} value={fmt(r.riskAmt)} />
                <DemoStat label={t('dcalcUnits')} value={fmt(r.units, 4)} primary />
                <DemoStat label={t('dcalcValue')} value={fmt(r.value)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-5">{t('dcalcInvalid')}</p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Link to="/register" className="w-full sm:w-auto shrink-0">
                <Button size="lg" className="w-full gap-2" data-testid="demo-cta">
                  {t('dcalcCta')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('dcalcCtaSub')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DemoField({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono bg-background/60"
      />
    </div>
  );
}

function DemoStat({ label, value, primary }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${primary ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/40'}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`font-mono text-base md:text-lg font-bold break-all ${primary ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
