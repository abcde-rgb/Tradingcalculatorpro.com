/**
 * Contenido legal — ESPAÑOL (versión que prevalece).
 *
 * Estructura por documento: { title, sections: [{ t, b: [bloques] }] }.
 * Bloques: { p: 'texto' } · { list: [...] } · { table: { head, rows } } ·
 * { stat: { fig, text } }. Texto enriquecido: **negrita**,
 * [etiqueta](https://url) enlace externo, {email} correo de contacto,
 * {terms} enlace interno a Términos.
 *
 * ⚠️ Identidad del titular y representante en la UE: ya NO se escriben aquí.
 * Viven en `./entity.js`, que es la fuente única, y llegan al texto por los
 * tokens {entity} y {euRepresentative}. Repetida en diez ficheros, la fórmula
 * genérica no se sustituía nunca; con un solo sitio, rellenarla es una edición.
 */
const es = {
  meta: {
    updated: 'Julio 2026',
    updatedLabel: 'Última actualización',
    courtesy: null, // el español es la versión vinculante
  },

  privacy: {
    title: 'Política de Privacidad',
    sections: [
      { t: 'Responsable del Tratamiento', b: [
        { p: 'El responsable del tratamiento de tus datos personales es **TradingCalculator.pro**, operado por {entity}. Para cualquier consulta sobre privacidad, contáctanos en {email}.' },
      ]},
      { t: 'Representante en la Unión Europea', b: [
        { p: 'Al estar el responsable establecido fuera del Espacio Económico Europeo y dirigir su servicio a residentes en la Unión, hemos designado un representante conforme al **artículo 27 del RGPD**. Puedes dirigirte a él, además de a nosotros, para cualquier cuestión relativa al tratamiento de tus datos: {euRepresentative}' },
      ]},
      { t: 'Datos que Recogemos', b: [
        { p: 'Recogemos únicamente los datos necesarios para prestarte el servicio:' },
        { list: [
          'Datos de identificación: nombre y dirección de correo electrónico, proporcionados durante el registro o mediante autenticación con Google (OAuth).',
          'Datos de uso: páginas visitadas, funcionalidades utilizadas (calculadora de opciones, simulaciones, seguimiento de precios), preferencias de tema e idioma.',
          'Datos de pago: procesados por proveedores de pago externos (Stripe, PayPal, Revolut y NOWPayments para criptomonedas). Nunca almacenamos números de tarjeta ni datos bancarios en nuestros servidores; solo conservamos identificadores de cliente/transacción y el estado de la suscripción.',
          'Registros técnicos (logs): dirección IP, tipo de navegador y sistema operativo, con fines de seguridad y diagnóstico.',
          'Datos de alertas de precio: pares de activos y umbrales configurados, únicamente si activas esta funcionalidad.',
          'Datos del diario de trading y del AI Trade Coach: las operaciones que registres voluntariamente y, si usas el AI Trade Coach, los parámetros de la estrategia analizada.',
        ]},
      ]},
      { t: 'Finalidad del Tratamiento', b: [
        { p: 'Tratamos tus datos para las siguientes finalidades:' },
        { list: [
          'Prestación del servicio: gestión de tu cuenta, acceso a las herramientas de la plataforma (calculadora de opciones, precios en tiempo real, simulaciones) y personalización de la experiencia.',
          'Facturación y gestión de suscripciones: procesamiento de pagos recurrentes, gestión de planes (€17/mes, €45/trimestre, €200/año, €500 de por vida) y emisión de facturas.',
          'Comunicaciones transaccionales: envío de confirmaciones de pago, avisos de renovación y notificaciones de alertas de precio configuradas por el usuario, mediante SendGrid.',
          'Seguridad y prevención del fraude: detección de accesos no autorizados y protección de la integridad del servicio.',
          'Análisis del uso del servicio (con tu consentimiento): mediante Google Analytics 4 con anonimización de IP, para mejorar las funcionalidades de la plataforma.',
        ]},
      ]},
      { t: 'Base Legal del Tratamiento (RGPD)', b: [
        { p: 'Para los usuarios del Espacio Económico Europeo, el tratamiento se fundamenta en las siguientes bases legales del Reglamento General de Protección de Datos (RGPD):' },
        { list: [
          'Art. 6(1)(b) RGPD — Ejecución de un contrato: el tratamiento es necesario para prestarte el servicio contratado, gestionar tu suscripción y procesar los pagos.',
          'Art. 6(1)(a) RGPD — Consentimiento: para el uso de cookies analíticas (Google Analytics 4) y el envío de comunicaciones de marketing opcionales. Puedes retirar tu consentimiento en cualquier momento.',
          'Art. 6(1)(c) RGPD — Obligación legal: conservación de datos de facturación según la legislación fiscal aplicable.',
          'Art. 6(1)(f) RGPD — Interés legítimo: para fines de seguridad del servicio y prevención del fraude.',
        ]},
      ]},
      { t: 'Terceros que Reciben tus Datos', b: [
        { p: 'Compartimos datos con los siguientes proveedores de servicios, únicamente en la medida necesaria para la prestación del servicio:' },
        { list: [
          'Stripe, Inc. (pagos con tarjeta y SEPA): procesa pagos de suscripción. Actúa como responsable independiente para los datos de pago. Política: stripe.com/privacy.',
          'PayPal, Inc. (pagos): procesa los pagos realizados con PayPal conforme a su propia política de privacidad.',
          'Revolut (Revolut Pay, incluye Apple Pay/Google Pay en su checkout): procesa los pagos realizados con Revolut Pay.',
          'NOWPayments (pagos con criptomonedas): procesa los pagos en criptomonedas. Recibe el importe, un identificador de pedido y, en su caso, tu email para el recibo.',
          'Google LLC (OAuth y Analytics): la autenticación con Google OAuth transfiere nombre y correo electrónico. Google Analytics 4 se usa con anonimización de IP y solo si otorgas tu consentimiento. Política: policies.google.com/privacy.',
          'PostHog (analítica de producto y grabación de sesión): registra de forma anónima cómo se navega por la aplicación —clics, rutas y errores— para diagnosticar fallos y mejorar la interfaz. Solo se activa si aceptas las cookies no esenciales.',
          'Twilio SendGrid (email transaccional): envío de correos de confirmación, facturas y alertas. Solo recibe tu dirección de email.',
          'Twilio (SMS): si activas los avisos del diario por SMS, recibe tu número de teléfono y el texto del aviso. Solo se usa si das de alta esa vía; en nuestros registros guardamos únicamente los cuatro últimos dígitos y la hora del envío.',
          'Anthropic (AI Trade Coach): cuando solicitas un análisis con IA, se envían a Anthropic los parámetros de la estrategia analizada (activo, patas de la operación, precios). No se envían tu nombre ni tu email junto con la consulta.',
        ]},
        { p: 'Los proveedores están sujetos a acuerdos de tratamiento de datos o cuentan con mecanismos de transferencia internacional adecuados (cláusulas contractuales tipo u otros mecanismos reconocidos).' },
      ]},
      { t: 'Tus Derechos como Interesado (RGPD)', b: [
        { p: 'Si te encuentras en la UE/EEE, dispones de los siguientes derechos:' },
        { list: [
          'Derecho de acceso (Art. 15 RGPD): puedes solicitar una copia de los datos personales que tratamos sobre ti.',
          'Derecho de rectificación (Art. 16 RGPD): puedes corregir datos inexactos o incompletos en cualquier momento desde los ajustes de tu cuenta.',
          'Derecho de supresión (Art. 17 RGPD): puedes solicitar la eliminación de tu cuenta y de tus datos personales, salvo que exista obligación legal de conservación.',
          'Derecho a la portabilidad (Art. 20 RGPD): puedes solicitar una exportación de tus datos en formato estructurado y legible por máquina.',
          'Derecho de oposición (Art. 21 RGPD): puedes oponerte al tratamiento basado en interés legítimo en cualquier momento.',
          'Derecho a retirar el consentimiento: sin que ello afecte a la licitud del tratamiento previo.',
          'Derecho a reclamar ante la autoridad de control de tu país de residencia en la UE (en España, la AEPD).',
        ]},
        { p: 'Para ejercer cualquiera de estos derechos, envía un correo a {email} indicando el derecho que deseas ejercer. Respondemos en un plazo máximo de 30 días.' },
      ]},
      { t: 'Plazos de Conservación', b: [
        { list: [
          'Datos de cuenta (nombre, email, preferencias): conservados mientras la cuenta esté activa. Eliminados dentro de los 30 días siguientes a la solicitud de baja.',
          'Registros técnicos (logs): 90 días, con fines de seguridad y diagnóstico.',
          'Datos de pago y facturación: conservados durante el plazo exigido por las obligaciones fiscales y contables aplicables (hasta 10 años según la jurisdicción).',
          'Datos analíticos (Google Analytics 4): máximo 14 meses, con IP anonimizada.',
          'Eventos de uso del producto (qué secciones se visitan, sin datos identificativos): 120 días, tras los cuales se purgan automáticamente.',
          'Registro de envíos por SMS: solo los cuatro últimos dígitos del número y la hora, mientras la cuenta esté activa; se elimina al borrar la cuenta.',
        ]},
      ]},
      { t: 'Seguridad de los Datos', b: [
        { p: 'Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos personales frente a acceso no autorizado, pérdida o divulgación: cifrado en tránsito (TLS/HTTPS), control de acceso basado en roles y revisiones periódicas de seguridad. Los pagos están protegidos por la infraestructura PCI DSS de los proveedores de pago.' },
      ]},
      { t: 'Transferencias Internacionales', b: [
        { p: 'La Empresa está establecida en los Estados Unidos y algunos proveedores (Google, Stripe, SendGrid, Anthropic) procesan datos fuera del Espacio Económico Europeo. En tales casos nos aseguramos de que existan garantías adecuadas, como cláusulas contractuales tipo aprobadas por la Comisión Europea u otros mecanismos válidos de transferencia.' },
      ]},
      { t: 'Cookies', b: [
        { p: 'Utilizamos cookies y tecnologías similares. Para más detalles, consulta nuestra Política de Cookies en la pestaña correspondiente de esta misma página.' },
      ]},
    ],
  },

  terms: {
    title: 'Términos de Uso',
    sections: [
      { t: 'Aceptación de los Términos', b: [
        { p: 'Al acceder y utilizar TradingCalculator.pro (en adelante, «el Servicio»), aceptas quedar vinculado por estos Términos de Uso. Si no estás de acuerdo con alguna de las condiciones aquí establecidas, debes abstenerte de usar el Servicio. Estos términos constituyen un acuerdo legalmente vinculante entre tú y {entity} (la «Empresa»).' },
      ]},
      { t: 'Naturaleza del Servicio — No es Asesoramiento Financiero', b: [
        { p: 'TradingCalculator.pro es una plataforma de herramientas de información financiera que incluye calculadoras de opciones (Black-Scholes, griegas), precios de activos en tiempo real y simulaciones de estrategias. El Servicio tiene carácter exclusivamente informativo y educativo.' },
        { p: '**AVISO IMPORTANTE: TradingCalculator.pro NO proporciona asesoramiento financiero, de inversión, fiscal ni legal. El contenido de la plataforma no debe interpretarse como una recomendación de compra, venta o mantenimiento de ningún instrumento financiero.**' },
        { p: 'Los resultados pasados no garantizan ni predicen resultados futuros. Toda inversión en instrumentos financieros, incluidas las opciones, conlleva un riesgo significativo de pérdida, pudiendo perder el capital invertido en su totalidad. Eres el único responsable de tus decisiones de inversión. Consulta a un asesor financiero profesional antes de operar.' },
      ]},
      { t: 'Registro y Cuenta de Usuario', b: [
        { p: 'Para acceder a las funcionalidades de la plataforma es necesario crear una cuenta. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que se realicen bajo tu cuenta. Notifícanos inmediatamente cualquier uso no autorizado en {email}. Debes tener al menos 18 años para registrarte y usar el Servicio.' },
      ]},
      { t: 'Planes de Suscripción, Prueba Gratuita y Pagos', b: [
        { p: 'Los planes disponibles son:' },
        { list: [
          'Plan Mensual: €17/mes, renovación automática cada mes.',
          'Plan Trimestral: €45/trimestre, renovación automática cada 3 meses.',
          'Plan Anual: €200/año, renovación automática cada 12 meses.',
          'Plan Lifetime (de por vida): €500, pago único, acceso permanente sin renovaciones.',
        ]},
        { p: '**Prueba gratuita de 7 días** (solo planes de renovación automática y nuevos suscriptores): al iniciarla se solicita un método de pago válido. Si no cancelas antes de que finalice la prueba, se efectuará automáticamente el primer cargo del plan elegido. Puedes cancelar durante la prueba, sin coste alguno, desde la sección «Mi Suscripción».' },
        { p: 'Los pagos se procesan de forma segura a través de **Stripe** (tarjeta, SEPA, Klarna y carteras como Apple Pay/Google Pay), **PayPal**, **Revolut Pay** y **NOWPayments** (criptomonedas). Los precios se indican en euros (EUR). El IVA aplicable se calcula en el momento del pago según tu país de residencia y se muestra desglosado antes de que confirmes la compra; el importe total que verás en la pantalla de pago es el que se cobrará. Al suscribirte a un plan de renovación automática, autorizas los cargos recurrentes en tu método de pago hasta que canceles la suscripción. Puedes cancelar en cualquier momento desde «Mi Suscripción»; el acceso se mantiene hasta el final del período de facturación en curso.' },
      ]},
      { t: 'Derecho de Desistimiento (consumidores de la UE)', b: [
        { p: 'Si eres consumidor con residencia en la Unión Europea, dispones de **14 días naturales desde la contratación** para desistir del contrato **sin necesidad de justificación y sin penalización alguna**. Este derecho es independiente y adicional a la política comercial de reembolsos descrita más abajo, y no puede condicionarse al uso que hayas hecho del Servicio.' },
        { p: 'Para ejercerlo, basta con que nos comuniques tu decisión de forma inequívoca —por ejemplo, con un correo a {email} indicando tu nombre, la fecha de contratación y el plan— antes de que venza el plazo. Puedes usar el formulario del apartado siguiente, aunque no es obligatorio. Te confirmaremos la recepción sin demora.' },
        { p: '**Reembolso.** Te devolveremos todos los pagos recibidos, sin demora indebida y en todo caso **antes de 14 días** desde que nos comuniques tu decisión, empleando el mismo medio de pago que usaste, sin gastos para ti. En pagos con criptomonedas, al ser transacciones irreversibles, se abonará el importe equivalente en euros por un medio alternativo.' },
        { p: '**Acceso inmediato y pérdida del derecho.** El Servicio es contenido digital de acceso inmediato. Al contratar, se te pide que consientas expresamente que la prestación comience de inmediato y que reconozcas que, una vez ejecutada por completo, **pierdes el derecho de desistimiento** (art. 16.m de la Directiva 2011/83/UE). Si no prestas ese consentimiento, la prestación no comienza hasta que transcurran los 14 días. Si desistes tras haber consentido el inicio inmediato, te cobraremos únicamente la parte proporcional al servicio ya prestado.' },
        { p: 'Nada de lo anterior limita los derechos irrenunciables que te correspondan como consumidor según la legislación de tu país de residencia.' },
      ]},
      { t: 'Modelo de Formulario de Desistimiento', b: [
        { p: 'Solo tienes que rellenar y enviar este formulario si deseas desistir del contrato. Su uso no es obligatorio.' },
        { list: [
          'A la atención de TradingCalculator.pro, {email}:',
          'Por la presente le comunico que desisto de mi contrato de prestación del siguiente servicio: [indica el plan contratado].',
          'Fecha de contratación: [fecha].',
          'Nombre del consumidor: [nombre].',
          'Domicilio del consumidor: [domicilio].',
          'Correo electrónico de la cuenta: [email].',
          'Fecha: [fecha de la solicitud].',
        ]},
      ]},
      { t: 'Política de Reembolsos', b: [
        { list: [
          'Plan Mensual (€17/mes): reembolso comercial completo dentro de los primeros 14 días naturales desde la activación (el derecho legal de desistimiento, descrito arriba, no está sujeto a esta ni a ninguna otra condición).',
          'Plan Trimestral (€45/trimestre): reembolso completo dentro de los primeros 14 días naturales desde la activación, bajo las mismas condiciones.',
          'Plan Anual (€200/año): reembolso completo dentro de los primeros 14 días naturales desde la activación, bajo las mismas condiciones.',
          'Plan Lifetime (€500): no reembolsable una vez efectuado el pago, sin perjuicio de los derechos irrenunciables que te correspondan como consumidor según la legislación de tu país de residencia.',
        ]},
        { p: 'Esta política de reembolsos es un compromiso **comercial** y se suma —sin sustituirlo ni limitarlo— al **derecho de desistimiento de 14 días** descrito más arriba, que es incondicional y no depende del uso que hayas hecho del Servicio. Para solicitar un reembolso comercial, contacta con nosotros en {email} dentro del plazo aplicable. Los reembolsos se procesan en el método de pago original en un plazo de 5 a 10 días hábiles. **Pagos con criptomonedas:** al ser transacciones irreversibles, los reembolsos aprobados se abonarán en euros mediante un medio alternativo equivalente. Esta política no limita los derechos que como consumidor te correspondan según la legislación de tu país de residencia en la UE.' },
      ]},
      { t: 'Propiedad Intelectual', b: [
        { p: 'Todo el contenido del Servicio —incluyendo código fuente, algoritmos, diseño de la interfaz, textos, gráficos, logotipos y bases de datos— es propiedad exclusiva de la Empresa y está protegido por las leyes de propiedad intelectual aplicables. Se te concede una licencia limitada, no exclusiva, intransferible y revocable para usar el Servicio exclusivamente para tus fines personales y no comerciales.' },
      ]},
      { t: 'Usos Prohibidos', b: [
        { p: 'Queda expresamente prohibido:' },
        { list: [
          'Ingeniería inversa, descompilación o desmantelamiento de cualquier parte del Servicio.',
          'Uso de scrapers, bots, crawlers u otras herramientas automatizadas para extraer datos de la plataforma.',
          'Reventa, sublicencia o redistribución del Servicio o de sus contenidos a terceros.',
          'Intentar acceder a sistemas o datos del Servicio de forma no autorizada.',
          'Uso del Servicio para actividades ilegales, fraudulentas o que infrinjan derechos de terceros.',
          'Compartir credenciales de acceso con terceros o permitir el uso de tu cuenta por múltiples personas de forma simultánea.',
          'Sobrecargar intencionadamente la infraestructura del Servicio mediante solicitudes masivas o ataques de denegación de servicio.',
        ]},
        { p: 'El incumplimiento puede dar lugar a la suspensión o cancelación inmediata de tu cuenta, sin derecho a reembolso, y a las acciones legales que correspondan.' },
      ]},
      { t: 'Disponibilidad y Limitación de Responsabilidad', b: [
        { p: 'Nos esforzamos por mantener el Servicio disponible de forma continua, pero no garantizamos una disponibilidad del 100%. Pueden producirse interrupciones por mantenimiento programado, fallos técnicos o causas de fuerza mayor.' },
        { p: 'En la máxima medida permitida por la ley aplicable, la Empresa no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo derivado del uso del Servicio, incluyendo pérdidas financieras derivadas de decisiones de inversión. La responsabilidad máxima de la Empresa quedará limitada al importe total abonado por ti durante los 12 meses anteriores al evento que origina la reclamación.' },
      ]},
      { t: 'Modificaciones', b: [
        { p: 'Nos reservamos el derecho de modificar estos Términos en cualquier momento. Notificaremos los cambios materiales mediante correo electrónico o aviso en la plataforma con al menos 15 días de antelación. El uso continuado del Servicio tras la entrada en vigor de los nuevos términos implica su aceptación.' },
      ]},
      { t: 'Ley Aplicable y Jurisdicción', b: [
        { p: 'Estos Términos se rigen por la legislación de los Estados Unidos y, en su caso, por la del estado de constitución de la Empresa, sin perjuicio de las normas imperativas de protección de los consumidores que te correspondan en tu país de residencia (en particular dentro de la Unión Europea). Para cualquier controversia que no pueda resolverse de forma amistosa, las partes se someten a los tribunales competentes conforme a la normativa aplicable.' },
      ]},
    ],
  },

  cookies: {
    title: 'Política de Cookies',
    sections: [
      { t: '¿Qué son las Cookies?', b: [
        { p: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo, para que no tengas que volver a introducir cierta información cada vez que navegas de una página a otra o regresas al sitio.' },
      ]},
      { t: 'Cookies Técnicas y Esenciales (No Requieren Consentimiento)', b: [
        { p: 'Estas cookies son estrictamente necesarias para el funcionamiento básico del Servicio (autenticación segura). Son cookies httpOnly: ningún script del navegador puede leerlas.' },
        { table: {
          head: ['Cookie', 'Finalidad', 'Duración'],
          rows: [
            ['access_token', 'Mantener tu sesión autenticada (token de acceso, httpOnly)', '1 hora'],
            ['refresh_token', 'Renovar la sesión sin volver a iniciar sesión (httpOnly)', '7 días'],
          ],
        }},
        { p: 'Además, utilizamos **almacenamiento local del navegador (localStorage — no son cookies)** para recordar tu elección de consentimiento de cookies y el estado de la interfaz en ese dispositivo. Si has iniciado sesión, tus preferencias de cuenta —idioma, tema, favoritos, progreso de la Academia y los setups de tu sistema de trading— **se guardan también en tu cuenta en nuestros servidores**, para que te acompañen al cambiar de dispositivo; se borran cuando eliminas la cuenta y se incluyen en la exportación de tus datos. No se transmiten a terceros.' },
      ]},
      { t: 'Cookies Analíticas (Requieren Consentimiento)', b: [
        { p: 'Utilizamos Google Analytics 4 para comprender cómo los usuarios interactúan con el Servicio y mejorar su funcionalidad. Estas cookies solo se instalan si previamente has otorgado tu consentimiento a través del banner de cookies (Google Consent Mode v2, denegado por defecto).' },
        { table: {
          head: ['Cookie', 'Proveedor', 'Finalidad', 'Duración'],
          rows: [
            ['_ga', 'Google Analytics', 'Distinguir usuarios únicos (ID anonimizado)', '12 meses'],
            ['_ga_*', 'Google Analytics', 'Mantener el estado de la sesión analítica', '12 meses'],
            ['ph_*', 'PostHog', 'Analítica de producto y grabación de sesión (clics, rutas y errores)', '12 meses'],
          ],
        }},
        { p: 'Google Analytics 4 se ha configurado con anonimización de IP activada: la dirección IP se trunca antes de ser almacenada. No se transmite información personal identificable a Google a través de estas cookies.' },
      ]},
      { t: 'Contenido Incrustado de Terceros', b: [
        { p: 'Algunas páginas incorporan el gráfico de **TradingView** mediante un iframe de tradingview.com. Ese contenido lo sirve TradingView y puede establecer sus propias cookies técnicas conforme a su propia política de privacidad y cookies. No controlamos esas cookies.' },
      ]},
      { t: 'Cookies de Publicidad y Tracking de Terceros', b: [
        { p: '**No mostramos anuncios de terceros ni compartimos datos con redes publicitarias, y no usamos cookies de publicidad ni de retargeting.** Sí utilizamos **PostHog** (analítica de producto y grabación de sesión) para entender cómo se usa la plataforma y detectar errores; se activa únicamente si aceptas las cookies no esenciales y puedes rechazarlo desde el banner. Consulta la tabla siguiente.' },
      ]},
      { t: 'Cómo Gestionar y Desactivar las Cookies', b: [
        { p: 'La mayoría de los navegadores permiten controlar las cookies a través de sus ajustes de configuración:' },
        { list: [
          'Google Chrome: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.',
          'Mozilla Firefox: Ajustes → Privacidad y seguridad → Cookies y datos del sitio.',
          'Safari: Preferencias → Privacidad → Gestionar datos de sitios web.',
          'Microsoft Edge: Configuración → Privacidad, búsqueda y servicios → Cookies y permisos del sitio.',
        ]},
        { p: 'Ten en cuenta que bloquear las cookies esenciales puede impedir el inicio de sesión. Para rechazar Google Analytics específicamente, puedes instalar el [complemento de inhabilitación de Google Analytics](https://tools.google.com/dlpage/gaoptout).' },
      ]},
      { t: 'Consentimiento y Gestión de Preferencias', b: [
        { p: 'Al acceder por primera vez se muestra un banner que te permite aceptar o rechazar las cookies no esenciales; tu elección se recuerda en tu dispositivo. Puedes modificar tus preferencias en cualquier momento borrando los datos del sitio en tu navegador o contactando en {email}. La retirada del consentimiento no afecta a la licitud del tratamiento previo.' },
      ]},
      { t: 'Actualizaciones de esta Política', b: [
        { p: 'Podemos actualizar esta Política de Cookies cuando introduzcamos nuevas tecnologías o cuando cambie la normativa aplicable. Te notificaremos los cambios significativos mediante un aviso en la plataforma o por correo electrónico. La fecha de «Última actualización» indica la última revisión.' },
      ]},
    ],
  },

  risk: {
    title: 'Advertencia de Riesgo',
    sections: [
      { t: 'Los datos hablan claro', b: [
        { p: '**Operar en los mercados financieros conlleva un riesgo elevado de pérdida. La gran mayoría de los traders minoristas pierden dinero.** Antes de operar con dinero real, conviene que conozcas estos datos verificados e independientes. No son nuestra opinión: son cifras de reguladores y de estudios académicos.' },
        { stat: { fig: '74–89%', text: 'de las **cuentas minoristas de CFDs pierden dinero**, según el regulador europeo (ESMA). La pérdida media por cliente se sitúa entre 1.600 € y 29.000 €. Por eso la ley obliga a cada bróker a mostrar este porcentaje en su publicidad.' } },
        { stat: { fig: '97%', text: 'de quienes hicieron **day trading durante más de 300 días** perdieron dinero (estudio sobre el mercado de futuros de Brasil, 2013–2015). Solo el 1,1% ganó más que el salario mínimo y solo el 0,5% más que el sueldo inicial de un cajero de banco. Los autores concluyen que es «virtualmente imposible vivir del day trading».' } },
        { stat: { fig: '<1%', text: 'de los day traders son rentables de forma **consistente y predecible**, según estudios clásicos sobre el mercado de Taiwán (Barber & Odean); en torno al 80% pierde dinero.' } },
      ]},
      { t: 'Qué significa esto para ti', b: [
        { list: [
          'La rentabilidad sostenida en el trading minorista es rara: menos del 1-3% lo consigue a largo plazo.',
          'Los resultados pasados no garantizan ni predicen los resultados futuros.',
          'Puedes perder la totalidad del capital invertido. En productos apalancados (CFDs, futuros, opciones) las pérdidas pueden producirse muy rápido e incluso superar el depósito inicial.',
          'Los costes (comisiones, spreads, slippage e impuestos) juegan en tu contra de forma acumulada.',
          'Factores psicológicos y sesgos de comportamiento (exceso de confianza, operar por venganza, sobreoperar) empeoran los resultados de la mayoría.',
        ]},
      ]},
      { t: 'Nuestra postura', b: [
        { p: '**TradingCalculator.pro ofrece herramientas informativas y educativas — no asesoramiento financiero, no señales y no promesas de rentabilidad.** Mostramos estas cifras porque queremos que decidas con información veraz. Opera únicamente con dinero que puedas permitirte perder y, si lo necesitas, consulta a un asesor financiero debidamente autorizado. Consulta también nuestros {terms}.' },
      ]},
      { t: 'Fuentes', b: [
        { list: [
          'ESMA (Autoridad Europea de Valores y Mercados) — medidas de intervención sobre CFDs: [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), «Day Trading for a Living?» — FGV/USP: [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — investigaciones sobre el rendimiento de los day traders en el mercado de Taiwán.',
        ]},
      ]},
    ],
  },
};

export default es;
