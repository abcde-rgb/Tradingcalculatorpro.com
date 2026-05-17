import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Cookie } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const TABS = [
  { id: 'privacy', label: 'Política de Privacidad', icon: Shield },
  { id: 'terms',   label: 'Términos de Uso',        icon: FileText },
  { id: 'cookies', label: 'Política de Cookies',    icon: Cookie },
];

const LAST_UPDATE = 'Mayo 2026';

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de tus datos personales es <strong className="text-foreground">TradingCalculator.pro</strong>,
          con dirección de contacto: <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">contact@tradingcalculator.pro</a>.
        </p>
      </Section>

      <Section title="2. Datos que recogemos">
        <p>Recogemos únicamente los datos necesarios para prestarte el servicio:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong className="text-foreground">Datos de cuenta:</strong> nombre, dirección de email y contraseña (cifrada con bcrypt).</li>
          <li><strong className="text-foreground">Datos de pago:</strong> gestionados íntegramente por Stripe. Nunca almacenamos números de tarjeta ni datos bancarios completos.</li>
          <li><strong className="text-foreground">Datos de uso:</strong> trades guardados en el diario, cálculos, alertas de precio y posiciones de opciones que tú mismo introduces.</li>
          <li><strong className="text-foreground">Datos técnicos:</strong> logs de acceso (IP, user-agent) durante 90 días con fines de seguridad.</li>
          <li><strong className="text-foreground">Google OAuth:</strong> si inicias sesión con Google, recibimos tu nombre, email y foto de perfil de Google.</li>
        </ul>
      </Section>

      <Section title="3. Base legal del tratamiento">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Ejecución de contrato</strong> (RGPD Art. 6.1.b): tratamos tus datos para prestarte el servicio contratado.</li>
          <li><strong className="text-foreground">Consentimiento</strong> (RGPD Art. 6.1.a): para el envío de emails opcionales de alertas de precio.</li>
          <li><strong className="text-foreground">Interés legítimo</strong> (RGPD Art. 6.1.f): para la seguridad y prevención de fraude.</li>
          <li><strong className="text-foreground">Obligación legal</strong> (RGPD Art. 6.1.c): conservamos datos de facturación según la normativa fiscal aplicable.</li>
        </ul>
      </Section>

      <Section title="4. Con quién compartimos tus datos">
        <p>No vendemos ni cedemos tus datos a terceros. Solo los compartimos con proveedores de servicio bajo contrato:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong className="text-foreground">Stripe Inc.</strong> — procesador de pagos. <a href="https://stripe.com/es/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline">Política de Stripe</a></li>
          <li><strong className="text-foreground">Google LLC</strong> — autenticación OAuth y analíticas anónimas (Google Analytics 4). <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline">Política de Google</a></li>
          <li><strong className="text-foreground">Twilio SendGrid</strong> — envío de emails transaccionales (confirmaciones, alertas).</li>
          <li><strong className="text-foreground">Google Cloud (GCP)</strong> — alojamiento de la aplicación en Europa (región europe-west1, Bélgica).</li>
        </ul>
      </Section>

      <Section title="5. Transferencias internacionales">
        <p>
          Google LLC y Stripe Inc. están establecidos en EE.UU. Las transferencias se amparan en las
          Cláusulas Contractuales Tipo (CCT) aprobadas por la Comisión Europea y en el marco
          EU-U.S. Data Privacy Framework. Los servidores de base de datos se encuentran en la UE (Bélgica).
        </p>
      </Section>

      <Section title="6. Plazos de conservación">
        <ul className="list-disc pl-5 space-y-1">
          <li>Datos de cuenta: hasta que solicites la eliminación.</li>
          <li>Logs técnicos de acceso: 90 días.</li>
          <li>Datos de facturación: 10 años (obligación fiscal suiza/europea).</li>
          <li>Tokens de sesión revocados: eliminados automáticamente tras 24 horas.</li>
        </ul>
      </Section>

      <Section title="7. Tus derechos (RGPD y DSG suizo)">
        <p>Tienes derecho a:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong className="text-foreground">Acceso:</strong> obtener una copia de tus datos.</li>
          <li><strong className="text-foreground">Rectificación:</strong> corregir datos inexactos desde tu perfil o contactándonos.</li>
          <li><strong className="text-foreground">Supresión:</strong> eliminar tu cuenta y datos desde Ajustes → Eliminar cuenta.</li>
          <li><strong className="text-foreground">Portabilidad:</strong> exportar tus datos en formato CSV desde el panel de Performance.</li>
          <li><strong className="text-foreground">Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
          <li><strong className="text-foreground">Limitación:</strong> solicitar que restrinjamos el tratamiento.</li>
        </ul>
        <p className="mt-3">
          Para ejercer tus derechos, escríbenos a{' '}
          <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">contact@tradingcalculator.pro</a>.
          Respondemos en menos de 30 días. También puedes presentar una reclamación ante la autoridad de
          control de tu país (en España: <a href="https://www.aepd.es" target="_blank" rel="noreferrer" className="text-primary hover:underline">AEPD</a>;
          en Suiza: <a href="https://www.edoeb.admin.ch" target="_blank" rel="noreferrer" className="text-primary hover:underline">PFPDT</a>).
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas apropiadas: cifrado en tránsito (HTTPS/TLS),
          contraseñas cifradas con bcrypt, tokens JWT con expiración de 24 h y revocación inmediata al
          cerrar sesión, rate limiting en endpoints de autenticación, y base de datos en infraestructura
          privada de Google Cloud.
        </p>
      </Section>

      <div className="mt-10 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          ¿Preguntas sobre privacidad?{' '}
          <Link to="/contact" className="text-primary hover:underline font-medium">Contáctanos</Link>
          {' '}y respondemos en menos de 48 horas laborables.
        </p>
      </div>
    </>
  );
}

