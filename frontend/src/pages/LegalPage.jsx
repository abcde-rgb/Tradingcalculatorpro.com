import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, FileText, Cookie, ChevronRight, AlertTriangle, Languages } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useTranslation } from '@/lib/i18n';
import { getLegalContent } from '@/lib/legalContent';

const CONTACT_EMAIL = 'contact@tradingcalculatorpro.com';

// ---------------------------------------------------------------------------
// Rich-text renderer for the legal content files. Supports:
//   **bold**  ·  [label](https://url)  ·  {email}  ·  {terms}
// ---------------------------------------------------------------------------
const TOKEN_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\{email\}|\{terms\})/g;

function Rich({ text, termsLabel }) {
  const parts = String(text).split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return (
            <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline break-words">{link[1]}</a>
          );
        }
        if (part === '{email}') {
          return (
            <a key={i} href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline break-words">
              {CONTACT_EMAIL}
            </a>
          );
        }
        if (part === '{terms}') {
          return (
            <Link key={i} to="/legal?tab=terms" className="text-primary hover:underline">{termsLabel}</Link>
          );
        }
        return part;
      })}
    </>
  );
}

function SectionTitle({ number, title }) {
  return (
    <h3 className="text-base font-bold text-foreground mt-6 mb-2">
      {number}. {title}
    </h3>
  );
}

function StatCallout({ figure, children }) {
  return (
    <div className="flex gap-4 items-start rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-3">
      <div className="text-2xl sm:text-3xl font-extrabold text-destructive shrink-0 leading-none min-w-[4.5rem]">
        {figure}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Block({ block, termsLabel }) {
  if (block.p) {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
        <Rich text={block.p} termsLabel={termsLabel} />
      </p>
    );
  }
  if (block.list) {
    return (
      <ul className="list-disc list-inside space-y-1 mb-3">
        {block.list.map((item, i) => (
          <li key={i} className="text-muted-foreground text-sm leading-relaxed">
            <Rich text={item} termsLabel={termsLabel} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.table) {
    const { head, rows } = block.table;
    return (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              {head.map((h, i) => (
                <th key={i} className="text-start py-2 pe-4 text-foreground font-semibold text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-border/50">
                {row.map((cell, c) => (
                  <td key={c} className={`py-2 pe-4 text-muted-foreground text-xs ${c === 0 ? 'font-mono' : ''}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.stat) {
    return (
      <StatCallout figure={block.stat.fig}>
        <Rich text={block.stat.text} termsLabel={termsLabel} />
      </StatCallout>
    );
  }
  return null;
}

function LegalDocument({ doc, meta, icon: Icon, iconClass, termsLabel }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${iconClass === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          <Icon className={`h-6 w-6 ${iconClass === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{doc.title}</h2>
          <p className="text-xs text-muted-foreground">{meta.updatedLabel}: {meta.updated}</p>
        </div>
      </div>

      {meta.courtesy && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 mb-5">
          <Languages className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{meta.courtesy}</p>
        </div>
      )}

      {doc.sections.map((section, i) => (
        <div key={i}>
          <SectionTitle number={i + 1} title={section.t} />
          {section.b.map((block, j) => (
            <Block key={j} block={block} termsLabel={termsLabel} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const VALID_TABS = ['privacy', 'terms', 'cookies', 'risk'];

const TAB_META = {
  privacy: { icon: Shield, iconClass: 'primary' },
  terms:   { icon: FileText, iconClass: 'primary' },
  cookies: { icon: Cookie, iconClass: 'primary' },
  risk:    { icon: AlertTriangle, iconClass: 'destructive' },
};

export default function LegalPage() {
  useSEO({ titleKey: 'seoLegalTitle', descriptionKey: 'seoLegalDesc', canonicalPath: '/legal' });
  const { t, locale } = useTranslation();
  const content = getLegalContent(locale);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'privacy';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(value === 'privacy' ? {} : { tab: value }, { replace: true });
  };

  const termsLabel = content.terms.title;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Page header */}
        <div className="mb-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{t('legalCenterTitle')}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mx-auto">
            {t('legalCenterDesc')}
          </p>
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full mb-8 h-auto flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
            {VALID_TABS.map((tab) => {
              const Icon = TAB_META[tab].icon;
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{content[tab].title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {VALID_TABS.map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card className="bg-card border-border">
                <CardContent className="p-6 sm:p-8">
                  <LegalDocument
                    doc={content[tab]}
                    meta={content.meta}
                    icon={TAB_META[tab].icon}
                    iconClass={TAB_META[tab].iconClass}
                    termsLabel={termsLabel}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <Card className="bg-card border-border w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground mb-2">
                {t('legalCtaTitle')}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t('legalCtaDesc')}
              </p>
              <Button asChild className="w-full sm:w-auto gap-2">
                <Link to="/contact">
                  {t('legalCtaButton')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
