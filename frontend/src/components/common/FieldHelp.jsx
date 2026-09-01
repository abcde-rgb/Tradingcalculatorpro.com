import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/lib/i18n';

/**
 * Interrogante de ayuda junto a una etiqueta o un título.
 *
 * Abre al PULSAR, no al pasar por encima. Es deliberado: la ayuda que había
 * antes en la web usaba el atributo `title` del navegador, que en un móvil
 * sencillamente no existe —no hay hover— así que era invisible para quien entra
 * desde el teléfono. Un popover se abre igual con dedo que con ratón.
 *
 * Regla al escribir el texto: si sólo repite la etiqueta ("saldo de la cuenta"
 * → "el saldo de tu cuenta"), NO se pone. Un interrogante que no aporta enseña
 * al usuario a no volver a pulsar ninguno.
 *
 * @param {string} titleKey  clave i18n del encabezado del popover (opcional)
 * @param {string} bodyKey   clave i18n del cuerpo. Acepta clave o literal.
 * @param {string} [size]    clases de tamaño del icono
 */
export default function FieldHelp({ titleKey, bodyKey, size = 'w-3.5 h-3.5', align = 'start' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!bodyKey) return null;

  const body = t(bodyKey);
  const title = titleKey ? t(titleKey) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // `aria-label` y no sólo el icono: un lector de pantalla necesita
          // saber qué abre este botón.
          aria-label={t('helpAria')}
          className="inline-flex items-center justify-center rounded-full text-muted-foreground
                     hover:text-primary focus-visible:outline-none focus-visible:ring-1
                     focus-visible:ring-primary transition-colors align-middle shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className={size} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-72 max-w-[calc(100vw-2rem)] p-3 text-[13px] leading-relaxed"
        // Sin esto, abrir el popover roba el foco al campo que se estaba
        // rellenando y en móvil se cierra el teclado.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {title && (
          <p className="font-semibold text-foreground mb-1 text-[13px]">{title}</p>
        )}
        <p className="text-muted-foreground whitespace-pre-line">{body}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Etiqueta + interrogante, que es la combinación que se repite en cada campo.
 * Existe para no tener que escribir el mismo `flex items-center gap-1.5` en
 * cuarenta sitios y que acabe desalineado en la mitad.
 */
export function LabelWithHelp({ children, className = '', ...help }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {children}
      <FieldHelp {...help} />
    </span>
  );
}
