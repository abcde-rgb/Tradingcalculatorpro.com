import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Users, BarChart3, Globe, ArrowRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import AuroraHeader from '@/components/landing/AuroraHeader';
import { useSEO } from '@/hooks/useSEO';
import { useTranslation } from '@/lib/i18n';
import { Footer } from '@/components/layout/Footer';

// Sólo el icono y las CLAVES: el texto se resuelve dentro del componente, que
// es donde se sabe en qué idioma se está pintando.
const VALUES = [
  { icon: Target, titleKey: 'aboutValuePrecision', descKey: 'aboutValuePrecisionDesc' },
  { icon: Zap,    titleKey: 'aboutValueRealtime',  descKey: 'aboutValueRealtimeDesc' },
  { icon: Shield, titleKey: 'aboutValuePrivacy',   descKey: 'aboutValuePrivacyDesc' },
  { icon: Globe,  titleKey: 'aboutValueGlobal',    descKey: 'aboutValueGlobalDesc' },
];

// `value` va crudo cuando es una cifra (no es idioma); cuando es palabra lleva
// clave, porque «Tiempo real» y «RGPD» sí cambian: en alemán es «DSGVO».
const STATS = [
  { labelKey: 'aboutStatCalcs',      value: '10+' },
  { labelKey: 'aboutStatAssets',     value: '4' },
  { labelKey: 'aboutStatData',       valueKey: 'aboutStatDataValue' },
  { labelKey: 'aboutStatCompliance', valueKey: 'aboutStatComplianceValue' },
];

const TECH_STACK = [
  { name: 'FastAPI',          descKey: 'aboutTechFastapi' },
  { name: 'PostgreSQL',       descKey: 'aboutTechPostgres' },
  { name: 'React',            descKey: 'aboutTechReact' },
  { name: 'Google Cloud Run', descKey: 'aboutTechCloudrun' },
];

export default function AboutPage() {
  useSEO({ titleKey: 'seoAboutTitle', descriptionKey: 'seoAboutDesc', canonicalPath: '/about' });
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <AuroraHeader />
      <Header />

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="py-20 px-4 text-center border-b border-border">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <TrendingUp className="w-8 h-8 text-primary" />
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
              {t('aboutHeroA')}{' '}
              <span className="text-primary">{t('aboutHeroB')}</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              {t('aboutHeroSub')}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 px-4 border-b border-border bg-card/40">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {stat.valueKey ? t(stat.valueKey) : stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-4 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t('aboutMissionEyebrow')}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-5">{t('aboutMissionTitle')}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>{t('aboutMissionP1')}</p>
              <p>{t('aboutMissionP2')}</p>
              <p>{t('aboutMissionP3')}</p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t('aboutValuesEyebrow')}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-10">{t('aboutValuesTitle')}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {VALUES.map((value) => {
                const Icon = value.icon;
                return (
                  <Card key={value.titleKey} className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </span>
                        <div>
                          <h3 className="font-semibold mb-1">{t(value.titleKey)}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t(value.descKey)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="py-16 px-4 border-b border-border bg-card/40">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t('aboutTechEyebrow')}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-2">{t('aboutTechTitle')}</h2>
            <p className="text-muted-foreground mb-10">{t('aboutTechSub')}</p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {TECH_STACK.map((tech) => (
                <Card key={tech.name} className="bg-background border-border">
                  <CardContent className="pt-5">
                    <p className="font-semibold text-primary mb-1">{tech.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(tech.descKey)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-3">{t('aboutCtaTitle')}</h2>
            <p className="text-muted-foreground mb-8 text-lg">{t('aboutCtaSub')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">
                  {t('viewPlans')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/register">{t('getStarted')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
