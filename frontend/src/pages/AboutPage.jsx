import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Users, BarChart3, Globe, ArrowRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import AuroraHeader from '@/components/landing/AuroraHeader';
import { useSEO } from '@/hooks/useSEO';
import { Footer } from '@/components/layout/Footer';

const VALUES = [
  {
    icon: Target,
    title: 'Precisión matemática',
    description:
      'Implementamos Black-Scholes real con griegas de primer y segundo orden. Sin aproximaciones ni atajos.',
  },
  {
    icon: Zap,
    title: 'Datos en tiempo real',
    description:
      'Precios de mercado para acciones, cripto, forex y materias primas.',
  },
  {
    icon: Shield,
    title: 'Privacidad primero',
    description:
      'No vendemos tus datos ni los compartimos con terceros. Cumplimiento total con RGPD y legislación europea.',
  },
  {
    icon: Globe,
    title: 'Acceso global',
    description:
      'Interfaz multi-idioma y soporte para activos de mercados internacionales. Donde operes, estamos.',
  },
];

const STATS = [
  { label: 'Calculadoras disponibles', value: '10+' },
  { label: 'Clases de activos', value: '4' },
  { label: 'Datos de mercado', value: 'Tiempo real' },
  { label: 'Cumplimiento', value: 'RGPD' },
];

const TECH_STACK = [
  { name: 'FastAPI', description: 'Backend de alto rendimiento en Python' },
  { name: 'PostgreSQL', description: 'Persistencia y gestión de usuarios' },
  { name: 'React', description: 'Interfaz rápida y reactiva' },
  { name: 'Google Cloud Run', description: 'Infraestructura escalable en la nube' },
];

export default function AboutPage() {
  useSEO({ titleKey: 'seoAboutTitle', descriptionKey: 'seoAboutDesc', canonicalPath: '/about' });
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
              Construido por traders,{' '}
              <span className="text-primary">para traders</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Nuestro objetivo es democratizar el acceso a herramientas institucionales de análisis
              de opciones. Las mismas calculadoras que usan los market makers, ahora en tu
              navegador.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 px-4 border-b border-border bg-card/40">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
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
                Nuestra misión
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-5">¿Por qué existe TradingCalculator.pro?</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Las herramientas profesionales de análisis de opciones han estado históricamente
                reservadas a instituciones con presupuestos de seis cifras. Terminales Bloomberg,
                software propietario, modelos internos — todo fuera del alcance del trader
                independiente.
              </p>
              <p>
                Creamos TradingCalculator.pro para cambiar eso. Tomamos los modelos matemáticos
                exactos — Black-Scholes, griegas completas, análisis de volatilidad implícita — y
                los hicimos accesibles desde cualquier navegador, sin instalaciones, sin licencias
                corporativas.
              </p>
              <p>
                Si operas opciones sobre acciones, crypto, forex o commodities, mereces las mismas
                herramientas que los profesionales.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                Nuestros valores
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-10">Lo que nos guía</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {VALUES.map((value) => {
                const Icon = value.icon;
                return (
                  <Card key={value.title} className="bg-card border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </span>
                        <div>
                          <h3 className="font-semibold mb-1">{value.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {value.description}
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
                Tecnología
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Stack técnico</h2>
            <p className="text-muted-foreground mb-10">
              Construido con tecnología de producción para garantizar velocidad, fiabilidad y
              escalabilidad.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {TECH_STACK.map((tech) => (
                <Card key={tech.name} className="bg-background border-border">
                  <CardContent className="pt-5">
                    <p className="font-semibold text-primary mb-1">{tech.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tech.description}
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
            <h2 className="text-3xl font-bold mb-3">Listo para empezar</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Accede a calculadoras profesionales de opciones hoy mismo. Sin tarjeta de crédito para
              empezar.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">
                  Ver precios
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/register">Empezar gratis</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
