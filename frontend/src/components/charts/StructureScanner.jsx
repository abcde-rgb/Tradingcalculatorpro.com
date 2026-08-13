import React from 'react';
import { Activity, Waves, GitBranch, CandlestickChart, History, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SectionCard, { SectionHeading } from '@/components/common/SectionCard';
import { useTranslation } from '@/lib/i18n';
import { useAssetsStore, ALL_ASSETS } from '@/lib/assets';
import { DAY_MS } from '@/lib/structureLog';
import { toYahooSymbol } from './structure/scannerMeta';
import useStructureScan from './structure/useStructureScan';
import ScanControls, { ScanNotices } from './structure/ScanControls';
import ScanReading from './structure/ScanReading';
import LevelLadder from './structure/LevelLadder';
import StructureEvents from './structure/StructureEvents';
import CandleSignals from './structure/CandleSignals';
import FvgList from './structure/FvgList';
import ScanLog from './structure/ScanLog';
import ScanStats from './structure/ScanStats';

/**
 * Escáner de estructura de precio del dashboard.
 *
 * ESTE ARCHIVO SOLO COMPONE. Todo lo que calcula, pide o pinta vive en
 * `./structure/`: el hook con las llamadas y el registro, los mapas de
 * constantes y un panel por bloque. Antes eran 730 líneas donde la tabla de
 * tickers, la lógica de reintentos y el marcado de cada nivel compartían
 * archivo, y cualquier cambio obligaba a leerlo entero.
 *
 * EL ORDEN ES LA FUNCIONALIDAD, igual que en el panel de opciones:
 *
 *   1 configurar  → qué vela y cuánto histórico (y los avisos que cambian el
 *                   significado de todo lo de abajo)
 *   2 lectura     → tendencia y recorrido hasta el siguiente nivel por lado
 *   3 niveles     → la escalera de precio: resistencias arriba, soportes abajo
 *   accesorio     → rupturas, velas, FVG, registro y detalle técnico, dentro
 *                   de secciones plegadas con un contador en la cabecera
 *
 * Antes los ocho bloques se apilaban siempre abiertos y con el mismo peso
 * visual: una pared en la que nada parecía más importante que otra cosa, y en
 * la que la respuesta ("¿estoy comprando contra una resistencia?") había que
 * buscarla. Nada se ha escondido — lo plegado lleva su contador a la vista.
 */
const StructureScanner = () => {
  const { t } = useTranslation();
  const { selectedAsset } = useAssetsStore();
  const asset = ALL_ASSETS[selectedAsset];
  const yahoo = toYahooSymbol(asset);

  const {
    ladder, periods, tfInterval, activePeriod,
    loading, data, candles, log,
    scan, changeInterval, changePeriod, clearLog, lastScanAt,
    chartInterval, chartRung,
  } = useStructureScan(yahoo);

  const counts = data?.counts || {};
  const events = data?.events || [];
  const levels = data?.levels || [];
  const fvgs = data?.fvgs || [];
  const newInDay = log.filter((e) => Date.now() - e.ts < DAY_MS).length;
  const scanned = data && data.rowsScanned > 0;
  const nothingFound = scanned && events.length === 0 && levels.length === 0
    && fvgs.length === 0 && candles.length === 0;

  const Badge = ({ children, tone = 'muted' }) => (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
      tone === 'primary' ? 'bg-primary/15 text-primary' : 'bg-muted border border-border text-muted-foreground'
    }`}
    >
      {children}
    </span>
  );

  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/30"
      data-testid="structure-scanner"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
              <Activity className="w-5 h-5 text-primary" />
              {t('structScanTitle')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {t('structScanIntro')}
            </p>
          </div>
          {asset && (
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {t('structScanReading')}
              </div>
              <div className="text-sm font-bold font-mono text-primary">{asset.symbol}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{asset.name}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── 1 · CONFIGURAR ─────────────────────────────────────────────── */}
        <div>
          <SectionHeading step={1} title={t('structStepSetup')} hint={t('structStepSetupHint')} />
          <ScanControls
            ladder={ladder}
            periods={periods}
            tfInterval={tfInterval}
            lastScanAt={lastScanAt}
            activePeriod={activePeriod}
            loading={loading}
            disabled={!yahoo}
            onInterval={changeInterval}
            onPeriod={changePeriod}
            onRescan={scan}
          />
          <div className="space-y-2 mt-2">
            <ScanNotices
              data={data}
              chartInterval={chartInterval}
              chartRung={chartRung}
              tfInterval={tfInterval}
              onSyncToChart={changeInterval}
            />
          </div>
        </div>

        {/* ── 2 · LECTURA ────────────────────────────────────────────────── */}
        {scanned && (
          <div>
            <SectionHeading step={2} title={t('structStepReading')} hint={t('structStepReadingHint')} />
            <ScanReading data={data} />
          </div>
        )}

        {/* ── 3 · NIVELES ────────────────────────────────────────────────── */}
        {scanned && levels.length > 0 && (
          <div>
            <SectionHeading step={3} title={t('structLevelsTitle')} hint={t('structStepLevelsHint')} />
            <LevelLadder data={data} />
          </div>
        )}

        {/* ── Accesorio: plegado, con contador a la vista ─────────────────── */}
        {scanned && (
          <div className="space-y-2">
            {events.length > 0 && (
              <SectionCard
                icon={<GitBranch className="w-4 h-4" />}
                title={t('structEventsTitle')}
                subtitle={t('structEventsSub')}
                accent="primary"
                testid="struct-sec-events"
                badge={<Badge tone="primary">{`${counts.confirmedEvents ?? 0}/${events.length}`}</Badge>}
              >
                <StructureEvents events={events} />
              </SectionCard>
            )}

            {candles.length > 0 && (
              <SectionCard
                icon={<CandlestickChart className="w-4 h-4" />}
                title={t('structCandlesTitle')}
                subtitle={t('structCandlesSub')}
                accent="purple"
                testid="struct-sec-candles"
                badge={<Badge>{candles.length}</Badge>}
              >
                <CandleSignals signals={candles} fallbackInterval={tfInterval} />
              </SectionCard>
            )}

            {fvgs.length > 0 && (
              <SectionCard
                icon={<Waves className="w-4 h-4" />}
                title={t('structFvgTitle')}
                subtitle={t('structFvgSub')}
                accent="blue"
                testid="struct-sec-fvg"
                badge={<Badge tone="primary">{counts.fvgOpen ?? 0}</Badge>}
              >
                <FvgList fvgs={fvgs} />
              </SectionCard>
            )}

            {log.length > 0 && (
              <SectionCard
                icon={<History className="w-4 h-4" />}
                title={`${t('structLogTitle')} · ${tfInterval}`}
                subtitle={t('structLogSub')}
                accent="amber"
                testid="struct-sec-log"
                badge={newInDay > 0
                  ? <Badge tone="primary">{t('structLogNew').replace('{n}', String(newInDay))}</Badge>
                  : <Badge>{log.length}</Badge>}
              >
                <ScanLog log={log} onClear={clearLog} />
              </SectionCard>
            )}

            <SectionCard
              icon={<SlidersHorizontal className="w-4 h-4" />}
              title={t('structDetailTitle')}
              subtitle={t('structDetailSub')}
              testid="struct-sec-detail"
              badge={<Badge>{data.rowsScanned}</Badge>}
            >
              <ScanStats data={data} />
            </SectionCard>
          </div>
        )}

        {/* Estados vacíos: datos insuficientes vs. escaneado y sin estructura. */}
        {data && data.rowsScanned === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground" data-testid="struct-empty">
            {t('structScanEmpty')}
          </div>
        )}
        {nothingFound && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('structScanNoStructure')}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
          {t('structScanNote')}
        </p>
      </CardContent>
    </Card>
  );
};

export default StructureScanner;
