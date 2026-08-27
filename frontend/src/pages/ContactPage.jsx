import { useState } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle, HelpCircle, CreditCard, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import AuroraHeader from '@/components/landing/AuroraHeader';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';
import { useTranslation } from '@/lib/i18n';

// Icono, claves y destino. El texto se resuelve al pintar.
const FAQ_ITEMS = [
  { icon: CreditCard,    qKey: 'contactFaq1Q', aKey: 'contactFaq1A', linkKey: 'contactFaqSubscription', linkHref: '/subscription' },
  { icon: User,          qKey: 'contactFaq2Q', aKey: 'contactFaq2A', linkKey: 'contactFaqRecover',      linkHref: '/forgot-password' },
  { icon: CheckCircle,   qKey: 'contactFaq3Q', aKey: 'contactFaq3A', linkKey: null,                     linkHref: null },
  { icon: HelpCircle,    qKey: 'contactFaq4Q', aKey: 'contactFaq4A', linkKey: 'contactFaqSubscription', linkHref: '/subscription' },
  { icon: MessageSquare, qKey: 'contactFaq5Q', aKey: 'contactFaq5A', linkKey: null,                     linkHref: null },
];

// `value` es lo que viaja en el formulario: no se traduce nunca, o el asunto
// dejaría de ser comparable entre idiomas.
const SUBJECT_OPTIONS = [
  { value: '',            labelKey: 'contactSubjectSelect' },
  { value: 'soporte',     labelKey: 'contactSubjectSupport' },
  { value: 'pago',        labelKey: 'contactSubjectPayment' },
  { value: 'cancelacion', labelKey: 'contactSubjectCancel' },
  { value: 'otro',        labelKey: 'contactSubjectOther' },
];

export default function ContactPage() {
  useSEO({ titleKey: 'seoContactTitle', descriptionKey: 'seoContactDesc', canonicalPath: '/contact' });
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      toast.error(t('contactErrFields'));
      return;
    }

    setSubmitting(true);

    // Simulated submission — no backend required
    setTimeout(() => {
      setSubmitting(false);
      toast.success(t('contactOk'));
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 800);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <AuroraHeader />
      <Header />

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="py-16 px-4 text-center border-b border-border">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Mail className="w-7 h-7 text-primary" />
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              {t('contactHeroTitle')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {/* El plazo va resaltado, así que la frase se parte por {sla}: el
                  orden de las dos mitades lo decide cada idioma, no el JSX. */}
              {t('contactHeroSub').split('{sla}').flatMap((trozo, i) =>
                i === 0
                  ? [trozo]
                  : [
                      <span key={i} className="text-primary font-medium">{t('contactSla')}</span>,
                      trozo,
                    ]
              )}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-16 grid gap-12 md:grid-cols-2">
          {/* Contact form */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">{t('contactFormTitle')}</h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t('contactNameLabel')}</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder={t('contactNamePh')}
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('contactEmailLabel')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t('contactEmailPh')}
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject">{t('contactSubjectLabel')}</Label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                          {t(opt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message">{t('contactMessageLabel')}</Label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      placeholder={t('contactMessagePh')}
                      value={form.message}
                      onChange={handleChange}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? t('contactSending') : t('contactSend')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Direct email note */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span>
                {t('contactDirect')}{' '}
                <a
                  href="mailto:contact@tradingcalculatorpro.com"
                  className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  contact@tradingcalculatorpro.com
                </a>
              </span>
            </div>

            {/* Response time */}
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{t('contactSlaLine', { sla: t('contactSla') })}</span>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">{t('contactFaqTitle')}</h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.qKey} className="bg-card border-border">
                    <CardContent className="pt-5">
                      <div className="flex gap-3">
                        <span className="mt-0.5 shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </span>
                        <div>
                          <p className="font-medium text-sm mb-1">{t(item.qKey)}</p>
                          <p className="text-sm text-muted-foreground">{t(item.aKey)}</p>
                          {item.linkHref && (
                            <a
                              href={item.linkHref}
                              className="inline-block mt-2 text-xs text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                            >
                              {t(item.linkKey)} →
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
