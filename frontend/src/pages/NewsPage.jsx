import { useMemo, useState } from 'react';
import {
  Newspaper, ExternalLink, Filter, Search, Clock, Building2, Bitcoin,
  Landmark, DollarSign, Globe,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import WipSection from '@/components/education/WipSection';

/**
 * NewsPage — headlines only, always linking out to the original source.
 *
 * ⚠️ STATUS: design preview, wrapped in <WipSection> (blurred + "working on it").
 * The layout below is the agreed shape; it is NOT wired to a data source yet.
 *
 * The rows are LAYOUT PLACEHOLDERS, deliberately generic: they describe the
 * kind of event a headline covers, never a specific claim, figure or date. This
 * page must never show invented news — see docs/EXAMEN_FINAL_2026-07-26.md §4.6.
 *
 * When it goes live (Finnhub /news, 60 calls/min free, 5-minute server cache):
 *   - render ONLY headline · source · relative time · category · outbound link
 *   - never the article body (reproducing agency copy is a rights infringement)
 *   - links get rel="noopener nofollow" and target="_blank"
 */

const CATEGORIES = [
  { id: 'all', icon: Globe, key: 'newsCatAll' },
  { id: 'macro', icon: Landmark, key: 'newsCatMacro' },
  { id: 'companies', icon: Building2, key: 'newsCatCompanies' },
  { id: 'crypto', icon: Bitcoin, key: 'newsCatCrypto' },
  { id: 'forex', icon: DollarSign, key: 'newsCatForex' },
];

// Layout placeholders. Structure only — no asserted facts.
const PLACEHOLDER_ROWS = [
  { cat: 'macro', mins: 12, src: 'Reuters' },
  { cat: 'companies', mins: 34, src: 'Bloomberg' },
  { cat: 'crypto', mins: 58, src: 'CoinDesk' },
  { cat: 'forex', mins: 96, src: 'FT' },
  { cat: 'macro', mins: 145, src: 'AP' },
  { cat: 'companies', mins: 190, src: 'CNBC' },
];

const catMeta = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export default function NewsPage() {
  const { t } = useTranslation();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  useSEO({
    title: t('newsSeoTitle'),
    description: t('newsSeoDesc'),
    canonicalPath: '/news',
    noindex: true, // nothing real to index yet
  });

  const rows = useMemo(
    () => PLACEHOLDER_ROWS.filter((r) => cat === 'all' || r.cat === cat),
    [cat]
  );

  const rel = (mins) =>
    mins < 60 ? t('newsMinsAgo', { n: mins }) : t('newsHoursAgo', { n: Math.round(mins / 60) });

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="news-page">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="font-unbounded text-3xl font-bold flex items-center gap-2.5 mb-2">
              <Newspaper className="w-7 h-7 text-primary" />
              {t('newsTitle')}
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">{t('newsIntro')}</p>
          </div>

          <WipSection message={t('newsWipMessage')}>
            <div className="space-y-5">
              {/* Filters */}
              <Card className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(({ id, icon: Icon, key }) => (
                      <button
                        key={id}
                        onClick={() => setCat(id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          cat === id
                            ? 'bg-primary/15 text-primary border-primary/40'
                            : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {t(key)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={t('newsSearchPlaceholder')}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Filter className="w-3 h-3" />
                    {t('newsFilterHint')}
                  </div>
                </CardContent>
              </Card>

              {/* Headline list */}
              <ul className="space-y-2.5">
                {rows.map((r, i) => {
                  const meta = catMeta(r.cat);
                  const Icon = meta.icon;
                  return (
                    <li key={`${r.cat}-${i}`}>
                      <Card className="bg-card border-border hover:border-primary/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h2 className="text-sm font-semibold leading-snug mb-1.5">
                                {t('newsSampleHeadline', { cat: t(meta.key) })}
                              </h2>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground">{r.src}</span>
                                <span aria-hidden="true">·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {rel(r.mins)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <Badge variant="secondary" className="text-[10px]">{t(meta.key)}</Badge>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>

              <div className="text-center">
                <Button variant="outline" size="sm">{t('newsLoadMore')}</Button>
              </div>
            </div>
          </WipSection>

          {/* Editorial policy — this stays visible, it is a real commitment */}
          <Card className="bg-card border-border mt-6">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-2">{t('newsPolicyTitle')}</h2>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <li>• {t('newsPolicy1')}</li>
                <li>• {t('newsPolicy2')}</li>
                <li>• {t('newsPolicy3')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
