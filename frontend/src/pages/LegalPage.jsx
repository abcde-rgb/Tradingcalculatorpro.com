import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, FileText, Cookie, ChevronRight } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const LAST_UPDATED = 'Mayo 2026';

function SectionTitle({ number, title }) {
  return (
    <h3 className="text-base font-bold text-foreground mt-6 mb-2">
      {number}. {title}
    </h3>
  );
}

function Para({ children }) {
  return (
    <p className="text-muted-foreground text-sm leading-relaxed mb-3">{children}</p>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 mb-3">
      {items.map((item, i) => (
        <li key={i} className="text-muted-foreground text-sm leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------
function PrivacyPolicy() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Política de Privacidad</h2>
          <p className="text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>
        </div>
      </div>

      <SectionTitle number={1} title="Responsable del Tratamiento" />
      <Para>
        El responsable del tratamiento de tus datos personales es{' '}
        <strong className="text-foreground">TradingCalculator.pro</strong>, con sede en Suiza.
        Para cualquier consulta sobre privacidad, contáctanos en{' '}
        <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">
          contact@tradingcalculator.pro
        </a>.
      </Para>

      <SectionTitle number={2} title="Datos que Recogemos" />
      <Para>Recogemos únicamente los datos necesarios para prestarte el servicio:</Para>
      <List items={[
        'Datos de identificación: nombre y dirección de correo electrónico, proporcionados durante el registro o mediante autenticación con Google (OAuth).',
        'Datos de uso: páginas visitadas, funcionalidades utilizadas (calculadora de opciones, simulaciones, seguimiento de precios), preferencias de tema e idioma.',
        'Datos de pago: procesados íntegramente por Stripe. Nunca almacenamos números de tarjeta ni datos bancarios en nuestros servidores. Solo conservamos el identificador de cliente de Stripe y el estado de la suscripción.',
        'Registros técnicos (logs): dirección IP, tipo de navegador y sistema operativo, con fines de seguridad y diagnóstico.',
        'Datos de alertas de precio: pares de activos y umbrales configurados, únicamente si activas esta funcionalidad.',
      ]} />

      <SectionTitle number={3} title="Finalidad del Tratamiento" />
      <Para>Tratamos tus datos para las siguientes finalidades:</Para>
      <List items={[
        'Prestación del servicio: gestión de tu cuenta, acceso a las herramientas de la plataforma (calculadora de opciones, precios en tiempo real, simulaciones) y personalización de la experiencia.',
        'Facturación y gestión de suscripciones: procesamiento de pagos recurrentes, gestión de planes (€17/mes, €45/trimestre, €200/año, €500 de por vida) y emisión de facturas.',
        'Comunicaciones transaccionales: envío de confirmaciones de pago, avisos de renovación y notificaciones de alertas de precio configuradas por el usuario, mediante Sendgrid.',
        'Seguridad y prevención del fraude: detección de accesos no autorizados y protección de la integridad del servicio.',
        'Análisis del uso del servicio (con tu consentimiento): mediante Google Analytics 4 con anonimización de IP, para mejorar las funcionalidades de la plataforma.',
      ]} />

      <SectionTitle number={4} title="Base Legal del Tratamiento (RGPD)" />
      <Para>
        El tratamiento de tus datos se fundamenta en las siguientes bases legales conforme al Reglamento
        General de Protección de Datos (RGPD) y la Ley Federal Suiza de Protección de Datos (nDSG):
      </Para>
      <List items={[
        'Art. 6(1)(b) RGPD — Ejecución de un contrato: el tratamiento es necesario para prestarte el servicio contratado, gestionar tu suscripción y procesar los pagos.',
        'Art. 6(1)(a) RGPD — Consentimiento: para el uso de cookies analíticas (Google Analytics 4) y el envío de comunicaciones de marketing opcionales. Puedes retirar tu consentimiento en cualquier momento.',
        'Art. 6(1)(c) RGPD — Obligación legal: conservación de datos de facturación según la legislación fiscal aplicable.',
        'Art. 6(1)(f) RGPD — Interés legítimo: para fines de seguridad del servicio y prevención del fraude.',
      ]} />

      <SectionTitle number={5} title="Terceros que Reciben tus Datos" />
      <Para>
        Compartimos datos con los siguientes proveedores de servicios, únicamente en la medida necesaria
        para la prestación del servicio:
      </Para>
      <List items={[
        'Stripe, Inc. (pagos): procesa todos los pagos de suscripción. Stripe actúa como responsable independiente del tratamiento para los datos de pago. Política de privacidad: stripe.com/privacy.',
        'Google LLC (OAuth y Analytics): la autenticación con Google OAuth transfiere nombre y correo electrónico. Google Analytics 4 se usa con anonimización de IP activada y solo si otorgas tu consentimiento. Política de privacidad: policies.google.com/privacy.',
        'Twilio Sendgrid (email transaccional): utilizado para el envío de correos de confirmación, facturas y alertas. Solo recibe tu dirección de email.',
      ]} />
      <Para>
        Todos los proveedores están sujetos a acuerdos de procesamiento de datos (DPA) conforme al RGPD
        o cuentan con mecanismos de transferencia internacional adecuados (cláusulas contractuales tipo).
        TradingCalculator.pro no actúa como encargado del tratamiento para terceros (DPA no aplicable en
        esa dirección).
      </Para>

      <SectionTitle number={6} title="Tus Derechos como Interesado (RGPD)" />
      <Para>
        Conforme al RGPD y la normativa suiza de protección de datos, dispones de los siguientes derechos:
      </Para>
      <List items={[
        'Derecho de acceso (Art. 15 RGPD): puedes solicitar una copia de los datos personales que tratamos sobre ti.',
        'Derecho de rectificación (Art. 16 RGPD): puedes corregir datos inexactos o incompletos en cualquier momento desde los ajustes de tu cuenta.',
        'Derecho de supresión (Art. 17 RGPD): puedes solicitar la eliminación de tu cuenta y de tus datos personales, salvo que exista obligación legal de conservación.',
        'Derecho a la portabilidad de datos (Art. 20 RGPD): puedes solicitar una exportación de tus datos en formato estructurado y legible por máquina.',
        'Derecho de oposición (Art. 21 RGPD): puedes oponerte al tratamiento basado en interés legítimo en cualquier momento.',
        'Derecho a retirar el consentimiento: si el tratamiento se basa en tu consentimiento, puedes retirarlo en cualquier momento sin que ello afecte a la licitud del tratamiento previo.',
        'Derecho a reclamar ante la autoridad de control: en la UE, ante la autoridad de tu país de residencia; en Suiza, ante el Comisionado Federal de Protección de Datos e Información (PFPDT).',
      ]} />
      <Para>
        Para ejercer cualquiera de estos derechos, envía un correo a{' '}
        <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">
          contact@tradingcalculator.pro
        </a>{' '}
        indicando el derecho que deseas ejercer. Respondemos en un plazo máximo de 30 días.
      </Para>

      <SectionTitle number={7} title="Plazos de Conservación" />
      <List items={[
        'Datos de cuenta (nombre, email, preferencias): conservados mientras la cuenta esté activa. Eliminados dentro de los 30 días siguientes a la solicitud de baja.',
        'Registros técnicos (logs): 90 días, con fines de seguridad y diagnóstico.',
        'Datos de pago y facturación: conservados durante 10 años conforme a la legislación fiscal suiza y europea.',
        'Datos analíticos (Google Analytics 4): máximo 14 meses, con IP anonimizada.',
      ]} />

      <SectionTitle number={8} title="Seguridad de los Datos" />
      <Para>
        Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos personales frente a
        acceso no autorizado, pérdida o divulgación. Esto incluye cifrado en tránsito (TLS/HTTPS), control
        de acceso basado en roles y auditorías periódicas de seguridad. Los pagos están protegidos por la
        infraestructura PCI DSS de Stripe.
      </Para>

      <SectionTitle number={9} title="Transferencias Internacionales" />
      <Para>
        Algunos proveedores (Google, Stripe, Sendgrid) pueden procesar datos fuera del Espacio Económico
        Europeo o Suiza. En tales casos, nos aseguramos de que existan garantías adecuadas, como cláusulas
        contractuales tipo aprobadas por la Comisión Europea o mecanismos equivalentes reconocidos por la
        legislación suiza.
      </Para>

      <SectionTitle number={10} title="Cookies" />
      <Para>
        Utilizamos cookies y tecnologías similares. Para más detalles, consulta nuestra Política de Cookies
        en la pestaña correspondiente de esta misma página.
      </Para>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Terms of Use
// ---------------------------------------------------------------------------
function TermsOfUse() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Términos de Uso</h2>
          <p className="text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>
        </div>
      </div>

      <SectionTitle number={1} title="Aceptación de los Términos" />
      <Para>
        Al acceder y utilizar TradingCalculator.pro (en adelante, "el Servicio"), aceptas quedar vinculado
        por estos Términos de Uso. Si no estás de acuerdo con alguna de las condiciones aquí establecidas,
        debes abstenerte de usar el Servicio. Estos términos constituyen un acuerdo legalmente vinculante
        entre tú y TradingCalculator.pro, con sede en Suiza.
      </Para>

      <SectionTitle number={2} title="Naturaleza del Servicio — No es Asesoramiento Financiero" />
      <Para>
        TradingCalculator.pro es una plataforma de herramientas de información financiera que incluye
        calculadoras de opciones (Black-Scholes, griegas), precios de activos en tiempo real y simulaciones
        de estrategias. El Servicio tiene carácter exclusivamente informativo y educativo.
      </Para>
      <Para>
        <strong className="text-foreground">
          AVISO IMPORTANTE: TradingCalculator.pro NO proporciona asesoramiento financiero, de inversión,
          fiscal ni legal. El contenido de la plataforma no debe interpretarse como una recomendación de
          compra, venta o mantenimiento de ningún instrumento financiero.
        </strong>
      </Para>
      <Para>
        Los resultados pasados no garantizan ni predicen resultados futuros. Toda inversión en instrumentos
        financieros, incluidas las opciones, conlleva un riesgo significativo de pérdida, pudiendo perder
        el capital invertido en su totalidad. Eres el único responsable de tus decisiones de inversión.
        Consulta a un asesor financiero profesional antes de operar.
      </Para>

      <SectionTitle number={3} title="Registro y Cuenta de Usuario" />
      <Para>
        Para acceder a las funcionalidades de la plataforma es necesario crear una cuenta. Eres responsable
        de mantener la confidencialidad de tus credenciales y de todas las actividades que se realicen bajo
        tu cuenta. Notifícanos inmediatamente cualquier uso no autorizado en{' '}
        <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">
          contact@tradingcalculator.pro
        </a>.
        Debes tener al menos 18 años para registrarte y usar el Servicio.
      </Para>

      <SectionTitle number={4} title="Planes de Suscripción y Pagos" />
      <Para>Los planes disponibles son:</Para>
      <List items={[
        'Plan Mensual: €17/mes, renovación automática cada mes.',
        'Plan Trimestral: €45/trimestre, renovación automática cada 3 meses.',
        'Plan Anual: €200/año, renovación automática cada 12 meses.',
        'Plan Lifetime (de por vida): €500, pago único, acceso permanente sin renovaciones.',
      ]} />
      <Para>
        Todos los pagos se procesan de forma segura a través de{' '}
        <strong className="text-foreground">Stripe</strong>. Los precios se indican en euros (EUR) e
        incluyen los impuestos aplicables cuando corresponda. Al suscribirte a un plan de renovación
        automática, autorizas los cargos recurrentes en tu método de pago hasta que canceles la suscripción.
        Puedes cancelar en cualquier momento desde la sección "Mi Suscripción" en tu panel de cuenta; el
        acceso se mantiene hasta el final del período de facturación en curso.
      </Para>

      <SectionTitle number={5} title="Política de Reembolsos" />
      <List items={[
        'Plan Mensual (€17/mes): reembolso completo dentro de los primeros 14 días naturales desde la activación, siempre que no hayas realizado uso significativo de las funcionalidades premium.',
        'Plan Trimestral (€45/trimestre): reembolso completo dentro de los primeros 14 días naturales desde la activación, bajo las mismas condiciones.',
        'Plan Anual (€200/año): reembolso completo dentro de los primeros 14 días naturales desde la activación, bajo las mismas condiciones.',
        'Plan Lifetime (€500): no reembolsable. Dado el carácter permanente de este acceso, no se realizarán devoluciones una vez efectuado el pago.',
      ]} />
      <Para>
        Para solicitar un reembolso, contacta con nosotros en{' '}
        <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">
          contact@tradingcalculator.pro
        </a>{' '}
        dentro del plazo aplicable. Los reembolsos se procesan en el método de pago original en un plazo
        de 5 a 10 días hábiles. Esta política no limita los derechos que como consumidor te correspondan
        según la legislación de tu país de residencia en la UE.
      </Para>

      <SectionTitle number={6} title="Propiedad Intelectual" />
      <Para>
        Todo el contenido del Servicio —incluyendo código fuente, algoritmos, diseño de la interfaz,
        textos, gráficos, logotipos y bases de datos— es propiedad exclusiva de TradingCalculator.pro y
        está protegido por las leyes de propiedad intelectual aplicables en Suiza y a nivel internacional.
        Se te concede una licencia limitada, no exclusiva, intransferible y revocable para usar el Servicio
        exclusivamente para tus fines personales y no comerciales.
      </Para>

      <SectionTitle number={7} title="Usos Prohibidos" />
      <Para>Queda expresamente prohibido:</Para>
      <List items={[
        'Ingeniería inversa, descompilación o desmantelamiento de cualquier parte del Servicio.',
        'Uso de scrapers, bots, crawlers u otras herramientas automatizadas para extraer datos de la plataforma.',
        'Reventa, sublicencia o redistribución del Servicio o de sus contenidos a terceros.',
        'Intentar acceder a sistemas o datos del Servicio de forma no autorizada.',
        'Uso del Servicio para actividades ilegales, fraudulentas o que infrinjan derechos de terceros.',
        'Compartir credenciales de acceso con terceros o permitir el uso de tu cuenta por múltiples personas de forma simultánea.',
        'Sobrecargar intencionadamente la infraestructura del Servicio mediante solicitudes masivas o ataques de denegación de servicio.',
      ]} />
      <Para>
        El incumplimiento puede dar lugar a la suspensión o cancelación inmediata de tu cuenta, sin derecho
        a reembolso, y a las acciones legales que correspondan.
      </Para>

      <SectionTitle number={8} title="Disponibilidad y Limitación de Responsabilidad" />
      <Para>
        Nos esforzamos por mantener el Servicio disponible de forma continua, pero no garantizamos una
        disponibilidad del 100%. Pueden producirse interrupciones por mantenimiento programado, fallos
        técnicos o causas de fuerza mayor.
      </Para>
      <Para>
        En la máxima medida permitida por la ley aplicable, TradingCalculator.pro no será responsable de
        ningún daño indirecto, incidental, especial, consecuente o punitivo derivado del uso del Servicio,
        incluyendo pérdidas financieras derivadas de decisiones de inversión. La responsabilidad máxima de
        TradingCalculator.pro quedará limitada al importe total abonado por ti durante los 12 meses
        anteriores al evento que origina la reclamación.
      </Para>

      <SectionTitle number={9} title="Modificaciones" />
      <Para>
        Nos reservamos el derecho de modificar estos Términos en cualquier momento. Notificaremos los
        cambios materiales mediante correo electrónico o aviso en la plataforma con al menos 15 días de
        antelación. El uso continuado del Servicio tras la entrada en vigor de los nuevos términos implica
        su aceptación.
      </Para>

      <SectionTitle number={10} title="Ley Aplicable y Jurisdicción" />
      <Para>
        Estos Términos se rigen e interpretan de conformidad con la legislación suiza, en particular el
        Código de Obligaciones suizo (CO) y la Ley Federal de Protección de Datos (nDSG), sin perjuicio
        de los derechos que como consumidor te correspondan en virtud de la legislación de tu país de
        residencia dentro de la Unión Europea. Para cualquier controversia que no pueda resolverse de forma
        amistosa, las partes se someten a la jurisdicción competente de Suiza.
      </Para>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cookie Policy
// ---------------------------------------------------------------------------
function CookiePolicy() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Cookie className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Política de Cookies</h2>
          <p className="text-xs text-muted-foreground">Última actualización: {LAST_UPDATED}</p>
        </div>
      </div>

      <SectionTitle number={1} title="¿Qué son las Cookies?" />
      <Para>
        Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un
        sitio web. Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo,
        para que no tengas que volver a introducir cierta información cada vez que navegas de una página a
        otra o regresas al sitio.
      </Para>

      <SectionTitle number={2} title="Cookies Técnicas y Esenciales (No Requieren Consentimiento)" />
      <Para>
        Estas cookies son estrictamente necesarias para el funcionamiento básico del Servicio. Sin ellas,
        el sitio no puede funcionar correctamente. No requieren tu consentimiento conforme a la normativa
        aplicable, ya que su base legal es el interés legítimo de ofrecer un servicio funcional.
      </Para>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-foreground font-semibold text-xs">Cookie</th>
              <th className="text-left py-2 pr-4 text-foreground font-semibold text-xs">Finalidad</th>
              <th className="text-left py-2 text-foreground font-semibold text-xs">Duración</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['session_token', 'Mantener la sesión iniciada del usuario autenticado', 'Sesión'],
              ['theme_pref', 'Recordar la preferencia de tema claro u oscuro', '12 meses'],
              ['lang_pref', 'Recordar el idioma seleccionado por el usuario', '12 meses'],
              ['csrf_token', 'Protección de seguridad contra ataques CSRF', 'Sesión'],
            ].map(([name, purpose, duration]) => (
              <tr key={name} className="border-b border-border/50">
                <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{name}</td>
                <td className="py-2 pr-4 text-muted-foreground text-xs">{purpose}</td>
                <td className="py-2 text-muted-foreground text-xs">{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle number={3} title="Cookies Analíticas (Requieren Consentimiento)" />
      <Para>
        Utilizamos Google Analytics 4 para comprender cómo los usuarios interactúan con el Servicio y
        mejorar su funcionalidad. Estas cookies solo se instalan si previamente has otorgado tu
        consentimiento a través del banner de cookies.
      </Para>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-foreground font-semibold text-xs">Cookie</th>
              <th className="text-left py-2 pr-4 text-foreground font-semibold text-xs">Proveedor</th>
              <th className="text-left py-2 pr-4 text-foreground font-semibold text-xs">Finalidad</th>
              <th className="text-left py-2 text-foreground font-semibold text-xs">Duración</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['_ga', 'Google Analytics', 'Distinguir usuarios únicos (ID anonimizado)', '12 meses'],
              ['_ga_*', 'Google Analytics', 'Mantener el estado de la sesión analítica', '12 meses'],
            ].map(([name, provider, purpose, duration]) => (
              <tr key={name} className="border-b border-border/50">
                <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{name}</td>
                <td className="py-2 pr-4 text-muted-foreground text-xs">{provider}</td>
                <td className="py-2 pr-4 text-muted-foreground text-xs">{purpose}</td>
                <td className="py-2 text-muted-foreground text-xs">{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Para>
        Google Analytics 4 se ha configurado con anonimización de IP activada: la dirección IP se trunca
        antes de ser almacenada. No se transmite información personal identificable a Google a través de
        estas cookies.
      </Para>

      <SectionTitle number={4} title="Cookies de Publicidad y Tracking de Terceros" />
      <Para>
        <strong className="text-foreground">
          TradingCalculator.pro no utiliza cookies de publicidad, retargeting ni de seguimiento
          comportamental de terceros.
        </strong>{' '}
        No mostramos anuncios de terceros en la plataforma ni compartimos datos de comportamiento con
        redes publicitarias.
      </Para>

      <SectionTitle number={5} title="Cómo Gestionar y Desactivar las Cookies" />
      <Para>
        La mayoría de los navegadores permiten controlar las cookies a través de sus ajustes de
        configuración. A continuación encontrarás instrucciones para los navegadores más comunes:
      </Para>
      <List items={[
        'Google Chrome: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.',
        'Mozilla Firefox: Ajustes → Privacidad y seguridad → Cookies y datos del sitio.',
        'Safari: Preferencias → Privacidad → Gestionar datos de sitios web.',
        'Microsoft Edge: Configuración → Privacidad, búsqueda y servicios → Cookies y permisos del sitio.',
      ]} />
      <Para>
        Ten en cuenta que bloquear las cookies técnicas/esenciales puede afectar al funcionamiento del
        Servicio, impidiendo el inicio de sesión o la correcta visualización de la plataforma. Para
        rechazar Google Analytics específicamente, puedes instalar el{' '}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          complemento de inhabilitación de Google Analytics
        </a>.
      </Para>

      <SectionTitle number={6} title="Consentimiento y Gestión de Preferencias" />
      <Para>
        Al acceder por primera vez a TradingCalculator.pro, se mostrará un banner de cookies que te permite
        aceptar o rechazar las cookies no esenciales. Puedes modificar tus preferencias en cualquier
        momento contactando con nosotros en{' '}
        <a href="mailto:contact@tradingcalculator.pro" className="text-primary hover:underline">
          contact@tradingcalculator.pro
        </a>.
        La retirada del consentimiento no afecta a la licitud del tratamiento previo basado en dicho
        consentimiento.
      </Para>

      <SectionTitle number={7} title="Duración de las Cookies" />
      <List items={[
        'Cookies de sesión: se eliminan automáticamente cuando cierras el navegador. Se usan para mantener tu sesión activa y para la protección CSRF.',
        'Cookies persistentes: permanecen en tu dispositivo durante un período máximo de 12 meses. Se usan para recordar tus preferencias de tema e idioma, y para las cookies analíticas de Google Analytics 4.',
      ]} />

      <SectionTitle number={8} title="Actualizaciones de esta Política" />
      <Para>
        Podemos actualizar esta Política de Cookies cuando introduzcamos nuevas tecnologías de seguimiento
        o cuando cambie la normativa aplicable. Te notificaremos los cambios significativos mediante un
        aviso en la plataforma o por correo electrónico. La fecha de "Última actualización" al inicio de
        esta sección indica cuándo se realizó la última revisión.
      </Para>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LegalPage() {
  useSEO({ titleKey: 'seoLegalTitle', descriptionKey: 'seoLegalDesc', canonicalPath: '/legal' });
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Page header */}
        <div className="mb-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Centro Legal</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mx-auto">
            Aquí encontrarás toda la información legal sobre el tratamiento de tus datos, las condiciones
            de uso del Servicio y nuestra política de cookies. Cumplimos con el RGPD y la legislación
            suiza de protección de datos (nDSG).
          </p>
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-8 h-auto flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
            <TabsTrigger
              value="privacy"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Política de Privacidad</span>
            </TabsTrigger>
            <TabsTrigger
              value="terms"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Términos de Uso</span>
            </TabsTrigger>
            <TabsTrigger
              value="cookies"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm"
            >
              <Cookie className="h-4 w-4 shrink-0" />
              <span>Política de Cookies</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy">
            <Card className="bg-card border-border">
              <CardContent className="p-6 sm:p-8">
                <PrivacyPolicy />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card className="bg-card border-border">
              <CardContent className="p-6 sm:p-8">
                <TermsOfUse />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cookies">
            <Card className="bg-card border-border">
              <CardContent className="p-6 sm:p-8">
                <CookiePolicy />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <Card className="bg-card border-border w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground mb-2">
                ¿Preguntas sobre privacidad o legalidad?
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Nuestro equipo responde en menos de 48 horas hábiles.
              </p>
              <Button asChild className="w-full sm:w-auto gap-2">
                <Link to="/contact">
                  Contactar con nosotros
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
