import { useState } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle, HelpCircle, CreditCard, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import AuroraHeader from '@/components/landing/AuroraHeader';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';

const FAQ_ITEMS = [
  {
    icon: CreditCard,
    question: '¿Cómo cancelo mi suscripción?',
    answer: 'Puedes cancelar en cualquier momento desde tu panel de suscripción.',
    linkText: 'Ir a Mi Suscripción',
    linkHref: '/subscription',
  },
  {
    icon: User,
    question: '¿Cómo recupero mi contraseña?',
    answer: 'Usa el enlace de recuperación en la pantalla de inicio de sesión.',
    linkText: 'Recuperar contraseña',
    linkHref: '/forgot-password',
  },
  {
    icon: CheckCircle,
    question: '¿Aceptan reembolsos?',
    answer:
      'Sí. Ofrecemos reembolso completo dentro de los primeros 14 días en planes mensuales y anuales. Los planes lifetime no son reembolsables.',
    linkText: null,
    linkHref: null,
  },
  {
    icon: HelpCircle,
    question: '¿Puedo cambiar de plan?',
    answer:
      'Sí, puedes actualizar o cambiar tu plan en cualquier momento desde la sección Mi Suscripción.',
    linkText: 'Ir a Mi Suscripción',
    linkHref: '/subscription',
  },
  {
    icon: MessageSquare,
    question: '¿Los datos de mercado son en tiempo real?',
    answer:
      'Sí. Utilizamos fuentes en tiempo real (yfinance, CoinGecko) para acciones, crypto, forex y commodities.',
    linkText: null,
    linkHref: null,
  },
];

const SUBJECT_OPTIONS = [
  { value: '', label: 'Selecciona un asunto' },
  { value: 'soporte', label: 'Soporte técnico' },
  { value: 'pago', label: 'Problema de pago' },
  { value: 'cancelacion', label: 'Cancelación' },
  { value: 'otro', label: 'Otro' },
];

export default function ContactPage() {
  useSEO({ titleKey: 'seoContactTitle', descriptionKey: 'seoContactDesc', canonicalPath: '/contact' });
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
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setSubmitting(true);

    // Simulated submission — no backend required
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Mensaje enviado. Te responderemos en 24-48 h laborables.');
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
              ¿En qué podemos ayudarte?
            </h1>
            <p className="text-muted-foreground text-lg">
              Escríbenos y te responderemos en menos de{' '}
              <span className="text-primary font-medium">48 horas laborables</span>.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-16 grid gap-12 md:grid-cols-2">
          {/* Contact form */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Envíanos un mensaje</h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Tu nombre"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Asunto</Label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message">Mensaje</Label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      placeholder="Describe tu consulta con el mayor detalle posible..."
                      value={form.message}
                      onChange={handleChange}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Enviando...' : 'Enviar mensaje'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Direct email note */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span>
                O escríbenos directamente a{' '}
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
              <span>Respondemos en menos de 48 horas laborables</span>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.question} className="bg-card border-border">
                    <CardContent className="pt-5">
                      <div className="flex gap-3">
                        <span className="mt-0.5 shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </span>
                        <div>
                          <p className="font-medium text-sm mb-1">{item.question}</p>
                          <p className="text-sm text-muted-foreground">{item.answer}</p>
                          {item.linkHref && (
                            <a
                              href={item.linkHref}
                              className="inline-block mt-2 text-xs text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                            >
                              {item.linkText} →
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
