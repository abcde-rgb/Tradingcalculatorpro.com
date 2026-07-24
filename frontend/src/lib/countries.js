// Country helpers for the registration form and admin panel.
//
// We store only the ISO 3166-1 alpha-2 code (e.g. "ES") on the user — it is
// stable and compact. Display names are derived at render time with the
// browser's Intl.DisplayNames in the active UI locale, so we never have to
// translate ~200 country names across 8 languages by hand. The flag emoji is
// built from the two-letter code via regional-indicator symbols.

// ISO 3166-1 alpha-2 codes (comprehensive; UN members + common territories).
export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AT','AU','AW','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BM','BN','BO','BR','BS','BT','BW','BY','BZ',
  'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CW','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','ER','ES','ET',
  'FI','FJ','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW','GY',
  'HK','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MG','MH','MK','ML','MM','MN','MO','MQ','MR','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NG','NI','NL','NO','NP','NR','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WS',
  'XK',
  'YE',
  'ZA','ZM','ZW',
];

/** Emoji flag from an ISO alpha-2 code (regional indicator symbols). */
export function countryFlag(code) {
  if (!code || code.length !== 2) return '🏳️';
  const cc = code.toUpperCase();
  // XK (Kosovo) has no emoji flag — fall back to a neutral flag.
  if (cc === 'XK') return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65),
  );
}

// Cache one DisplayNames instance per locale (constructing it is not free).
const _displayNamesCache = {};
function getDisplayNames(locale) {
  if (_displayNamesCache[locale] !== undefined) return _displayNamesCache[locale];
  let dn = null;
  try {
    dn = new Intl.DisplayNames([locale], { type: 'region' });
  } catch (_) {
    dn = null;
  }
  _displayNamesCache[locale] = dn;
  return dn;
}

/** Localized country name for a code; falls back to the code itself. */
export function countryName(code, locale = 'es') {
  if (!code) return '';
  if (code === 'XK') return 'Kosovo';
  const dn = getDisplayNames(locale);
  try {
    return (dn && dn.of(code)) || code;
  } catch (_) {
    return code;
  }
}

/**
 * Options for a <select>, sorted alphabetically by the localized name.
 * Returns [{ code, name, flag }].
 */
export function getCountryOptions(locale = 'es') {
  return COUNTRY_CODES
    .map((code) => ({ code, name: countryName(code, locale), flag: countryFlag(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
