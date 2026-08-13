import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

/**
 * Mapa de las 14 calculadoras: qué hace cada una, en una pantalla.
 *
 * Existe porque la navegación por pestañas te obliga a abrir una herramienta
 * para saber si es la que buscabas. Con 14, eso son 14 intentos. Aquí se lee
 * todo de una vez y se salta directo a la correcta.
 *
 * Los grupos y las descripciones NO se duplican: llegan de `CALC_NAV`, que es
 * la misma estructura que pinta la navegación. Añadir una calculadora allí la
 * añade aquí sola.
 */
export default function ToolMap({ groups, onPick, activeTool }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5" data-testid="tool-map">
      <p className="text-xs text-muted-foreground">{t('toolMapIntro')}</p>

      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
            {group.Icon && <group.Icon className="w-3.5 h-3.5" />}
            {group.label}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <Card
                key={item.value}
                onClick={() => onPick(item.value)}
                // Es un botón real, no un div con onClick: se llega con el
                // tabulador y responde a Enter, que es como navega quien no
                // usa ratón.
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(item.value);
                  }
                }}
                className={`cursor-pointer transition-colors hover:border-primary/50 focus-visible:outline-none
                            focus-visible:ring-1 focus-visible:ring-primary
                            ${activeTool === item.value ? 'border-primary/60' : 'border-border'}`}
                data-testid={`tool-map-${item.value}`}
              >
                <CardContent className="p-3">
                  <p className="font-semibold text-sm mb-1">{item.label}</p>
                  {item.descKey && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                      {t(item.descKey)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
