import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getForumReports, moderateForumTarget } from '@/services/forumApi';

/**
 * La cola de moderación del foro, dentro del panel de administración.
 *
 * Existe porque una denuncia que no lee nadie es peor que no tener botón de
 * denunciar: promete una respuesta que no llega. `check-rutas-muertas.py`
 * marcó las dos rutas de moderación como «sin consumidor» y ésa era la señal
 * correcta — el arreglo es esta pantalla, no callar al verificador.
 *
 * **La identidad de quien denuncia no viaja hasta aquí.** El backend devuelve
 * el mensaje denunciado y el motivo, nunca el denunciante: si denunciar
 * tuviera coste social, nadie denunciaría.
 */
const MOTIVO = {
  spam: 'Spam',
  senal: 'Señal encubierta',
  abuso: 'Abuso',
  fuera_de_tema: 'Fuera de tema',
  datos_personales: 'Datos personales',
  otro: 'Otro',
};

export default function ModeracionForo() {
  const [denuncias, setDenuncias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDenuncias(await getForumReports('abierta'));
    } catch {
      setError('No se ha podido cargar la cola de moderación.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const moderar = async (d, accion) => {
    setTrabajando(d.id);
    try {
      await moderateForumTarget({ type: d.targetType, id: d.targetId, accion });
      await cargar();
    } catch {
      setError('No se ha podido aplicar la acción.');
    } finally {
      setTrabajando('');
    }
  };

  return (
    <section className="rounded-lg border border-rule bg-card p-5">
      <header className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-lg font-semibold">Moderación de la comunidad</h3>
        <span className="font-mono text-sm text-muted-foreground">{denuncias.length}</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={cargar} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Recargar'}
        </Button>
      </header>

      <p className="mt-2 text-sm text-muted-foreground">
        Denuncias abiertas. Ocultar retira el mensaje del foro sin borrarlo: sigue en la
        base de datos y se puede volver a mostrar.
      </p>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {!cargando && denuncias.length === 0 ? (
        <p className="mt-4 rounded-sharp border border-dashed border-rule px-4 py-6 text-center text-sm text-muted-foreground">
          No hay denuncias abiertas.
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-rule">
        {denuncias.map((d) => (
          <li key={d.id} className="flex flex-wrap items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-sharp border border-warn/40 bg-warn/10 px-1.5 text-warn">
                  {MOTIVO[d.reason] || d.reason}
                </span>
                <span>{d.targetType === 'thread' ? 'Hilo' : 'Respuesta'}</span>
                <span className="font-mono">{d.targetId}</span>
                {d.targetStatus === 'hidden' ? (
                  <span className="text-destructive">oculto</span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{d.excerpt || '—'}</p>
            </div>
            <div className="flex gap-2">
              {d.targetStatus === 'hidden' ? (
                <Button variant="outline" size="sm" disabled={trabajando === d.id}
                  onClick={() => moderar(d, 'show')}>
                  Volver a mostrar
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled={trabajando === d.id}
                  onClick={() => moderar(d, 'hide')}>
                  Ocultar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
