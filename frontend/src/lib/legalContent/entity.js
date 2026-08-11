/**
 * Identidad legal del titular — FUENTE ÚNICA.
 *
 * Vivía repetida como una fórmula genérica («una sociedad de responsabilidad
 * limitada (LLC) registrada en los Estados Unidos») en los diez ficheros de
 * `legalContent/`, con un comentario que pedía sustituirla «cuando se disponga
 * del nombre legal exacto». Repetida diez veces, esa sustitución no llega
 * nunca; y mientras tanto incumple tres normas a la vez:
 *
 *   · RGPD art. 13(1)(a)            — identidad y datos de contacto del responsable
 *   · Directiva 2000/31/CE art. 5   — nombre y dirección geográfica del prestador
 *   · Directiva 2011/83/UE art. 6   — identidad y domicilio ANTES de contratar
 *
 * Y falta además el **representante en la Unión** del art. 27 del RGPD, que es
 * obligatorio para un responsable establecido fuera de la UE que ofrece
 * servicios a residentes en la UE — y aquí se ofrecen: precios en euros,
 * versión vinculante en español y mención expresa a la AEPD.
 *
 * ▸ QUÉ HAY QUE HACER: rellenar las constantes de abajo con los datos reales.
 *   Es el único sitio; los cuatro documentos y los diez idiomas los heredan.
 *   Mientras `legalName` siga vacío, `LEGAL_ENTITY.complete` es `false` y los
 *   textos caen a la fórmula genérica, que es lo que hay hoy: no empeora nada,
 *   pero tampoco cumple. El representante en la UE hay que designarlo por
 *   escrito antes de poder publicarlo.
 */

// ── Rellenar con los datos reales de la sociedad ────────────────────────────
const legalName = '';        // p. ej. 'Trading Calculator Pro LLC'
const jurisdiction = '';     // p. ej. 'Delaware, Estados Unidos'
const registryNumber = '';   // nº de registro / EIN, si procede
const address = '';          // domicilio social completo

// ── Representante en la Unión (RGPD art. 27) ────────────────────────────────
// Se designa por escrito y su nombre y dirección deben ser públicos, para que
// cualquier interesado o autoridad de control pueda dirigirse a él.
const euRepresentativeName = '';
const euRepresentativeAddress = '';
const euRepresentativeEmail = '';

// ── Fórmula de respaldo, la que hay publicada hoy ───────────────────────────
const GENERIC = {
  es: 'una sociedad de responsabilidad limitada (LLC) registrada en los Estados Unidos',
  en: 'a limited liability company (LLC) registered in the United States',
  de: 'eine in den Vereinigten Staaten eingetragene Gesellschaft mit beschränkter Haftung (LLC)',
  fr: 'une société à responsabilité limitée (LLC) enregistrée aux États-Unis',
  it: 'una società a responsabilità limitata (LLC) registrata negli Stati Uniti',
  pt: 'uma sociedade de responsabilidade limitada (LLC) registada nos Estados Unidos',
  ru: 'общество с ограниченной ответственностью (LLC), зарегистрированное в США',
  zh: '一家在美国注册的有限责任公司（LLC）',
  ja: '米国で登記された有限責任会社（LLC）',
  ar: 'شركة ذات مسؤولية محدودة (LLC) مسجّلة في الولايات المتحدة',
};

export const LEGAL_ENTITY = {
  legalName,
  jurisdiction,
  registryNumber,
  address,
  euRepresentativeName,
  euRepresentativeAddress,
  euRepresentativeEmail,

  /** `true` sólo cuando hay identidad publicable. */
  get complete() {
    return Boolean(legalName && address);
  },

  /** `true` cuando el representante del art. 27 está designado y es publicable. */
  get hasEuRepresentative() {
    return Boolean(euRepresentativeName && euRepresentativeAddress);
  },

  /** Cómo nombrar al titular en un texto legal, en el idioma que toque. */
  describe(locale = 'es') {
    if (!this.complete) return GENERIC[locale] || GENERIC.es;
    const parts = [legalName];
    if (registryNumber) parts.push(`(${registryNumber})`);
    if (jurisdiction) parts.push(`— ${jurisdiction}`);
    return `${parts.join(' ')}, con domicilio en ${address}`;
  },

  /** Bloque de contacto del representante en la UE, o `null` si no lo hay. */
  describeEuRepresentative() {
    if (!this.hasEuRepresentative) return null;
    const contact = euRepresentativeEmail ? ` · ${euRepresentativeEmail}` : '';
    return `${euRepresentativeName}, ${euRepresentativeAddress}${contact}`;
  },
};

export default LEGAL_ENTITY;