function TermsOfUse() {
  return (
    <>
      <Section title="1. Objeto y aceptación">
        <p>
          Los presentes Términos de Uso regulan el acceso y uso de la plataforma TradingCalculator.pro
          (en adelante, "el Servicio"). Al registrarte o usar el Servicio, aceptas estos términos en su
          totalidad. Si no estás de acuerdo, no uses el Servicio.
        </p>
      </Section>

      <Section title="2. Descripción del servicio">
        <p>
          TradingCalculator.pro es una plataforma de <strong className="text-foreground">herramientas de análisis financiero</strong> que incluye
          calculadoras de opciones (Black-Scholes, griegos), simulaciones (Monte Carlo, backtesting),
          diario de trading, alertas de precio y datos de mercado en tiempo real.
        </p>
        <p className="mt-2 font-medium text-foreground">
          ⚠️ Aviso importante: el Servicio proporciona información y herramientas de análisis. NO
          constituye asesoramiento de inversión, recomendación de compra o venta, ni servicio regulado
          financieramente. Los resultados pasados no garantizan resultados futuros. Inviertes bajo tu
          propia responsabilidad.
        </p>
      </Section>

      <Section title="3. Registro y cuenta">
        <p>
          Para acceder a funciones de pago debes crear una cuenta con datos verídicos. Eres responsable
          de mantener la confidencialidad de tu contraseña. Notifícanos inmediatamente cualquier uso no
          autorizado en <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">contact@tradingcalculator.pro</a>.
        </p>
      </Section>

      <Section title="4. Planes de suscripción y pagos">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-foreground">Planes disponibles:</strong> Mensual (€17/mes), Trimestral (€45/trimestre), Anual (€200/año) y De Por Vida (€500, pago único).</li>
          <li><strong className="text-foreground">Facturación:</strong> los planes recurrentes se renuevan automáticamente. Puedes cancelar en cualquier momento desde Cuenta → Mi Suscripción; no se realizarán más cargos tras la cancelación.</li>
          <li><strong className="text-foreground">Reembolsos:</strong> tienes 14 días naturales desde el primer pago para solicitar reembolso completo en planes mensual, trimestral y anual, siempre que no hayas realizado uso significativo del servicio. El plan De Por Vida no es reembolsable salvo defecto grave del servicio.</li>
          <li><strong className="text-foreground">Impuestos:</strong> los precios incluyen IVA donde aplique según la normativa europea.</li>
          <li><strong className="text-foreground">Pagos:</strong> procesados por Stripe. Aceptamos tarjeta de crédito/débito, SEPA y Klarna (plan De Por Vida).</li>
        </ul>
      </Section>

      <Section title="5. Uso permitido y prohibido">
        <p>Puedes usar el Servicio para tu análisis personal de trading. Está prohibido:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Revender, sublicenciar o redistribuir el Servicio o sus datos.</li>
          <li>Realizar scraping, crawling o extracción masiva de datos.</li>
          <li>Intentar acceder a cuentas de otros usuarios o a la infraestructura del sistema.</li>
          <li>Usar el Servicio para actividades ilegales o que infrinjan derechos de terceros.</li>
          <li>Eludir medidas de seguridad o realizar ingeniería inversa del software.</li>
        </ul>
      </Section>

      <Section title="6. Propiedad intelectual">
        <p>
          Todo el software, diseño, contenido educativo y código fuente de TradingCalculator.pro son
          propiedad exclusiva de sus creadores y están protegidos por derechos de autor. Se te concede
          una licencia personal, no exclusiva e intransferible para usar el Servicio según estos Términos.
        </p>
      </Section>

      <Section title="7. Disponibilidad y cambios">
        <p>
          Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos disponibilidad
          ininterrumpida. Podemos modificar, suspender o discontinuar funciones con aviso previo razonable.
          Los cambios en Términos se comunicarán por email con al menos 15 días de antelación.
        </p>
      </Section>

      <Section title="8. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, TradingCalculator.pro no será responsable de pérdidas
          financieras derivadas de decisiones de inversión tomadas con base en las herramientas del Servicio.
          Nuestra responsabilidad total ante ti no superará el importe pagado en los últimos 12 meses.
        </p>
      </Section>

      <Section title="9. Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por el derecho suizo. Para resolución de disputas, intentaremos
          primero una solución amistosa. Si no es posible, la jurisdicción competente será la de Suiza,
          sin perjuicio de los derechos que la normativa de consumidores de la UE te otorgue en tu país
          de residencia.
        </p>
      </Section>
    </>
  );
}

