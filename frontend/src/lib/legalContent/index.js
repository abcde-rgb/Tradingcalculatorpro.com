/**
 * Legal content registry — one structured document set per locale.
 * The Spanish version is the binding one; the rest are courtesy translations
 * (each non-es file carries its own translated `meta.courtesy` note).
 */
import es from './es';
import en from './en';
import de from './de';
import fr from './fr';
import ru from './ru';
import zh from './zh';
import ja from './ja';
import ar from './ar';

const CONTENT = { es, en, de, fr, ru, zh, ja, ar };

export function getLegalContent(locale) {
  return CONTENT[locale] || CONTENT.es;
}

export default getLegalContent;