function CookiePolicy() {
  return (
    <>
      <Section title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que un sitio web almacena en tu navegador.
          Usamos cookies de forma muy limitada, priorizando tu privacidad.
        </p>
      </Section>

      <Section title="2. Cookies que usamos">
        <div className="space-y-4 mt-2">
          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="font-medium text-foreground mb-1">✅ Cookies técnicas (esenciales)</p>
            <p>Necesarias para el funcionamiento del Servicio. No requieren consentimiento.</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong className="text-foreground">btc-auth-storage:</strong> tu sesión de usuario (token JWT) — expira en 24 h.</li>
              <li><strong className="text-foreground">btc-theme:</strong> preferencia de tema oscuro/claro — sin expiración.</li>
              <li><strong className="text-foreground">btc-lang:</strong> preferencia de idioma — sin expiración.</li>
              <li><strong className="text-foreground">tcp-preferences:</strong> preferencias de notificaciones y modo compacto — sin expiración.</li>
            </ul>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="font-medium text-foreground mb-1">📊 Cookies analíticas (opcionales)</p>
            <p>Solo si aceptas. Usamos Google Analytics 4 con anonimización de IP activada.</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong className="text-foreground">_ga, _ga_*:</strong> identificador de sesión analítica de Google — duración 13 meses.</li>
            </ul>
            <p className="mt-2">
              Puedes optar por no participar instalando el{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                complemento de inhabilitación de Google Analytics
              </a>.
            </p>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="font-medium text-foreground mb-1">🚫 Cookies de publicidad</p>
            <p>No usamos ninguna cookie de publicidad, tracking comportamental ni retargeting.</p>
          </div>
        </div>
      </Section>

      <Section title="3. Cookies de terceros">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Google (OAuth):</strong> si inicias sesión con Google, Google puede establecer sus propias cookies según su política.</li>
          <li><strong className="text-foreground">Stripe:</strong> cuando accedes a la página de pago de Stripe, Stripe puede establecer cookies según su política de privacidad.</li>
        </ul>
        <p className="mt-2">Estas cookies están sujetas a las políticas de privacidad de sus respectivos proveedores.</p>
      </Section>

      <Section title="4. Cómo gestionar las cookies">
        <p>Puedes controlar o eliminar las cookies desde tu navegador:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-que-los-sitios-we" target="_blank" rel="noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" className="text-primary hover:underline">Safari</a></li>
          <li><a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
        </ul>
        <p className="mt-2">
          Ten en cuenta que desactivar las cookies técnicas puede impedir el correcto funcionamiento de
          la sesión y las preferencias de la aplicación.
        </p>
      </Section>

      <Section title="5. Actualización de esta política">
        <p>
          Podemos actualizar esta política de cookies cuando cambiemos nuestras prácticas. Te notificaremos
          por email ante cambios relevantes. La fecha de la última actualización aparece siempre al inicio
          de esta página.
        </p>
      </Section>

      <div className="mt-10 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          ¿Preguntas sobre el uso de cookies?{' '}
          <Link to="/contact" className="text-primary hover:underline font-medium">Contáctanos</Link>.
        </p>
      </div>
    </>
  );
}

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('privacy');

  const ActiveContent = {
    privacy: PrivacyPolicy,
    terms:   TermsOfUse,
    cookies: CookiePolicy,
  }[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Información Legal</h1>
          <p className="text-muted-foreground">
            Última actualización: {LAST_UPDATE}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'outline'}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content */}
        <Card className="bg-card border-border">
          <CardContent className="pt-8 pb-8 px-6 md:px-10">
            <ActiveContent />
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
